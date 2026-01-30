# How to Build Async Methods with CompletableFuture in Spring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Java, Spring Boot, Async, Performance

Description: Implement asynchronous processing in Spring Boot using CompletableFuture with @Async, custom thread pools, exception handling, and composing multiple async operations.

---

## Introduction

When your Spring application needs to call multiple external services, process large datasets, or handle I/O-bound operations, blocking the main thread kills performance. CompletableFuture combined with Spring's @Async annotation gives you a clean way to execute tasks in parallel and compose results.

This guide walks through building production-ready async methods in Spring Boot. You will learn how to configure thread pools, chain async operations, handle failures gracefully, and test async code.

## Prerequisites

- Java 17 or later
- Spring Boot 3.x
- Basic understanding of Spring dependency injection

Add these dependencies to your `pom.xml`:

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

## Enabling Async Support

Spring does not enable async processing by default. You need to add the `@EnableAsync` annotation to a configuration class.

```java
package com.example.async.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

@Configuration
@EnableAsync
public class AsyncConfig {
    // Thread pool configuration will go here
}
```

This annotation tells Spring to look for methods marked with `@Async` and execute them in a separate thread.

## Basic @Async Usage

The simplest way to make a method async is to annotate it with `@Async` and return a `CompletableFuture`.

```java
package com.example.async.service;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class UserService {

    // This method runs in a separate thread managed by Spring
    @Async
    public CompletableFuture<User> findUserById(Long id) {
        // Simulate a slow database or API call
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        User user = new User(id, "john.doe@example.com", "John Doe");
        return CompletableFuture.completedFuture(user);
    }

    // Fire-and-forget async method, no return value needed
    @Async
    public void sendWelcomeEmail(String email) {
        // Email sending logic here
        System.out.println("Sending email to: " + email);
    }
}
```

Important rules for `@Async` methods:

| Rule | Explanation |
|------|-------------|
| Must be public | Spring proxies cannot intercept private methods |
| Cannot be called from the same class | Self-invocation bypasses the proxy |
| Return void or Future | Use CompletableFuture for results |
| Class must be a Spring bean | Annotate with @Service, @Component, etc. |

## Configuring Custom Thread Pools

The default thread pool in Spring has no upper bound, which can exhaust system resources under heavy load. Always configure a custom thread pool for production.

```java
package com.example.async.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    // Primary thread pool for general async operations
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        // Initial number of threads
        executor.setCorePoolSize(4);

        // Maximum threads when queue is full
        executor.setMaxPoolSize(8);

        // Queue capacity before creating new threads
        executor.setQueueCapacity(100);

        // Thread name prefix for debugging
        executor.setThreadNamePrefix("Async-");

        // Wait for tasks to complete on shutdown
        executor.setWaitForTasksToCompleteOnShutdown(true);

        // Maximum wait time on shutdown
        executor.setAwaitTerminationSeconds(30);

        executor.initialize();
        return executor;
    }

    // Dedicated thread pool for I/O heavy operations
    @Bean(name = "ioExecutor")
    public Executor ioExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("IO-Async-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();
        return executor;
    }
}
```

### Thread Pool Sizing Guidelines

| Operation Type | Core Pool Size | Max Pool Size | Queue Capacity |
|----------------|----------------|---------------|----------------|
| CPU-bound | Number of CPUs | Number of CPUs | Small (10-50) |
| I/O-bound | Number of CPUs * 2 | Number of CPUs * 4 | Large (100-500) |
| Mixed | Number of CPUs | Number of CPUs * 2 | Medium (50-100) |

To use a specific executor, pass its name to the `@Async` annotation:

```java
@Service
public class FileService {

    // Uses the ioExecutor bean for file operations
    @Async("ioExecutor")
    public CompletableFuture<byte[]> readLargeFile(String path) {
        // File reading logic
        return CompletableFuture.completedFuture(new byte[0]);
    }
}
```

## CompletableFuture Composition

Real applications often need to chain multiple async operations or combine results from parallel calls. CompletableFuture provides methods for both scenarios.

### Sequential Chaining with thenApply and thenCompose

Use `thenApply` when the next step is synchronous, and `thenCompose` when it returns another CompletableFuture.

```java
package com.example.async.service;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class OrderService {

    private final UserService userService;
    private final InventoryService inventoryService;
    private final PaymentService paymentService;

    public OrderService(UserService userService,
                       InventoryService inventoryService,
                       PaymentService paymentService) {
        this.userService = userService;
        this.inventoryService = inventoryService;
        this.paymentService = paymentService;
    }

    // Chain async operations: fetch user, then validate, then process
    public CompletableFuture<OrderResult> processOrder(Long userId, String productId) {
        return userService.findUserById(userId)
            // thenApply: transform the result synchronously
            .thenApply(user -> {
                if (!user.isActive()) {
                    throw new IllegalStateException("User account is not active");
                }
                return user;
            })
            // thenCompose: chain another async operation
            .thenCompose(user -> inventoryService.checkStock(productId)
                .thenApply(stock -> new UserStockPair(user, stock)))
            // Another async chain for payment
            .thenCompose(pair -> {
                if (pair.stock() < 1) {
                    return CompletableFuture.failedFuture(
                        new IllegalStateException("Product out of stock")
                    );
                }
                return paymentService.processPayment(pair.user().getId(), productId);
            })
            // Final transformation
            .thenApply(paymentId -> new OrderResult(paymentId, "SUCCESS"));
    }

    // Helper record for passing multiple values through the chain
    private record UserStockPair(User user, Integer stock) {}
}
```

### Parallel Execution with allOf and anyOf

When you need results from multiple independent operations, run them in parallel.

```java
package com.example.async.service;

import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class DashboardService {

    private final UserService userService;
    private final OrderService orderService;
    private final NotificationService notificationService;

    public DashboardService(UserService userService,
                           OrderService orderService,
                           NotificationService notificationService) {
        this.userService = userService;
        this.orderService = orderService;
        this.notificationService = notificationService;
    }

    // Fetch all dashboard data in parallel
    public CompletableFuture<DashboardData> getDashboardData(Long userId) {
        // Start all async operations at the same time
        CompletableFuture<User> userFuture = userService.findUserById(userId);
        CompletableFuture<List<Order>> ordersFuture = orderService.getRecentOrders(userId);
        CompletableFuture<Integer> notificationCountFuture =
            notificationService.getUnreadCount(userId);

        // Wait for all to complete and combine results
        return CompletableFuture.allOf(userFuture, ordersFuture, notificationCountFuture)
            .thenApply(ignored -> {
                // All futures are complete, safe to call join()
                User user = userFuture.join();
                List<Order> orders = ordersFuture.join();
                Integer notificationCount = notificationCountFuture.join();

                return new DashboardData(user, orders, notificationCount);
            });
    }

    // Get the first successful result from multiple sources
    public CompletableFuture<ProductPrice> getProductPrice(String productId) {
        // Try multiple pricing services, use first response
        CompletableFuture<ProductPrice> primarySource =
            pricingServiceA.getPrice(productId);
        CompletableFuture<ProductPrice> fallbackSource =
            pricingServiceB.getPrice(productId);

        return CompletableFuture.anyOf(primarySource, fallbackSource)
            .thenApply(result -> (ProductPrice) result);
    }
}
```

### Combining Two Futures with thenCombine

When you need results from exactly two async operations:

```java
@Service
public class ReportService {

    // Combine results from two independent async calls
    public CompletableFuture<SalesReport> generateReport(String region, int year) {
        CompletableFuture<List<Sale>> salesFuture = salesService.getSales(region, year);
        CompletableFuture<List<Target>> targetsFuture = targetService.getTargets(region, year);

        // thenCombine waits for both and merges results
        return salesFuture.thenCombine(targetsFuture, (sales, targets) -> {
            double totalSales = sales.stream()
                .mapToDouble(Sale::getAmount)
                .sum();
            double totalTarget = targets.stream()
                .mapToDouble(Target::getAmount)
                .sum();

            return new SalesReport(region, year, totalSales, totalTarget);
        });
    }
}
```

## Exception Handling

Async code requires careful exception handling. Exceptions thrown in async methods do not propagate to the caller directly.

### Using exceptionally and handle

```java
@Service
public class ResilientUserService {

    private final UserRepository userRepository;
    private final UserCache userCache;

    public ResilientUserService(UserRepository userRepository, UserCache userCache) {
        this.userRepository = userRepository;
        this.userCache = userCache;
    }

    // Handle exceptions and provide fallback
    @Async
    public CompletableFuture<User> findUserWithFallback(Long id) {
        return CompletableFuture.supplyAsync(() -> userRepository.findById(id))
            // exceptionally: handle errors and return fallback
            .exceptionally(ex -> {
                System.err.println("Database error: " + ex.getMessage());
                // Try cache as fallback
                return userCache.get(id).orElse(User.anonymous());
            });
    }

    // Use handle for both success and error cases
    @Async
    public CompletableFuture<ApiResponse<User>> findUserSafe(Long id) {
        return CompletableFuture.supplyAsync(() -> userRepository.findById(id))
            // handle: process both success and failure
            .handle((user, ex) -> {
                if (ex != null) {
                    return ApiResponse.error("Failed to fetch user: " + ex.getMessage());
                }
                return ApiResponse.success(user);
            });
    }

    // Recover with another async operation
    @Async
    public CompletableFuture<User> findUserWithAsyncFallback(Long id) {
        return CompletableFuture.supplyAsync(() -> userRepository.findById(id))
            // exceptionallyCompose: async fallback
            .exceptionallyCompose(ex -> {
                System.err.println("Primary lookup failed, trying backup");
                return backupUserService.findUserById(id);
            });
    }
}
```

### Global Exception Handler for @Async Methods

Configure a global handler for uncaught async exceptions:

```java
package com.example.async.config;

import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;

import java.lang.reflect.Method;
import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    @Override
    public Executor getAsyncExecutor() {
        // Return your configured executor
        return taskExecutor();
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return new CustomAsyncExceptionHandler();
    }

    // Custom handler for void async methods that throw exceptions
    public static class CustomAsyncExceptionHandler
            implements AsyncUncaughtExceptionHandler {

        @Override
        public void handleUncaughtException(Throwable ex,
                                           Method method,
                                           Object... params) {
            System.err.println("Async exception in method: " + method.getName());
            System.err.println("Exception message: " + ex.getMessage());

            // Log to monitoring system, send alerts, etc.
            // metricsService.incrementAsyncErrorCount(method.getName());
        }
    }
}
```

## Implementing Timeouts

Prevent async operations from hanging indefinitely with timeouts.

```java
package com.example.async.service;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Service
public class TimeoutAwareService {

    private final ExternalApiClient apiClient;

    public TimeoutAwareService(ExternalApiClient apiClient) {
        this.apiClient = apiClient;
    }

    // Method 1: orTimeout - throws TimeoutException
    public CompletableFuture<ApiResponse> callWithTimeout(String request) {
        return apiClient.makeRequest(request)
            // Throws TimeoutException after 5 seconds
            .orTimeout(5, TimeUnit.SECONDS)
            .exceptionally(ex -> {
                if (ex.getCause() instanceof TimeoutException) {
                    return ApiResponse.timeout("Request timed out after 5 seconds");
                }
                return ApiResponse.error(ex.getMessage());
            });
    }

    // Method 2: completeOnTimeout - returns default value
    public CompletableFuture<ApiResponse> callWithDefaultOnTimeout(String request) {
        return apiClient.makeRequest(request)
            // Returns default value after 5 seconds instead of throwing
            .completeOnTimeout(
                ApiResponse.defaultResponse(),
                5,
                TimeUnit.SECONDS
            );
    }

    // Method 3: Custom timeout with failedFuture
    public CompletableFuture<ApiResponse> callWithCustomTimeout(String request,
                                                                Duration timeout) {
        CompletableFuture<ApiResponse> future = apiClient.makeRequest(request);

        // Schedule a timeout task
        CompletableFuture<ApiResponse> timeoutFuture = new CompletableFuture<>();
        scheduler.schedule(
            () -> timeoutFuture.completeExceptionally(
                new TimeoutException("Custom timeout after " + timeout)
            ),
            timeout.toMillis(),
            TimeUnit.MILLISECONDS
        );

        // Return whichever completes first
        return future.applyToEither(timeoutFuture, response -> response);
    }
}
```

## Testing Async Methods

Testing async code requires waiting for results without blocking tests indefinitely.

```java
package com.example.async.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;

@SpringBootTest
@ExtendWith(SpringExtension.class)
class UserServiceTest {

    @Autowired
    private UserService userService;

    // Basic test using get() with timeout
    @Test
    void shouldFindUserById() throws ExecutionException, InterruptedException {
        CompletableFuture<User> future = userService.findUserById(1L);

        // Block and get result with timeout
        User user = future.get(5, TimeUnit.SECONDS);

        assertThat(user).isNotNull();
        assertThat(user.getId()).isEqualTo(1L);
    }

    // Test using join() - throws unchecked exception
    @Test
    void shouldFindUserByIdWithJoin() {
        User user = userService.findUserById(1L).join();

        assertThat(user.getName()).isEqualTo("John Doe");
    }

    // Test with Awaitility for more complex scenarios
    @Test
    void shouldProcessOrderAsync() {
        CompletableFuture<OrderResult> future =
            orderService.processOrder(1L, "PROD-001");

        // Awaitility provides better timeout and polling control
        await()
            .atMost(Duration.ofSeconds(10))
            .pollInterval(Duration.ofMillis(100))
            .untilAsserted(() -> {
                assertThat(future).isCompleted();
                assertThat(future.join().status()).isEqualTo("SUCCESS");
            });
    }

    // Test exception handling
    @Test
    void shouldHandleUserNotFound() {
        CompletableFuture<User> future = userService.findUserById(-1L);

        assertThatThrownBy(future::join)
            .hasCauseInstanceOf(UserNotFoundException.class)
            .hasMessageContaining("User not found");
    }

    // Test parallel execution actually runs in parallel
    @Test
    void shouldRunInParallel() {
        long startTime = System.currentTimeMillis();

        // Each call takes 1 second, but they run in parallel
        CompletableFuture<User> user1 = userService.findUserById(1L);
        CompletableFuture<User> user2 = userService.findUserById(2L);
        CompletableFuture<User> user3 = userService.findUserById(3L);

        CompletableFuture.allOf(user1, user2, user3).join();

        long elapsed = System.currentTimeMillis() - startTime;

        // Should complete in roughly 1 second, not 3 seconds
        assertThat(elapsed).isLessThan(2000);
    }

    // Test with mock executor for synchronous testing
    @Test
    void shouldProcessWithMockExecutor() {
        // Use a synchronous executor in tests for deterministic behavior
        Executor syncExecutor = Runnable::run;

        UserService testService = new UserService(userRepository, syncExecutor);

        User user = testService.findUserById(1L).join();

        assertThat(user).isNotNull();
    }
}
```

### Test Configuration for Async

Create a test configuration that uses a synchronous executor:

```java
package com.example.async.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.core.task.SyncTaskExecutor;

import java.util.concurrent.Executor;

@TestConfiguration
public class AsyncTestConfig {

    // Override the async executor with synchronous execution for tests
    @Bean
    @Primary
    public Executor taskExecutor() {
        return new SyncTaskExecutor();
    }
}
```

## Best Practices Summary

| Practice | Why |
|----------|-----|
| Always configure custom thread pools | Default pool has unbounded growth |
| Use meaningful thread name prefixes | Makes debugging and monitoring easier |
| Handle exceptions explicitly | Unhandled async exceptions are silent |
| Set timeouts on external calls | Prevent resource exhaustion from hanging calls |
| Return CompletableFuture, not void | Allows callers to handle results and errors |
| Avoid blocking operations in async methods | Defeats the purpose of async execution |
| Test with both real and mock executors | Verify parallel behavior and logic separately |

## Common Pitfalls to Avoid

### Self-Invocation Does Not Work

```java
@Service
public class BrokenService {

    @Async
    public CompletableFuture<String> asyncMethod() {
        return CompletableFuture.completedFuture("result");
    }

    public void callerMethod() {
        // This runs synchronously! The proxy is bypassed.
        asyncMethod(); // WRONG
    }
}

// Solution: Inject the service into itself or use a separate class
@Service
public class FixedService {

    @Autowired
    private FixedService self; // Inject proxy

    @Async
    public CompletableFuture<String> asyncMethod() {
        return CompletableFuture.completedFuture("result");
    }

    public void callerMethod() {
        self.asyncMethod(); // Uses proxy, runs async
    }
}
```

### Do Not Block Inside Async Methods

```java
@Service
public class BadAsyncService {

    @Async
    public CompletableFuture<Result> processAsync() {
        // WRONG: Blocking call inside async method wastes the thread
        Result result = otherService.syncMethod(); // Blocks thread
        return CompletableFuture.completedFuture(result);
    }
}

@Service
public class GoodAsyncService {

    @Async
    public CompletableFuture<Result> processAsync() {
        // Correct: Chain async operations
        return otherService.asyncMethod()
            .thenApply(this::transform);
    }
}
```

## Conclusion

CompletableFuture with Spring's @Async provides a solid foundation for building responsive, scalable applications. The key points to remember:

1. Enable async with `@EnableAsync` and configure appropriate thread pools
2. Use `thenApply` for sync transformations, `thenCompose` for async chains
3. Run independent operations in parallel with `allOf`
4. Handle exceptions at every stage of the async pipeline
5. Always set timeouts on external service calls
6. Test both the async behavior and the business logic

Start with simple @Async methods, then gradually adopt CompletableFuture composition as your async workflows become more complex. The investment in proper async architecture pays off when your application needs to handle high concurrency without blocking threads.
