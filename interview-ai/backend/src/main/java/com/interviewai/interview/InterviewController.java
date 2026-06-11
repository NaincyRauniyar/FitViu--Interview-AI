package com.interviewai.interview;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewai.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.*;

@RestController
@RequestMapping("/api/interview")
@RequiredArgsConstructor
@Slf4j
public class InterviewController {

    private final WebClient webClient;
    private final InterviewService service;
    private final SimpMessagingTemplate ws;
    private final ObjectMapper mapper;

    @Value("${ai.service.url}")
    private String aiUrl;

    // ── Parse resume PDF ────────────────────────────────────
    @PostMapping("/parse-resume")
    public ResponseEntity<?> parseResume(@RequestParam("file") MultipartFile file) {
        try {
            var builder = new org.springframework.http.client.MultipartBodyBuilder();
            builder.part("file", file.getResource());
            var result = webClient.post()
                .uri(aiUrl + "/api/resume/parse")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(Object.class)
                .block();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Resume parse failed: {}", e.getMessage());
            throw new RuntimeException("Resume parsing failed. Check AI service is running.");
        }
    }

    // ── Start interview session ─────────────────────────────
    @PostMapping("/start")
    public ResponseEntity<?> start(@Valid @RequestBody StartRequest req,
                                   @AuthenticationPrincipal UserDetails user) {
        var qs = webClient.post()
            .uri(aiUrl + "/api/questions/generate")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(Map.of("resume_text", req.resumeText(), "num_questions", 10))
            .retrieve()
            .bodyToMono(Map.class)
            .block();

        String structured = "";
        try { structured = mapper.writeValueAsString(req.structured()); } catch (Exception ignored) {}

        var session = service.createSession(user.getUsername(), req.resumeText(), structured);
        return ResponseEntity.ok(Map.of(
            "session_id", session.getId(),
            "questions",  qs != null ? qs.get("questions") : List.of()
        ));
    }

    // ── Submit and evaluate an answer ──────────────────────
    @PostMapping("/{sessionId}/answer")
    public ResponseEntity<?> answer(@PathVariable Long sessionId,
                                    @Valid @RequestBody AnswerRequest req) {
        var eval = webClient.post()
            .uri(aiUrl + "/api/answers/evaluate")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(Map.of(
                "question", req.question(),
                "answer",   req.answer(),
                "role",     req.role() != null ? req.role() : "Software Engineer"
            ))
            .retrieve()
            .bodyToMono(Object.class)
            .block();

        service.saveAnswer(sessionId, req.question(), req.answer(),
            req.category() != null ? req.category() : "general", eval);

        // Broadcast via WebSocket
        ws.convertAndSend("/topic/interview/" + sessionId,
            Map.of("type", "ANSWER_EVALUATED", "data", eval));

        return ResponseEntity.ok(eval);
    }

    // ── Complete session ───────────────────────────────────
    @PostMapping("/{sessionId}/complete")
    public ResponseEntity<?> complete(@PathVariable Long sessionId,
                                      @RequestBody CompleteRequest req) {
        var session = service.completeSession(sessionId,
            req.violations() != null ? req.violations() : List.of());
        ws.convertAndSend("/topic/interview/" + sessionId,
            Map.of("type", "SESSION_COMPLETE", "average_score", session.getAverageScore()));
        return ResponseEntity.ok(Map.of(
            "message",       "Interview completed",
            "average_score", session.getAverageScore(),
            "status",        session.getStatus()
        ));
    }

    // ── Get all sessions for dashboard ────────────────────
    @GetMapping("/sessions")
    public ResponseEntity<List<SessionSummaryResponse>> sessions(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(
            service.getSessions(user.getUsername()).stream()
                .map(SessionSummaryResponse::from)
                .toList()
        );
    }

    // ── Get single session detail ──────────────────────────
    @GetMapping("/sessions/{id}")
    public ResponseEntity<?> detail(@PathVariable Long id,
                                    @AuthenticationPrincipal UserDetails user) {
        var data    = service.getDetail(id, user.getUsername());
        var answers = ((List<Answer>) data.get("answers")).stream()
            .map(AnswerResponse::from).toList();
        return ResponseEntity.ok(Map.of("session", data.get("session"), "answers", answers));
    }
}
