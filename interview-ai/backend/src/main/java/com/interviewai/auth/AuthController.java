package com.interviewai.auth;

import com.interviewai.user.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final VerificationService verificationService;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authManager;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        userService.register(req);
        return ResponseEntity.status(201).body(
            Map.of("message", "Account created! You can now sign in."));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        try {
            authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email(), req.password()));
        } catch (DisabledException e) {
            throw new RuntimeException("Please verify your email before logging in.");
        } catch (BadCredentialsException e) {
            throw new RuntimeException("Invalid email or password.");
        }
        var user = userService.findByEmail(req.email());
        return ResponseEntity.ok(new AuthResponse(
            jwtUtil.generate(req.email()),
            user.getEmail(), user.getName(), user.isEnabled()));
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verify(@RequestParam String token) {
        verificationService.verify(token);
        return ResponseEntity.ok(Map.of("message", "Email verified! You can now log in."));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resend(@RequestParam String email) {
        var user = userService.findByEmail(email);
        if (user.isEnabled())
            return ResponseEntity.ok(Map.of("message", "Already verified."));
        verificationService.sendVerification(user);
        return ResponseEntity.ok(Map.of("message", "Verification email resent."));
    }
}
