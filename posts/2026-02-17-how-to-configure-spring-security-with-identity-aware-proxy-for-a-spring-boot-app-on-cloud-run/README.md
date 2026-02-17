# How to Configure Spring Security with Identity-Aware Proxy for a Spring Boot App on Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Spring Security, Identity-Aware Proxy, Cloud Run, Authentication, Java

Description: Configure Spring Security to work with Google Identity-Aware Proxy on Cloud Run for zero-trust authentication with JWT validation and user identity extraction.

---

Identity-Aware Proxy (IAP) sits in front of your Cloud Run application and handles authentication before requests reach your code. Users authenticate through Google's login flow, and IAP forwards the request with a signed JWT token containing the user's identity. Your Spring Boot application then validates that token and extracts user information.

This gives you centralized authentication without writing any login code. In this post, I will show you how to configure Spring Security to work with IAP on Cloud Run.

## How IAP Works with Cloud Run

When IAP is enabled for a Cloud Run service:

1. A user makes a request to your application URL.
2. IAP intercepts the request and checks if the user is authenticated.
3. If not, IAP redirects to Google's sign-in page.
4. After authentication, IAP forwards the request to your Cloud Run service with a JWT in the `x-goog-iap-jwt-assertion` header.
5. Your application validates the JWT and extracts user identity.

The JWT contains the user's email, subject ID, and other claims. Your application should validate the token's signature, issuer, and audience to ensure it came from IAP and was not forged.

## Project Dependencies

```xml
<!-- Spring Security -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- Spring Boot Web -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- Google Auth Library for JWT validation -->
<dependency>
    <groupId>com.google.auth</groupId>
    <artifactId>google-auth-library-oauth2-http</artifactId>
    <version>1.22.0</version>
</dependency>

<!-- Nimbus JOSE JWT for token parsing -->
<dependency>
    <groupId>com.nimbusds</groupId>
    <artifactId>nimbus-jose-jwt</artifactId>
    <version>9.37.3</version>
</dependency>
```

## IAP JWT Validation Service

The core of the integration is validating the IAP JWT. Google provides a verification library, but you can also do it manually for more control:

```java
@Service
public class IapJwtValidator {

    // IAP uses ES256 keys for signing JWTs
    private static final String IAP_ISSUER = "https://cloud.google.com/iap";
    private static final String PUBLIC_KEY_URL =
            "https://www.gstatic.com/iap/verify/public_key-jwk";

    private final String expectedAudience;

    // The audience is specific to your Cloud Run service
    public IapJwtValidator(@Value("${iap.audience}") String expectedAudience) {
        this.expectedAudience = expectedAudience;
    }

    // Validate the IAP JWT and return the decoded claims
    public IapClaims validateToken(String jwtToken) {
        try {
            // Use Google's token verifier
            TokenVerifier verifier = TokenVerifier.newBuilder()
                    .setAudience(expectedAudience)
                    .setIssuer(IAP_ISSUER)
                    .build();

            JsonWebSignature jws = verifier.verify(jwtToken);
            JsonWebToken.Payload payload = jws.getPayload();

            String email = (String) payload.get("email");
            String subject = payload.getSubject();

            return new IapClaims(email, subject);

        } catch (TokenVerifier.VerificationException e) {
            throw new SecurityException("Invalid IAP JWT: " + e.getMessage(), e);
        }
    }
}
```

```java
// Holds the validated claims from the IAP JWT
public class IapClaims {
    private final String email;
    private final String subject;

    public IapClaims(String email, String subject) {
        this.email = email;
        this.subject = subject;
    }

    public String getEmail() { return email; }
    public String getSubject() { return subject; }
}
```

## Spring Security Filter

Create a custom security filter that extracts and validates the IAP JWT:

```java
@Component
public class IapAuthenticationFilter extends OncePerRequestFilter {

    private static final String IAP_JWT_HEADER = "x-goog-iap-jwt-assertion";

    private final IapJwtValidator jwtValidator;

    public IapAuthenticationFilter(IapJwtValidator jwtValidator) {
        this.jwtValidator = jwtValidator;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain)
            throws ServletException, IOException {

        String jwtToken = request.getHeader(IAP_JWT_HEADER);

        if (jwtToken == null || jwtToken.isEmpty()) {
            // No IAP token - reject the request
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED,
                    "Missing IAP JWT assertion header");
            return;
        }

        try {
            // Validate the token and extract claims
            IapClaims claims = jwtValidator.validateToken(jwtToken);

            // Create a Spring Security authentication object
            IapAuthenticationToken authentication = new IapAuthenticationToken(
                    claims.getEmail(),
                    claims.getSubject(),
                    List.of(new SimpleGrantedAuthority("ROLE_USER")));

            // Set the authentication in the security context
            SecurityContextHolder.getContext().setAuthentication(authentication);

            filterChain.doFilter(request, response);

        } catch (SecurityException e) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN,
                    "Invalid IAP JWT: " + e.getMessage());
        }
    }
}
```

## Custom Authentication Token

Create a custom authentication token to hold IAP-specific information:

```java
// Custom authentication token that carries IAP user details
public class IapAuthenticationToken extends AbstractAuthenticationToken {

    private final String email;
    private final String subject;

    public IapAuthenticationToken(String email, String subject,
                                   Collection<? extends GrantedAuthority> authorities) {
        super(authorities);
        this.email = email;
        this.subject = subject;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return null; // No credentials - IAP handles authentication
    }

    @Override
    public Object getPrincipal() {
        return email;
    }

    public String getEmail() { return email; }
    public String getSubject() { return subject; }
}
```

## Security Configuration

Configure Spring Security to use the IAP filter:

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final IapAuthenticationFilter iapFilter;

    public SecurityConfig(IapAuthenticationFilter iapFilter) {
        this.iapFilter = iapFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // Disable CSRF - IAP handles this
                .csrf(csrf -> csrf.disable())

                // Disable form login - IAP handles authentication
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())

                // Add the IAP filter before the standard authentication filter
                .addFilterBefore(iapFilter, UsernamePasswordAuthenticationFilter.class)

                // Authorization rules
                .authorizeHttpRequests(auth -> auth
                        // Allow health check endpoints without authentication
                        .requestMatchers("/actuator/health/**").permitAll()
                        // Require authentication for everything else
                        .anyRequest().authenticated()
                );

        return http.build();
    }
}
```

## Using the Authenticated User in Controllers

Access the authenticated user's identity in your controllers:

```java
@RestController
@RequestMapping("/api")
public class UserController {

    // Get the current user's profile
    @GetMapping("/me")
    public Map<String, String> getCurrentUser(Authentication authentication) {
        IapAuthenticationToken iapAuth = (IapAuthenticationToken) authentication;

        return Map.of(
                "email", iapAuth.getEmail(),
                "subject", iapAuth.getSubject());
    }

    // Access user info through the security context
    @GetMapping("/dashboard")
    public Map<String, Object> getDashboard() {
        IapAuthenticationToken auth = (IapAuthenticationToken)
                SecurityContextHolder.getContext().getAuthentication();

        return Map.of(
                "user", auth.getEmail(),
                "message", "Welcome to the dashboard");
    }
}
```

## Role-Based Access Control

Extend the filter to assign roles based on the user's email domain or a lookup:

```java
// Assign roles based on user attributes
private List<SimpleGrantedAuthority> determineAuthorities(IapClaims claims) {
    List<SimpleGrantedAuthority> authorities = new ArrayList<>();
    authorities.add(new SimpleGrantedAuthority("ROLE_USER"));

    // Assign admin role for specific domain
    if (claims.getEmail().endsWith("@mycompany.com")) {
        authorities.add(new SimpleGrantedAuthority("ROLE_EMPLOYEE"));
    }

    // You could also look up roles from a database here
    return authorities;
}
```

Then use role-based authorization in your security config:

```java
.authorizeHttpRequests(auth -> auth
        .requestMatchers("/actuator/health/**").permitAll()
        .requestMatchers("/api/admin/**").hasRole("EMPLOYEE")
        .anyRequest().authenticated()
)
```

## Enabling IAP on Cloud Run

Set up IAP for your Cloud Run service:

```bash
# Enable the IAP API
gcloud services enable iap.googleapis.com

# Deploy the Cloud Run service
gcloud run deploy my-app \
    --image gcr.io/my-project/my-app:latest \
    --region us-central1 \
    --no-allow-unauthenticated

# Set up a load balancer and enable IAP through the console
# or use the gcloud command
gcloud iap web enable \
    --resource-type=backend-services \
    --service=my-backend-service
```

The IAP audience value you need for JWT validation is in the format: `/projects/PROJECT_NUMBER/global/backendServices/BACKEND_SERVICE_ID`.

## Application Properties

```properties
# IAP audience for JWT validation
iap.audience=/projects/123456789/global/backendServices/987654321

# Actuator for health checks
management.endpoints.web.exposure.include=health
```

## Wrapping Up

Identity-Aware Proxy with Spring Security gives you enterprise authentication without writing login flows. IAP handles the Google sign-in, and your Spring Security filter validates the JWT and extracts user identity. The key pieces are the JWT validation service that checks the token signature and claims, the custom filter that runs before Spring Security's default authentication, and the security configuration that ties it all together. This pattern works well for internal applications where you want Google account authentication with minimal code.
