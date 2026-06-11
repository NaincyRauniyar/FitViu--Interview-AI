package com.interviewai.user;

import com.interviewai.auth.RegisterRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository repo;
    private final PasswordEncoder encoder;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User u = repo.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
        return org.springframework.security.core.userdetails.User
            .withUsername(u.getEmail())
            .password(u.getPassword())
            .authorities("ROLE_USER")
            .disabled(!u.isEnabled())
            .build();
    }

    public User register(RegisterRequest req) {
        if (repo.existsByEmail(req.email()))
            throw new RuntimeException("Email already registered");
        return repo.save(User.builder()
            .name(req.name())
            .email(req.email())
            .password(encoder.encode(req.password()))
            .enabled(false)
            .build());
    }

    public User findByEmail(String email) {
        return repo.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }
}
