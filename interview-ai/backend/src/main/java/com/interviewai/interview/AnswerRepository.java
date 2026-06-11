package com.interviewai.interview;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AnswerRepository extends JpaRepository<Answer, Long> {
    List<Answer> findBySessionIdOrderByAnsweredAtAsc(Long sessionId);
}
