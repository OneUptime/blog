# How to Secure Microservices as OAuth2 Resource Servers in Spring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Security, OAuth2, Microservices, Security

Description: Learn how to configure Spring Boot microservices as OAuth2 resource servers to validate JWT tokens, enforce scopes, and implement fine-grained access control across your distributed architecture.

---

When building microservices, every service needs to verify that incoming requests are authorized. Rather than having each service manage its own authentication, OAuth2 resource servers let you delegate token validation to a central authorization server while keeping authorization decisions local. This guide walks through implementing OAuth2 resource server security in Spring Boot.

---

## Understanding the Resource Server Pattern

In the OAuth2 architecture, a resource server is any service that hosts protected resources and accepts access tokens. The authorization server issues tokens, and your microservices validate them. This separation means your services never handle user credentials directly.

A typical flow looks like this:

1. Client obtains an access token from the authorization server
2. Client sends request to your microservice with the token in the Authorization header
3. Your microservice validates the token and checks permissions
4. If valid, the request proceeds; otherwise, it returns 401 or 403

---

## Setting Up the Dependencies

Start by adding the Spring Security OAuth2 resource server dependency to your project.

For Maven:

```xml
<dependencies>
    <!-- Spring Boot Starter for web applications -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- OAuth2 Resource Server support with JWT validation -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
    </dependency>

    <!-- Core Spring Security features -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
</dependencies>
```

For Gradle:

```groovy
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-oauth2-resource-server'
    implementation 'org.springframework.boot:spring-boot-starter-security'
}
```

---

## Basic Configuration

The simplest configuration requires just one property pointing to your authorization server's JWKS endpoint.

```yaml
# application.yml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          # The JWKS URI where public keys are published for token verification
          jwks-uri: https://auth.example.com/.well-known/jwks.json
```

With this configuration, Spring Security will automatically:

- Download the public keys from the JWKS endpoint
- Validate the JWT signature on every request
- Extract claims and populate the security context

---

## Custom Security Configuration

For most real applications, you need more control over security rules. Create a security configuration class to define which endpoints require authentication and what permissions they need.

```java
// SecurityConfig.java
package com.example.orderservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity  // Enables @PreAuthorize annotations on methods
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF since we're using stateless JWT authentication
            .csrf(csrf -> csrf.disable())

            // No sessions - each request must include a valid token
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Define authorization rules for different endpoints
            .authorizeHttpRequests(auth -> auth
                // Health checks and metrics should be publicly accessible
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()

                // API documentation doesn't need authentication
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()

                // Read operations require the 'read' scope
                .requestMatchers("GET", "/api/orders/**").hasAuthority("SCOPE_read")

                // Write operations require the 'write' scope
                .requestMatchers("POST", "/api/orders/**").hasAuthority("SCOPE_write")
                .requestMatchers("PUT", "/api/orders/**").hasAuthority("SCOPE_write")
                .requestMatchers("DELETE", "/api/orders/**").hasAuthority("SCOPE_write")

                // Everything else requires authentication
                .anyRequest().authenticated()
            )

            // Configure as OAuth2 resource server with JWT support
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    // Use custom converter for extracting authorities from JWT
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            );

        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        // Custom converter to extract roles and scopes from JWT claims
        JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter =
            new JwtGrantedAuthoritiesConverter();

        // By default, Spring looks for 'scope' or 'scp' claims
        // Customize if your authorization server uses different claim names
        grantedAuthoritiesConverter.setAuthoritiesClaimName("scope");
        grantedAuthoritiesConverter.setAuthorityPrefix("SCOPE_");

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(grantedAuthoritiesConverter);
        return converter;
    }
}
```

---

## Extracting Custom Claims from JWT

Most authorization servers include custom claims like user roles, tenant IDs, or other metadata. Here's how to create a converter that extracts both scopes and custom roles.

```java
// CustomJwtAuthenticationConverter.java
package com.example.orderservice.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class CustomJwtAuthenticationConverter
        implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        // Extract all authorities from different JWT claims
        Collection<GrantedAuthority> authorities = extractAuthorities(jwt);

        // Get the principal name from the 'sub' claim
        String principalName = jwt.getSubject();

        return new JwtAuthenticationToken(jwt, authorities, principalName);
    }

    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        List<GrantedAuthority> authorities = new ArrayList<>();

        // Extract OAuth2 scopes (standard claim)
        authorities.addAll(extractScopes(jwt));

        // Extract custom roles claim (specific to your authorization server)
        authorities.addAll(extractRoles(jwt));

        return authorities;
    }

    private List<GrantedAuthority> extractScopes(Jwt jwt) {
        // Handle 'scope' claim which can be space-delimited string or array
        Object scopeClaim = jwt.getClaim("scope");

        if (scopeClaim == null) {
            return List.of();
        }

        List<String> scopes;
        if (scopeClaim instanceof String) {
            // Space-delimited string: "read write profile"
            scopes = List.of(((String) scopeClaim).split(" "));
        } else if (scopeClaim instanceof Collection) {
            // Array format: ["read", "write", "profile"]
            scopes = new ArrayList<>((Collection<String>) scopeClaim);
        } else {
            return List.of();
        }

        return scopes.stream()
            .map(scope -> new SimpleGrantedAuthority("SCOPE_" + scope))
            .collect(Collectors.toList());
    }

    private List<GrantedAuthority> extractRoles(Jwt jwt) {
        // Extract roles from custom claim - adjust claim name for your provider
        // Keycloak uses 'realm_access.roles', Auth0 uses custom namespace
        Object rolesClaim = jwt.getClaim("roles");

        if (rolesClaim == null) {
            // Try nested claim structure (common in Keycloak)
            Object realmAccess = jwt.getClaim("realm_access");
            if (realmAccess instanceof java.util.Map) {
                rolesClaim = ((java.util.Map<?, ?>) realmAccess).get("roles");
            }
        }

        if (!(rolesClaim instanceof Collection)) {
            return List.of();
        }

        return ((Collection<?>) rolesClaim).stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toString().toUpperCase()))
            .collect(Collectors.toList());
    }
}
```

---

## Method-Level Security

For fine-grained access control, use method-level security annotations. This approach is cleaner than defining all rules in the security configuration.

```java
// OrderController.java
package com.example.orderservice.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // Requires the 'read' scope to list orders
    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_read')")
    public List<Order> listOrders(@AuthenticationPrincipal Jwt jwt) {
        // Extract user ID from JWT to filter orders
        String userId = jwt.getSubject();
        return orderService.findByUserId(userId);
    }

    // Requires the 'write' scope to create orders
    @PostMapping
    @PreAuthorize("hasAuthority('SCOPE_write')")
    public Order createOrder(
            @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String userId = jwt.getSubject();
        String email = jwt.getClaimAsString("email");

        return orderService.create(request, userId, email);
    }

    // Only admins can delete orders
    @DeleteMapping("/{orderId}")
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteOrder(@PathVariable String orderId) {
        orderService.delete(orderId);
    }

    // Combine multiple conditions with SpEL
    @GetMapping("/{orderId}")
    @PreAuthorize("hasAuthority('SCOPE_read') and " +
                  "(hasRole('ADMIN') or @orderSecurity.isOwner(#orderId, authentication))")
    public Order getOrder(@PathVariable String orderId) {
        return orderService.findById(orderId);
    }
}
```

The custom security expression bean allows for complex authorization logic:

```java
// OrderSecurity.java
package com.example.orderservice.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component("orderSecurity")
public class OrderSecurity {

    private final OrderRepository orderRepository;

    public OrderSecurity(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    // Called from @PreAuthorize to check if the user owns the order
    public boolean isOwner(String orderId, Authentication authentication) {
        if (authentication.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getSubject();
            return orderRepository.findById(orderId)
                .map(order -> order.getUserId().equals(userId))
                .orElse(false);
        }
        return false;
    }
}
```

---

## Validating Token Claims

Beyond signature validation, you often need to verify specific claims like audience, issuer, or custom business rules.

```java
// JwtClaimValidator.java
package com.example.orderservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.*;

import java.util.List;

@Configuration
public class JwtValidationConfig {

    @Bean
    public JwtDecoder jwtDecoder() {
        // Create decoder with your JWKS URI
        NimbusJwtDecoder decoder = NimbusJwtDecoder
            .withJwkSetUri("https://auth.example.com/.well-known/jwks.json")
            .build();

        // Chain multiple validators together
        OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
            // Validate timestamp claims (exp, nbf, iat)
            JwtValidators.createDefault(),

            // Validate issuer matches your authorization server
            new JwtIssuerValidator("https://auth.example.com"),

            // Validate audience includes your service
            audienceValidator(),

            // Custom business validation
            tenantValidator()
        );

        decoder.setJwtValidator(validator);
        return decoder;
    }

    private OAuth2TokenValidator<Jwt> audienceValidator() {
        // Token must be intended for this service
        return token -> {
            List<String> audiences = token.getAudience();
            if (audiences != null && audiences.contains("order-service")) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                new OAuth2Error("invalid_token", "Token not intended for order-service", null)
            );
        };
    }

    private OAuth2TokenValidator<Jwt> tenantValidator() {
        // Custom validation for multi-tenant applications
        return token -> {
            String tenantId = token.getClaimAsString("tenant_id");
            if (tenantId != null && !tenantId.isBlank()) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                new OAuth2Error("invalid_token", "Missing tenant_id claim", null)
            );
        };
    }
}
```

---

## Handling Token Validation Errors

Provide clear error responses when token validation fails. This helps API consumers understand what went wrong.

```java
// SecurityExceptionHandler.java
package com.example.orderservice.config;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class SecurityExceptionHandler {

    @ExceptionHandler(InvalidBearerTokenException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public Map<String, Object> handleInvalidToken(InvalidBearerTokenException ex) {
        return Map.of(
            "error", "invalid_token",
            "message", "The access token is invalid or expired",
            "timestamp", Instant.now().toString()
        );
    }

    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public Map<String, Object> handleAccessDenied(AccessDeniedException ex) {
        return Map.of(
            "error", "insufficient_scope",
            "message", "You do not have permission to access this resource",
            "timestamp", Instant.now().toString()
        );
    }
}
```

---

## Testing Secured Endpoints

Spring Security provides test utilities for simulating authenticated requests.

```java
// OrderControllerTest.java
package com.example.orderservice.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void listOrders_withValidToken_returnsOrders() throws Exception {
        mockMvc.perform(get("/api/orders")
                .with(SecurityMockMvcRequestPostProcessors.jwt()
                    .jwt(jwt -> jwt
                        .subject("user-123")
                        .claim("scope", "read write")
                        .claim("email", "user@example.com"))))
            .andExpect(status().isOk());
    }

    @Test
    void listOrders_withoutToken_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/orders"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteOrder_withoutAdminRole_returnsForbidden() throws Exception {
        mockMvc.perform(delete("/api/orders/order-456")
                .with(SecurityMockMvcRequestPostProcessors.jwt()
                    .jwt(jwt -> jwt
                        .subject("user-123")
                        .claim("scope", "read write"))))
            .andExpect(status().isForbidden());
    }
}
```

---

## Best Practices

1. **Always validate the audience claim** - Tokens should be explicitly intended for your service
2. **Use short token lifetimes** - Access tokens should expire within minutes, not hours
3. **Prefer scopes for coarse-grained access** - Use scopes like read/write for API-level permissions
4. **Use roles for fine-grained access** - Roles like ADMIN determine what operations users can perform
5. **Cache JWKS responses** - Spring does this by default, but ensure your TTL settings are appropriate
6. **Log security events** - Track authentication failures for security monitoring
7. **Never log token contents** - Tokens may contain sensitive information

---

*Building microservices that need monitoring? [OneUptime](https://oneuptime.com) provides comprehensive observability for your Spring applications with distributed tracing, log aggregation, and alerting.*

**Related Reading:**
- [Three Pillars of Observability: Logs, Metrics, Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [SRE Best Practices](https://oneuptime.com/blog/post/2025-11-28-sre-best-practices/view)
