# How to Implement Custom Error Decoder in Feign

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Java, Spring Boot, Feign, Microservices

Description: Build custom error decoders for Feign clients to handle API errors gracefully with proper exception mapping and retry logic.

---

When building microservices with Spring Cloud OpenFeign, you will encounter HTTP errors from downstream services. The default error handling throws a generic `FeignException` for any non-2xx response, which makes it difficult to handle specific error scenarios in your application. Custom error decoders let you parse error responses, map them to meaningful exceptions, and decide which errors should trigger retries.

This guide walks through implementing production-ready error decoders for Feign clients.

## Understanding the ErrorDecoder Interface

Feign provides the `ErrorDecoder` interface with a single method that gets called whenever a response has a non-2xx status code.

```java
public interface ErrorDecoder {
    Exception decode(String methodKey, Response response);
}
```

The `methodKey` parameter contains information about which Feign client method was called (format: `ClientName#methodName(ArgTypes)`). The `response` object gives you access to the HTTP status, headers, and response body.

Here is what the default implementation looks like:

```java
public class Default implements ErrorDecoder {

    private final RetryAfterDecoder retryAfterDecoder = new RetryAfterDecoder();

    @Override
    public Exception decode(String methodKey, Response response) {
        FeignException exception = FeignException.errorStatus(methodKey, response);

        Date retryAfter = retryAfterDecoder.apply(
            firstOrNull(response.headers(), RETRY_AFTER)
        );

        if (retryAfter != null) {
            return new RetryableException(
                response.status(),
                exception.getMessage(),
                response.request().httpMethod(),
                exception,
                retryAfter,
                response.request()
            );
        }

        return exception;
    }
}
```

The default decoder only handles the `Retry-After` header and wraps everything else in a `FeignException`. This is rarely sufficient for real applications.

## Setting Up the Project

Add these dependencies to your `pom.xml`:

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-openfeign</artifactId>
    </dependency>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
</dependencies>

<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-dependencies</artifactId>
            <version>2023.0.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

## Defining Custom Exceptions

Before building the error decoder, define exception classes that represent different error scenarios. This creates a clear contract for error handling throughout your application.

```java
package com.example.feign.exception;

/**
 * Base exception for all API errors.
 * Extend this for specific error types.
 */
public abstract class ApiException extends RuntimeException {

    private final int statusCode;
    private final String errorCode;

    protected ApiException(String message, int statusCode, String errorCode) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }

    protected ApiException(String message, int statusCode, String errorCode, Throwable cause) {
        super(message, cause);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
```

Now create specific exception types for different HTTP status categories:

```java
package com.example.feign.exception;

/**
 * Thrown when a requested resource does not exist (404).
 */
public class ResourceNotFoundException extends ApiException {

    private final String resourceType;
    private final String resourceId;

    public ResourceNotFoundException(String resourceType, String resourceId) {
        super(
            String.format("%s with id '%s' not found", resourceType, resourceId),
            404,
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
package com.example.feign.exception;

/**
 * Thrown when the request contains invalid data (400).
 */
public class BadRequestException extends ApiException {

    private final Map<String, List<String>> fieldErrors;

    public BadRequestException(String message, Map<String, List<String>> fieldErrors) {
        super(message, 400, "BAD_REQUEST");
        this.fieldErrors = fieldErrors != null ? fieldErrors : Collections.emptyMap();
    }

    public Map<String, List<String>> getFieldErrors() {
        return fieldErrors;
    }
}
```

```java
package com.example.feign.exception;

/**
 * Thrown when rate limits are exceeded (429).
 * Includes retry information for the caller.
 */
public class RateLimitExceededException extends ApiException {

    private final long retryAfterSeconds;

    public RateLimitExceededException(String message, long retryAfterSeconds) {
        super(message, 429, "RATE_LIMIT_EXCEEDED");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
```

```java
package com.example.feign.exception;

/**
 * Thrown for server errors (5xx) that may be transient.
 * These errors are candidates for retry.
 */
public class ServiceUnavailableException extends ApiException {

    private final boolean retryable;

    public ServiceUnavailableException(String message, int statusCode, boolean retryable) {
        super(message, statusCode, "SERVICE_UNAVAILABLE");
        this.retryable = retryable;
    }

    public boolean isRetryable() {
        return retryable;
    }
}
```

```java
package com.example.feign.exception;

/**
 * Thrown when authentication or authorization fails (401, 403).
 */
public class AuthenticationException extends ApiException {

    public AuthenticationException(String message, int statusCode) {
        super(message, statusCode, statusCode == 401 ? "UNAUTHORIZED" : "FORBIDDEN");
    }
}
```

## Parsing Error Response Bodies

Most APIs return structured error responses. Define a model that matches your downstream services' error format:

```java
package com.example.feign.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Standard error response format.
 * Adjust fields based on your API's actual error format.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class ErrorResponse {

    private String message;
    private String errorCode;
    private Instant timestamp;
    private String path;
    private Map<String, List<String>> fieldErrors;
    private String traceId;

    // Default constructor for Jackson
    public ErrorResponse() {}

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public Map<String, List<String>> getFieldErrors() {
        return fieldErrors;
    }

    public void setFieldErrors(Map<String, List<String>> fieldErrors) {
        this.fieldErrors = fieldErrors;
    }

    public String getTraceId() {
        return traceId;
    }

    public void setTraceId(String traceId) {
        this.traceId = traceId;
    }
}
```

## Building the Custom Error Decoder

Now implement the error decoder that parses responses and throws appropriate exceptions:

```java
package com.example.feign.decoder;

import com.example.feign.exception.*;
import com.example.feign.model.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.Response;
import feign.RetryableException;
import feign.codec.ErrorDecoder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collection;
import java.util.Date;

/**
 * Custom error decoder that maps HTTP errors to domain exceptions.
 * Handles response body parsing and retry logic.
 */
public class CustomErrorDecoder implements ErrorDecoder {

    private static final Logger log = LoggerFactory.getLogger(CustomErrorDecoder.class);

    private final ObjectMapper objectMapper;
    private final ErrorDecoder defaultDecoder = new Default();

    public CustomErrorDecoder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public Exception decode(String methodKey, Response response) {
        int status = response.status();
        ErrorResponse errorResponse = parseErrorResponse(response);

        log.warn(
            "Feign error - method: {}, status: {}, message: {}",
            methodKey,
            status,
            errorResponse != null ? errorResponse.getMessage() : "unknown"
        );

        // Map status codes to specific exceptions
        return switch (status) {
            case 400 -> handleBadRequest(errorResponse);
            case 401, 403 -> handleAuthError(status, errorResponse);
            case 404 -> handleNotFound(methodKey, errorResponse);
            case 409 -> handleConflict(errorResponse);
            case 429 -> handleRateLimit(response, errorResponse);
            case 500, 502, 503, 504 -> handleServerError(methodKey, response, status, errorResponse);
            default -> defaultDecoder.decode(methodKey, response);
        };
    }

    /**
     * Parse the response body into an ErrorResponse object.
     * Returns null if parsing fails.
     */
    private ErrorResponse parseErrorResponse(Response response) {
        if (response.body() == null) {
            return null;
        }

        try (InputStream bodyStream = response.body().asInputStream()) {
            return objectMapper.readValue(bodyStream, ErrorResponse.class);
        } catch (IOException e) {
            log.debug("Failed to parse error response body", e);
            return null;
        }
    }

    private BadRequestException handleBadRequest(ErrorResponse errorResponse) {
        String message = errorResponse != null ? errorResponse.getMessage() : "Bad request";
        var fieldErrors = errorResponse != null ? errorResponse.getFieldErrors() : null;
        return new BadRequestException(message, fieldErrors);
    }

    private AuthenticationException handleAuthError(int status, ErrorResponse errorResponse) {
        String message = errorResponse != null ? errorResponse.getMessage() : "Authentication failed";
        return new AuthenticationException(message, status);
    }

    private ResourceNotFoundException handleNotFound(String methodKey, ErrorResponse errorResponse) {
        // Extract resource type from method key if possible
        String resourceType = extractResourceType(methodKey);
        String resourceId = "unknown";

        if (errorResponse != null && errorResponse.getErrorCode() != null) {
            // Some APIs include resource ID in error response
            resourceId = errorResponse.getErrorCode();
        }

        return new ResourceNotFoundException(resourceType, resourceId);
    }

    private ApiException handleConflict(ErrorResponse errorResponse) {
        String message = errorResponse != null ? errorResponse.getMessage() : "Resource conflict";
        return new ApiException(message, 409, "CONFLICT") {};
    }

    private RateLimitExceededException handleRateLimit(Response response, ErrorResponse errorResponse) {
        long retryAfter = extractRetryAfterSeconds(response);
        String message = errorResponse != null ? errorResponse.getMessage() : "Rate limit exceeded";
        return new RateLimitExceededException(message, retryAfter);
    }

    private Exception handleServerError(
            String methodKey,
            Response response,
            int status,
            ErrorResponse errorResponse
    ) {
        String message = errorResponse != null ? errorResponse.getMessage() : "Server error";

        // 503 and 504 are typically transient - make them retryable
        if (status == 503 || status == 504) {
            Date retryAfter = extractRetryAfterDate(response);
            return new RetryableException(
                status,
                message,
                response.request().httpMethod(),
                new ServiceUnavailableException(message, status, true),
                retryAfter,
                response.request()
            );
        }

        // 500 and 502 might be permanent failures
        return new ServiceUnavailableException(message, status, false);
    }

    /**
     * Extract resource type from Feign method key.
     * Method key format: ClientName#methodName(ArgTypes)
     */
    private String extractResourceType(String methodKey) {
        if (methodKey == null) {
            return "Resource";
        }

        // Extract client name and guess resource type
        int hashIndex = methodKey.indexOf('#');
        if (hashIndex > 0) {
            String clientName = methodKey.substring(0, hashIndex);
            // Remove "Client" suffix if present
            return clientName.replace("Client", "");
        }

        return "Resource";
    }

    /**
     * Parse Retry-After header value as seconds.
     */
    private long extractRetryAfterSeconds(Response response) {
        Collection<String> retryAfterValues = response.headers().get("Retry-After");
        if (retryAfterValues == null || retryAfterValues.isEmpty()) {
            return 60; // Default to 60 seconds
        }

        String retryAfter = retryAfterValues.iterator().next();
        try {
            return Long.parseLong(retryAfter);
        } catch (NumberFormatException e) {
            return 60;
        }
    }

    /**
     * Parse Retry-After header as a Date for RetryableException.
     */
    private Date extractRetryAfterDate(Response response) {
        long seconds = extractRetryAfterSeconds(response);
        return new Date(System.currentTimeMillis() + (seconds * 1000));
    }
}
```

## Retryable vs Non-Retryable Errors

Understanding which errors should trigger retries is important for building resilient systems. Here is a comparison:

| HTTP Status | Error Type | Retryable | Reason |
|-------------|-----------|-----------|--------|
| 400 | Bad Request | No | Client error - request is malformed |
| 401 | Unauthorized | No | Authentication required - retry will not help |
| 403 | Forbidden | No | Permission denied - retry will not help |
| 404 | Not Found | No | Resource does not exist |
| 409 | Conflict | Maybe | Depends on the conflict type |
| 429 | Rate Limited | Yes | Temporary - retry after delay |
| 500 | Internal Error | Maybe | Could be transient or permanent |
| 502 | Bad Gateway | Yes | Usually transient |
| 503 | Service Unavailable | Yes | Service is temporarily down |
| 504 | Gateway Timeout | Yes | Temporary network issue |

To make an error retryable in Feign, wrap it in a `RetryableException`. Feign's `Retryer` will only retry when this exception type is thrown.

Here is a dedicated retryable error decoder:

```java
package com.example.feign.decoder;

import feign.Response;
import feign.RetryableException;
import feign.codec.ErrorDecoder;

import java.util.Date;
import java.util.Set;

/**
 * Error decoder that marks specific status codes as retryable.
 * Use this when you want automatic retries for transient failures.
 */
public class RetryableErrorDecoder implements ErrorDecoder {

    private static final Set<Integer> RETRYABLE_STATUS_CODES = Set.of(
        429,  // Rate limited
        502,  // Bad gateway
        503,  // Service unavailable
        504   // Gateway timeout
    );

    private final ErrorDecoder delegate;
    private final long defaultRetryIntervalMs;

    public RetryableErrorDecoder(ErrorDecoder delegate, long defaultRetryIntervalMs) {
        this.delegate = delegate;
        this.defaultRetryIntervalMs = defaultRetryIntervalMs;
    }

    @Override
    public Exception decode(String methodKey, Response response) {
        Exception exception = delegate.decode(methodKey, response);

        if (RETRYABLE_STATUS_CODES.contains(response.status())) {
            Date retryAfter = calculateRetryAfter(response);
            return new RetryableException(
                response.status(),
                exception.getMessage(),
                response.request().httpMethod(),
                exception,
                retryAfter,
                response.request()
            );
        }

        return exception;
    }

    private Date calculateRetryAfter(Response response) {
        // Check for Retry-After header first
        var retryAfterHeader = response.headers().get("Retry-After");
        if (retryAfterHeader != null && !retryAfterHeader.isEmpty()) {
            try {
                long seconds = Long.parseLong(retryAfterHeader.iterator().next());
                return new Date(System.currentTimeMillis() + (seconds * 1000));
            } catch (NumberFormatException ignored) {
                // Fall through to default
            }
        }

        return new Date(System.currentTimeMillis() + defaultRetryIntervalMs);
    }
}
```

## Configuring the Retryer

The error decoder works with Feign's `Retryer` to implement retry logic:

```java
package com.example.feign.config;

import feign.Retryer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Configure retry behavior for Feign clients.
 */
@Configuration
public class FeignRetryConfig {

    /**
     * Custom retryer with exponential backoff.
     * - Initial interval: 100ms
     * - Max interval: 1 second
     * - Max attempts: 3
     */
    @Bean
    public Retryer feignRetryer() {
        return new Retryer.Default(
            100,                          // period (initial interval in ms)
            TimeUnit.SECONDS.toMillis(1), // maxPeriod (max interval in ms)
            3                             // maxAttempts
        );
    }
}
```

For more control over retry behavior, implement a custom retryer:

```java
package com.example.feign.config;

import feign.RetryableException;
import feign.Retryer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Custom retryer with configurable backoff and attempt limits.
 * Logs retry attempts for debugging.
 */
public class LoggingRetryer implements Retryer {

    private static final Logger log = LoggerFactory.getLogger(LoggingRetryer.class);

    private final int maxAttempts;
    private final long initialBackoffMs;
    private final double backoffMultiplier;
    private final long maxBackoffMs;

    private int attempt;
    private long currentBackoffMs;

    public LoggingRetryer(int maxAttempts, long initialBackoffMs, double backoffMultiplier, long maxBackoffMs) {
        this.maxAttempts = maxAttempts;
        this.initialBackoffMs = initialBackoffMs;
        this.backoffMultiplier = backoffMultiplier;
        this.maxBackoffMs = maxBackoffMs;
        this.attempt = 1;
        this.currentBackoffMs = initialBackoffMs;
    }

    @Override
    public void continueOrPropagate(RetryableException e) {
        if (attempt >= maxAttempts) {
            log.warn("Max retry attempts ({}) reached, giving up", maxAttempts);
            throw e;
        }

        log.info(
            "Retry attempt {} of {} after {}ms - status: {}, reason: {}",
            attempt,
            maxAttempts,
            currentBackoffMs,
            e.status(),
            e.getMessage()
        );

        try {
            Thread.sleep(currentBackoffMs);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw e;
        }

        attempt++;
        currentBackoffMs = Math.min(
            (long) (currentBackoffMs * backoffMultiplier),
            maxBackoffMs
        );
    }

    @Override
    public Retryer clone() {
        return new LoggingRetryer(maxAttempts, initialBackoffMs, backoffMultiplier, maxBackoffMs);
    }
}
```

## Global Configuration

To apply the custom error decoder to all Feign clients, create a global configuration:

```java
package com.example.feign.config;

import com.example.feign.decoder.CustomErrorDecoder;
import com.example.feign.decoder.RetryableErrorDecoder;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.Retryer;
import feign.codec.ErrorDecoder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Global Feign configuration applied to all clients.
 * Place this class in a package that is scanned by Spring.
 */
@Configuration
public class GlobalFeignConfig {

    @Bean
    public ErrorDecoder errorDecoder(ObjectMapper objectMapper) {
        // Wrap custom decoder with retry support
        CustomErrorDecoder customDecoder = new CustomErrorDecoder(objectMapper);
        return new RetryableErrorDecoder(customDecoder, 1000);
    }

    @Bean
    public Retryer retryer() {
        // Exponential backoff: 100ms, 200ms, 400ms (max 3 attempts)
        return new LoggingRetryer(3, 100, 2.0, 1000);
    }
}
```

## Per-Client Configuration

Sometimes different clients need different error handling. Feign supports per-client configuration:

```java
package com.example.feign.config;

import com.example.feign.decoder.CustomErrorDecoder;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.Retryer;
import feign.codec.ErrorDecoder;
import org.springframework.context.annotation.Bean;

/**
 * Configuration for a specific Feign client.
 * Do NOT annotate with @Configuration to avoid global application.
 */
public class PaymentClientConfig {

    @Bean
    public ErrorDecoder paymentErrorDecoder(ObjectMapper objectMapper) {
        // Payment service has different error format
        return new PaymentServiceErrorDecoder(objectMapper);
    }

    @Bean
    public Retryer paymentRetryer() {
        // More aggressive retry for payment service
        return new LoggingRetryer(5, 200, 1.5, 2000);
    }
}
```

Apply this configuration to a specific client:

```java
package com.example.feign.client;

import com.example.feign.config.PaymentClientConfig;
import com.example.feign.model.PaymentRequest;
import com.example.feign.model.PaymentResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

/**
 * Feign client for payment service with custom configuration.
 */
@FeignClient(
    name = "payment-service",
    url = "${services.payment.url}",
    configuration = PaymentClientConfig.class
)
public interface PaymentClient {

    @PostMapping("/api/v1/payments")
    PaymentResponse processPayment(@RequestBody PaymentRequest request);
}
```

## Service-Specific Error Decoder Example

Here is an error decoder tailored for a payment service with a different error format:

```java
package com.example.feign.decoder;

import com.example.feign.exception.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.Response;
import feign.codec.ErrorDecoder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;

/**
 * Error decoder for payment service which returns errors in a different format.
 */
public class PaymentServiceErrorDecoder implements ErrorDecoder {

    private static final Logger log = LoggerFactory.getLogger(PaymentServiceErrorDecoder.class);

    private final ObjectMapper objectMapper;
    private final ErrorDecoder defaultDecoder = new Default();

    public PaymentServiceErrorDecoder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Payment service error response format.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class PaymentError {
        public String code;
        public String description;
        public String transactionId;
        public boolean declineRetryable;
    }

    @Override
    public Exception decode(String methodKey, Response response) {
        PaymentError error = parsePaymentError(response);
        int status = response.status();

        if (error == null) {
            return defaultDecoder.decode(methodKey, response);
        }

        log.warn(
            "Payment error - code: {}, txn: {}, message: {}",
            error.code,
            error.transactionId,
            error.description
        );

        // Map payment-specific error codes
        return switch (error.code) {
            case "INSUFFICIENT_FUNDS" -> new PaymentDeclinedException(
                error.description,
                error.transactionId,
                error.declineRetryable
            );
            case "CARD_EXPIRED" -> new PaymentDeclinedException(
                error.description,
                error.transactionId,
                false
            );
            case "FRAUD_DETECTED" -> new FraudDetectedException(
                error.description,
                error.transactionId
            );
            case "GATEWAY_TIMEOUT" -> new ServiceUnavailableException(
                error.description,
                status,
                true
            );
            default -> defaultDecoder.decode(methodKey, response);
        };
    }

    private PaymentError parsePaymentError(Response response) {
        if (response.body() == null) {
            return null;
        }

        try (InputStream bodyStream = response.body().asInputStream()) {
            return objectMapper.readValue(bodyStream, PaymentError.class);
        } catch (IOException e) {
            log.debug("Failed to parse payment error response", e);
            return null;
        }
    }
}
```

And the custom payment exceptions:

```java
package com.example.feign.exception;

/**
 * Thrown when a payment is declined by the processor.
 */
public class PaymentDeclinedException extends ApiException {

    private final String transactionId;
    private final boolean retryable;

    public PaymentDeclinedException(String message, String transactionId, boolean retryable) {
        super(message, 402, "PAYMENT_DECLINED");
        this.transactionId = transactionId;
        this.retryable = retryable;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public boolean isRetryable() {
        return retryable;
    }
}
```

```java
package com.example.feign.exception;

/**
 * Thrown when fraud is detected during payment processing.
 */
public class FraudDetectedException extends ApiException {

    private final String transactionId;

    public FraudDetectedException(String message, String transactionId) {
        super(message, 403, "FRAUD_DETECTED");
        this.transactionId = transactionId;
    }

    public String getTransactionId() {
        return transactionId;
    }
}
```

## Testing the Error Decoder

Write unit tests to verify your error decoder behavior:

```java
package com.example.feign.decoder;

import com.example.feign.exception.*;
import com.example.feign.model.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.Request;
import feign.Response;
import feign.RetryableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CustomErrorDecoderTest {

    private CustomErrorDecoder decoder;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        decoder = new CustomErrorDecoder(objectMapper);
    }

    @Test
    void shouldDecodeNotFoundAsResourceNotFoundException() throws Exception {
        // Arrange
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setMessage("User not found");
        errorResponse.setErrorCode("user-123");

        Response response = buildResponse(404, errorResponse);

        // Act
        Exception result = decoder.decode("UserClient#getUser(String)", response);

        // Assert
        assertThat(result).isInstanceOf(ResourceNotFoundException.class);
        ResourceNotFoundException ex = (ResourceNotFoundException) result;
        assertThat(ex.getResourceType()).isEqualTo("User");
    }

    @Test
    void shouldDecodeBadRequestWithFieldErrors() throws Exception {
        // Arrange
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setMessage("Validation failed");
        errorResponse.setFieldErrors(Map.of("email", java.util.List.of("Invalid format")));

        Response response = buildResponse(400, errorResponse);

        // Act
        Exception result = decoder.decode("UserClient#createUser(User)", response);

        // Assert
        assertThat(result).isInstanceOf(BadRequestException.class);
        BadRequestException ex = (BadRequestException) result;
        assertThat(ex.getFieldErrors()).containsKey("email");
    }

    @Test
    void shouldDecodeServiceUnavailableAsRetryable() throws Exception {
        // Arrange
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setMessage("Service temporarily unavailable");

        Response response = buildResponse(503, errorResponse);

        // Act
        Exception result = decoder.decode("UserClient#getUser(String)", response);

        // Assert
        assertThat(result).isInstanceOf(RetryableException.class);
        RetryableException ex = (RetryableException) result;
        assertThat(ex.status()).isEqualTo(503);
    }

    @Test
    void shouldHandleEmptyResponseBody() {
        // Arrange
        Response response = Response.builder()
            .status(500)
            .reason("Internal Server Error")
            .request(buildRequest())
            .headers(Collections.emptyMap())
            .build();

        // Act
        Exception result = decoder.decode("UserClient#getUser(String)", response);

        // Assert
        assertThat(result).isInstanceOf(ServiceUnavailableException.class);
    }

    private Response buildResponse(int status, ErrorResponse body) throws Exception {
        String jsonBody = objectMapper.writeValueAsString(body);
        return Response.builder()
            .status(status)
            .reason("Error")
            .request(buildRequest())
            .headers(Collections.emptyMap())
            .body(jsonBody, StandardCharsets.UTF_8)
            .build();
    }

    private Request buildRequest() {
        return Request.create(
            Request.HttpMethod.GET,
            "/api/users/123",
            Collections.emptyMap(),
            null,
            StandardCharsets.UTF_8,
            null
        );
    }
}
```

## Handling Response Body Consumption

One gotcha with Feign error decoders is that the response body can only be read once. If you need to read it multiple times or pass it to multiple handlers, buffer it first:

```java
package com.example.feign.decoder;

import feign.Response;
import feign.Util;
import feign.codec.ErrorDecoder;

import java.io.IOException;

/**
 * Error decoder that buffers the response body for multiple reads.
 */
public class BufferingErrorDecoder implements ErrorDecoder {

    private final ErrorDecoder delegate;

    public BufferingErrorDecoder(ErrorDecoder delegate) {
        this.delegate = delegate;
    }

    @Override
    public Exception decode(String methodKey, Response response) {
        // Buffer the response body so it can be read multiple times
        try {
            if (response.body() != null) {
                byte[] bodyData = Util.toByteArray(response.body().asInputStream());
                Response bufferedResponse = response.toBuilder()
                    .body(bodyData)
                    .build();
                return delegate.decode(methodKey, bufferedResponse);
            }
        } catch (IOException e) {
            // Fall through to delegate with original response
        }

        return delegate.decode(methodKey, response);
    }
}
```

## Logging and Observability

Add detailed logging to help debug production issues:

```java
package com.example.feign.decoder;

import feign.Response;
import feign.codec.ErrorDecoder;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

/**
 * Error decoder wrapper that adds logging and metrics.
 */
public class ObservableErrorDecoder implements ErrorDecoder {

    private static final Logger log = LoggerFactory.getLogger(ObservableErrorDecoder.class);

    private final ErrorDecoder delegate;
    private final MeterRegistry meterRegistry;

    public ObservableErrorDecoder(ErrorDecoder delegate, MeterRegistry meterRegistry) {
        this.delegate = delegate;
        this.meterRegistry = meterRegistry;
    }

    @Override
    public Exception decode(String methodKey, Response response) {
        int status = response.status();
        String clientName = extractClientName(methodKey);

        // Record metric
        Counter.builder("feign.client.errors")
            .tag("client", clientName)
            .tag("status", String.valueOf(status))
            .tag("status_group", status / 100 + "xx")
            .register(meterRegistry)
            .increment();

        // Add context to MDC for logging
        MDC.put("feign.client", clientName);
        MDC.put("feign.method", methodKey);
        MDC.put("feign.status", String.valueOf(status));

        try {
            log.error(
                "Feign client error - client: {}, method: {}, status: {}, url: {}",
                clientName,
                methodKey,
                status,
                response.request().url()
            );

            return delegate.decode(methodKey, response);
        } finally {
            MDC.remove("feign.client");
            MDC.remove("feign.method");
            MDC.remove("feign.status");
        }
    }

    private String extractClientName(String methodKey) {
        int hashIndex = methodKey.indexOf('#');
        return hashIndex > 0 ? methodKey.substring(0, hashIndex) : "unknown";
    }
}
```

## Complete Configuration Example

Here is the full configuration bringing everything together:

```java
package com.example.feign.config;

import com.example.feign.decoder.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.Logger;
import feign.Retryer;
import feign.codec.ErrorDecoder;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FeignConfiguration {

    @Bean
    public ErrorDecoder errorDecoder(ObjectMapper objectMapper, MeterRegistry meterRegistry) {
        // Build the decoder chain
        CustomErrorDecoder customDecoder = new CustomErrorDecoder(objectMapper);
        BufferingErrorDecoder bufferingDecoder = new BufferingErrorDecoder(customDecoder);
        RetryableErrorDecoder retryableDecoder = new RetryableErrorDecoder(bufferingDecoder, 1000);
        return new ObservableErrorDecoder(retryableDecoder, meterRegistry);
    }

    @Bean
    public Retryer retryer() {
        return new LoggingRetryer(3, 100, 2.0, 1000);
    }

    @Bean
    public Logger.Level feignLoggerLevel() {
        return Logger.Level.BASIC;
    }
}
```

## Summary

Custom error decoders in Feign give you control over how HTTP errors are handled in your microservices. The key points to remember:

1. Implement `ErrorDecoder` interface to intercept non-2xx responses
2. Parse error response bodies to extract meaningful error information
3. Map HTTP status codes to domain-specific exceptions
4. Use `RetryableException` to trigger automatic retries for transient failures
5. Configure `Retryer` to control retry behavior with exponential backoff
6. Apply configurations globally or per-client as needed
7. Add logging and metrics for production observability

With proper error handling, your Feign clients become more resilient and your applications can respond appropriately to different failure scenarios.
