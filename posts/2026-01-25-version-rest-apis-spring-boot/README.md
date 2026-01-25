# How to Version REST APIs in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, REST API, Versioning, Best Practices

Description: Learn how to implement REST API versioning in Spring Boot using URI paths, request parameters, custom headers, and content negotiation. This guide covers practical code examples and helps you choose the right strategy for your project.

---

> APIs evolve. Features get added, schemas change, and sometimes breaking changes are unavoidable. The question is not whether your API will need versioning, but how you will implement it.

When building REST APIs with Spring Boot, you need a versioning strategy from day one. Without it, you risk breaking existing clients every time you ship an update. This guide walks through the most common versioning approaches with working code examples so you can pick the right one for your project.

---

## Why Version Your API?

Before diving into implementation, let's be clear about why versioning matters:

- **Backward compatibility** - Existing clients continue working while new clients use updated endpoints
- **Gradual migration** - Give consumers time to update their integrations
- **Clear contracts** - Each version represents a stable, documented interface
- **Parallel support** - Run multiple versions simultaneously during transition periods

The cost of not versioning is technical debt that compounds with every release. Start with a strategy, even if your first version stays at v1 for years.

---

## Strategy 1: URI Path Versioning

URI path versioning is the most visible and widely adopted approach. The version number appears directly in the URL path, making it immediately obvious which API version a client is using.

### Basic Implementation

```java
// UserControllerV1.java
// Version 1 returns a simple user representation
package com.example.api.v1;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
public class UserControllerV1 {

    // GET /api/v1/users - Returns users with basic fields
    @GetMapping
    public List<UserResponseV1> getUsers() {
        return userService.getAllUsers().stream()
            .map(this::toV1Response)
            .toList();
    }

    // GET /api/v1/users/{id} - Returns single user
    @GetMapping("/{id}")
    public UserResponseV1 getUser(@PathVariable Long id) {
        User user = userService.findById(id);
        return toV1Response(user);
    }

    // V1 response only includes name as a single field
    private UserResponseV1 toV1Response(User user) {
        return new UserResponseV1(
            user.getId(),
            user.getFirstName() + " " + user.getLastName(),
            user.getEmail()
        );
    }
}

// V1 response DTO with combined name field
record UserResponseV1(Long id, String name, String email) {}
```

```java
// UserControllerV2.java
// Version 2 splits the name into separate fields and adds metadata
package com.example.api.v2;

import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v2/users")
public class UserControllerV2 {

    // GET /api/v2/users - Returns users with expanded fields
    @GetMapping
    public List<UserResponseV2> getUsers() {
        return userService.getAllUsers().stream()
            .map(this::toV2Response)
            .toList();
    }

    // GET /api/v2/users/{id} - Returns single user with metadata
    @GetMapping("/{id}")
    public UserResponseV2 getUser(@PathVariable Long id) {
        User user = userService.findById(id);
        return toV2Response(user);
    }

    // V2 response separates first and last name, adds timestamps
    private UserResponseV2 toV2Response(User user) {
        return new UserResponseV2(
            user.getId(),
            user.getFirstName(),
            user.getLastName(),
            user.getEmail(),
            user.getCreatedAt(),
            user.getUpdatedAt()
        );
    }
}

// V2 response DTO with split name fields and audit timestamps
record UserResponseV2(
    Long id,
    String firstName,
    String lastName,
    String email,
    Instant createdAt,
    Instant updatedAt
) {}
```

### Pros and Cons

**Advantages:**
- Easy to understand and implement
- Version is visible in URLs and logs
- Simple to cache at the CDN level
- Works with any HTTP client

**Disadvantages:**
- URL changes between versions
- Can lead to code duplication if not structured carefully

---

## Strategy 2: Request Parameter Versioning

Request parameter versioning keeps the base URL constant and passes the version as a query parameter. This approach works well when you want a single endpoint to handle multiple versions.

### Implementation

```java
// UserController.java
// Single controller handles multiple versions via query parameter
package com.example.api;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    // GET /api/users?version=1 or GET /api/users?version=2
    // Defaults to version 2 if not specified
    @GetMapping
    public Object getUsers(
            @RequestParam(value = "version", defaultValue = "2") int version) {

        return switch (version) {
            case 1 -> userService.getAllUsers().stream()
                .map(this::toV1Response)
                .toList();
            case 2 -> userService.getAllUsers().stream()
                .map(this::toV2Response)
                .toList();
            default -> throw new UnsupportedVersionException(
                "API version " + version + " is not supported"
            );
        };
    }

    // GET /api/users/{id}?version=1 or GET /api/users/{id}?version=2
    @GetMapping("/{id}")
    public Object getUser(
            @PathVariable Long id,
            @RequestParam(value = "version", defaultValue = "2") int version) {

        User user = userService.findById(id);

        return switch (version) {
            case 1 -> toV1Response(user);
            case 2 -> toV2Response(user);
            default -> throw new UnsupportedVersionException(
                "API version " + version + " is not supported"
            );
        };
    }

    private UserResponseV1 toV1Response(User user) {
        return new UserResponseV1(
            user.getId(),
            user.getFirstName() + " " + user.getLastName(),
            user.getEmail()
        );
    }

    private UserResponseV2 toV2Response(User user) {
        return new UserResponseV2(
            user.getId(),
            user.getFirstName(),
            user.getLastName(),
            user.getEmail(),
            user.getCreatedAt(),
            user.getUpdatedAt()
        );
    }
}
```

### Custom Exception Handler

```java
// UnsupportedVersionException.java
// Custom exception for invalid API versions
package com.example.api.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class UnsupportedVersionException extends RuntimeException {
    public UnsupportedVersionException(String message) {
        super(message);
    }
}
```

---

## Strategy 3: Custom Header Versioning

Header versioning keeps URLs clean and moves version information into HTTP headers. This approach is popular with teams that prefer not to embed versioning in the URL structure.

### Implementation with Custom Annotation

```java
// ApiVersion.java
// Custom annotation to mark controller methods with version requirements
package com.example.api.annotation;

import java.lang.annotation.*;

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface ApiVersion {
    int value();  // The version number this endpoint supports
}
```

```java
// ApiVersionRequestMappingHandlerMapping.java
// Custom handler that routes requests based on X-API-Version header
package com.example.api.config;

import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.method.HandlerMethod;
import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;

public class ApiVersionRequestMappingHandlerMapping
        extends RequestMappingHandlerMapping {

    @Override
    protected RequestMappingInfo getMappingForMethod(
            Method method, Class<?> handlerType) {

        RequestMappingInfo info = super.getMappingForMethod(method, handlerType);
        if (info == null) return null;

        // Check for @ApiVersion on method first, then on class
        ApiVersion methodAnnotation = method.getAnnotation(ApiVersion.class);
        if (methodAnnotation != null) {
            return createVersionedMapping(info, methodAnnotation.value());
        }

        ApiVersion typeAnnotation = handlerType.getAnnotation(ApiVersion.class);
        if (typeAnnotation != null) {
            return createVersionedMapping(info, typeAnnotation.value());
        }

        return info;
    }

    // Add header condition to the request mapping
    private RequestMappingInfo createVersionedMapping(
            RequestMappingInfo info, int version) {

        // Require X-API-Version header to match
        String headerCondition = "X-API-Version=" + version;

        return RequestMappingInfo
            .paths(info.getPatternValues().toArray(new String[0]))
            .methods(info.getMethodsCondition().getMethods()
                .toArray(new org.springframework.web.bind.annotation.RequestMethod[0]))
            .headers(headerCondition)
            .build();
    }
}
```

```java
// WebConfig.java
// Register the custom handler mapping
package com.example.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class WebConfig {

    @Bean
    public ApiVersionRequestMappingHandlerMapping
            apiVersionRequestMappingHandlerMapping() {

        ApiVersionRequestMappingHandlerMapping mapping =
            new ApiVersionRequestMappingHandlerMapping();
        mapping.setOrder(0);  // Higher priority than default handler
        return mapping;
    }
}
```

```java
// UserController.java
// Controller using custom @ApiVersion annotation
package com.example.api;

import org.springframework.web.bind.annotation.*;
import com.example.api.annotation.ApiVersion;

@RestController
@RequestMapping("/api/users")
public class UserController {

    // Responds to requests with header: X-API-Version: 1
    @ApiVersion(1)
    @GetMapping
    public List<UserResponseV1> getUsersV1() {
        return userService.getAllUsers().stream()
            .map(this::toV1Response)
            .toList();
    }

    // Responds to requests with header: X-API-Version: 2
    @ApiVersion(2)
    @GetMapping
    public List<UserResponseV2> getUsersV2() {
        return userService.getAllUsers().stream()
            .map(this::toV2Response)
            .toList();
    }
}
```

---

## Strategy 4: Content Negotiation (Media Type Versioning)

Content negotiation uses the `Accept` header with custom media types to specify the API version. This approach follows REST principles closely and is sometimes called "vendor media type" versioning.

### Implementation

```java
// UserController.java
// Version selection through Accept header media types
package com.example.api;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.MediaType;

@RestController
@RequestMapping("/api/users")
public class UserController {

    // Custom media type for V1: application/vnd.example.api.v1+json
    public static final String V1_MEDIA_TYPE =
        "application/vnd.example.api.v1+json";

    // Custom media type for V2: application/vnd.example.api.v2+json
    public static final String V2_MEDIA_TYPE =
        "application/vnd.example.api.v2+json";

    // Responds when Accept header contains V1 media type
    @GetMapping(produces = V1_MEDIA_TYPE)
    public List<UserResponseV1> getUsersV1() {
        return userService.getAllUsers().stream()
            .map(this::toV1Response)
            .toList();
    }

    // Responds when Accept header contains V2 media type or standard JSON
    @GetMapping(produces = {V2_MEDIA_TYPE, MediaType.APPLICATION_JSON_VALUE})
    public List<UserResponseV2> getUsersV2() {
        return userService.getAllUsers().stream()
            .map(this::toV2Response)
            .toList();
    }

    @GetMapping(value = "/{id}", produces = V1_MEDIA_TYPE)
    public UserResponseV1 getUserV1(@PathVariable Long id) {
        User user = userService.findById(id);
        return toV1Response(user);
    }

    @GetMapping(value = "/{id}", produces = {V2_MEDIA_TYPE, MediaType.APPLICATION_JSON_VALUE})
    public UserResponseV2 getUserV2(@PathVariable Long id) {
        User user = userService.findById(id);
        return toV2Response(user);
    }
}
```

### Client Usage Example

```bash
# Request V1 format
curl -H "Accept: application/vnd.example.api.v1+json" \
     https://api.example.com/api/users

# Request V2 format
curl -H "Accept: application/vnd.example.api.v2+json" \
     https://api.example.com/api/users

# Default (V2) when using standard JSON accept header
curl -H "Accept: application/json" \
     https://api.example.com/api/users
```

---

## Organizing Code for Multiple Versions

When supporting multiple API versions long-term, structure your code to minimize duplication and make maintenance easier.

### Recommended Package Structure

```
src/main/java/com/example/
├── api/
│   ├── v1/
│   │   ├── controller/
│   │   │   └── UserControllerV1.java
│   │   ├── dto/
│   │   │   ├── UserRequestV1.java
│   │   │   └── UserResponseV1.java
│   │   └── mapper/
│   │       └── UserMapperV1.java
│   ├── v2/
│   │   ├── controller/
│   │   │   └── UserControllerV2.java
│   │   ├── dto/
│   │   │   ├── UserRequestV2.java
│   │   │   └── UserResponseV2.java
│   │   └── mapper/
│   │       └── UserMapperV2.java
│   └── common/
│       └── exception/
│           └── GlobalExceptionHandler.java
├── domain/
│   ├── model/
│   │   └── User.java
│   └── service/
│       └── UserService.java
└── infrastructure/
    └── repository/
        └── UserRepository.java
```

### Shared Service Layer

```java
// UserService.java
// Business logic is version-agnostic - controllers handle mapping
package com.example.domain.service;

import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Core business methods work with domain objects
    // Controllers convert to version-specific DTOs
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User findById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
    }

    public User createUser(String firstName, String lastName, String email) {
        User user = new User(firstName, lastName, email);
        return userRepository.save(user);
    }
}
```

---

## Choosing the Right Strategy

Each versioning approach has trade-offs. Here is a quick guide to help you decide:

| Strategy | Best For | Avoid When |
|----------|----------|------------|
| URI Path | Public APIs, clear separation needed | You need URL stability |
| Query Parameter | Internal APIs, gradual rollouts | Caching is critical |
| Custom Header | Mobile apps, controlled clients | Third-party integrations |
| Content Negotiation | REST purists, schema evolution | Simple client requirements |

For most teams building public APIs, URI path versioning offers the best balance of clarity and simplicity. Start there unless you have specific requirements that push you toward another approach.

---

## Deprecation and Sunset Practices

Versioning is only half the story. You also need a strategy for retiring old versions.

```java
// DeprecationInterceptor.java
// Add deprecation headers to warn clients about upcoming sunsets
package com.example.api.interceptor;

import org.springframework.web.servlet.HandlerInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class DeprecationInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler) {

        String path = request.getRequestURI();

        // Add deprecation warning for V1 endpoints
        if (path.contains("/v1/")) {
            response.setHeader("Deprecation", "true");
            response.setHeader("Sunset", "Sat, 01 Jun 2026 00:00:00 GMT");
            response.setHeader("Link",
                "</api/v2" + path.substring(path.indexOf("/v1/") + 3) + ">; rel=\"successor-version\"");
        }

        return true;
    }
}
```

---

## Summary

API versioning is a decision you will live with for years. The key points to remember:

1. **Pick one strategy and stick with it** - Mixing approaches creates confusion
2. **Version from day one** - Even if you stay at v1 forever, the infrastructure is ready
3. **Keep business logic version-agnostic** - Only DTOs and controllers should care about versions
4. **Plan for deprecation** - Every version you release is a version you will eventually retire

Start with URI path versioning if you are unsure. It is explicit, easy to understand, and works everywhere. You can always get more sophisticated later, but you cannot easily change a versioning strategy once clients depend on it.

---

*Building APIs that need monitoring? [OneUptime](https://oneuptime.com) provides end-to-end observability for your Spring Boot applications with distributed tracing, metrics, and alerting.*
