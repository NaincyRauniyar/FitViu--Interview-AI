package com.interviewai.interview;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewai.user.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class InterviewService {

    private final InterviewSessionRepository sessionRepo;
    private final AnswerRepository answerRepo;
    private final UserService userService;
    private final ObjectMapper mapper;

    public InterviewSession createSession(String email, String resumeText, String structured) {
        var user = userService.findByEmail(email);
        return sessionRepo.save(InterviewSession.builder()
            .user(user)
            .resumeText(resumeText)
            .resumeStructured(structured)
            .status("STARTED")
            .build());
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Answer saveAnswer(Long sessionId, String question, String answer,
                              String category, Object evalObj) {
        var session = sessionRepo.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));
        session.setStatus("IN_PROGRESS");
        sessionRepo.save(session);

        try {
            Map<String, Object> eval = mapper.convertValue(evalObj, Map.class);
            var ans = Answer.builder()
                .session(session)
                .question(question)
                .answer(answer)
                .category(category)
                .overallScore(toDouble(eval.get("overall_score")))
                .technicalScore(toDouble(eval.get("technical_accuracy")))
                .communicationScore(toDouble(eval.get("communication")))
                .completenessScore(toDouble(eval.get("completeness")))
                .feedback((String) eval.get("feedback"))
                .evaluationJson(mapper.writeValueAsString(eval))
                .build();
            return answerRepo.save(ans);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save answer: " + e.getMessage());
        }
    }

    @Transactional
    public InterviewSession completeSession(Long sessionId, List<String> violations) {
        var session = sessionRepo.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found"));
        var answers = answerRepo.findBySessionIdOrderByAnsweredAtAsc(sessionId);

        if (!answers.isEmpty()) {
            session.setAverageScore(avg(answers, "overall"));
            session.setTechnicalScore(avg(answers, "technical"));
            session.setCommunicationScore(avg(answers, "communication"));
        }

        try {
            session.setViolations(mapper.writeValueAsString(violations));
        } catch (Exception ignored) {}

        session.setAnsweredQuestions(answers.size());
        session.setStatus("COMPLETED");
        session.setCompletedAt(LocalDateTime.now());
        return sessionRepo.save(session);
    }

    public List<InterviewSession> getSessions(String email) {
        return sessionRepo.findByUserEmailOrderByCreatedAtDesc(email);
    }

    public Map<String, Object> getDetail(Long id, String email) {
        var session = sessionRepo.findByIdAndUserEmail(id, email)
            .orElseThrow(() -> new RuntimeException("Session not found or access denied"));
        var answers = answerRepo.findBySessionIdOrderByAnsweredAtAsc(id);
        return Map.of("session", session, "answers", answers);
    }

    private double avg(List<Answer> answers, String type) {
        return answers.stream().mapToDouble(a -> {
            Double v = switch (type) {
                case "technical"      -> a.getTechnicalScore();
                case "communication"  -> a.getCommunicationScore();
                default               -> a.getOverallScore();
            };
            return v != null ? v : 0.0;
        }).average().orElse(0.0);
    }

    private Double toDouble(Object v) {
        if (v == null) return 0.0;
        if (v instanceof Number) return ((Number) v).doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return 0.0; }
    }
}
