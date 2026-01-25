# How to Set Up Swagger/OpenAPI Documentation in Spring Boot

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Java, Spring Boot, OpenAPI, Swagger, API Documentation, Backend

Description: Learn how to set up interactive API documentation in Spring Boot using SpringDoc OpenAPI with customization, security configuration, and best practices.

---

Good API documentation is essential for any REST API. SpringDoc OpenAPI provides automatic generation of OpenAPI 3.0 documentation with an interactive Swagger UI. This guide shows you how to set it up and customize it for your Spring Boot application.

## Dependencies

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.3.0</version>
</dependency>
```

For WebFlux applications:

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webflux-ui</artifactId>
    <version>2.3.0</version>
</dependency>
```

## Basic Setup

With just the dependency added, you get:
- **Swagger UI**: `http://localhost:8080/swagger-ui.html`
- **OpenAPI JSON**: `http://localhost:8080/v3/api-docs`
- **OpenAPI YAML**: `http://localhost:8080/v3/api-docs.yaml`

## Configuration Properties

```yaml
# application.yml
springdoc:
  api-docs:
    path: /api-docs
    enabled: true
  swagger-ui:
    path: /swagger-ui.html
    enabled: true
    operationsSorter: method
    tagsSorter: alpha
    tryItOutEnabled: true
    filter: true
  packages-to-scan: com.example.controller
  paths-to-match: /api/**
```

## OpenAPI Configuration Class

```java
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("User Management API")
                .version("1.0.0")
                .description("REST API for managing users and orders")
                .termsOfService("https://example.com/terms")
                .contact(new Contact()
                    .name("API Support")
                    .email("support@example.com")
                    .url("https://example.com/support"))
                .license(new License()
                    .name("Apache 2.0")
                    .url("https://www.apache.org/licenses/LICENSE-2.0")))
            .externalDocs(new ExternalDocumentation()
                .description("Full Documentation")
                .url("https://docs.example.com"))
            .servers(List.of(
                new Server().url("https://api.example.com").description("Production"),
                new Server().url("https://staging-api.example.com").description("Staging"),
                new Server().url("http://localhost:8080").description("Local")
            ));
    }
}
```

## Documenting Controllers

```java
@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "User management operations")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @Operation(
        summary = "Get all users",
        description = "Retrieves a paginated list of all users with optional filtering"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Successfully retrieved users",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = PagedUserResponse.class)
            )
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Unauthorized",
            content = @Content
        )
    })
    @GetMapping
    public ResponseEntity<Page<UserDTO>> getUsers(
            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Filter by name (partial match)")
            @RequestParam(required = false) String name) {

        Pageable pageable = PageRequest.of(page, size);
        Page<UserDTO> users = userService.findUsers(name, pageable);
        return ResponseEntity.ok(users);
    }

    @Operation(
        summary = "Get user by ID",
        description = "Retrieves a specific user by their unique identifier"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "User found",
            content = @Content(schema = @Schema(implementation = UserDTO.class))
        ),
        @ApiResponse(
            responseCode = "404",
            description = "User not found",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))
        )
    })
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUser(
            @Parameter(description = "User ID", required = true, example = "123")
            @PathVariable Long id) {

        UserDTO user = userService.findById(id);
        return ResponseEntity.ok(user);
    }

    @Operation(
        summary = "Create a new user",
        description = "Creates a new user with the provided information"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "201",
            description = "User created successfully",
            content = @Content(schema = @Schema(implementation = UserDTO.class))
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid input",
            content = @Content(schema = @Schema(implementation = ValidationErrorResponse.class))
        ),
        @ApiResponse(
            responseCode = "409",
            description = "Email already exists",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))
        )
    })
    @PostMapping
    public ResponseEntity<UserDTO> createUser(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                description = "User to create",
                required = true,
                content = @Content(schema = @Schema(implementation = CreateUserRequest.class))
            )
            @Valid @RequestBody CreateUserRequest request) {

        UserDTO user = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    @Operation(summary = "Delete a user")
    @ApiResponse(responseCode = "204", description = "User deleted")
    @ApiResponse(responseCode = "404", description = "User not found")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
```

## Documenting DTOs

```java
@Schema(description = "User data transfer object")
public record UserDTO(
    @Schema(description = "Unique identifier", example = "123")
    Long id,

    @Schema(description = "User's full name", example = "John Doe")
    String name,

    @Schema(description = "Email address", example = "john@example.com")
    String email,

    @Schema(description = "Account creation timestamp")
    LocalDateTime createdAt,

    @Schema(description = "User role", allowableValues = {"USER", "ADMIN"})
    String role
) {}

@Schema(description = "Request body for creating a new user")
public record CreateUserRequest(
    @Schema(description = "User's full name", example = "John Doe", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    @Size(min = 2, max = 100)
    String name,

    @Schema(description = "Email address", example = "john@example.com", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    @Email
    String email,

    @Schema(description = "Password (min 8 characters)", example = "securePassword123", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    @Size(min = 8)
    String password,

    @Schema(description = "User role", defaultValue = "USER")
    String role
) {}

@Schema(description = "Error response")
public record ErrorResponse(
    @Schema(description = "Error code", example = "USER_NOT_FOUND")
    String code,

    @Schema(description = "Error message", example = "User with ID 123 not found")
    String message,

    @Schema(description = "Timestamp of the error")
    LocalDateTime timestamp
) {}
```

## Adding Security Documentation

### JWT Bearer Authentication

```java
@Configuration
public class OpenApiSecurityConfig {

    @Bean
    public OpenAPI securedOpenAPI() {
        return new OpenAPI()
            .info(new Info().title("Secured API").version("1.0"))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
            .components(new Components()
                .addSecuritySchemes("bearerAuth", new SecurityScheme()
                    .name("bearerAuth")
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .description("Enter JWT token")));
    }
}
```

### OAuth2 Authentication

```java
@Bean
public OpenAPI oauth2OpenAPI() {
    return new OpenAPI()
        .info(new Info().title("OAuth2 API").version("1.0"))
        .addSecurityItem(new SecurityRequirement().addList("oauth2"))
        .components(new Components()
            .addSecuritySchemes("oauth2", new SecurityScheme()
                .type(SecurityScheme.Type.OAUTH2)
                .flows(new OAuthFlows()
                    .authorizationCode(new OAuthFlow()
                        .authorizationUrl("https://auth.example.com/authorize")
                        .tokenUrl("https://auth.example.com/token")
                        .scopes(new Scopes()
                            .addString("read", "Read access")
                            .addString("write", "Write access"))))));
}
```

### Per-Endpoint Security

```java
@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin", description = "Admin-only operations")
@SecurityRequirement(name = "bearerAuth")  // All endpoints require auth
public class AdminController {

    @Operation(summary = "Get all users (admin only)")
    @GetMapping("/users")
    public List<UserDTO> getAllUsers() {
        return userService.findAll();
    }
}

@RestController
@RequestMapping("/api/public")
@Tag(name = "Public", description = "Public endpoints")
public class PublicController {

    @Operation(
        summary = "Health check",
        security = {}  // No security required
    )
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
```

## Grouping APIs

```java
@Configuration
public class OpenApiGroupConfig {

    @Bean
    public GroupedOpenApi publicApi() {
        return GroupedOpenApi.builder()
            .group("public")
            .displayName("Public API")
            .pathsToMatch("/api/public/**")
            .build();
    }

    @Bean
    public GroupedOpenApi adminApi() {
        return GroupedOpenApi.builder()
            .group("admin")
            .displayName("Admin API")
            .pathsToMatch("/api/admin/**")
            .addOpenApiCustomizer(openApi ->
                openApi.info(new Info()
                    .title("Admin API")
                    .description("Administrative operations")))
            .build();
    }

    @Bean
    public GroupedOpenApi v1Api() {
        return GroupedOpenApi.builder()
            .group("v1")
            .displayName("API v1")
            .pathsToMatch("/api/v1/**")
            .build();
    }
}
```

## Customizing Swagger UI

```yaml
springdoc:
  swagger-ui:
    # UI customization
    displayRequestDuration: true
    showExtensions: true
    showCommonExtensions: true
    docExpansion: none
    defaultModelsExpandDepth: -1
    defaultModelExpandDepth: 3
    syntaxHighlight:
      activated: true
      theme: monokai

    # Disable Try It Out for production
    supportedSubmitMethods: []

    # OAuth2 configuration
    oauth:
      clientId: my-client-id
      clientSecret: my-client-secret
      appName: My API
      scopeSeparator: ' '
```

## Hiding Endpoints and Fields

```java
// Hide entire endpoint
@Operation(hidden = true)
@GetMapping("/internal/metrics")
public Map<String, Object> internalMetrics() {
    return metricsService.getMetrics();
}

// Hide field from schema
public record UserDTO(
    Long id,
    String name,
    @Schema(hidden = true)
    String internalId,

    @JsonIgnore  // Also hidden from JSON serialization
    String sensitiveData
) {}

// Exclude endpoints by path
@Configuration
public class OpenApiExclusionConfig {

    @Bean
    public OpenApiCustomizer hideInternalEndpoints() {
        return openApi -> {
            openApi.getPaths().entrySet()
                .removeIf(entry -> entry.getKey().contains("/internal/"));
        };
    }
}
```

## Environment-Specific Configuration

```yaml
# application-prod.yml
springdoc:
  swagger-ui:
    enabled: false  # Disable in production
  api-docs:
    enabled: false
```

```yaml
# application-dev.yml
springdoc:
  swagger-ui:
    enabled: true
    tryItOutEnabled: true
```

Or with conditional beans:

```java
@Configuration
@Profile("!prod")
public class SwaggerDevConfig {

    @Bean
    public OpenAPI devOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("API (Development)")
                .description("Development environment - all features enabled"));
    }
}
```

## Adding Examples

```java
@Operation(summary = "Create order")
@io.swagger.v3.oas.annotations.parameters.RequestBody(
    content = @Content(
        examples = {
            @ExampleObject(
                name = "Simple order",
                summary = "A simple order with one item",
                value = """
                    {
                        "customerId": 123,
                        "items": [
                            {"productId": 456, "quantity": 2}
                        ]
                    }
                    """
            ),
            @ExampleObject(
                name = "Complex order",
                summary = "An order with multiple items and discount",
                value = """
                    {
                        "customerId": 123,
                        "items": [
                            {"productId": 456, "quantity": 2},
                            {"productId": 789, "quantity": 1}
                        ],
                        "discountCode": "SAVE10"
                    }
                    """
            )
        }
    )
)
@PostMapping("/orders")
public ResponseEntity<OrderDTO> createOrder(@RequestBody CreateOrderRequest request) {
    return ResponseEntity.ok(orderService.create(request));
}
```

## Generating OpenAPI Spec at Build Time

```xml
<plugin>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-maven-plugin</artifactId>
    <version>1.4</version>
    <executions>
        <execution>
            <id>generate-openapi</id>
            <goals>
                <goal>generate</goal>
            </goals>
        </execution>
    </executions>
    <configuration>
        <apiDocsUrl>http://localhost:8080/v3/api-docs</apiDocsUrl>
        <outputFileName>openapi.json</outputFileName>
        <outputDir>${project.build.directory}</outputDir>
    </configuration>
</plugin>
```

## Summary

| Feature | Annotation/Config |
|---------|-------------------|
| Controller description | `@Tag(name, description)` |
| Endpoint description | `@Operation(summary, description)` |
| Response documentation | `@ApiResponse(responseCode, description)` |
| Parameter description | `@Parameter(description, required, example)` |
| Schema documentation | `@Schema(description, example)` |
| Security requirement | `@SecurityRequirement(name)` |
| Hide from docs | `@Operation(hidden = true)` or `@Schema(hidden = true)` |

SpringDoc OpenAPI provides comprehensive API documentation with minimal configuration. Start with the basic setup, add descriptions to your endpoints and DTOs, configure security documentation, and customize the UI for your needs. Good documentation makes your API easier to use and reduces support burden.
