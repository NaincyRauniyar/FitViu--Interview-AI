package com.interviewai.interview;

import com.interviewai.user.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "interview_sessions")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class InterviewSession {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude @EqualsAndHashCode.Exclude
    private User user;

    @Column(columnDefinition = "TEXT")
    private String resumeText;

    @Column(columnDefinition = "TEXT")
    private String resumeStructured;

    private Double averageScore;
    private Double technicalScore;
    private Double communicationScore;

    private Integer totalQuestions;
    private Integer answeredQuestions;

    private String status; // STARTED | IN_PROGRESS | COMPLETED

    @Column(columnDefinition = "TEXT")
    private String violations;

    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @ToString.Exclude @EqualsAndHashCode.Exclude
    private List<Answer> answers;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
