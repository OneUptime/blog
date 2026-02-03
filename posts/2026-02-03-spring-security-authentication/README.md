# How to Use Spring Security for Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Spring, Java, Security, Authentication, Backend, DevOps

Description: A hands-on guide to implementing authentication in Spring Boot applications using Spring Security, covering filter chains, user details, password encoding, and method-level security.

---

Spring Security is the de facto standard for securing Java applications. It handles authentication, authorization, and protection against common attacks out of the box. But its flexibility comes with complexity - there are multiple ways to configure everything, and the documentation assumes you already know what you want.

This guide walks through building authentication from scratch. We will start with the security filter chain, add user authentication, configure different login mechanisms, and lock down specific methods. By the end, you will have a working security setup that you can adapt to your needs.

## How Spring Security Works

Before writing any code, you need to understand the request flow. Spring Security intercepts every HTTP request through a chain of filters. Each filter handles a specific security concern - one extracts credentials, another checks them, another handles exceptions.

```mermaid
flowchart LR
    REQ[HTTP Request] --> FC[Security Filter Chain]
    FC --> AF[Authentication Filter]
    AF --> AM[Authentication Manager]
    AM --> AP[Authentication Provider]
    AP --> UDS[UserDetailsService]
    UDS --> DB[(User Database)]
    AP --> PE[Password Encoder]
    AP -->|Success| SC[Security Context]
    SC --> CTRL[Your Controller]
```

The key components:

- **Security Filter Chain**: The pipeline of security filters applied to requests
- **Authentication Filter**: Extracts credentials from the request (form data, HTTP headers, etc.)
- **Authentication Manager**: Coordinates the authentication process
- **Authentication Provider**: Actually validates credentials against a user store
- **UserDetailsService**: Loads user data from your database or other source
- **Password Encoder**: Hashes and verifies passwords
- **Security Context**: Holds the authenticated user for the current request

## Basic Setup

Add the Spring Security starter to your project. This automatically secures all endpoints with HTTP Basic auth and generates a random password at startup.

```xml
<!-- Maven dependency for Spring Security -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

Or with Gradle:

```groovy
// Gradle dependency for Spring Security
implementation 'org.springframework.boot:spring-boot-starter-security'
```

With just this dependency, Spring Boot auto-configures basic security. Every endpoint requires authentication, and you get a default user called "user" with a password printed to the console.

## Configuring the Security Filter Chain

The modern way to configure Spring Security is through a `SecurityFilterChain` bean. This replaced the older `WebSecurityConfigurerAdapter` approach.

```java
package com.example.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // Define which URLs require authentication and which are public
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Configure URL-based authorization
            .authorizeHttpRequests(auth -> auth
                // Public endpoints - no authentication required
                .requestMatchers("/", "/home", "/public/**").permitAll()
                // Health checks should be accessible
                .requestMatchers("/actuator/health").permitAll()
                // Admin endpoints require ADMIN role
                .requestMatchers("/admin/**").hasRole("ADMIN")
                // API endpoints require authentication
                .requestMatchers("/api/**").authenticated()
                // Everything else requires authentication
                .anyRequest().authenticated()
            )
            // Enable form-based login
            .formLogin(form -> form
                .loginPage("/login")
                .loginProcessingUrl("/perform_login")
                .defaultSuccessUrl("/dashboard", true)
                .failureUrl("/login?error=true")
                .permitAll()
            )
            // Enable logout
            .logout(logout -> logout
                .logoutUrl("/perform_logout")
                .logoutSuccessUrl("/login?logout=true")
                .deleteCookies("JSESSIONID")
                .permitAll()
            );

        return http.build();
    }
}
```

The `authorizeHttpRequests` method defines access rules. Rules are evaluated in order, so put specific patterns before general ones. The first matching rule wins.

## Implementing UserDetailsService

Spring Security needs to load user information from somewhere. The `UserDetailsService` interface has one method: `loadUserByUsername`. You implement it to fetch users from your database.

```java
package com.example.security;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Spring Security calls this method during authentication
    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {

        // Find user in your database
        AppUser appUser = userRepository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException(
                "User not found: " + username
            ));

        // Convert your user entity to Spring Security's UserDetails
        return User.builder()
            .username(appUser.getUsername())
            .password(appUser.getPasswordHash())
            .roles(appUser.getRoles().toArray(new String[0]))
            .accountExpired(!appUser.isActive())
            .accountLocked(appUser.isLocked())
            .credentialsExpired(false)
            .disabled(!appUser.isEnabled())
            .build();
    }
}
```

Your user entity might look different, but the pattern is the same: load from database, convert to `UserDetails`.

```java
package com.example.model;

import jakarta.persistence.*;
import java.util.Set;

@Entity
@Table(name = "users")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String email;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles",
                     joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    private Set<String> roles;

    private boolean active = true;
    private boolean locked = false;
    private boolean enabled = true;

    // Getters and setters omitted for brevity
    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public String getEmail() { return email; }
    public Set<String> getRoles() { return roles; }
    public boolean isActive() { return active; }
    public boolean isLocked() { return locked; }
    public boolean isEnabled() { return enabled; }
}
```

## Password Encoding

Never store passwords in plain text. Spring Security requires a `PasswordEncoder` bean for hashing passwords during registration and verifying them during login.

BCrypt is the recommended choice. It automatically handles salting and has a configurable work factor.

```java
package com.example.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class PasswordConfig {

    // BCrypt is the recommended password encoder
    // The strength parameter (12) controls computational cost
    // Higher values are more secure but slower
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
```

Use the encoder when creating new users:

```java
package com.example.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public AppUser createUser(String username, String rawPassword,
                              String email, Set<String> roles) {

        // Check if username already exists
        if (userRepository.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("Username already taken");
        }

        AppUser user = new AppUser();
        user.setUsername(username);
        // Hash the password before storing
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setEmail(email);
        user.setRoles(roles);
        user.setActive(true);
        user.setEnabled(true);

        return userRepository.save(user);
    }
}
```

## Form Login Configuration

Form login is the classic username/password form. Spring Security can generate a default login page, or you can provide your own.

```java
// Full form login configuration with all options
.formLogin(form -> form
    // Custom login page URL - you need to create this controller/view
    .loginPage("/login")
    // URL where the form POSTs credentials
    .loginProcessingUrl("/perform_login")
    // Form field names if different from defaults
    .usernameParameter("email")
    .passwordParameter("pass")
    // Where to go after successful login
    .defaultSuccessUrl("/dashboard")
    // Force redirect to defaultSuccessUrl even if user requested another page
    .defaultSuccessUrl("/dashboard", true)
    // Custom success handler for more control
    .successHandler((request, response, authentication) -> {
        // Log the login, update last-login timestamp, etc.
        response.sendRedirect("/dashboard");
    })
    // Where to go after failed login
    .failureUrl("/login?error=true")
    // Custom failure handler
    .failureHandler((request, response, exception) -> {
        // Log failed attempt, implement lockout logic, etc.
        response.sendRedirect("/login?error=" + exception.getMessage());
    })
    // Allow everyone to see the login page
    .permitAll()
)
```

A simple Thymeleaf login template:

```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<head>
    <title>Login</title>
</head>
<body>
    <h1>Login</h1>

    <!-- Show error message if login failed -->
    <div th:if="${param.error}" style="color: red;">
        Invalid username or password
    </div>

    <!-- Show logout message -->
    <div th:if="${param.logout}" style="color: green;">
        You have been logged out
    </div>

    <!-- Login form - posts to loginProcessingUrl -->
    <form th:action="@{/perform_login}" method="post">
        <div>
            <label>Username:</label>
            <input type="text" name="username" required />
        </div>
        <div>
            <label>Password:</label>
            <input type="password" name="password" required />
        </div>
        <div>
            <input type="checkbox" name="remember-me" />
            <label>Remember me</label>
        </div>
        <button type="submit">Login</button>
    </form>
</body>
</html>
```

## HTTP Basic Authentication

HTTP Basic is simpler than form login. The browser prompts for credentials, which are sent in the Authorization header. It is commonly used for APIs and machine-to-machine communication.

```java
@Bean
public SecurityFilterChain apiFilterChain(HttpSecurity http) throws Exception {
    http
        // Only apply to /api/** paths
        .securityMatcher("/api/**")
        .authorizeHttpRequests(auth -> auth
            .anyRequest().authenticated()
        )
        // Enable HTTP Basic authentication
        .httpBasic(basic -> basic
            // Custom realm name shown in browser prompt
            .realmName("MyApp API")
            // Custom entry point for unauthorized requests
            .authenticationEntryPoint((request, response, authException) -> {
                response.setHeader("WWW-Authenticate", "Basic realm=\"MyApp API\"");
                response.setStatus(401);
                response.getWriter().write("{\"error\": \"Unauthorized\"}");
            })
        )
        // Disable CSRF for stateless API
        .csrf(csrf -> csrf.disable())
        // Make sessions stateless for API
        .sessionManagement(session -> session
            .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
        );

    return http.build();
}
```

Testing with curl:

```bash
# Send credentials with the request
curl -u username:password https://api.example.com/api/users

# Or encode credentials manually (base64 of "username:password")
curl -H "Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=" https://api.example.com/api/users
```

## Multiple Security Filter Chains

You can define multiple filter chains for different URL patterns. Spring uses the `@Order` annotation to determine which chain handles a request first.

```mermaid
flowchart TD
    REQ[Incoming Request] --> CHECK{URL Pattern?}
    CHECK -->|/api/**| API[API Filter Chain]
    CHECK -->|Everything else| WEB[Web Filter Chain]
    API --> BASIC[HTTP Basic Auth]
    API --> STATELESS[Stateless Sessions]
    WEB --> FORM[Form Login]
    WEB --> SESSION[Session-based]
```

```java
package com.example.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class MultipleSecurityConfig {

    // API security - checked first due to lower order number
    @Bean
    @Order(1)
    public SecurityFilterChain apiSecurityFilterChain(HttpSecurity http)
            throws Exception {
        http
            .securityMatcher("/api/**")
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .httpBasic(basic -> {})
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            );

        return http.build();
    }

    // Web security - checked second
    @Bean
    @Order(2)
    public SecurityFilterChain webSecurityFilterChain(HttpSecurity http)
            throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/home", "/css/**", "/js/**").permitAll()
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .defaultSuccessUrl("/dashboard")
                .permitAll()
            )
            .logout(logout -> logout
                .logoutSuccessUrl("/login?logout")
                .permitAll()
            );

        return http.build();
    }
}
```

## Method-Level Security

Sometimes URL patterns are not granular enough. Method security lets you annotate individual service methods with access rules.

Enable it in your configuration:

```java
package com.example.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

@Configuration
@EnableMethodSecurity(
    prePostEnabled = true,   // Enable @PreAuthorize and @PostAuthorize
    securedEnabled = true,   // Enable @Secured
    jsr250Enabled = true     // Enable @RolesAllowed
)
public class MethodSecurityConfig {
    // Configuration is automatic with @EnableMethodSecurity
}
```

Now you can secure methods directly:

```java
package com.example.service;

import org.springframework.security.access.annotation.Secured;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.stereotype.Service;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;

    public DocumentService(DocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
    }

    // Only users with ADMIN role can call this
    @Secured("ROLE_ADMIN")
    public void deleteAllDocuments() {
        documentRepository.deleteAll();
    }

    // SpEL expression - user must have ADMIN or MANAGER role
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public Document createDocument(Document document) {
        return documentRepository.save(document);
    }

    // Check that the returned document belongs to the current user
    // Runs after the method executes
    @PostAuthorize("returnObject.owner == authentication.name")
    public Document getDocument(Long id) {
        return documentRepository.findById(id)
            .orElseThrow(() -> new DocumentNotFoundException(id));
    }

    // Access method arguments in the expression
    @PreAuthorize("#document.owner == authentication.name or hasRole('ADMIN')")
    public Document updateDocument(Document document) {
        return documentRepository.save(document);
    }

    // JSR-250 annotation - works the same as @Secured
    @RolesAllowed({"ADMIN", "EDITOR"})
    public void publishDocument(Long documentId) {
        Document doc = documentRepository.findById(documentId).orElseThrow();
        doc.setPublished(true);
        documentRepository.save(doc);
    }
}
```

## Custom Authentication Provider

For complex authentication scenarios - LDAP, external APIs, multi-factor - you can implement your own `AuthenticationProvider`.

```java
package com.example.security;

import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class CustomAuthenticationProvider implements AuthenticationProvider {

    private final CustomUserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptService loginAttemptService;

    public CustomAuthenticationProvider(
            CustomUserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder,
            LoginAttemptService loginAttemptService) {
        this.userDetailsService = userDetailsService;
        this.passwordEncoder = passwordEncoder;
        this.loginAttemptService = loginAttemptService;
    }

    @Override
    public Authentication authenticate(Authentication authentication)
            throws AuthenticationException {

        String username = authentication.getName();
        String password = authentication.getCredentials().toString();

        // Check if account is locked due to too many failed attempts
        if (loginAttemptService.isBlocked(username)) {
            throw new BadCredentialsException(
                "Account temporarily locked due to too many failed attempts"
            );
        }

        // Load user details
        UserDetails user = userDetailsService.loadUserByUsername(username);

        // Verify password
        if (!passwordEncoder.matches(password, user.getPassword())) {
            // Record failed attempt
            loginAttemptService.recordFailedAttempt(username);
            throw new BadCredentialsException("Invalid password");
        }

        // Clear failed attempts on successful login
        loginAttemptService.clearFailedAttempts(username);

        // Return authenticated token with user details and authorities
        return new UsernamePasswordAuthenticationToken(
            user,
            password,
            user.getAuthorities()
        );
    }

    @Override
    public boolean supports(Class<?> authentication) {
        // This provider handles username/password authentication
        return UsernamePasswordAuthenticationToken.class
            .isAssignableFrom(authentication);
    }
}
```

Register the provider in your security configuration:

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CustomAuthenticationProvider authenticationProvider;

    public SecurityConfig(CustomAuthenticationProvider authenticationProvider) {
        this.authenticationProvider = authenticationProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(HttpSecurity http)
            throws Exception {
        AuthenticationManagerBuilder authBuilder =
            http.getSharedObject(AuthenticationManagerBuilder.class);
        authBuilder.authenticationProvider(authenticationProvider);
        return authBuilder.build();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        // ... your filter chain configuration
        return http.build();
    }
}
```

## Accessing the Current User

Once authenticated, you can access the current user in several ways.

```java
package com.example.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {

    // Method 1: Inject Authentication directly
    @GetMapping("/me")
    public String getCurrentUser(Authentication authentication) {
        if (authentication == null) {
            return "Not authenticated";
        }
        return "Hello, " + authentication.getName();
    }

    // Method 2: Use @AuthenticationPrincipal to get UserDetails
    @GetMapping("/profile")
    public UserProfile getProfile(@AuthenticationPrincipal UserDetails userDetails) {
        return new UserProfile(
            userDetails.getUsername(),
            userDetails.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .toList()
        );
    }

    // Method 3: Access SecurityContextHolder directly (useful in services)
    @GetMapping("/audit")
    public String getAuditInfo() {
        Authentication auth = SecurityContextHolder.getContext()
            .getAuthentication();

        if (auth == null || !auth.isAuthenticated()) {
            return "Anonymous";
        }

        return "Authenticated as: " + auth.getName();
    }
}
```

For services where you cannot inject the principal:

```java
@Service
public class AuditService {

    public void logAction(String action) {
        String username = getCurrentUsername();
        // Log the action with the username
        System.out.println(username + " performed: " + action);
    }

    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext()
            .getAuthentication();

        if (auth == null || !auth.isAuthenticated()) {
            return "anonymous";
        }
        return auth.getName();
    }
}
```

## CSRF Protection

Spring Security enables CSRF protection by default for browser clients. This prevents attackers from tricking users into submitting malicious requests.

For forms, include the CSRF token:

```html
<!-- Thymeleaf automatically includes CSRF token -->
<form th:action="@{/transfer}" method="post">
    <input type="hidden" th:name="${_csrf.parameterName}"
           th:value="${_csrf.token}" />
    <!-- form fields -->
</form>
```

For AJAX requests, get the token from cookies or meta tags:

```html
<!-- Include token in meta tags -->
<meta name="_csrf" th:content="${_csrf.token}"/>
<meta name="_csrf_header" th:content="${_csrf.headerName}"/>
```

```javascript
// Include CSRF token in AJAX requests
const csrfToken = document.querySelector('meta[name="_csrf"]').content;
const csrfHeader = document.querySelector('meta[name="_csrf_header"]').content;

fetch('/api/data', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        [csrfHeader]: csrfToken
    },
    body: JSON.stringify(data)
});
```

For stateless APIs using tokens (JWT, etc.), disable CSRF:

```java
http.csrf(csrf -> csrf.disable())
```

## Remember Me Authentication

Remember me allows users to stay logged in across browser sessions by storing a token in a cookie.

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth
            .anyRequest().authenticated()
        )
        .formLogin(form -> form
            .loginPage("/login")
            .permitAll()
        )
        // Enable remember-me with secure token storage
        .rememberMe(remember -> remember
            // Secret key for token generation
            .key("uniqueAndSecretKey")
            // Cookie lifetime: 7 days
            .tokenValiditySeconds(7 * 24 * 60 * 60)
            // Form parameter name for remember-me checkbox
            .rememberMeParameter("remember-me")
            // UserDetailsService to load user when token is presented
            .userDetailsService(userDetailsService)
        );

    return http.build();
}
```

For production, use persistent tokens stored in a database:

```java
@Bean
public PersistentTokenRepository persistentTokenRepository() {
    JdbcTokenRepositoryImpl tokenRepository = new JdbcTokenRepositoryImpl();
    tokenRepository.setDataSource(dataSource);
    // Create table on first run (set to false after)
    // tokenRepository.setCreateTableOnStartup(true);
    return tokenRepository;
}

@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        // ... other config
        .rememberMe(remember -> remember
            .tokenRepository(persistentTokenRepository())
            .tokenValiditySeconds(7 * 24 * 60 * 60)
            .userDetailsService(userDetailsService)
        );

    return http.build();
}
```

## Testing Security Configuration

Test your security rules with Spring Security's test support.

```java
package com.example.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void publicEndpointShouldBeAccessible() throws Exception {
        mockMvc.perform(get("/public/info"))
            .andExpect(status().isOk());
    }

    @Test
    void protectedEndpointShouldRequireAuth() throws Exception {
        mockMvc.perform(get("/api/users"))
            .andExpect(status().isUnauthorized());
    }

    // Use @WithMockUser to simulate an authenticated user
    @Test
    @WithMockUser(username = "testuser", roles = "USER")
    void authenticatedUserCanAccessProtectedEndpoint() throws Exception {
        mockMvc.perform(get("/api/users"))
            .andExpect(status().isOk());
    }

    // Test role-based access
    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void adminCanAccessAdminEndpoint() throws Exception {
        mockMvc.perform(get("/admin/settings"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "user", roles = "USER")
    void regularUserCannotAccessAdminEndpoint() throws Exception {
        mockMvc.perform(get("/admin/settings"))
            .andExpect(status().isForbidden());
    }

    // Test form login
    @Test
    void loginWithValidCredentials() throws Exception {
        mockMvc.perform(post("/perform_login")
                .with(csrf())
                .param("username", "testuser")
                .param("password", "password"))
            .andExpect(status().is3xxRedirection())
            .andExpect(redirectedUrl("/dashboard"));
    }

    // Test HTTP Basic auth
    @Test
    void apiWithBasicAuth() throws Exception {
        mockMvc.perform(get("/api/data")
                .with(httpBasic("apiuser", "apipassword")))
            .andExpect(status().isOk());
    }
}
```

## Common Security Headers

Spring Security adds several security headers by default. You can customize them:

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        // Configure security headers
        .headers(headers -> headers
            // Prevent clickjacking
            .frameOptions(frame -> frame.deny())
            // Prevent MIME type sniffing
            .contentTypeOptions(content -> {})
            // Enable XSS filter
            .xssProtection(xss -> xss.disable()) // Modern browsers handle this
            // HTTP Strict Transport Security
            .httpStrictTransportSecurity(hsts -> hsts
                .maxAgeInSeconds(31536000)
                .includeSubDomains(true)
            )
            // Content Security Policy
            .contentSecurityPolicy(csp -> csp
                .policyDirectives("default-src 'self'; script-src 'self'")
            )
        );

    return http.build();
}
```

## Summary

| Component | Purpose |
|-----------|---------|
| SecurityFilterChain | Defines URL-based security rules |
| UserDetailsService | Loads user data from your store |
| PasswordEncoder | Hashes passwords (use BCrypt) |
| Form Login | Traditional username/password forms |
| HTTP Basic | Simple header-based auth for APIs |
| Method Security | Annotations for fine-grained access control |
| AuthenticationProvider | Custom authentication logic |
| CSRF Protection | Prevents cross-site request forgery |
| Remember Me | Persistent login across sessions |

Spring Security has a steep learning curve, but once you understand the filter chain model, everything clicks into place. Start with the basic SecurityFilterChain configuration, add UserDetailsService for your user store, and enable password encoding. Then layer on form login or HTTP Basic depending on your needs. Use method security when URL patterns are not enough.

The security model is composable - you can have multiple filter chains for different parts of your application, each with its own authentication mechanism. An API can use stateless HTTP Basic while the web interface uses sessions and form login. They share the same UserDetailsService and password encoder.

One final note: security configuration that works in development may fail in production behind a load balancer or proxy. Watch out for redirect URLs, cookie settings, and HTTPS enforcement. Test your security configuration in an environment that matches production as closely as possible.
