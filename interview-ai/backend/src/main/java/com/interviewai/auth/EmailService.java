package com.interviewai.auth;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.*;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${app.mail.from}")
    private String fromEmail;

    public void sendVerificationEmail(String toEmail, String token, String name) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(msg, true, "UTF-8");
            h.setFrom(fromEmail);
            h.setTo(toEmail);
            h.setSubject("Verify your Interview AI account");
            h.setText(buildHtml(name, token), true);
            mailSender.send(msg);
            log.info("Verification email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Email send failed for {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send verification email");
        }
    }

    private String buildHtml(String name, String token) {
        String link = frontendUrl + "/verify-email?token=" + token;
        return """
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
              <h2 style="color:#4f46e5;margin-bottom:8px">Verify your email</h2>
              <p style="color:#374151;margin-bottom:24px">
                Hi %s, thanks for signing up to Interview AI.<br>
                Click the button below to verify your email address.
                This link expires in 24 hours.
              </p>
              <a href="%s"
                style="display:inline-block;padding:12px 28px;background:#4f46e5;
                       color:#fff;border-radius:8px;text-decoration:none;
                       font-weight:500;font-size:15px">
                Verify my email
              </a>
              <p style="color:#9ca3af;font-size:12px;margin-top:24px">
                Or copy this link into your browser:<br>%s
              </p>
            </div>
            """.formatted(name, link, link);
    }
}
