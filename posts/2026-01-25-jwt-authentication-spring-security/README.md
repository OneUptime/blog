# How to Implement JWT Authentication with Spring Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Security, JWT, Authentication, Security

Description: A practical guide to implementing JSON Web Token authentication in Spring Boot applications using Spring Security 6, covering token generation, validation, and securing REST endpoints.

---

> JWT authentication has become the standard for securing REST APIs. Unlike session-based auth, JWTs are stateless and work well in distributed systems. This guide walks you through implementing JWT authentication in Spring Boot from scratch.

If you have built REST APIs with Spring Boot, you have probably wondered about the best way to secure them. Spring Security is powerful but notoriously complex. Adding JWT on top can feel overwhelming. This guide cuts through the noise and gives you a working implementation you can adapt for your projects.

---

## Why JWT for REST APIs?

Before diving into code, let's understand why JWTs work well for APIs:

| Feature | Session-Based | JWT-Based |
|---------|--------------|-----------|
| **State** | Server stores session | Stateless - token contains claims |
| **Scalability** | Requires session sharing | Each server validates independently |
| **Mobile-friendly** | Cookie issues on mobile | Works anywhere |
| **Cross-domain** | CORS complications | Easy cross-domain auth |

JWTs carry their own payload (claims) and signature. The server does not need to look up anything in a database to validate the token - it just verifies the signature.

---

## Project Setup

Start with a Spring Boot project. You will need these dependencies in your `pom.xml`:

```xml
<!-- pom.xml -->
<dependencies>
    <!-- Spring Boot Starter Web -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Spring Security -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>

    <!-- JWT library - jjwt is widely used and well-maintained -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.12.3</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.12.3</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.12.3</version>
        <scope>runtime</scope>
    </dependency>

    <!-- Lombok to reduce boilerplate -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

Add your JWT configuration to `application.yml`:

```yaml
# application.yml
jwt:
  secret: your-256-bit-secret-key-here-make-it-long-and-random
  expiration: 86400000  # 24 hours in milliseconds
```

---

## JWT Service Implementation

The JWT service handles token creation and validation. This is where the core JWT logic lives.

```java
// JwtService.java
package com.example.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    // Extract username from token - this is the subject claim
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    // Generic method to extract any claim from the token
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    // Generate token with just the user details
    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    // Generate token with extra claims (roles, permissions, etc.)
    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSigningKey())
                .compact();
    }

    // Validate token - check username matches and token is not expired
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    // Check if token has expired
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    // Extract expiration date from token
    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    // Parse the token and extract all claims
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // Create the signing key from the secret
    private SecretKey getSigningKey() {
        // For production, use a properly generated key
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }
}
```

---

## JWT Authentication Filter

The filter intercepts every request and checks for a valid JWT in the Authorization header. If found, it sets up the security context so Spring Security knows the user is authenticated.

```java
// JwtAuthenticationFilter.java
package com.example.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        // Get the Authorization header
        final String authHeader = request.getHeader("Authorization");

        // JWT tokens are sent as "Bearer <token>"
        // If header is missing or does not start with Bearer, skip this filter
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Extract the token (everything after "Bearer ")
        final String jwt = authHeader.substring(7);
        final String username = jwtService.extractUsername(jwt);

        // If we have a username and no authentication exists yet
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            // Load user details from database
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

            // Validate the token
            if (jwtService.isTokenValid(jwt, userDetails)) {
                // Create authentication token
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,  // No credentials needed - JWT already validated
                        userDetails.getAuthorities()
                );

                // Attach request details
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // Set the authentication in the security context
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        // Continue the filter chain
        filterChain.doFilter(request, response);
    }
}
```

---

## Security Configuration

Spring Security 6 uses a builder pattern for configuration. This setup disables sessions (since we are using JWTs), permits access to auth endpoints, and requires authentication for everything else.

```java
// SecurityConfig.java
package com.example.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF - not needed for stateless JWT auth
            .csrf(csrf -> csrf.disable())

            // Configure authorization rules
            .authorizeHttpRequests(auth -> auth
                // Public endpoints - no auth required
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                // Everything else requires authentication
                .anyRequest().authenticated()
            )

            // Stateless session - no server-side session storage
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            // Use our custom authentication provider
            .authenticationProvider(authenticationProvider())

            // Add JWT filter before the standard authentication filter
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

---

## Authentication Controller

The controller provides endpoints for registration and login. On successful login, it returns a JWT that the client stores and sends with future requests.

```java
// AuthController.java
package com.example.controller;

import com.example.dto.AuthRequest;
import com.example.dto.AuthResponse;
import com.example.dto.RegisterRequest;
import com.example.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        // Register new user and return JWT
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> authenticate(@RequestBody AuthRequest request) {
        // Authenticate and return JWT
        return ResponseEntity.ok(authService.authenticate(request));
    }
}
```

The authentication service handles the business logic:

```java
// AuthService.java
package com.example.service;

import com.example.dto.AuthRequest;
import com.example.dto.AuthResponse;
import com.example.dto.RegisterRequest;
import com.example.model.User;
import com.example.repository.UserRepository;
import com.example.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request) {
        // Create new user with encoded password
        var user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role("USER")
                .build();

        // Save to database
        userRepository.save(user);

        // Generate JWT for immediate login after registration
        var jwt = jwtService.generateToken(user);

        return AuthResponse.builder()
                .token(jwt)
                .build();
    }

    public AuthResponse authenticate(AuthRequest request) {
        // Let Spring Security validate credentials
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        // If we get here, credentials are valid
        var user = userRepository.findByUsername(request.getUsername())
                .orElseThrow();

        // Generate and return JWT
        var jwt = jwtService.generateToken(user);

        return AuthResponse.builder()
                .token(jwt)
                .build();
    }
}
```

---

## Testing the Implementation

Once everything is wired up, test the flow:

```bash
# Register a new user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"secret123"}'

# Response: {"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}

# Login with existing user
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"secret123"}'

# Access protected endpoint with JWT
curl http://localhost:8080/api/protected/resource \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Security Best Practices

A few things to keep in mind for production:

1. **Use strong secrets** - Your JWT secret should be at least 256 bits of random data. Never hardcode it in source files.

2. **Set reasonable expiration** - Short-lived tokens (15-60 minutes) with refresh tokens are safer than long-lived tokens.

3. **Validate all claims** - Check issuer, audience, and expiration. Do not just verify the signature.

4. **Use HTTPS** - JWTs are not encrypted. Anyone who intercepts the token can read its contents and impersonate the user.

5. **Handle token revocation** - If you need to invalidate tokens before expiry, maintain a blacklist or use short expiration with refresh tokens.

---

## Conclusion

JWT authentication with Spring Security takes some setup, but the result is a clean, stateless authentication system that scales well. The key components are the JWT service for token operations, the authentication filter for request interception, and proper security configuration to tie it all together.

This implementation gives you a solid foundation. From here, you might add refresh tokens, role-based access control, or integrate with OAuth2 providers.

---

*Building secure APIs? [OneUptime](https://oneuptime.com) helps you monitor your authentication endpoints and catch issues before your users do.*

**Related Reading:**
- [How to Secure FastAPI Applications Against OWASP Top 10](https://oneuptime.com/blog/post/2025-01-06-fastapi-owasp-security/view)
- [SRE Best Practices for Authentication Systems](https://oneuptime.com/blog/post/2025-11-28-sre-best-practices/view)
