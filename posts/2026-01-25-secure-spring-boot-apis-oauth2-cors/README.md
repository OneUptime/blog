# How to Secure Spring Boot APIs with OAuth2 and CORS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, OAuth2, CORS, Security

Description: A practical guide to securing your Spring Boot REST APIs using OAuth2 for authentication and properly configuring CORS for cross-origin requests.

---

If you're building REST APIs with Spring Boot, security should be at the top of your priority list. Two of the most common security concerns are authentication (who is making the request?) and cross-origin resource sharing (where is the request coming from?). In this post, I'll walk you through implementing OAuth2 and CORS in a Spring Boot application with practical code examples.

## Why OAuth2 and CORS Matter

OAuth2 has become the standard for API authentication. Rather than passing usernames and passwords with every request, clients obtain tokens that represent their authorization to access specific resources. This approach is more secure and more flexible than basic authentication.

CORS, on the other hand, is a browser security feature that blocks web pages from making requests to domains different from the one that served the page. While this protects users from malicious scripts, it also blocks legitimate requests from your frontend to your API if they're hosted on different domains. Proper CORS configuration lets you whitelist trusted origins.

## Setting Up the Project

First, add the required dependencies to your `pom.xml`:

```xml
<dependencies>
    <!-- Spring Boot Starter Web -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- OAuth2 Resource Server -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
    </dependency>

    <!-- Spring Security -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
</dependencies>
```

## Configuring OAuth2 Resource Server

Your Spring Boot API will act as a resource server that validates JWT tokens. Configure the issuer URI in `application.yml`:

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          # Replace with your OAuth2 provider's issuer URI
          issuer-uri: https://your-auth-server.com/oauth2
          # Alternatively, specify the JWK Set URI directly
          # jwk-set-uri: https://your-auth-server.com/.well-known/jwks.json
```

This tells Spring Security where to fetch the public keys needed to validate incoming JWT tokens.

## Creating the Security Configuration

Now let's create a security configuration class that ties everything together:

```java
package com.example.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity  // Enables @PreAuthorize annotations
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Enable CORS with our custom configuration
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // Disable CSRF - not needed for stateless APIs
            .csrf(csrf -> csrf.disable())

            // Set session management to stateless
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Configure endpoint authorization
            .authorizeHttpRequests(auth -> auth
                // Public endpoints that don't require authentication
                .requestMatchers("/api/public/**", "/health", "/actuator/health").permitAll()
                // All other endpoints require authentication
                .anyRequest().authenticated())

            // Configure OAuth2 resource server with JWT validation
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {}));

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Specify allowed origins - never use "*" in production with credentials
        configuration.setAllowedOrigins(Arrays.asList(
            "https://your-frontend.com",
            "https://admin.your-frontend.com"
        ));

        // For development, you might want to allow localhost
        // configuration.setAllowedOrigins(List.of("http://localhost:3000"));

        // Allowed HTTP methods
        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
        ));

        // Allowed headers in requests
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "Accept",
            "Origin"
        ));

        // Headers exposed to the client
        configuration.setExposedHeaders(List.of(
            "X-Total-Count",
            "X-Page-Number"
        ));

        // Allow credentials (cookies, authorization headers)
        configuration.setAllowCredentials(true);

        // How long the browser should cache preflight response (1 hour)
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Apply this configuration to all paths
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
```

## Adding Custom JWT Claims Extraction

Often you'll need to extract custom claims from JWT tokens, such as user roles or tenant IDs. Create a custom converter:

```java
package com.example.api.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class CustomJwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = extractAuthorities(jwt);
        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }

    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        // Extract roles from the "roles" claim in your JWT
        List<String> roles = jwt.getClaimAsStringList("roles");

        if (roles == null) {
            return Collections.emptyList();
        }

        return roles.stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
            .collect(Collectors.toList());
    }
}
```

Then update your security configuration to use this converter:

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http,
        CustomJwtConverter jwtConverter) throws Exception {
    http
        // ... other configuration ...
        .oauth2ResourceServer(oauth2 -> oauth2
            .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtConverter)));

    return http.build();
}
```

## Protecting Endpoints with Method Security

With `@EnableMethodSecurity` enabled, you can protect individual methods using annotations:

```java
package com.example.api.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping("/me")
    public UserProfile getCurrentUser(@AuthenticationPrincipal Jwt jwt) {
        // Extract user info from the JWT
        String userId = jwt.getSubject();
        String email = jwt.getClaimAsString("email");

        return new UserProfile(userId, email);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")  // Only users with ADMIN role
    public List<UserProfile> getAllUsers() {
        // This endpoint requires ADMIN role
        return userService.findAll();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.name")
    public void deleteUser(@PathVariable String id) {
        // Admins can delete any user
        // Regular users can only delete themselves
        userService.delete(id);
    }
}
```

## Handling CORS Preflight Requests

Browsers send OPTIONS requests (preflight) before actual requests to check if the server allows the cross-origin request. Spring handles this automatically with our CORS configuration, but make sure your security config allows OPTIONS requests:

```java
.authorizeHttpRequests(auth -> auth
    // Allow preflight requests without authentication
    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
    .requestMatchers("/api/public/**").permitAll()
    .anyRequest().authenticated())
```

## Testing Your Configuration

Here's a simple test to verify your security setup works:

```java
@SpringBootTest
@AutoConfigureMockMvc
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void publicEndpointShouldBeAccessible() throws Exception {
        mockMvc.perform(get("/api/public/status"))
            .andExpect(status().isOk());
    }

    @Test
    void protectedEndpointShouldRequireAuth() throws Exception {
        mockMvc.perform(get("/api/users/me"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    void protectedEndpointShouldWorkWithAuth() throws Exception {
        mockMvc.perform(get("/api/users/me"))
            .andExpect(status().isOk());
    }

    @Test
    void corsHeadersShouldBePresent() throws Exception {
        mockMvc.perform(options("/api/users")
                .header("Origin", "https://your-frontend.com")
                .header("Access-Control-Request-Method", "GET"))
            .andExpect(status().isOk())
            .andExpect(header().exists("Access-Control-Allow-Origin"));
    }
}
```

## Common Pitfalls to Avoid

**1. Using wildcard origins with credentials.** If you set `allowCredentials(true)`, you cannot use `"*"` for allowed origins. Always specify exact origins.

**2. Forgetting to handle preflight requests.** If your OPTIONS requests return 401, the actual request will never be sent.

**3. Token validation failures.** Make sure your issuer URI matches exactly what's in the token's `iss` claim. A trailing slash difference will cause validation to fail.

**4. Missing scopes vs roles.** OAuth2 typically uses scopes, but many identity providers also support custom claims for roles. Know which your provider uses.

## Wrapping Up

Securing Spring Boot APIs requires attention to both authentication and cross-origin concerns. OAuth2 provides a robust, industry-standard way to handle authentication, while proper CORS configuration ensures your API is accessible from legitimate clients without opening it up to malicious requests.

The configuration shown here works well for most production scenarios, but always review it against your specific security requirements. Consider adding rate limiting, input validation, and audit logging as additional security layers.

Start with the most restrictive settings possible and only open things up as needed. Your users will thank you for keeping their data safe.
