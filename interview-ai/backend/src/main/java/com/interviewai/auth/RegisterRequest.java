package com.interviewai.auth;

import jakarta.validation.constraints.*;

public record RegisterRequest(
    @NotBlank(message = "Name is required") String name,
    @Email(message = "Valid email required") @NotBlank String email,
    @Size(min = 8, message = "Password must be at least 8 characters") @NotBlank String password
) {}
