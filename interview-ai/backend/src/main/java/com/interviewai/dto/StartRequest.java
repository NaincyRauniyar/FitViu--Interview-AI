package com.interviewai.dto;
import jakarta.validation.constraints.NotBlank;
public record StartRequest(
    @NotBlank(message = "Resume text is required") String resumeText,
    Object structured
) {}
