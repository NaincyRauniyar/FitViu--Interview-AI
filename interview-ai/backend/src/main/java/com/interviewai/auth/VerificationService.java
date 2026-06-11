package com.interviewai.auth;

import com.interviewai.user.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VerificationService {

    private final VerificationTokenRepository tokenRepo;
    private final UserRepository userRepo;
    private final EmailService emailService;

    @Transactional
    public void sendVerification(User user) {
        tokenRepo.deleteByUser_Email(user.getEmail());
        String t = UUID.randomUUID().toString();
        tokenRepo.save(VerificationToken.builder()
            .token(t).user(user)
            .expiresAt(LocalDateTime.now().plusHours(24))
            .build());
        emailService.sendVerificationEmail(user.getEmail(), t, user.getName());
    }

    @Transactional
    public void verify(String tokenStr) {
        VerificationToken vt = tokenRepo.findByToken(tokenStr)
            .orElseThrow(() -> new RuntimeException("Invalid or already used verification link"));
        if (vt.isExpired())
            throw new RuntimeException("Link expired. Request a new one.");
        User u = vt.getUser();
        u.setEnabled(true);
        u.setEmailVerifiedAt(LocalDateTime.now());
        userRepo.save(u);
        tokenRepo.delete(vt);
    }
}
