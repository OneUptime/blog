# How to Implement Retry Logic in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Retry, Resilience, Fault Tolerance

Description: Learn how to implement retry logic in Spring Boot with Spring Retry. This guide covers annotations, templates, and backoff strategies.

---

Applications fail. External services become temporarily unavailable. Database connections drop. Network requests time out. Without retry logic, these transient failures cascade into user-facing errors that could have been avoided with a simple second attempt.

Spring Retry provides a clean, declarative approach to retry logic in Spring Boot applications. This guide covers everything from simple `@Retryable` annotations to advanced `RetryTemplate` configurations, backoff strategies, recovery methods, and retry listeners.

---

## Why Retry Logic Matters

Consider an e-commerce application calling a payment gateway. The gateway might occasionally return a timeout due to network congestion, but the next request succeeds. Without retry logic, you lose that sale. With proper retry logic, the application recovers automatically.

| Scenario | Without Retry | With Retry |
|----------|--------------|------------|
| Network timeout | Error returned to user | Automatic recovery |
| Service restart | Request fails | Brief delay, then success |
| Database connection dropped | Transaction fails | Reconnection and completion |
| Rate limiting | Request rejected | Backoff and successful retry |

---

## Setting Up Spring Retry

Add Spring Retry to your project. You need both the retry library and AOP support for annotation processing.

```xml
<!-- pom.xml -->
<dependencies>
    <dependency>
        <groupId>org.springframework.retry</groupId>
        <artifactId>spring-retry</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-aop</artifactId>
    </dependency>
</dependencies>
```

For Gradle users:

```groovy
// build.gradle
dependencies {
    implementation 'org.springframework.retry:spring-retry'
    implementation 'org.springframework.boot:spring-boot-starter-aop'
}
```

Enable retry processing in your configuration:

```java
// RetryConfiguration.java
package com.example.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.retry.annotation.EnableRetry;

@Configuration
@EnableRetry
public class RetryConfiguration {
    // Spring Retry is now enabled for @Retryable annotations
}
```

---

## Basic @Retryable Annotation

The `@Retryable` annotation is the simplest way to add retry logic. Annotate any method and Spring automatically retries on failure.

```java
// ExternalApiService.java
package com.example.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
public class ExternalApiService {

    private static final Logger log = LoggerFactory.getLogger(ExternalApiService.class);
    private final RestTemplate restTemplate;

    public ExternalApiService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // Retry up to 3 times when RestClientException is thrown
    @Retryable(retryFor = RestClientException.class, maxAttempts = 3)
    public String fetchData(String url) {
        log.info("Attempting to fetch data from: {}", url);
        return restTemplate.getForObject(url, String.class);
    }
}
```

This method retries up to 3 times when a `RestClientException` occurs. By default, there is no delay between retries.

---

## Specifying Exceptions to Retry

Control which exceptions trigger retries and which should fail immediately:

```java
// OrderService.java
package com.example.service;

import com.example.exception.BusinessValidationException;
import com.example.exception.TransientServiceException;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.HttpServerErrorException;

import java.io.IOException;
import java.net.SocketTimeoutException;

@Service
public class OrderService {

    // Retry for network and server errors
    // Do NOT retry for business validation errors
    @Retryable(
        retryFor = {
            IOException.class,
            SocketTimeoutException.class,
            ResourceAccessException.class,
            HttpServerErrorException.class,
            TransientServiceException.class
        },
        noRetryFor = {
            BusinessValidationException.class,
            IllegalArgumentException.class
        },
        maxAttempts = 4
    )
    public OrderResponse createOrder(OrderRequest request) {
        log.info("Creating order for customer: {}", request.getCustomerId());
        return orderClient.submitOrder(request);
    }
}
```

The `retryFor` parameter specifies which exceptions trigger retries. The `noRetryFor` parameter specifies exceptions that should fail immediately without retry.

---

## Backoff Strategies with @Backoff

Without backoff, retries happen immediately. This can overwhelm a struggling service. Backoff adds delays between retries, giving the failing service time to recover.

### Fixed Delay Backoff

Wait a fixed amount of time between each retry:

```java
// NotificationService.java
package com.example.service;

import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    // Wait 2 seconds between each retry attempt
    @Retryable(
        retryFor = NotificationException.class,
        maxAttempts = 3,
        backoff = @Backoff(delay = 2000)  // 2 seconds
    )
    public void sendNotification(String userId, String message) {
        log.info("Sending notification to user: {}", userId);
        notificationGateway.send(userId, message);
    }
}
```

### Exponential Backoff

Double the delay after each failure. This progressively reduces load on a struggling service:

```java
// PaymentService.java
package com.example.service;

import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;

@Service
public class PaymentService {

    // Exponential backoff: 1s, 2s, 4s, 8s...
    // Multiplier doubles the delay each attempt
    @Retryable(
        retryFor = PaymentGatewayException.class,
        maxAttempts = 5,
        backoff = @Backoff(
            delay = 1000,       // Initial delay: 1 second
            multiplier = 2.0,   // Double each time
            maxDelay = 30000    // Cap at 30 seconds
        )
    )
    public PaymentResult processPayment(PaymentRequest request) {
        log.info("Processing payment for order: {}", request.getOrderId());
        return paymentGateway.charge(request);
    }
}
```

With `maxDelay`, you prevent excessive wait times. Without it, exponential growth could lead to very long delays.

### Random Backoff

Add randomness to prevent synchronized retries from multiple clients (thundering herd problem):

```java
// InventoryService.java
package com.example.service;

import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;

@Service
public class InventoryService {

    // Random delay between 1-3 seconds
    // Prevents multiple clients from retrying at the exact same time
    @Retryable(
        retryFor = InventoryException.class,
        maxAttempts = 4,
        backoff = @Backoff(
            delay = 1000,        // Minimum delay
            maxDelay = 3000,     // Maximum delay
            random = true        // Randomize between delay and maxDelay
        )
    )
    public int checkStock(String productId) {
        log.info("Checking stock for product: {}", productId);
        return inventoryClient.getAvailableQuantity(productId);
    }
}
```

---

## Recovery Methods with @Recover

When all retries are exhausted, the `@Recover` annotation defines fallback behavior. This prevents exceptions from propagating to the caller.

```java
// EmailService.java
package com.example.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final EmailGateway emailGateway;
    private final EmailQueueRepository emailQueue;

    public EmailService(EmailGateway emailGateway, EmailQueueRepository emailQueue) {
        this.emailGateway = emailGateway;
        this.emailQueue = emailQueue;
    }

    @Retryable(
        retryFor = EmailDeliveryException.class,
        maxAttempts = 3,
        backoff = @Backoff(delay = 2000, multiplier = 2)
    )
    public EmailResult sendEmail(String recipient, String subject, String body) {
        log.info("Attempting to send email to: {}", recipient);
        return emailGateway.send(recipient, subject, body);
    }

    // Recovery method called after all retries fail
    // Must match return type of the retryable method
    // Exception parameter must be first, followed by same method parameters
    @Recover
    public EmailResult recoverSendEmail(
            EmailDeliveryException ex,
            String recipient,
            String subject,
            String body) {

        log.warn("Email delivery failed after retries. Queuing for later: {}", recipient);

        // Queue the email for retry by a background job
        emailQueue.save(new QueuedEmail(recipient, subject, body));

        return EmailResult.builder()
            .status(EmailStatus.QUEUED)
            .message("Email queued for delayed delivery")
            .build();
    }
}
```

### Recovery Method Rules

The recovery method must follow these rules:

1. Same return type as the retryable method
2. First parameter is the exception type (or a parent class)
3. Remaining parameters match the retryable method parameters
4. Method must be in the same class as the retryable method

```java
// UserService.java
package com.example.service;

import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Retryable(retryFor = ServiceException.class, maxAttempts = 3)
    public User findUser(Long userId, boolean includeDetails) {
        return userClient.getUser(userId, includeDetails);
    }

    // Recovery for ServiceException
    @Recover
    public User recoverFindUser(ServiceException ex, Long userId, boolean includeDetails) {
        log.warn("Failed to find user {}: {}", userId, ex.getMessage());

        // Return cached user or create placeholder
        return userCache.get(userId)
            .orElse(User.placeholder(userId));
    }

    // Recovery for a more specific exception type
    // Spring chooses the most specific match
    @Recover
    public User recoverFindUserTimeout(TimeoutException ex, Long userId, boolean includeDetails) {
        log.warn("Timeout finding user {}, returning cached data", userId);
        return userCache.get(userId).orElseThrow();
    }
}
```

---

## RetryTemplate for Programmatic Control

When annotations are not flexible enough, use `RetryTemplate` for programmatic retry logic. This gives you full control over retry behavior.

### Basic RetryTemplate

```java
// RetryTemplateConfig.java
package com.example.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.backoff.ExponentialBackOffPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

@Configuration
public class RetryTemplateConfig {

    @Bean
    public RetryTemplate retryTemplate() {
        RetryTemplate template = new RetryTemplate();

        // Configure retry policy: max 4 attempts
        SimpleRetryPolicy retryPolicy = new SimpleRetryPolicy();
        retryPolicy.setMaxAttempts(4);
        template.setRetryPolicy(retryPolicy);

        // Configure backoff: exponential with 1s initial, 2x multiplier, 30s max
        ExponentialBackOffPolicy backOffPolicy = new ExponentialBackOffPolicy();
        backOffPolicy.setInitialInterval(1000);
        backOffPolicy.setMultiplier(2.0);
        backOffPolicy.setMaxInterval(30000);
        template.setBackOffPolicy(backOffPolicy);

        return template;
    }
}
```

### Using RetryTemplate

```java
// DataSyncService.java
package com.example.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.retry.support.RetryTemplate;
import org.springframework.stereotype.Service;

@Service
public class DataSyncService {

    private static final Logger log = LoggerFactory.getLogger(DataSyncService.class);

    private final RetryTemplate retryTemplate;
    private final ExternalDataSource dataSource;

    public DataSyncService(RetryTemplate retryTemplate, ExternalDataSource dataSource) {
        this.retryTemplate = retryTemplate;
        this.dataSource = dataSource;
    }

    public List<DataRecord> syncData(String sourceId) {
        return retryTemplate.execute(context -> {
            int attemptNumber = context.getRetryCount() + 1;
            log.info("Sync attempt {} for source: {}", attemptNumber, sourceId);

            return dataSource.fetchRecords(sourceId);
        });
    }

    // With recovery callback
    public List<DataRecord> syncDataWithRecovery(String sourceId) {
        return retryTemplate.execute(
            // Retry callback
            context -> {
                log.info("Attempt {} for source: {}", context.getRetryCount() + 1, sourceId);
                return dataSource.fetchRecords(sourceId);
            },
            // Recovery callback - called after all retries fail
            context -> {
                log.warn("All retries failed for source: {}. Returning cached data.", sourceId);
                return dataCache.get(sourceId);
            }
        );
    }
}
```

### Exception-Specific Retry Policies

Configure different retry behavior for different exceptions:

```java
// AdvancedRetryConfig.java
package com.example.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.backoff.ExponentialBackOffPolicy;
import org.springframework.retry.policy.ExceptionClassifierRetryPolicy;
import org.springframework.retry.policy.NeverRetryPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class AdvancedRetryConfig {

    @Bean
    public RetryTemplate advancedRetryTemplate() {
        RetryTemplate template = new RetryTemplate();

        // Different retry counts for different exceptions
        Map<Class<? extends Throwable>, Boolean> retryableExceptions = new HashMap<>();
        retryableExceptions.put(IOException.class, true);           // Retry IO errors
        retryableExceptions.put(TimeoutException.class, true);      // Retry timeouts
        retryableExceptions.put(ServiceUnavailableException.class, true);
        retryableExceptions.put(IllegalArgumentException.class, false);  // Never retry
        retryableExceptions.put(ValidationException.class, false);        // Never retry

        SimpleRetryPolicy retryPolicy = new SimpleRetryPolicy(5, retryableExceptions);
        template.setRetryPolicy(retryPolicy);

        // Exponential backoff with jitter
        ExponentialRandomBackOffPolicy backOffPolicy = new ExponentialRandomBackOffPolicy();
        backOffPolicy.setInitialInterval(1000);
        backOffPolicy.setMultiplier(2.0);
        backOffPolicy.setMaxInterval(30000);
        template.setBackOffPolicy(backOffPolicy);

        return template;
    }
}
```

---

## Custom Backoff Policies

Create custom backoff policies for specific requirements:

### Jitter Backoff Policy

```java
// JitterBackOffPolicy.java
package com.example.retry;

import org.springframework.retry.RetryContext;
import org.springframework.retry.backoff.BackOffContext;
import org.springframework.retry.backoff.BackOffInterruptedException;
import org.springframework.retry.backoff.BackOffPolicy;

import java.util.Random;

public class JitterBackOffPolicy implements BackOffPolicy {

    private final long baseDelay;
    private final double multiplier;
    private final long maxDelay;
    private final double jitterFactor;
    private final Random random = new Random();

    public JitterBackOffPolicy(long baseDelay, double multiplier, long maxDelay, double jitterFactor) {
        this.baseDelay = baseDelay;
        this.multiplier = multiplier;
        this.maxDelay = maxDelay;
        this.jitterFactor = jitterFactor;
    }

    @Override
    public BackOffContext start(RetryContext context) {
        return new JitterBackOffContext();
    }

    @Override
    public void backOff(BackOffContext backOffContext) throws BackOffInterruptedException {
        JitterBackOffContext context = (JitterBackOffContext) backOffContext;

        // Calculate exponential delay
        long delay = (long) (baseDelay * Math.pow(multiplier, context.getAttempt()));
        delay = Math.min(delay, maxDelay);

        // Add jitter: +/- jitterFactor percent
        double jitter = delay * jitterFactor * (random.nextDouble() * 2 - 1);
        long actualDelay = Math.max(0, delay + (long) jitter);

        context.incrementAttempt();

        try {
            Thread.sleep(actualDelay);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BackOffInterruptedException("Backoff interrupted", e);
        }
    }

    private static class JitterBackOffContext implements BackOffContext {
        private int attempt = 0;

        public int getAttempt() {
            return attempt;
        }

        public void incrementAttempt() {
            attempt++;
        }
    }
}
```

### Using Custom Backoff

```java
// CustomRetryConfig.java
package com.example.config;

import com.example.retry.JitterBackOffPolicy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

@Configuration
public class CustomRetryConfig {

    @Bean
    public RetryTemplate jitterRetryTemplate() {
        RetryTemplate template = new RetryTemplate();

        // Max 5 attempts
        SimpleRetryPolicy retryPolicy = new SimpleRetryPolicy();
        retryPolicy.setMaxAttempts(5);
        template.setRetryPolicy(retryPolicy);

        // Custom jitter backoff: 1s base, 2x multiplier, 30s max, 25% jitter
        JitterBackOffPolicy backOffPolicy = new JitterBackOffPolicy(1000, 2.0, 30000, 0.25);
        template.setBackOffPolicy(backOffPolicy);

        return template;
    }
}
```

---

## Retry Listeners

Listeners observe retry events for logging, metrics, and debugging. They fire on each retry attempt and on final success or failure.

### Creating a Retry Listener

```java
// LoggingRetryListener.java
package com.example.retry;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.retry.RetryCallback;
import org.springframework.retry.RetryContext;
import org.springframework.retry.listener.RetryListenerSupport;
import org.springframework.stereotype.Component;

@Component
public class LoggingRetryListener extends RetryListenerSupport {

    private static final Logger log = LoggerFactory.getLogger(LoggingRetryListener.class);

    @Override
    public <T, E extends Throwable> boolean open(RetryContext context, RetryCallback<T, E> callback) {
        log.info("Starting retry operation: {}", context.getAttribute(RetryContext.NAME));
        // Return true to proceed with retry, false to abort
        return true;
    }

    @Override
    public <T, E extends Throwable> void onError(
            RetryContext context,
            RetryCallback<T, E> callback,
            Throwable throwable) {

        log.warn("Retry attempt {} failed: {}",
            context.getRetryCount(),
            throwable.getMessage());
    }

    @Override
    public <T, E extends Throwable> void close(
            RetryContext context,
            RetryCallback<T, E> callback,
            Throwable throwable) {

        if (throwable == null) {
            log.info("Operation succeeded after {} attempts",
                context.getRetryCount() + 1);
        } else {
            log.error("Operation failed after {} attempts: {}",
                context.getRetryCount(),
                throwable.getMessage());
        }
    }
}
```

### Metrics Listener

```java
// MetricsRetryListener.java
package com.example.retry;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.retry.RetryCallback;
import org.springframework.retry.RetryContext;
import org.springframework.retry.listener.RetryListenerSupport;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

@Component
public class MetricsRetryListener extends RetryListenerSupport {

    private final MeterRegistry meterRegistry;
    private static final String TIMER_NAME = "retry.operation.duration";
    private static final String RETRY_COUNTER = "retry.attempts";
    private static final String SUCCESS_COUNTER = "retry.success";
    private static final String FAILURE_COUNTER = "retry.failure";

    public MetricsRetryListener(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @Override
    public <T, E extends Throwable> boolean open(RetryContext context, RetryCallback<T, E> callback) {
        context.setAttribute("startTime", Instant.now());
        return true;
    }

    @Override
    public <T, E extends Throwable> void onError(
            RetryContext context,
            RetryCallback<T, E> callback,
            Throwable throwable) {

        String operationName = getOperationName(context);

        Counter.builder(RETRY_COUNTER)
            .tag("operation", operationName)
            .tag("exception", throwable.getClass().getSimpleName())
            .tag("attempt", String.valueOf(context.getRetryCount()))
            .register(meterRegistry)
            .increment();
    }

    @Override
    public <T, E extends Throwable> void close(
            RetryContext context,
            RetryCallback<T, E> callback,
            Throwable throwable) {

        String operationName = getOperationName(context);
        Instant startTime = (Instant) context.getAttribute("startTime");
        Duration duration = Duration.between(startTime, Instant.now());

        // Record duration
        Timer.builder(TIMER_NAME)
            .tag("operation", operationName)
            .tag("success", String.valueOf(throwable == null))
            .register(meterRegistry)
            .record(duration);

        // Record success or failure
        if (throwable == null) {
            Counter.builder(SUCCESS_COUNTER)
                .tag("operation", operationName)
                .tag("retryCount", String.valueOf(context.getRetryCount()))
                .register(meterRegistry)
                .increment();
        } else {
            Counter.builder(FAILURE_COUNTER)
                .tag("operation", operationName)
                .tag("exception", throwable.getClass().getSimpleName())
                .register(meterRegistry)
                .increment();
        }
    }

    private String getOperationName(RetryContext context) {
        Object name = context.getAttribute(RetryContext.NAME);
        return name != null ? name.toString() : "unknown";
    }
}
```

### Registering Listeners

```java
// RetryListenerConfig.java
package com.example.config;

import com.example.retry.LoggingRetryListener;
import com.example.retry.MetricsRetryListener;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.backoff.ExponentialBackOffPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

@Configuration
public class RetryListenerConfig {

    @Bean
    public RetryTemplate monitoredRetryTemplate(
            LoggingRetryListener loggingListener,
            MetricsRetryListener metricsListener) {

        RetryTemplate template = new RetryTemplate();

        // Retry policy
        SimpleRetryPolicy retryPolicy = new SimpleRetryPolicy();
        retryPolicy.setMaxAttempts(4);
        template.setRetryPolicy(retryPolicy);

        // Backoff policy
        ExponentialBackOffPolicy backOffPolicy = new ExponentialBackOffPolicy();
        backOffPolicy.setInitialInterval(1000);
        backOffPolicy.setMultiplier(2.0);
        backOffPolicy.setMaxInterval(30000);
        template.setBackOffPolicy(backOffPolicy);

        // Register listeners
        template.registerListener(loggingListener);
        template.registerListener(metricsListener);

        return template;
    }
}
```

---

## Stateful Retry

Stateful retry maintains state across method invocations, useful for distributed transactions and message processing.

```java
// MessageProcessorService.java
package com.example.service;

import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MessageProcessorService {

    // Stateful retry uses the message ID to track retry state
    // If the same message fails multiple times across different invocations,
    // Spring Retry can track the retry count
    @Retryable(
        retryFor = ProcessingException.class,
        maxAttempts = 3,
        stateful = true,  // Enable stateful retry
        backoff = @Backoff(delay = 5000)
    )
    @Transactional
    public void processMessage(Message message) {
        log.info("Processing message: {}", message.getId());

        // Process the message
        processor.handle(message);

        // Mark as processed
        message.setStatus(MessageStatus.PROCESSED);
        messageRepository.save(message);
    }
}
```

### Stateful RetryTemplate

```java
// StatefulRetryConfig.java
package com.example.config;

import org.springframework.classify.Classifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.RetryPolicy;
import org.springframework.retry.backoff.ExponentialBackOffPolicy;
import org.springframework.retry.policy.ExceptionClassifierRetryPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

@Configuration
public class StatefulRetryConfig {

    @Bean
    public RetryTemplate statefulRetryTemplate() {
        RetryTemplate template = new RetryTemplate();

        // Policy that classifies exceptions
        ExceptionClassifierRetryPolicy policy = new ExceptionClassifierRetryPolicy();

        policy.setExceptionClassifier((Classifier<Throwable, RetryPolicy>) throwable -> {
            if (throwable instanceof TransientException) {
                // Retry transient errors up to 5 times
                SimpleRetryPolicy retryPolicy = new SimpleRetryPolicy();
                retryPolicy.setMaxAttempts(5);
                return retryPolicy;
            } else if (throwable instanceof RateLimitException) {
                // Retry rate limits up to 10 times with longer backoff
                SimpleRetryPolicy retryPolicy = new SimpleRetryPolicy();
                retryPolicy.setMaxAttempts(10);
                return retryPolicy;
            }
            // Do not retry other exceptions
            return new NeverRetryPolicy();
        });

        template.setRetryPolicy(policy);

        // Backoff
        ExponentialBackOffPolicy backOffPolicy = new ExponentialBackOffPolicy();
        backOffPolicy.setInitialInterval(1000);
        backOffPolicy.setMultiplier(2.0);
        backOffPolicy.setMaxInterval(60000);
        template.setBackOffPolicy(backOffPolicy);

        return template;
    }
}
```

---

## Retry Context and Attributes

Access retry information within your retryable methods:

```java
// ContextAwareService.java
package com.example.service;

import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.retry.support.RetrySynchronizationManager;
import org.springframework.stereotype.Service;

@Service
public class ContextAwareService {

    @Retryable(
        retryFor = ServiceException.class,
        maxAttempts = 5,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public DataResponse fetchData(String dataId) {
        // Access the current retry context
        var context = RetrySynchronizationManager.getContext();

        if (context != null) {
            int attemptNumber = context.getRetryCount() + 1;
            log.info("Fetch attempt {} for data: {}", attemptNumber, dataId);

            // Store custom attributes for use in recovery or listeners
            context.setAttribute("dataId", dataId);
            context.setAttribute("startTime", System.currentTimeMillis());

            // Check if this is the last attempt
            if (context.getRetryCount() >= 4) {
                log.warn("Last attempt for data: {}", dataId);
            }
        }

        return dataClient.fetch(dataId);
    }
}
```

---

## Retry with Circuit Breaker Pattern

Combine retry with circuit breaker to prevent hammering a failing service:

```java
// CircuitBreakerRetryService.java
package com.example.service;

import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.CircuitBreaker;
import org.springframework.retry.annotation.Recover;
import org.springframework.stereotype.Service;

@Service
public class CircuitBreakerRetryService {

    // Circuit breaker with retry
    // Opens after 3 failures, stays open for 10 seconds
    // When open, calls fail immediately without retry
    @CircuitBreaker(
        maxAttempts = 3,
        openTimeout = 10000,    // Circuit stays open for 10 seconds
        resetTimeout = 30000    // Reset failure count after 30 seconds of success
    )
    public ExternalData callExternalService(String requestId) {
        log.info("Calling external service for request: {}", requestId);
        return externalClient.getData(requestId);
    }

    @Recover
    public ExternalData recoverCallExternalService(Exception ex, String requestId) {
        log.warn("Circuit open or retries exhausted for request: {}. Using fallback.", requestId);
        return ExternalData.fallback(requestId);
    }
}
```

---

## Testing Retry Logic

Verify retry behavior with integration tests:

```java
// RetryServiceTest.java
package com.example.service;

import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@SpringBootTest
class RetryServiceTest {

    @Autowired
    private ExternalApiService service;

    @MockBean
    private ExternalClient externalClient;

    @Test
    void shouldRetryOnTransientFailure() {
        // First two calls fail, third succeeds
        when(externalClient.fetchData("test-id"))
            .thenThrow(new ServiceException("Connection refused"))
            .thenThrow(new ServiceException("Timeout"))
            .thenReturn("Success");

        String result = service.fetchData("test-id");

        assertThat(result).isEqualTo("Success");
        verify(externalClient, times(3)).fetchData("test-id");
    }

    @Test
    void shouldUseRecoveryAfterAllRetriesFail() {
        // All calls fail
        when(externalClient.fetchData("test-id"))
            .thenThrow(new ServiceException("Service down"));

        String result = service.fetchData("test-id");

        // Verify recovery method was called
        assertThat(result).isEqualTo("Fallback data");
        verify(externalClient, times(3)).fetchData("test-id");
    }

    @Test
    void shouldNotRetryNonRetryableException() {
        when(externalClient.fetchData("test-id"))
            .thenThrow(new IllegalArgumentException("Invalid ID"));

        assertThatThrownBy(() -> service.fetchData("test-id"))
            .isInstanceOf(IllegalArgumentException.class);

        // Should only be called once, no retries
        verify(externalClient, times(1)).fetchData("test-id");
    }

    @Test
    void shouldRespectBackoffDelays() {
        when(externalClient.fetchData("test-id"))
            .thenThrow(new ServiceException("Error"))
            .thenThrow(new ServiceException("Error"))
            .thenReturn("Success");

        long startTime = System.currentTimeMillis();
        service.fetchData("test-id");
        long duration = System.currentTimeMillis() - startTime;

        // With exponential backoff (1s, 2s), should take at least 3 seconds
        assertThat(duration).isGreaterThan(2500);
    }
}
```

---

## Real-World Example: Resilient HTTP Client

Complete example of a resilient HTTP client with retry, backoff, and recovery:

```java
// ResilientHttpClient.java
package com.example.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;

@Component
public class ResilientHttpClient {

    private static final Logger log = LoggerFactory.getLogger(ResilientHttpClient.class);

    private final RestTemplate restTemplate;
    private final ResponseCache responseCache;

    public ResilientHttpClient(RestTemplate restTemplate, ResponseCache responseCache) {
        this.restTemplate = restTemplate;
        this.responseCache = responseCache;
    }

    @Retryable(
        retryFor = {
            ResourceAccessException.class,     // Connection errors
            HttpServerErrorException.class     // 5xx errors
        },
        noRetryFor = {
            HttpClientErrorException.class     // 4xx errors - client's fault
        },
        maxAttempts = 4,
        backoff = @Backoff(
            delay = 1000,
            multiplier = 2.0,
            maxDelay = 15000,
            random = true
        )
    )
    public <T> ResponseEntity<T> get(String url, Class<T> responseType, HttpHeaders headers) {
        log.debug("GET request to: {}", url);

        HttpEntity<?> entity = new HttpEntity<>(headers);
        ResponseEntity<T> response = restTemplate.exchange(
            url, HttpMethod.GET, entity, responseType);

        // Cache successful response
        responseCache.put(url, response);

        return response;
    }

    @Recover
    public <T> ResponseEntity<T> recoverGet(
            Exception ex,
            String url,
            Class<T> responseType,
            HttpHeaders headers) {

        log.warn("GET request failed after retries: {} - {}", url, ex.getMessage());

        // Try to return cached response
        Optional<ResponseEntity<T>> cached = responseCache.get(url, responseType);
        if (cached.isPresent()) {
            log.info("Returning cached response for: {}", url);
            return cached.get();
        }

        // No cache available, re-throw
        throw new ServiceUnavailableException(
            "Service unavailable and no cached data: " + url, ex);
    }

    @Retryable(
        retryFor = {
            ResourceAccessException.class,
            HttpServerErrorException.class
        },
        noRetryFor = {
            HttpClientErrorException.class
        },
        maxAttempts = 3,
        backoff = @Backoff(delay = 2000, multiplier = 2.0, maxDelay = 10000)
    )
    public <T, R> ResponseEntity<R> post(
            String url,
            T body,
            Class<R> responseType,
            HttpHeaders headers) {

        log.debug("POST request to: {}", url);

        HttpEntity<T> entity = new HttpEntity<>(body, headers);
        return restTemplate.exchange(url, HttpMethod.POST, entity, responseType);
    }

    @Recover
    public <T, R> ResponseEntity<R> recoverPost(
            Exception ex,
            String url,
            T body,
            Class<R> responseType,
            HttpHeaders headers) {

        log.error("POST request failed after retries: {} - {}", url, ex.getMessage());

        // For POST requests, we typically cannot use cache
        // Throw a specific exception for the caller to handle
        throw new ServiceUnavailableException(
            "Service unavailable for POST request: " + url, ex);
    }
}
```

---

## Configuration Properties

Externalize retry configuration for different environments:

```java
// RetryProperties.java
package com.example.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.retry")
public class RetryProperties {

    private int maxAttempts = 3;
    private long initialDelay = 1000;
    private double multiplier = 2.0;
    private long maxDelay = 30000;
    private boolean randomBackoff = true;

    // Getters and setters
    public int getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }

    public long getInitialDelay() { return initialDelay; }
    public void setInitialDelay(long initialDelay) { this.initialDelay = initialDelay; }

    public double getMultiplier() { return multiplier; }
    public void setMultiplier(double multiplier) { this.multiplier = multiplier; }

    public long getMaxDelay() { return maxDelay; }
    public void setMaxDelay(long maxDelay) { this.maxDelay = maxDelay; }

    public boolean isRandomBackoff() { return randomBackoff; }
    public void setRandomBackoff(boolean randomBackoff) { this.randomBackoff = randomBackoff; }
}
```

```yaml
# application.yml
app:
  retry:
    max-attempts: 4
    initial-delay: 1000
    multiplier: 2.0
    max-delay: 30000
    random-backoff: true

# Different settings for production
---
spring:
  config:
    activate:
      on-profile: production

app:
  retry:
    max-attempts: 5
    initial-delay: 2000
    max-delay: 60000
```

```java
// DynamicRetryTemplateConfig.java
package com.example.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.backoff.ExponentialBackOffPolicy;
import org.springframework.retry.backoff.ExponentialRandomBackOffPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

@Configuration
public class DynamicRetryTemplateConfig {

    @Bean
    public RetryTemplate dynamicRetryTemplate(RetryProperties properties) {
        RetryTemplate template = new RetryTemplate();

        // Retry policy from properties
        SimpleRetryPolicy retryPolicy = new SimpleRetryPolicy();
        retryPolicy.setMaxAttempts(properties.getMaxAttempts());
        template.setRetryPolicy(retryPolicy);

        // Backoff policy from properties
        if (properties.isRandomBackoff()) {
            ExponentialRandomBackOffPolicy backOffPolicy = new ExponentialRandomBackOffPolicy();
            backOffPolicy.setInitialInterval(properties.getInitialDelay());
            backOffPolicy.setMultiplier(properties.getMultiplier());
            backOffPolicy.setMaxInterval(properties.getMaxDelay());
            template.setBackOffPolicy(backOffPolicy);
        } else {
            ExponentialBackOffPolicy backOffPolicy = new ExponentialBackOffPolicy();
            backOffPolicy.setInitialInterval(properties.getInitialDelay());
            backOffPolicy.setMultiplier(properties.getMultiplier());
            backOffPolicy.setMaxInterval(properties.getMaxDelay());
            template.setBackOffPolicy(backOffPolicy);
        }

        return template;
    }
}
```

---

## Best Practices

### Do Retry

- Network timeouts and connection errors
- HTTP 5xx server errors
- Database connection drops
- Rate limiting responses (HTTP 429)
- Service temporarily unavailable (HTTP 503)

### Do Not Retry

- Validation errors (HTTP 400)
- Authentication failures (HTTP 401)
- Authorization failures (HTTP 403)
- Resource not found (HTTP 404)
- Business logic exceptions

### Configuration Guidelines

| Setting | Recommendation |
|---------|----------------|
| Max attempts | 3-5 for user-facing, 5-10 for background jobs |
| Initial delay | 500ms-2s depending on downstream service |
| Multiplier | 2.0 is standard |
| Max delay | 30-60 seconds |
| Jitter | Always enable in production |

### Common Pitfalls

1. **Retrying non-idempotent operations**: Retrying a payment that partially succeeded can charge the customer twice
2. **Missing backoff**: Immediate retries can overwhelm a struggling service
3. **Retrying validation errors**: Wastes resources since the request will always fail
4. **Infinite retries**: Always set a maximum attempt limit
5. **Not monitoring retry rates**: High retry rates indicate underlying problems

---

## Summary

| Feature | Annotation | RetryTemplate |
|---------|------------|---------------|
| Simple retry | @Retryable | execute() |
| Exponential backoff | @Backoff(multiplier) | ExponentialBackOffPolicy |
| Recovery | @Recover | RecoveryCallback |
| Listeners | Via configuration | registerListener() |
| Stateful | stateful = true | StatefulRetryOperationsInterceptor |

Spring Retry provides powerful, declarative retry capabilities for Spring Boot applications. Start with `@Retryable` for simple cases and graduate to `RetryTemplate` when you need more control. Always use exponential backoff with jitter in production, and implement proper recovery methods for graceful degradation.

---

*Retry logic helps your application recover from transient failures, but you need visibility into when retries happen and why. [OneUptime](https://oneuptime.com) provides comprehensive monitoring to track retry patterns, identify failing services, and alert you before transient issues become outages.*
