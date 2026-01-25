# How to Handle Exceptions Globally in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Exception Handling, REST API, Error Response, ControllerAdvice

Description: Learn how to implement global exception handling in Spring Boot using @ControllerAdvice. This guide covers custom exceptions, error responses, validation errors, and best practices for consistent API error handling.

---

> Consistent error handling is crucial for building professional APIs. Spring Boot's @ControllerAdvice provides a centralized way to handle exceptions across all controllers. This guide shows you how to implement comprehensive global exception handling.

Good error handling improves developer experience for API consumers and helps with debugging in production. Let's build a robust exception handling system.

---

## Architecture Overview

```mermaid
flowchart TD
    A[HTTP Request] --> B[Controller]
    B --> C{Exception?}
    C -->|No| D[Success Response]
    C -->|Yes| E[@ControllerAdvice]
    E --> F{Exception Type}
    F --> G[ValidationException Handler]
    F --> H[BusinessException Handler]
    F --> I[Generic Exception Handler]
    G --> J[400 Bad Request]
    H --> K[4xx/5xx Response]
    I --> L[500 Internal Error]
```

---

## Standard Error Response

### Error Response DTO

```java
package com.example.exception;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant timestamp;

    private int status;
    private String error;
    private String message;
    private String path;
    private String traceId;

    // For validation errors
    private List<FieldError> fieldErrors;

    // For additional context
    private Map<String, Object> details;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class FieldError {
        private String field;
        private String message;
        private Object rejectedValue;
    }
}
```

---

## Custom Exceptions

### Base Application Exception

```java
package com.example.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public abstract class ApplicationException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    protected ApplicationException(String message, HttpStatus status, String errorCode) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    protected ApplicationException(String message, HttpStatus status, String errorCode, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.errorCode = errorCode;
    }
}
```

### Specific Exceptions

```java
package com.example.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends ApplicationException {

    public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue) {
        super(
            String.format("%s not found with %s: '%s'", resourceName, fieldName, fieldValue),
            HttpStatus.NOT_FOUND,
            "RESOURCE_NOT_FOUND"
        );
    }

    public ResourceNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
    }
}

public class BadRequestException extends ApplicationException {

    public BadRequestException(String message) {
        super(message, HttpStatus.BAD_REQUEST, "BAD_REQUEST");
    }

    public BadRequestException(String message, String errorCode) {
        super(message, HttpStatus.BAD_REQUEST, errorCode);
    }
}

public class ConflictException extends ApplicationException {

    public ConflictException(String message) {
        super(message, HttpStatus.CONFLICT, "CONFLICT");
    }

    public ConflictException(String resourceName, String fieldName, Object fieldValue) {
        super(
            String.format("%s already exists with %s: '%s'", resourceName, fieldName, fieldValue),
            HttpStatus.CONFLICT,
            "RESOURCE_ALREADY_EXISTS"
        );
    }
}

public class UnauthorizedException extends ApplicationException {

    public UnauthorizedException(String message) {
        super(message, HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
    }
}

public class ForbiddenException extends ApplicationException {

    public ForbiddenException(String message) {
        super(message, HttpStatus.FORBIDDEN, "FORBIDDEN");
    }
}

public class ServiceUnavailableException extends ApplicationException {

    public ServiceUnavailableException(String message) {
        super(message, HttpStatus.SERVICE_UNAVAILABLE, "SERVICE_UNAVAILABLE");
    }

    public ServiceUnavailableException(String message, Throwable cause) {
        super(message, HttpStatus.SERVICE_UNAVAILABLE, "SERVICE_UNAVAILABLE", cause);
    }
}
```

---

## Global Exception Handler

```java
package com.example.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
@Slf4j
public class GlobalExceptionHandler {

    private final TraceIdProvider traceIdProvider;

    // Handle custom application exceptions
    @ExceptionHandler(ApplicationException.class)
    public ResponseEntity<ErrorResponse> handleApplicationException(
            ApplicationException ex, HttpServletRequest request) {

        log.error("Application exception: {}", ex.getMessage());

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(ex.getStatus().value())
            .error(ex.getErrorCode())
            .message(ex.getMessage())
            .path(request.getRequestURI())
            .traceId(traceIdProvider.getTraceId())
            .build();

        return new ResponseEntity<>(error, ex.getStatus());
    }

    // Handle validation errors from @Valid
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(
            MethodArgumentNotValidException ex, HttpServletRequest request) {

        List<ErrorResponse.FieldError> fieldErrors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(error -> new ErrorResponse.FieldError(
                error.getField(),
                error.getDefaultMessage(),
                error.getRejectedValue()
            ))
            .collect(Collectors.toList());

        log.warn("Validation failed: {}", fieldErrors);

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("VALIDATION_FAILED")
            .message("One or more fields have validation errors")
            .path(request.getRequestURI())
            .traceId(traceIdProvider.getTraceId())
            .fieldErrors(fieldErrors)
            .build();

        return ResponseEntity.badRequest().body(error);
    }

    // Handle constraint violations (e.g., @PathVariable, @RequestParam validation)
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(
            ConstraintViolationException ex, HttpServletRequest request) {

        List<ErrorResponse.FieldError> fieldErrors = ex.getConstraintViolations()
            .stream()
            .map(violation -> new ErrorResponse.FieldError(
                violation.getPropertyPath().toString(),
                violation.getMessage(),
                violation.getInvalidValue()
            ))
            .collect(Collectors.toList());

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("CONSTRAINT_VIOLATION")
            .message("Request parameters validation failed")
            .path(request.getRequestURI())
            .traceId(traceIdProvider.getTraceId())
            .fieldErrors(fieldErrors)
            .build();

        return ResponseEntity.badRequest().body(error);
    }

    // Handle invalid JSON
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleMessageNotReadable(
            HttpMessageNotReadableException ex, HttpServletRequest request) {

        log.warn("Invalid request body: {}", ex.getMessage());

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("MALFORMED_JSON")
            .message("Request body is not valid JSON")
            .path(request.getRequestURI())
            .traceId(traceIdProvider.getTraceId())
            .build();

        return ResponseEntity.badRequest().body(error);
    }

    // Handle missing request parameters
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParams(
            MissingServletRequestParameterException ex, HttpServletRequest request) {

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("MISSING_PARAMETER")
            .message(String.format("Required parameter '%s' is missing", ex.getParameterName()))
            .path(request.getRequestURI())
            .traceId(traceIdProvider.getTraceId())
            .build();

        return ResponseEntity.badRequest().body(error);
    }

    // Handle type mismatch
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request) {

        String message = String.format("Parameter '%s' should be of type %s",
            ex.getName(), ex.getRequiredType().getSimpleName());

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("TYPE_MISMATCH")
            .message(message)
            .path(request.getRequestURI())
            .traceId(traceIdProvider.getTraceId())
            .build();

        return ResponseEntity.badRequest().body(error);
    }

    // Handle unsupported HTTP method
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.METHOD_NOT_ALLOWED.value())
            .error("METHOD_NOT_ALLOWED")
            .message(String.format("HTTP method '%s' is not supported for this endpoint", ex.getMethod()))
            .path(request.getRequestURI())
            .traceId(traceIdProvider.getTraceId())
            .build();

        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(error);
    }

    // Handle unsupported media type
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMediaTypeNotSupported(
            HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.UNSUPPORTED_MEDIA_TYPE.value())
            .error("UNSUPPORTED_MEDIA_TYPE")
            .message(String.format("Media type '%s' is not supported", ex.getContentType()))
            .path(request.getRequestURI())
            .traceId(traceIdProvider.getTraceId())
            .build();

        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(error);
    }

    // Handle 404 errors
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoHandlerFound(
            NoHandlerFoundException ex, HttpServletRequest request) {

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.NOT_FOUND.value())
            .error("ENDPOINT_NOT_FOUND")
            .message(String.format("Endpoint '%s %s' not found", ex.getHttpMethod(), ex.getRequestURL()))
            .path(request.getRequestURI())
            .traceId(traceIdProvider.getTraceId())
            .build();

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    // Handle database constraint violations
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(
            DataIntegrityViolationException ex, HttpServletRequest request) {

        log.error("Data integrity violation", ex);

        String message = "Database constraint violation";
        if (ex.getMessage().contains("unique constraint") ||
            ex.getMessage().contains("Duplicate entry")) {
            message = "A record with this value already exists";
        }

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.CONFLICT.value())
            .error("DATA_INTEGRITY_VIOLATION")
            .message(message)
            .path(request.getRequestURI())
            .traceId(traceIdProvider.getTraceId())
            .build();

        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    // Handle file upload size exceeded
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSize(
            MaxUploadSizeExceededException ex, HttpServletRequest request) {

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.PAYLOAD_TOO_LARGE.value())
            .error("FILE_TOO_LARGE")
            .message("File size exceeds the maximum allowed limit")
            .path(request.getRequestURI())
            .traceId(traceIdProvider.getTraceId())
            .build();

        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(error);
    }

    // Handle access denied (403)
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request) {

        log.warn("Access denied: {}", request.getRequestURI());

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.FORBIDDEN.value())
            .error("ACCESS_DENIED")
            .message("You don't have permission to access this resource")
            .path(request.getRequestURI())
            .traceId(traceIdProvider.getTraceId())
            .build();

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    // Handle bad credentials
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(
            BadCredentialsException ex, HttpServletRequest request) {

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.UNAUTHORIZED.value())
            .error("INVALID_CREDENTIALS")
            .message("Invalid username or password")
            .path(request.getRequestURI())
            .traceId(traceIdProvider.getTraceId())
            .build();

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    // Catch-all handler for unexpected exceptions
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleAllUncaughtException(
            Exception ex, HttpServletRequest request) {

        log.error("Unexpected error occurred", ex);

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
            .error("INTERNAL_ERROR")
            .message("An unexpected error occurred. Please try again later.")
            .path(request.getRequestURI())
            .traceId(traceIdProvider.getTraceId())
            .build();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
```

---

## Trace ID Provider

```java
package com.example.exception;

import io.micrometer.tracing.Tracer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class TraceIdProvider {

    private final Optional<Tracer> tracer;

    public String getTraceId() {
        return tracer
            .map(Tracer::currentSpan)
            .map(span -> span.context().traceId())
            .orElse(null);
    }
}
```

---

## Usage in Controllers

```java
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(userService.createUser(request));
    }
}

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return mapToResponse(user);
    }

    public UserResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("User", "email", request.getEmail());
        }
        // Create user...
    }
}
```

---

## Error Response Examples

### Validation Error

```json
{
  "timestamp": "2025-12-22T10:30:00Z",
  "status": 400,
  "error": "VALIDATION_FAILED",
  "message": "One or more fields have validation errors",
  "path": "/api/users",
  "traceId": "abc123def456",
  "fieldErrors": [
    {
      "field": "email",
      "message": "must be a valid email address",
      "rejectedValue": "invalid-email"
    },
    {
      "field": "age",
      "message": "must be at least 18",
      "rejectedValue": 15
    }
  ]
}
```

### Not Found Error

```json
{
  "timestamp": "2025-12-22T10:30:00Z",
  "status": 404,
  "error": "RESOURCE_NOT_FOUND",
  "message": "User not found with id: '999'",
  "path": "/api/users/999",
  "traceId": "abc123def456"
}
```

---

## Best Practices

1. **Consistent Response Format** - Use the same structure for all errors
2. **Include Trace IDs** - Help with debugging and support
3. **Log Appropriately** - Warn for client errors, error for server errors
4. **Don't Expose Internal Details** - Hide stack traces in production
5. **Use HTTP Status Codes Correctly** - Match status to error type
6. **Document Error Codes** - Help API consumers handle errors

---

## Conclusion

Global exception handling provides consistent, professional error responses:

- Use @ControllerAdvice for centralized exception handling
- Create custom exceptions for business logic errors
- Return structured error responses with trace IDs
- Handle validation errors with field-level details
- Log errors appropriately based on severity

With these patterns, your API will provide clear, consistent error information to clients.

---

*Need to monitor your API error rates? [OneUptime](https://oneuptime.com) provides comprehensive error tracking with alerting and trend analysis.*
