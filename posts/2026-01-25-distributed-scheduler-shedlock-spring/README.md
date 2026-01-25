# How to Build a Distributed Scheduler with ShedLock in Spring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring, ShedLock, Scheduler, Distributed Systems

Description: Learn how to prevent duplicate scheduled task execution across multiple Spring application instances using ShedLock for distributed locking. This guide covers database-backed locks, configuration, and production best practices.

---

Running scheduled tasks in a single-instance application is straightforward. Spring's `@Scheduled` annotation handles everything. But what happens when you scale to multiple instances? Without coordination, every instance runs the same task at the same time - leading to duplicate emails, double charges, or corrupted data.

ShedLock solves this by ensuring only one instance executes a scheduled task at any given time. It uses a simple locking mechanism backed by your existing database, Redis, or other storage systems.

---

## The Problem with Distributed Scheduling

Consider this scenario: you have a scheduled job that sends daily report emails to customers.

```java
@Scheduled(cron = "0 0 9 * * *")  // Run at 9 AM daily
public void sendDailyReports() {
    List<Customer> customers = customerRepository.findAll();
    for (Customer customer : customers) {
        emailService.sendReport(customer);
    }
}
```

This works fine with one instance. Deploy three instances behind a load balancer, and suddenly customers receive three identical emails every morning. The scheduler runs independently on each instance with no awareness of the others.

Traditional solutions involve designating a "primary" instance or using complex distributed coordination. ShedLock offers a simpler approach: lock acquisition at task execution time.

---

## How ShedLock Works

ShedLock creates a lock record in your database when a task starts. Other instances attempting to run the same task check for this lock and skip execution if it exists. When the task completes, the lock is released (or expires after a configured time).

The locking mechanism is optimistic. ShedLock attempts to create or update a lock record with an atomic operation. If the operation succeeds, the instance acquired the lock and proceeds. If it fails (because another instance already holds the lock), execution is skipped.

---

## Setting Up ShedLock with Spring Boot

### Dependencies

Add ShedLock to your project. This example uses JDBC with PostgreSQL, but ShedLock supports MongoDB, Redis, DynamoDB, and other backends.

```xml
<!-- pom.xml -->
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
```

For Gradle users:

```groovy
// build.gradle
implementation 'net.javacrumbs.shedlock:shedlock-spring:5.10.0'
implementation 'net.javacrumbs.shedlock:shedlock-provider-jdbc-template:5.10.0'
```

### Database Schema

ShedLock needs a table to store lock records. Create this table in your database:

```sql
-- PostgreSQL
CREATE TABLE shedlock (
    name VARCHAR(64) NOT NULL,       -- Lock identifier (task name)
    lock_until TIMESTAMP NOT NULL,   -- When the lock expires
    locked_at TIMESTAMP NOT NULL,    -- When the lock was acquired
    locked_by VARCHAR(255) NOT NULL, -- Which instance holds the lock
    PRIMARY KEY (name)
);

-- MySQL
CREATE TABLE shedlock (
    name VARCHAR(64) NOT NULL,
    lock_until TIMESTAMP(3) NOT NULL,
    locked_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    locked_by VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
);
```

### Configuration

Configure ShedLock in your Spring Boot application:

```java
// ShedLockConfig.java
import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.jdbctemplate.JdbcTemplateLockProvider;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import javax.sql.DataSource;

@Configuration
@EnableScheduling                                    // Enable Spring scheduling
@EnableSchedulerLock(defaultLockAtMostFor = "10m")  // Enable ShedLock with default timeout
public class ShedLockConfig {

    @Bean
    public LockProvider lockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(
            JdbcTemplateLockProvider.Configuration.builder()
                .withJdbcTemplate(new JdbcTemplate(dataSource))
                .usingDbTime()  // Use database time for consistency across instances
                .build()
        );
    }
}
```

The `defaultLockAtMostFor` setting ensures locks are released even if an instance crashes. Set this to longer than your longest expected task duration.

---

## Writing Locked Scheduled Tasks

Now annotate your scheduled methods with `@SchedulerLock`:

```java
// ReportScheduler.java
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class ReportScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReportScheduler.class);

    private final CustomerRepository customerRepository;
    private final EmailService emailService;

    public ReportScheduler(CustomerRepository customerRepository, EmailService emailService) {
        this.customerRepository = customerRepository;
        this.emailService = emailService;
    }

    @Scheduled(cron = "0 0 9 * * *")  // 9 AM daily
    @SchedulerLock(
        name = "sendDailyReports",    // Unique identifier for this task
        lockAtMostFor = "30m",        // Maximum lock duration (safety net)
        lockAtLeastFor = "5m"         // Minimum lock duration (prevents rapid re-execution)
    )
    public void sendDailyReports() {
        log.info("Starting daily report generation");

        List<Customer> customers = customerRepository.findAllActive();
        int sent = 0;

        for (Customer customer : customers) {
            try {
                emailService.sendReport(customer);
                sent++;
            } catch (Exception e) {
                log.error("Failed to send report to customer {}", customer.getId(), e);
            }
        }

        log.info("Completed daily reports. Sent {} emails", sent);
    }
}
```

### Understanding Lock Duration Parameters

- **lockAtMostFor**: The maximum time a lock can be held. This is your safety net - if the instance crashes or hangs, the lock will be released after this duration. Set it longer than your task's worst-case execution time.

- **lockAtLeastFor**: The minimum time before the task can run again. This prevents rapid re-execution if your cron expression fires frequently and tasks complete quickly. For a daily task, you might set this to several minutes.

---

## Multiple Scheduled Tasks

Each task needs a unique lock name. Here's an example with multiple scheduled jobs:

```java
// DataSyncScheduler.java
@Component
public class DataSyncScheduler {

    private static final Logger log = LoggerFactory.getLogger(DataSyncScheduler.class);

    @Scheduled(fixedRate = 60000)  // Every minute
    @SchedulerLock(
        name = "syncInventory",
        lockAtMostFor = "5m",
        lockAtLeastFor = "30s"
    )
    public void syncInventory() {
        log.info("Syncing inventory data");
        // Sync logic here
    }

    @Scheduled(fixedRate = 300000)  // Every 5 minutes
    @SchedulerLock(
        name = "syncPricing",
        lockAtMostFor = "10m",
        lockAtLeastFor = "2m"
    )
    public void syncPricing() {
        log.info("Syncing pricing data");
        // Sync logic here
    }

    @Scheduled(cron = "0 0 2 * * *")  // 2 AM daily
    @SchedulerLock(
        name = "cleanupOldRecords",
        lockAtMostFor = "2h",
        lockAtLeastFor = "30m"
    )
    public void cleanupOldRecords() {
        log.info("Running daily cleanup");
        // Cleanup logic here
    }
}
```

---

## Using Redis as Lock Provider

For applications already using Redis, it makes sense to use it for lock storage:

```xml
<dependency>
    <groupId>net.javacrumbs.shedlock</groupId>
    <artifactId>shedlock-provider-redis-spring</artifactId>
    <version>5.10.0</version>
</dependency>
```

```java
// RedisLockConfig.java
import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.redis.spring.RedisLockProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;

@Configuration
@EnableScheduling
@EnableSchedulerLock(defaultLockAtMostFor = "10m")
public class RedisLockConfig {

    @Bean
    public LockProvider lockProvider(RedisConnectionFactory connectionFactory) {
        // Use environment name as prefix to isolate locks per environment
        return new RedisLockProvider(connectionFactory, "prod");
    }
}
```

Redis locks use the SET command with NX and PX options for atomic lock acquisition with expiration.

---

## Testing Scheduled Tasks

Testing locked scheduled tasks requires some setup. You want to verify the task logic works without ShedLock interfering:

```java
// ReportSchedulerTest.java
@SpringBootTest
@TestPropertySource(properties = {
    "spring.main.allow-bean-definition-overriding=true"
})
class ReportSchedulerTest {

    @MockBean
    private CustomerRepository customerRepository;

    @MockBean
    private EmailService emailService;

    @Autowired
    private ReportScheduler reportScheduler;

    @Test
    void sendDailyReports_sendsEmailToAllActiveCustomers() {
        // Arrange
        List<Customer> customers = List.of(
            new Customer(1L, "alice@example.com"),
            new Customer(2L, "bob@example.com")
        );
        when(customerRepository.findAllActive()).thenReturn(customers);

        // Act
        reportScheduler.sendDailyReports();

        // Assert
        verify(emailService, times(2)).sendReport(any(Customer.class));
    }

    @Test
    void sendDailyReports_continuesOnEmailFailure() {
        // Arrange
        List<Customer> customers = List.of(
            new Customer(1L, "alice@example.com"),
            new Customer(2L, "bob@example.com")
        );
        when(customerRepository.findAllActive()).thenReturn(customers);

        // First email fails
        doThrow(new RuntimeException("SMTP error"))
            .doNothing()
            .when(emailService).sendReport(any());

        // Act - should not throw
        assertDoesNotThrow(() -> reportScheduler.sendDailyReports());

        // Assert - both customers attempted
        verify(emailService, times(2)).sendReport(any(Customer.class));
    }
}
```

---

## Production Considerations

### Monitoring Lock Acquisition

Log when locks are acquired and released for debugging:

```java
@Scheduled(cron = "0 */5 * * * *")
@SchedulerLock(name = "processOrders", lockAtMostFor = "10m")
public void processOrders() {
    String instanceId = System.getenv("HOSTNAME");  // Container hostname
    log.info("Lock acquired for processOrders on instance {}", instanceId);

    try {
        // Task logic
    } finally {
        log.info("Releasing lock for processOrders on instance {}", instanceId);
    }
}
```

### Handling Long-Running Tasks

For tasks that might exceed `lockAtMostFor`, consider extending the lock programmatically:

```java
@Autowired
private LockProvider lockProvider;

@Scheduled(cron = "0 0 3 * * *")
@SchedulerLock(name = "longRunningTask", lockAtMostFor = "4h")
public void longRunningTask() {
    // For very long tasks, consider breaking into smaller chunks
    // or using a different approach like job queues
}
```

### Clock Synchronization

When using database time (`usingDbTime()`), clock differences between application instances don't matter. If using local time, ensure NTP is configured on all servers.

### Graceful Shutdown

Spring Boot handles graceful shutdown of scheduled tasks. Ensure your `application.properties` includes:

```properties
spring.lifecycle.timeout-per-shutdown-phase=30s
```

This gives running tasks time to complete before the instance shuts down.

---

## Common Pitfalls

**Lock name collisions**: Each task must have a unique lock name. Using the same name for different tasks causes one to be skipped.

**Lock duration too short**: If `lockAtMostFor` is shorter than task execution time, another instance might start the same task while the first is still running.

**Missing database table**: ShedLock fails silently if the `shedlock` table doesn't exist. Verify your migration ran successfully.

**Time zone issues**: Cron expressions use the server's time zone by default. Be explicit with `@Scheduled(cron = "...", zone = "UTC")`.

---

## Conclusion

ShedLock provides a straightforward solution to distributed scheduling in Spring applications. By using your existing database or cache as a coordination point, it eliminates the need for complex distributed consensus protocols.

The key points to remember:
- Choose lock durations carefully based on your task characteristics
- Use database time for consistency across instances
- Monitor lock acquisition in production
- Test task logic independently of locking behavior

For applications with more complex scheduling needs - job dependencies, retries, or persistent job history - consider dedicated job schedulers like Quartz or Spring Batch. But for most scheduled task scenarios, ShedLock combined with Spring's `@Scheduled` annotation provides the right balance of simplicity and reliability.

---

**Related Reading:**
- [Spring Boot Scheduling Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.task-execution-and-scheduling)
- [ShedLock GitHub Repository](https://github.com/lukas-krecan/ShedLock)
