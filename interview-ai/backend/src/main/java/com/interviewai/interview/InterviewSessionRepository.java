package com.interviewai.interview;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InterviewSessionRepository extends JpaRepository<InterviewSession, Long> {
    List<InterviewSession> findByUserEmailOrderByCreatedAtDesc(String email);
    Optional<InterviewSession> findByIdAndUserEmail(Long id, String email);
}
