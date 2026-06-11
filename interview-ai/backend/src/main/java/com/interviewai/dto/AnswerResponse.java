package com.interviewai.dto;

import com.interviewai.interview.Answer;
import java.time.LocalDateTime;

public record AnswerResponse(
    Long id, String question, String answer, String category, String difficulty,
    Double overallScore, Double technicalScore, Double communicationScore,
    String feedback, LocalDateTime answeredAt
) {
    public static AnswerResponse from(Answer a) {
        return new AnswerResponse(
            a.getId(), a.getQuestion(), a.getAnswer(), a.getCategory(), a.getDifficulty(),
            a.getOverallScore(), a.getTechnicalScore(), a.getCommunicationScore(),
            a.getFeedback(), a.getAnsweredAt()
        );
    }
}
