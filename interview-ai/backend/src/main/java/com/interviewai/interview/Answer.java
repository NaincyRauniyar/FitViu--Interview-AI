package com.interviewai.interview;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "answers")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Answer {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    @ToString.Exclude @EqualsAndHashCode.Exclude
    private InterviewSession session;

    @Column(columnDefinition = "TEXT") private String question;
    @Column(columnDefinition = "TEXT") private String answer;

    private String category;
    private String difficulty;

    private Double overallScore;
    private Double technicalScore;
    private Double communicationScore;
    private Double completenessScore;

    @Column(columnDefinition = "TEXT") private String feedback;
    @Column(columnDefinition = "TEXT") private String evaluationJson;

    private LocalDateTime answeredAt;

    @PrePersist
    protected void onCreate() {
        this.answeredAt = LocalDateTime.now();
    }
}
