# How to Build a Global Exception Handler in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Exception Handling, REST API, Error Handling

Description: Learn how to build a centralized global exception handler in Spring Boot using @ControllerAdvice. This guide covers error response formatting, logging, validation errors, and best practices for clean API error handling.

---

Every API needs consistent error handling. Without it, your clients receive inconsistent error formats, stack traces leak in production, and debugging becomes a nightmare. Spring Boot's `@ControllerAdvice` provides a clean way to handle exceptions globally across all your controllers.

This guide shows you how to build a production-ready exception handling system that provides consistent error responses, proper logging, and useful debugging information without exposing sensitive details.

---

## The Problem with Default Exception Handling

By default, Spring Boot returns stack traces and internal details that:
- Expose implementation details to clients
- Provide inconsistent error formats across endpoints
- Make client-side error handling difficult
- Risk leaking sensitive information

A global exception handler solves these problems by centralizing error handling logic.

---

## Basic Global Exception Handler

Start with a simple `@ControllerAdvice` class that catches all exceptions:

```java
// GlobalExceptionHandler.java
// Centralized exception handling for all controllers
package com.example.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

import java.time.Instant;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // Catch-all handler for unhandled exceptions
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleAllExceptions(
            Exception ex, WebRequest request) {

        log.error("Unhandled exception: {}", ex.getMessage(), ex);

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
            .error("Internal Server Error")
            .message("An unexpected error occurred")
            .path(request.getDescription(false).replace("uri=", ""))
            .build();

        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
```

---

## Standardized Error Response Structure

Define a consistent error response format that works for all error types:

```java
// ErrorResponse.java
// Standardized error response structure for API errors
package com.example.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)  // Omit null fields from JSON
public class ErrorResponse {

    // When the error occurred
    private final Instant timestamp;

    // HTTP status code
    private final int status;

    // Short error type description
    private final String error;

    // Human-readable error message
    private final String message;

    // Request path that caused the error
    private final String path;

    // Unique identifier for tracing this error in logs
    private final String traceId;

    // Validation errors for 400 Bad Request responses
    // Maps field name to list of validation messages
    private final Map<String, List<String>> validationErrors;

    // Additional details for debugging (only in dev/staging)
    private final Object details;
}
```

---

## Custom Business Exceptions

Define domain-specific exceptions that carry meaningful error information:

```java
// BusinessException.java
// Base class for all business logic exceptions
package com.example.exception;

import org.springframework.http.HttpStatus;

public class BusinessException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    public BusinessException(String message, HttpStatus status, String errorCode) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    public BusinessException(String message, HttpStatus status, String errorCode, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.errorCode = errorCode;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
```

```java
// ResourceNotFoundException.java
// Thrown when a requested resource does not exist
package com.example.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends BusinessException {

    private final String resourceType;
    private final String resourceId;

    public ResourceNotFoundException(String resourceType, String resourceId) {
        super(
            String.format("%s not found with id: %s", resourceType, resourceId),
            HttpStatus.NOT_FOUND,
            "RESOURCE_NOT_FOUND"
        );
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }

    public String getResourceType() {
        return resourceType;
    }

    public String getResourceId() {
        return resourceId;
    }
}
```

```java
// ValidationException.java
// Thrown when request data fails validation
package com.example.exception;

import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

public class ValidationException extends BusinessException {

    private final Map<String, List<String>> errors;

    public ValidationException(Map<String, List<String>> errors) {
        super("Validation failed", HttpStatus.BAD_REQUEST, "VALIDATION_ERROR");
        this.errors = errors;
    }

    public Map<String, List<String>> getErrors() {
        return errors;
    }
}
```

```java
// ConflictException.java
// Thrown when an operation conflicts with current state
package com.example.exception;

import org.springframework.http.HttpStatus;

public class ConflictException extends BusinessException {

    public ConflictException(String message) {
        super(message, HttpStatus.CONFLICT, "CONFLICT");
    }

    public ConflictException(String resourceType, String field, String value) {
        super(
            String.format("%s with %s '%s' already exists", resourceType, field, value),
            HttpStatus.CONFLICT,
            "DUPLICATE_RESOURCE"
        );
    }
}
```

---

## Comprehensive Exception Handler

Build a complete exception handler that handles different exception types appropriately:

```java
// GlobalExceptionHandler.java
// Production-ready global exception handler
package com.example.exception;

import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final MeterRegistry meterRegistry;

    // Include stack traces in error responses only in non-production environments
    @Value("${app.include-error-details:false}")
    private boolean includeErrorDetails;

    public GlobalExceptionHandler(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    // Handle custom business exceptions
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(
            BusinessException ex, WebRequest request) {

        String traceId = getOrCreateTraceId();

        log.warn("Business exception [{}]: {} - {}",
            traceId, ex.getErrorCode(), ex.getMessage());

        incrementErrorCounter(ex.getErrorCode(), ex.getStatus().value());

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(ex.getStatus().value())
            .error(ex.getErrorCode())
            .message(ex.getMessage())
            .path(extractPath(request))
            .traceId(traceId)
            .build();

        return new ResponseEntity<>(error, ex.getStatus());
    }

    // Handle resource not found with extra context
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(
            ResourceNotFoundException ex, WebRequest request) {

        String traceId = getOrCreateTraceId();

        log.info("Resource not found [{}]: {} with id {}",
            traceId, ex.getResourceType(), ex.getResourceId());

        incrementErrorCounter("RESOURCE_NOT_FOUND", 404);

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.NOT_FOUND.value())
            .error("RESOURCE_NOT_FOUND")
            .message(ex.getMessage())
            .path(extractPath(request))
            .traceId(traceId)
            .build();

        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    // Handle validation exceptions with field-level errors
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            ValidationException ex, WebRequest request) {

        String traceId = getOrCreateTraceId();

        log.info("Validation failed [{}]: {}", traceId, ex.getErrors());

        incrementErrorCounter("VALIDATION_ERROR", 400);

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("VALIDATION_ERROR")
            .message("Validation failed")
            .path(extractPath(request))
            .traceId(traceId)
            .validationErrors(ex.getErrors())
            .build();

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // Handle Spring's @Valid annotation failures
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, WebRequest request) {

        String traceId = getOrCreateTraceId();

        // Extract field-level validation errors
        Map<String, List<String>> validationErrors = new HashMap<>();

        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            validationErrors
                .computeIfAbsent(fieldError.getField(), k -> new ArrayList<>())
                .add(fieldError.getDefaultMessage());
        }

        log.info("Request validation failed [{}]: {}", traceId, validationErrors);

        incrementErrorCounter("VALIDATION_ERROR", 400);

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("VALIDATION_ERROR")
            .message("Request validation failed")
            .path(extractPath(request))
            .traceId(traceId)
            .validationErrors(validationErrors)
            .build();

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // Handle constraint violations (path/query parameter validation)
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(
            ConstraintViolationException ex, WebRequest request) {

        String traceId = getOrCreateTraceId();

        Map<String, List<String>> validationErrors = new HashMap<>();

        for (ConstraintViolation<?> violation : ex.getConstraintViolations()) {
            String field = violation.getPropertyPath().toString();
            validationErrors
                .computeIfAbsent(field, k -> new ArrayList<>())
                .add(violation.getMessage());
        }

        log.info("Constraint violation [{}]: {}", traceId, validationErrors);

        incrementErrorCounter("VALIDATION_ERROR", 400);

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("VALIDATION_ERROR")
            .message("Parameter validation failed")
            .path(extractPath(request))
            .traceId(traceId)
            .validationErrors(validationErrors)
            .build();

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // Handle malformed JSON requests
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex, WebRequest request) {

        String traceId = getOrCreateTraceId();

        log.warn("Malformed request body [{}]: {}", traceId, ex.getMessage());

        incrementErrorCounter("MALFORMED_REQUEST", 400);

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("MALFORMED_REQUEST")
            .message("Request body is malformed or missing")
            .path(extractPath(request))
            .traceId(traceId)
            .build();

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // Handle missing required request parameters
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParameter(
            MissingServletRequestParameterException ex, WebRequest request) {

        String traceId = getOrCreateTraceId();

        log.info("Missing parameter [{}]: {}", traceId, ex.getParameterName());

        incrementErrorCounter("MISSING_PARAMETER", 400);

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("MISSING_PARAMETER")
            .message(String.format("Required parameter '%s' is missing", ex.getParameterName()))
            .path(extractPath(request))
            .traceId(traceId)
            .build();

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // Handle type mismatches (e.g., string instead of number)
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, WebRequest request) {

        String traceId = getOrCreateTraceId();

        String expectedType = ex.getRequiredType() != null
            ? ex.getRequiredType().getSimpleName()
            : "unknown";

        log.info("Type mismatch [{}]: parameter {} expected {}", traceId, ex.getName(), expectedType);

        incrementErrorCounter("TYPE_MISMATCH", 400);

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("TYPE_MISMATCH")
            .message(String.format("Parameter '%s' should be of type %s", ex.getName(), expectedType))
            .path(extractPath(request))
            .traceId(traceId)
            .build();

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // Handle unsupported HTTP methods
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException ex, WebRequest request) {

        String traceId = getOrCreateTraceId();

        incrementErrorCounter("METHOD_NOT_ALLOWED", 405);

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.METHOD_NOT_ALLOWED.value())
            .error("METHOD_NOT_ALLOWED")
            .message(String.format("HTTP method '%s' is not supported for this endpoint", ex.getMethod()))
            .path(extractPath(request))
            .traceId(traceId)
            .build();

        return new ResponseEntity<>(error, HttpStatus.METHOD_NOT_ALLOWED);
    }

    // Handle unsupported media types
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMediaTypeNotSupported(
            HttpMediaTypeNotSupportedException ex, WebRequest request) {

        String traceId = getOrCreateTraceId();

        incrementErrorCounter("UNSUPPORTED_MEDIA_TYPE", 415);

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.UNSUPPORTED_MEDIA_TYPE.value())
            .error("UNSUPPORTED_MEDIA_TYPE")
            .message(String.format("Content type '%s' is not supported", ex.getContentType()))
            .path(extractPath(request))
            .traceId(traceId)
            .build();

        return new ResponseEntity<>(error, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    // Handle 404 for undefined endpoints
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoHandlerFound(
            NoHandlerFoundException ex, WebRequest request) {

        String traceId = getOrCreateTraceId();

        incrementErrorCounter("ENDPOINT_NOT_FOUND", 404);

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.NOT_FOUND.value())
            .error("ENDPOINT_NOT_FOUND")
            .message(String.format("No handler found for %s %s", ex.getHttpMethod(), ex.getRequestURL()))
            .path(extractPath(request))
            .traceId(traceId)
            .build();

        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    // Catch-all for unhandled exceptions
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleAllExceptions(
            Exception ex, WebRequest request) {

        String traceId = getOrCreateTraceId();

        // Log full stack trace for debugging
        log.error("Unhandled exception [{}]: {}", traceId, ex.getMessage(), ex);

        incrementErrorCounter("INTERNAL_ERROR", 500);

        ErrorResponse.ErrorResponseBuilder builder = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
            .error("INTERNAL_ERROR")
            .message("An unexpected error occurred. Please try again later.")
            .path(extractPath(request))
            .traceId(traceId);

        // Include exception details only in non-production environments
        if (includeErrorDetails) {
            builder.details(Map.of(
                "exception", ex.getClass().getName(),
                "message", ex.getMessage()
            ));
        }

        return new ResponseEntity<>(builder.build(), HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Get trace ID from MDC (set by tracing infrastructure) or generate one
    private String getOrCreateTraceId() {
        String traceId = MDC.get("traceId");
        if (traceId == null || traceId.isEmpty()) {
            traceId = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        }
        return traceId;
    }

    // Extract path from WebRequest
    private String extractPath(WebRequest request) {
        return request.getDescription(false).replace("uri=", "");
    }

    // Track error metrics for monitoring
    private void incrementErrorCounter(String errorCode, int statusCode) {
        meterRegistry.counter("api_errors_total",
            "error_code", errorCode,
            "status_code", String.valueOf(statusCode)
        ).increment();
    }
}
```

---

## Configuration for 404 Handler

Enable Spring to throw `NoHandlerFoundException` for undefined endpoints:

```yaml
# application.yml
spring:
  mvc:
    throw-exception-if-no-handler-found: true
  web:
    resources:
      add-mappings: false  # Disable default static resource handling

app:
  # Set to true in development/staging, false in production
  include-error-details: ${INCLUDE_ERROR_DETAILS:false}
```

---

## Using the Custom Exceptions

Now your services can throw meaningful exceptions:

```java
// UserService.java
// Service demonstrating exception usage
package com.example.service;

import com.example.exception.ConflictException;
import com.example.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getUser(String userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }

    public User createUser(CreateUserRequest request) {
        // Check for duplicate email
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("User", "email", request.getEmail());
        }

        User user = new User(request);
        return userRepository.save(user);
    }
}
```

---

## Example Error Responses

Here are example responses your API will return:

**404 Not Found:**
```json
{
  "timestamp": "2026-01-27T10:15:30.123Z",
  "status": 404,
  "error": "RESOURCE_NOT_FOUND",
  "message": "User not found with id: abc123",
  "path": "/api/users/abc123",
  "traceId": "a1b2c3d4e5f6g7h8"
}
```

**400 Validation Error:**
```json
{
  "timestamp": "2026-01-27T10:15:30.123Z",
  "status": 400,
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "path": "/api/users",
  "traceId": "a1b2c3d4e5f6g7h8",
  "validationErrors": {
    "email": ["must be a valid email address"],
    "name": ["must not be blank", "size must be between 2 and 100"]
  }
}
```

**409 Conflict:**
```json
{
  "timestamp": "2026-01-27T10:15:30.123Z",
  "status": 409,
  "error": "DUPLICATE_RESOURCE",
  "message": "User with email 'john@example.com' already exists",
  "path": "/api/users",
  "traceId": "a1b2c3d4e5f6g7h8"
}
```

---

## Best Practices

1. **Never expose stack traces in production** - Stack traces reveal implementation details and potential vulnerabilities

2. **Use trace IDs** - Include a unique identifier in every error response so users can report issues with a reference you can find in logs

3. **Log appropriately** - Use INFO for expected errors (validation, not found), WARN for business rule violations, ERROR for unexpected failures

4. **Track error metrics** - Monitor error rates and types to identify problems early

5. **Keep error messages helpful but safe** - Provide enough information for clients to fix their requests without revealing sensitive system details

6. **Use consistent error codes** - Define a catalog of error codes that clients can programmatically handle

---

## Conclusion

A global exception handler is essential for any production Spring Boot API. It provides consistent error responses, proper logging, and protects against information leakage. Start with the basic structure and add handlers for specific exception types as your application grows.

---

*Consistent error handling is part of building reliable APIs. [OneUptime](https://oneuptime.com) helps you monitor your API health and track error rates so you can catch problems before they affect users.*

**Related Reading:**
- [How to Implement Retry with Exponential Backoff in Spring](https://oneuptime.com/blog/post/2026-01-25-retry-exponential-backoff-spring/view)
- [How to Export Prometheus Metrics with Micrometer in Spring](https://oneuptime.com/blog/post/2026-01-26-prometheus-metrics-micrometer-spring/view)
