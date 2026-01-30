# How to Build Scheduled Tasks with @Scheduled

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Java, Spring Boot, Scheduling, Automation

Description: Implement scheduled tasks in Spring Boot using @Scheduled annotation with cron expressions, fixed delays, and distributed locking for clustered deployments.

---

Scheduled tasks are fundamental to most production applications. Whether you need to send daily reports, clean up expired sessions, sync data from external APIs, or process batch jobs, Spring Boot's `@Scheduled` annotation provides a straightforward way to run code at specified intervals.

This guide walks through everything you need to build reliable scheduled tasks in Spring Boot, from basic setups to production-ready configurations with distributed locking.

## Prerequisites

You will need:
- Java 17 or later
- Spring Boot 3.x
- Maven or Gradle

Add the following dependency to your `pom.xml` (Spring Boot Starter already includes scheduling support):

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter</artifactId>
</dependency>
```

## Enabling Scheduling with @EnableScheduling

Before any `@Scheduled` methods will run, you must enable scheduling in your application. Add `@EnableScheduling` to any configuration class or your main application class.

```java
package com.example.scheduling;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling  // This annotation activates the scheduling infrastructure
public class SchedulingApplication {

    public static void main(String[] args) {
        SpringApplication.run(SchedulingApplication.class, args);
    }
}
```

Alternatively, create a dedicated configuration class to keep scheduling configuration separate:

```java
package com.example.scheduling.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class SchedulingConfig {
    // Additional scheduling beans can be defined here
}
```

## Your First Scheduled Task

Create a simple scheduled task by annotating a method with `@Scheduled`. The method must have a `void` return type and take no parameters.

```java
package com.example.scheduling.tasks;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component  // Must be a Spring-managed bean
public class SimpleScheduledTask {

    private static final Logger logger = LoggerFactory.getLogger(SimpleScheduledTask.class);

    // Runs every 5 seconds after the previous execution completes
    @Scheduled(fixedDelay = 5000)
    public void performTask() {
        logger.info("Task executed at: {}", LocalDateTime.now());
        // Your business logic here
    }
}
```

## Fixed Rate vs Fixed Delay

Understanding the difference between `fixedRate` and `fixedDelay` is critical for building correct scheduled tasks.

| Attribute | Behavior | Use Case |
|-----------|----------|----------|
| `fixedDelay` | Waits specified milliseconds after the previous execution completes | Tasks where overlap must be avoided |
| `fixedRate` | Executes at a fixed interval regardless of previous execution time | Time-sensitive tasks that must run at exact intervals |
| `initialDelay` | Delays the first execution by specified milliseconds | Tasks that need application warmup time |

The following example demonstrates both approaches:

```java
package com.example.scheduling.tasks;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class RateVsDelayDemo {

    private static final Logger logger = LoggerFactory.getLogger(RateVsDelayDemo.class);

    // Fixed Delay: If task takes 3 seconds, next execution starts 5 seconds AFTER completion
    // Timeline: [task 3s] --- 5s delay --- [task 3s] --- 5s delay ---
    @Scheduled(fixedDelay = 5000, initialDelay = 1000)
    public void fixedDelayTask() {
        logger.info("Fixed delay task started");
        try {
            // Simulating a task that takes 3 seconds
            Thread.sleep(3000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        logger.info("Fixed delay task completed");
    }

    // Fixed Rate: Executes every 5 seconds regardless of execution time
    // Timeline: [task 3s]--[task 3s]--[task 3s]-- (every 5 seconds from start)
    // Warning: If task takes longer than rate, executions will queue up
    @Scheduled(fixedRate = 5000, initialDelay = 2000)
    public void fixedRateTask() {
        logger.info("Fixed rate task started");
        try {
            Thread.sleep(3000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        logger.info("Fixed rate task completed");
    }
}
```

You can also use string values with property placeholders for externalized configuration:

```java
@Component
public class ConfigurableScheduledTask {

    // Values can be externalized to application.properties or application.yml
    @Scheduled(fixedDelayString = "${task.fixed-delay:5000}")
    public void configurableTask() {
        // Task logic
    }
}
```

In `application.yml`:

```yaml
task:
  fixed-delay: 10000  # 10 seconds
```

## Cron Expressions

For complex scheduling requirements, cron expressions offer precise control. Spring uses a six-field cron format.

| Field | Values | Special Characters |
|-------|--------|-------------------|
| Seconds | 0-59 | , - * / |
| Minutes | 0-59 | , - * / |
| Hours | 0-23 | , - * / |
| Day of Month | 1-31 | , - * / ? L W |
| Month | 1-12 or JAN-DEC | , - * / |
| Day of Week | 0-7 or SUN-SAT (0 and 7 are Sunday) | , - * / ? L # |

Common cron expression examples:

| Expression | Description |
|------------|-------------|
| `0 0 * * * *` | Every hour at minute 0, second 0 |
| `0 0 8 * * *` | Every day at 8:00 AM |
| `0 0 8 * * MON-FRI` | Weekdays at 8:00 AM |
| `0 0/30 * * * *` | Every 30 minutes |
| `0 0 0 1 * *` | First day of every month at midnight |
| `0 0 12 ? * WED` | Every Wednesday at noon |
| `0 0 9-17 * * MON-FRI` | Every hour from 9 AM to 5 PM on weekdays |

Here is a practical example with multiple cron-based tasks:

```java
package com.example.scheduling.tasks;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class CronScheduledTasks {

    private static final Logger logger = LoggerFactory.getLogger(CronScheduledTasks.class);

    // Runs every day at 2:00 AM - good for nightly batch jobs
    @Scheduled(cron = "0 0 2 * * *")
    public void nightlyBatchJob() {
        logger.info("Starting nightly batch processing");
        // Process accumulated data, generate reports, etc.
    }

    // Runs every 15 minutes during business hours (9 AM - 6 PM) on weekdays
    @Scheduled(cron = "0 0/15 9-18 * * MON-FRI")
    public void businessHoursSync() {
        logger.info("Syncing data during business hours");
        // Sync with external systems
    }

    // Runs at 9:00 AM on the first day of each month
    @Scheduled(cron = "0 0 9 1 * *")
    public void monthlyReport() {
        logger.info("Generating monthly report");
        // Generate and send monthly reports
    }

    // Runs every Sunday at 3:00 AM for weekly maintenance
    @Scheduled(cron = "0 0 3 * * SUN")
    public void weeklyMaintenance() {
        logger.info("Running weekly maintenance tasks");
        // Clean up old files, optimize databases, etc.
    }

    // Externalized cron expression from properties
    @Scheduled(cron = "${reports.daily.cron:0 0 6 * * *}")
    public void dailyReport() {
        logger.info("Generating daily report");
    }
}
```

You can also specify a timezone for cron expressions:

```java
// Runs at 9:00 AM New York time, accounting for daylight saving time
@Scheduled(cron = "0 0 9 * * *", zone = "America/New_York")
public void newYorkMorningTask() {
    // Task runs at 9 AM Eastern Time
}
```

## Configuring Custom Thread Pools

By default, Spring uses a single-threaded executor for scheduled tasks. This means all scheduled methods share one thread, and a long-running task can delay others. For production applications, configure a dedicated thread pool.

```java
package com.example.scheduling.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;

@Configuration
@EnableScheduling
public class SchedulerConfig implements SchedulingConfigurer {

    @Override
    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        taskRegistrar.setTaskScheduler(taskScheduler());
    }

    @Bean
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();

        // Number of threads in the pool - adjust based on your task count and duration
        scheduler.setPoolSize(10);

        // Prefix for thread names - useful for debugging and monitoring
        scheduler.setThreadNamePrefix("scheduled-task-");

        // Wait for tasks to complete on shutdown
        scheduler.setWaitForTasksToCompleteOnShutdown(true);

        // Maximum time to wait for tasks during shutdown
        scheduler.setAwaitTerminationSeconds(30);

        // Handle rejected executions when pool is exhausted
        scheduler.setRejectedExecutionHandler((runnable, executor) -> {
            // Log or handle rejected tasks
            System.err.println("Task rejected: " + runnable.toString());
        });

        scheduler.initialize();
        return scheduler;
    }
}
```

Alternatively, configure via `application.yml`:

```yaml
spring:
  task:
    scheduling:
      pool:
        size: 10
      thread-name-prefix: scheduled-task-
      shutdown:
        await-termination: true
        await-termination-period: 30s
```

## Error Handling in Scheduled Tasks

Scheduled tasks run in background threads, so exceptions do not propagate to the main application. Implement proper error handling to avoid silent failures.

```java
package com.example.scheduling.tasks;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class RobustScheduledTask {

    private static final Logger logger = LoggerFactory.getLogger(RobustScheduledTask.class);

    private int consecutiveFailures = 0;
    private static final int MAX_FAILURES = 3;

    @Scheduled(fixedDelay = 60000)
    public void resilientTask() {
        try {
            logger.info("Starting scheduled task");

            performBusinessLogic();

            // Reset failure counter on success
            consecutiveFailures = 0;
            logger.info("Task completed successfully");

        } catch (RecoverableException e) {
            consecutiveFailures++;
            logger.warn("Recoverable error in scheduled task (attempt {}): {}",
                consecutiveFailures, e.getMessage());

            if (consecutiveFailures >= MAX_FAILURES) {
                logger.error("Task failed {} consecutive times, sending alert", MAX_FAILURES);
                sendAlert("Scheduled task failing repeatedly: " + e.getMessage());
            }

        } catch (Exception e) {
            logger.error("Unexpected error in scheduled task", e);
            sendAlert("Critical error in scheduled task: " + e.getMessage());
        }
    }

    private void performBusinessLogic() throws RecoverableException {
        // Your actual business logic
        // Throw RecoverableException for transient errors
    }

    private void sendAlert(String message) {
        // Send to monitoring system, Slack, email, etc.
    }
}

// Custom exception for recoverable errors
class RecoverableException extends Exception {
    public RecoverableException(String message) {
        super(message);
    }

    public RecoverableException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

For global error handling across all scheduled tasks, configure an `ErrorHandler`:

```java
package com.example.scheduling.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.util.ErrorHandler;

@Configuration
@EnableScheduling
public class SchedulerErrorConfig implements SchedulingConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(SchedulerErrorConfig.class);

    @Override
    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(5);
        scheduler.setThreadNamePrefix("scheduled-");

        // Set custom error handler for all scheduled tasks
        scheduler.setErrorHandler(scheduledTaskErrorHandler());

        scheduler.initialize();
        taskRegistrar.setTaskScheduler(scheduler);
    }

    @Bean
    public ErrorHandler scheduledTaskErrorHandler() {
        return throwable -> {
            logger.error("Error in scheduled task: {}", throwable.getMessage(), throwable);

            // Send metrics to monitoring system
            // Increment error counter for alerting
            // Send notification if critical
        };
    }
}
```

## Distributed Locking with ShedLock

When running multiple instances of your application (e.g., in Kubernetes or behind a load balancer), scheduled tasks will execute on every instance. ShedLock ensures a task runs on only one instance at a time.

Add the ShedLock dependencies:

```xml
<dependencies>
    <!-- ShedLock core -->
    <dependency>
        <groupId>net.javacrumbs.shedlock</groupId>
        <artifactId>shedlock-spring</artifactId>
        <version>5.10.0</version>
    </dependency>

    <!-- JDBC lock provider - use your database -->
    <dependency>
        <groupId>net.javacrumbs.shedlock</groupId>
        <artifactId>shedlock-provider-jdbc-template</artifactId>
        <version>5.10.0</version>
    </dependency>
</dependencies>
```

Create the lock table in your database:

```sql
-- PostgreSQL
CREATE TABLE shedlock (
    name VARCHAR(64) NOT NULL,
    lock_until TIMESTAMP NOT NULL,
    locked_at TIMESTAMP NOT NULL,
    locked_by VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
);

-- MySQL
CREATE TABLE shedlock (
    name VARCHAR(64) NOT NULL,
    lock_until TIMESTAMP(3) NOT NULL,
    locked_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    locked_by VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
) ENGINE=InnoDB;
```

Configure ShedLock in your application:

```java
package com.example.scheduling.config;

import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.jdbctemplate.JdbcTemplateLockProvider;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;

import javax.sql.DataSource;

@Configuration
@EnableScheduling
@EnableSchedulerLock(defaultLockAtMostFor = "10m")  // Maximum lock duration
public class ShedLockConfig {

    @Bean
    public LockProvider lockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(
            JdbcTemplateLockProvider.Configuration.builder()
                .withJdbcTemplate(new JdbcTemplate(dataSource))
                .usingDbTime()  // Use database time instead of application time
                .build()
        );
    }
}
```

Use `@SchedulerLock` on your scheduled methods:

```java
package com.example.scheduling.tasks;

import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class DistributedScheduledTasks {

    private static final Logger logger = LoggerFactory.getLogger(DistributedScheduledTasks.class);

    // This task will only run on ONE instance even with multiple app replicas
    @Scheduled(cron = "0 0 2 * * *")
    @SchedulerLock(
        name = "nightlyDataProcessing",        // Unique lock name
        lockAtMostFor = "2h",                  // Release lock after 2 hours max (even if task hangs)
        lockAtLeastFor = "5m"                  // Keep lock for at least 5 minutes (prevents rapid re-execution)
    )
    public void processNightlyData() {
        logger.info("Starting nightly data processing on instance: {}", getInstanceId());

        // Long-running processing that should only run on one instance

        logger.info("Completed nightly data processing");
    }

    @Scheduled(fixedRate = 60000)  // Every minute
    @SchedulerLock(
        name = "syncExternalData",
        lockAtMostFor = "5m",
        lockAtLeastFor = "30s"
    )
    public void syncExternalData() {
        logger.info("Syncing external data");
        // API calls, data synchronization, etc.
    }

    private String getInstanceId() {
        // Return pod name, hostname, or instance identifier
        return System.getenv().getOrDefault("HOSTNAME", "unknown");
    }
}
```

For Redis-based locking (better for high-frequency tasks):

```xml
<dependency>
    <groupId>net.javacrumbs.shedlock</groupId>
    <artifactId>shedlock-provider-redis-spring</artifactId>
    <version>5.10.0</version>
</dependency>
```

```java
@Bean
public LockProvider lockProvider(RedisConnectionFactory connectionFactory) {
    return new RedisLockProvider(connectionFactory);
}
```

## Conditional Scheduling

Sometimes you want to enable or disable scheduled tasks based on configuration, environment, or runtime conditions.

Using `@ConditionalOnProperty`:

```java
package com.example.scheduling.tasks;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

// This entire component is only created when scheduling.enabled=true
@Component
@ConditionalOnProperty(
    name = "scheduling.enabled",
    havingValue = "true",
    matchIfMissing = false  // Task is disabled by default
)
public class ConditionalScheduledTask {

    private static final Logger logger = LoggerFactory.getLogger(ConditionalScheduledTask.class);

    @Scheduled(fixedDelay = 30000)
    public void conditionalTask() {
        logger.info("Conditional task running");
    }
}
```

In `application.yml`:

```yaml
scheduling:
  enabled: true  # Set to false to disable all scheduled tasks in this class
```

For more granular control, use profiles:

```java
package com.example.scheduling.tasks;

import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

// Only active in production profile
@Component
@Profile("production")
public class ProductionOnlyTask {

    @Scheduled(cron = "0 0 3 * * *")
    public void productionTask() {
        // Runs only in production
    }
}

// Only active in non-production profiles
@Component
@Profile("!production")
public class DevScheduledTask {

    @Scheduled(fixedDelay = 5000)
    public void devTask() {
        // Runs frequently in dev for testing, disabled in production
    }
}
```

For runtime conditional execution:

```java
package com.example.scheduling.tasks;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class RuntimeConditionalTask {

    private static final Logger logger = LoggerFactory.getLogger(RuntimeConditionalTask.class);

    @Value("${feature.data-sync.enabled:true}")
    private boolean dataSyncEnabled;

    @Scheduled(fixedDelay = 60000)
    public void conditionalSync() {
        if (!dataSyncEnabled) {
            logger.debug("Data sync is disabled, skipping execution");
            return;
        }

        logger.info("Performing data sync");
        // Sync logic here
    }
}
```

## Dynamic Scheduling with SchedulingConfigurer

For cases where you need to change scheduling at runtime or read cron expressions from a database:

```java
package com.example.scheduling.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.scheduling.support.CronTrigger;

@Configuration
@EnableScheduling
public class DynamicSchedulingConfig implements SchedulingConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(DynamicSchedulingConfig.class);

    @Autowired
    private ScheduleConfigRepository scheduleConfigRepository;

    @Override
    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        taskRegistrar.addTriggerTask(
            // The task to run
            () -> {
                logger.info("Running dynamically scheduled task");
                performDynamicTask();
            },
            // The trigger that determines when the task runs
            triggerContext -> {
                // Fetch cron expression from database on each trigger evaluation
                String cronExpression = scheduleConfigRepository
                    .findByTaskName("dynamicTask")
                    .map(ScheduleConfig::getCronExpression)
                    .orElse("0 0 * * * *");  // Default: every hour

                CronTrigger trigger = new CronTrigger(cronExpression);
                return trigger.nextExecution(triggerContext);
            }
        );
    }

    private void performDynamicTask() {
        // Task implementation
    }
}
```

## Monitoring Scheduled Tasks

Track execution metrics using Micrometer:

```java
package com.example.scheduling.tasks;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MonitoredScheduledTask {

    private static final Logger logger = LoggerFactory.getLogger(MonitoredScheduledTask.class);

    private final Timer taskTimer;
    private final MeterRegistry meterRegistry;

    public MonitoredScheduledTask(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.taskTimer = Timer.builder("scheduled.task.duration")
            .tag("task", "dataSync")
            .description("Time taken to execute data sync task")
            .register(meterRegistry);
    }

    @Scheduled(fixedDelay = 60000)
    public void monitoredTask() {
        taskTimer.record(() -> {
            try {
                logger.info("Starting monitored task");

                performTask();

                // Record success metric
                meterRegistry.counter("scheduled.task.success", "task", "dataSync").increment();

            } catch (Exception e) {
                // Record failure metric
                meterRegistry.counter("scheduled.task.failure", "task", "dataSync").increment();
                throw e;
            }
        });
    }

    private void performTask() {
        // Task logic
    }
}
```

## Testing Scheduled Tasks

Testing scheduled tasks requires special consideration since you typically do not want to wait for actual schedules during tests.

```java
package com.example.scheduling.tasks;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.test.context.TestPropertySource;

import java.time.Duration;

import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.verify;

@SpringBootTest
@TestPropertySource(properties = {
    "scheduling.enabled=true"
})
class ScheduledTaskTest {

    @SpyBean
    private SimpleScheduledTask scheduledTask;

    @Test
    void shouldExecuteScheduledTask() {
        // Wait for the task to execute at least once
        await()
            .atMost(Duration.ofSeconds(10))
            .untilAsserted(() ->
                verify(scheduledTask, atLeast(1)).performTask()
            );
    }
}
```

For unit testing the task logic directly:

```java
package com.example.scheduling.tasks;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DataSyncTaskTest {

    @Mock
    private ExternalApiClient apiClient;

    @Mock
    private DataRepository dataRepository;

    @InjectMocks
    private DataSyncTask dataSyncTask;

    @Test
    void shouldSyncDataSuccessfully() {
        // Given
        when(apiClient.fetchLatestData()).thenReturn(mockData());

        // When - call the scheduled method directly
        dataSyncTask.syncData();

        // Then
        verify(apiClient).fetchLatestData();
        verify(dataRepository).saveAll(any());
    }

    @Test
    void shouldHandleApiFailureGracefully() {
        // Given
        when(apiClient.fetchLatestData()).thenThrow(new RuntimeException("API down"));

        // When
        dataSyncTask.syncData();

        // Then - verify error handling
        verify(dataRepository, never()).saveAll(any());
    }

    private Object mockData() {
        // Return test data
        return null;
    }
}
```

## Best Practices Summary

| Practice | Recommendation |
|----------|---------------|
| Thread Pool | Configure dedicated thread pool based on task count and duration |
| Error Handling | Always catch exceptions to prevent silent failures |
| Logging | Log task start, completion, and errors with context |
| Monitoring | Track execution time, success/failure rates with metrics |
| Distributed Environments | Use ShedLock or similar for cluster-safe execution |
| Configuration | Externalize cron expressions and enable/disable flags |
| Testing | Test business logic separately from scheduling mechanism |
| Timeouts | Set reasonable lockAtMostFor values to handle hung tasks |
| Idempotency | Design tasks to be safely re-runnable |

## Complete Example: Production-Ready Scheduled Task

Here is a complete example combining all the patterns discussed:

```java
package com.example.scheduling.tasks;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@ConditionalOnProperty(name = "tasks.order-sync.enabled", havingValue = "true")
public class OrderSyncTask {

    private static final Logger logger = LoggerFactory.getLogger(OrderSyncTask.class);
    private static final String TASK_NAME = "orderSync";

    private final OrderService orderService;
    private final ExternalOrderApi externalApi;
    private final Timer taskTimer;
    private final MeterRegistry meterRegistry;

    @Value("${tasks.order-sync.batch-size:100}")
    private int batchSize;

    public OrderSyncTask(
            OrderService orderService,
            ExternalOrderApi externalApi,
            MeterRegistry meterRegistry) {
        this.orderService = orderService;
        this.externalApi = externalApi;
        this.meterRegistry = meterRegistry;
        this.taskTimer = Timer.builder("scheduled.task.duration")
            .tag("task", TASK_NAME)
            .register(meterRegistry);
    }

    @Scheduled(cron = "${tasks.order-sync.cron:0 */5 * * * *}")
    @SchedulerLock(
        name = "orderSyncTask",
        lockAtMostFor = "10m",
        lockAtLeastFor = "1m"
    )
    public void syncOrders() {
        String executionId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("executionId", executionId);
        MDC.put("task", TASK_NAME);

        logger.info("Starting order sync task");
        long startTime = System.currentTimeMillis();

        try {
            taskTimer.record(() -> {
                int processed = 0;
                int failed = 0;

                var pendingOrders = orderService.findPendingSync(batchSize);
                logger.info("Found {} orders to sync", pendingOrders.size());

                for (var order : pendingOrders) {
                    try {
                        externalApi.syncOrder(order);
                        orderService.markAsSynced(order.getId());
                        processed++;
                    } catch (Exception e) {
                        logger.warn("Failed to sync order {}: {}", order.getId(), e.getMessage());
                        orderService.markSyncFailed(order.getId(), e.getMessage());
                        failed++;
                    }
                }

                // Record metrics
                meterRegistry.counter("task.orders.processed", "task", TASK_NAME)
                    .increment(processed);
                meterRegistry.counter("task.orders.failed", "task", TASK_NAME)
                    .increment(failed);

                logger.info("Order sync completed: processed={}, failed={}", processed, failed);
            });

            meterRegistry.counter("scheduled.task.success", "task", TASK_NAME).increment();

        } catch (Exception e) {
            logger.error("Order sync task failed", e);
            meterRegistry.counter("scheduled.task.failure", "task", TASK_NAME).increment();
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            logger.info("Task completed in {}ms", duration);
            MDC.clear();
        }
    }
}
```

## Conclusion

Spring Boot's `@Scheduled` annotation provides a powerful foundation for building scheduled tasks. By combining it with proper thread pool configuration, error handling, distributed locking via ShedLock, and monitoring, you can build reliable background jobs suitable for production deployments.

Key takeaways:
- Use `fixedDelay` when tasks should not overlap
- Use `fixedRate` when precise timing matters
- Configure thread pools for parallel task execution
- Always implement error handling for background tasks
- Use ShedLock when running multiple application instances
- Externalize configuration for flexibility across environments
- Monitor task execution with metrics and logging

With these patterns in place, your scheduled tasks will be maintainable, observable, and ready for production workloads.
