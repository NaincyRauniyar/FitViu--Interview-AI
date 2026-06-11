package com.interviewai.dto;
import java.time.LocalDateTime;
public record ErrorResponse(String message, int status, String path, LocalDateTime timestamp) {}
