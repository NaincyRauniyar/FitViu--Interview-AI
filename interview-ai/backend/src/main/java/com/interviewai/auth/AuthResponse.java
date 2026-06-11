package com.interviewai.auth;

public record AuthResponse(
    String token,
    String email,
    String name,
    boolean emailVerified
) {}
