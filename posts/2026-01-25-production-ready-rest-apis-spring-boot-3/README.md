# How to Build Production-Ready REST APIs with Spring Boot 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot 3, REST API, Production, Best Practices

Description: A practical guide to building production-ready REST APIs with Spring Boot 3, covering validation, error handling, security, and observability patterns that scale.

---

Building a REST API is easy. Building one that survives production traffic, handles errors gracefully, and remains maintainable as your team grows is a different story. Spring Boot 3 brings Java 17+ support, native compilation with GraalVM, and improved observability out of the box. This guide walks through the patterns and practices that separate hobby projects from production systems.

## Project Setup

Start with Spring Initializr or add these dependencies to your `pom.xml`:

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
</parent>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
</dependencies>
```

## Structuring Your API Layer

Keep your controllers thin. They should handle HTTP concerns and delegate business logic to services.

```java
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    // Constructor injection - no need for @Autowired in Spring Boot 3
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        return userService.findById(id)
            .map(ResponseEntity::ok)
            .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    @PostMapping
    public ResponseEntity<UserResponse> createUser(
            @Valid @RequestBody CreateUserRequest request) {
        UserResponse created = userService.create(request);
        URI location = ServletUriComponentsBuilder
            .fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created.id())
            .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

## Request Validation

Use Jakarta Bean Validation annotations to validate input before it reaches your service layer. Spring Boot 3 moved from `javax.validation` to `jakarta.validation`.

```java
// Use records for immutable DTOs - cleaner than traditional classes
public record CreateUserRequest(
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    String email,

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    String name,

    @NotNull(message = "Role is required")
    UserRole role
) {}
```

For complex validation that spans multiple fields, create custom validators:

```java
@Documented
@Constraint(validatedBy = PasswordMatchValidator.class)
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface PasswordMatch {
    String message() default "Passwords do not match";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class PasswordMatchValidator
        implements ConstraintValidator<PasswordMatch, PasswordChangeRequest> {

    @Override
    public boolean isValid(PasswordChangeRequest request,
                          ConstraintValidatorContext context) {
        if (request.newPassword() == null) {
            return true; // Let @NotNull handle this
        }
        return request.newPassword().equals(request.confirmPassword());
    }
}
```

## Global Exception Handling

Centralize error handling with `@RestControllerAdvice`. This keeps your controllers clean and ensures consistent error responses across your API.

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // Standard error response structure
    public record ErrorResponse(
        String code,
        String message,
        Instant timestamp,
        String path,
        List<FieldError> errors
    ) {
        public record FieldError(String field, String message) {}
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
            ResourceNotFoundException ex,
            HttpServletRequest request) {
        ErrorResponse response = new ErrorResponse(
            "NOT_FOUND",
            ex.getMessage(),
            Instant.now(),
            request.getRequestURI(),
            List.of()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {
        List<ErrorResponse.FieldError> fieldErrors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(e -> new ErrorResponse.FieldError(e.getField(), e.getDefaultMessage()))
            .toList();

        ErrorResponse response = new ErrorResponse(
            "VALIDATION_FAILED",
            "Request validation failed",
            Instant.now(),
            request.getRequestURI(),
            fieldErrors
        );
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(
            Exception ex,
            HttpServletRequest request) {
        // Log the full stack trace for debugging
        log.error("Unhandled exception", ex);

        // Return generic message to client - don't leak internal details
        ErrorResponse response = new ErrorResponse(
            "INTERNAL_ERROR",
            "An unexpected error occurred",
            Instant.now(),
            request.getRequestURI(),
            List.of()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
```

## Pagination and Sorting

Spring Data provides pagination out of the box, but you need to expose it properly in your API.

```java
@GetMapping
public ResponseEntity<Page<UserResponse>> listUsers(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "createdAt") String sortBy,
        @RequestParam(defaultValue = "desc") String sortDir) {

    // Limit page size to prevent abuse
    int safeSize = Math.min(size, 100);

    Sort sort = sortDir.equalsIgnoreCase("asc")
        ? Sort.by(sortBy).ascending()
        : Sort.by(sortBy).descending();

    Pageable pageable = PageRequest.of(page, safeSize, sort);
    return ResponseEntity.ok(userService.findAll(pageable));
}
```

## Health Checks and Actuator

Spring Boot Actuator provides production-ready endpoints. Configure them properly:

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health, info, metrics, prometheus
  endpoint:
    health:
      show-details: when_authorized
      probes:
        enabled: true  # Enables /actuator/health/liveness and /actuator/health/readiness
  health:
    db:
      enabled: true
    diskspace:
      enabled: true
```

Add custom health indicators for external dependencies:

```java
@Component
public class PaymentGatewayHealthIndicator implements HealthIndicator {

    private final PaymentGatewayClient client;

    public PaymentGatewayHealthIndicator(PaymentGatewayClient client) {
        this.client = client;
    }

    @Override
    public Health health() {
        try {
            boolean reachable = client.ping();
            if (reachable) {
                return Health.up()
                    .withDetail("gateway", "Payment gateway is reachable")
                    .build();
            }
            return Health.down()
                .withDetail("gateway", "Payment gateway not responding")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

## Observability with Micrometer

Spring Boot 3 integrates Micrometer for metrics. Add custom metrics for business operations:

```java
@Service
public class OrderService {

    private final Counter orderCounter;
    private final Timer orderProcessingTimer;

    public OrderService(MeterRegistry registry) {
        this.orderCounter = Counter.builder("orders.created")
            .description("Number of orders created")
            .register(registry);

        this.orderProcessingTimer = Timer.builder("orders.processing.time")
            .description("Time spent processing orders")
            .register(registry);
    }

    public Order createOrder(CreateOrderRequest request) {
        return orderProcessingTimer.record(() -> {
            Order order = processOrder(request);
            orderCounter.increment();
            return order;
        });
    }
}
```

## Security Basics

Add Spring Security for authentication and authorization:

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())  // Disable for stateless API
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health/**").permitAll()
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
            .build();
    }
}
```

## Rate Limiting

Protect your API from abuse with rate limiting. You can use Bucket4j with Spring:

```java
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    private Bucket createBucket() {
        // Allow 100 requests per minute
        return Bucket.builder()
            .addLimit(Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1))))
            .build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String clientId = getClientId(request);
        Bucket bucket = buckets.computeIfAbsent(clientId, k -> createBucket());

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.getWriter().write("{\"error\": \"Rate limit exceeded\"}");
        }
    }

    private String getClientId(HttpServletRequest request) {
        // Use API key, user ID, or IP address
        String apiKey = request.getHeader("X-API-Key");
        return apiKey != null ? apiKey : request.getRemoteAddr();
    }
}
```

## Testing Your API

Write integration tests that actually hit your endpoints:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void createUser_WithValidData_ReturnsCreated() throws Exception {
        CreateUserRequest request = new CreateUserRequest(
            "test@example.com",
            "Test User",
            UserRole.USER
        );

        mockMvc.perform(post("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(header().exists("Location"))
            .andExpect(jsonPath("$.email").value("test@example.com"));
    }

    @Test
    void createUser_WithInvalidEmail_ReturnsBadRequest() throws Exception {
        CreateUserRequest request = new CreateUserRequest(
            "invalid-email",
            "Test User",
            UserRole.USER
        );

        mockMvc.perform(post("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }
}
```

## Configuration for Production

Set sensible defaults for production deployment:

```yaml
# application-prod.yml
server:
  port: 8080
  shutdown: graceful
  tomcat:
    connection-timeout: 5s
    max-connections: 10000
    accept-count: 100
    threads:
      max: 200
      min-spare: 10

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000

logging:
  level:
    root: INFO
    com.yourcompany: DEBUG
  pattern:
    console: "%d{ISO8601} [%thread] %-5level %logger{36} - %msg%n"
```

## Summary

Production-ready Spring Boot APIs require more than just working endpoints. You need proper validation to catch bad input early, consistent error handling so clients know what went wrong, pagination to handle large datasets, health checks for orchestrators like Kubernetes, metrics for monitoring, and security to protect your data.

The patterns shown here will get you most of the way there. Start with the basics - validation, error handling, and health checks. Add metrics and security as your API matures. The key is building these patterns in from the start rather than bolting them on later when you are dealing with production incidents.
