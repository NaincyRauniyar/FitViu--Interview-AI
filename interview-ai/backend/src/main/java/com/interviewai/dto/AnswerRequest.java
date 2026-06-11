package com.interviewai.dto;
import jakarta.validation.constraints.NotBlank;
public record AnswerRequest(
    @NotBlank String question,
    @NotBlank String answer,
    String category,
    String role
) {}
