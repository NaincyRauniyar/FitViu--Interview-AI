package com.interviewai.dto;

import com.interviewai.interview.InterviewSession;
import java.time.LocalDateTime;

public record SessionSummaryResponse(
    Long id, String status,
    Double averageScore, Double technicalScore, Double communicationScore,
    Integer answeredQuestions, Integer totalQuestions,
    LocalDateTime createdAt, LocalDateTime completedAt
) {
    public static SessionSummaryResponse from(InterviewSession s) {
        return new SessionSummaryResponse(
            s.getId(), s.getStatus(),
            s.getAverageScore(), s.getTechnicalScore(), s.getCommunicationScore(),
            s.getAnsweredQuestions(), s.getTotalQuestions(),
            s.getCreatedAt(), s.getCompletedAt()
        );
    }
}
