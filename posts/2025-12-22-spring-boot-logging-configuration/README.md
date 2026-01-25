# How to Configure Logging in Spring Boot

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Java, Spring Boot, Logging, Logback, SLF4J, Observability, Backend

Description: Learn how to configure logging in Spring Boot applications with Logback, including log levels, file output, JSON formatting, and production best practices.

---

Proper logging is essential for debugging, monitoring, and understanding your application's behavior. Spring Boot uses Logback by default with SLF4J as the logging facade. This guide covers everything from basic configuration to production-ready logging setups.

## Default Logging Behavior

Spring Boot provides sensible defaults out of the box:
- Logs to console
- INFO level for application code
- WARN level for most libraries
- Colored output in terminals that support ANSI

## Basic Configuration via Properties

```properties
# application.properties

# Set root logging level
logging.level.root=INFO

# Set logging level for specific packages
logging.level.com.example=DEBUG
logging.level.org.springframework=WARN
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.orm.jdbc.bind=TRACE

# Log to file
logging.file.name=logs/application.log
logging.file.path=/var/log/myapp

# File rotation
logging.logback.rollingpolicy.max-file-size=10MB
logging.logback.rollingpolicy.max-history=30
logging.logback.rollingpolicy.total-size-cap=1GB

# Console pattern
logging.pattern.console=%d{yyyy-MM-dd HH:mm:ss.SSS} %highlight(%-5level) [%thread] %cyan(%logger{36}) - %msg%n

# File pattern
logging.pattern.file=%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger{36} - %msg%n
```

## YAML Configuration

```yaml
# application.yml
logging:
  level:
    root: INFO
    com.example: DEBUG
    org.springframework: WARN
    org.hibernate.SQL: DEBUG
    org.hibernate.orm.jdbc.bind: TRACE

  file:
    name: logs/application.log

  logback:
    rollingpolicy:
      max-file-size: 10MB
      max-history: 30
      total-size-cap: 1GB

  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss.SSS} %highlight(%-5level) [%thread] %cyan(%logger{36}) - %msg%n"
    file: "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger{36} - %msg%n"
```

## Custom Logback Configuration

For more control, create `src/main/resources/logback-spring.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration scan="true" scanPeriod="30 seconds">

    <!-- Properties -->
    <property name="LOG_PATH" value="${LOG_PATH:-logs}"/>
    <property name="APP_NAME" value="${APP_NAME:-myapp}"/>

    <!-- Console Appender -->
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} %highlight(%-5level) [%thread] %cyan(%logger{36}) - %msg%n</pattern>
        </encoder>
    </appender>

    <!-- File Appender with Rolling -->
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>${LOG_PATH}/${APP_NAME}.log</file>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger{36} - %msg%n</pattern>
        </encoder>
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>${LOG_PATH}/${APP_NAME}.%d{yyyy-MM-dd}.%i.log.gz</fileNamePattern>
            <maxFileSize>10MB</maxFileSize>
            <maxHistory>30</maxHistory>
            <totalSizeCap>1GB</totalSizeCap>
        </rollingPolicy>
    </appender>

    <!-- Error File Appender -->
    <appender name="ERROR_FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>${LOG_PATH}/${APP_NAME}-error.log</file>
        <filter class="ch.qos.logback.classic.filter.ThresholdFilter">
            <level>ERROR</level>
        </filter>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger{36} - %msg%n%ex</pattern>
        </encoder>
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>${LOG_PATH}/${APP_NAME}-error.%d{yyyy-MM-dd}.%i.log.gz</fileNamePattern>
            <maxFileSize>10MB</maxFileSize>
            <maxHistory>90</maxHistory>
        </rollingPolicy>
    </appender>

    <!-- Async Appender for Performance -->
    <appender name="ASYNC_FILE" class="ch.qos.logback.classic.AsyncAppender">
        <appender-ref ref="FILE"/>
        <queueSize>512</queueSize>
        <discardingThreshold>0</discardingThreshold>
        <includeCallerData>false</includeCallerData>
    </appender>

    <!-- Logger configurations -->
    <logger name="com.example" level="DEBUG"/>
    <logger name="org.springframework" level="WARN"/>
    <logger name="org.hibernate.SQL" level="DEBUG"/>
    <logger name="org.hibernate.orm.jdbc.bind" level="TRACE"/>

    <!-- Root logger -->
    <root level="INFO">
        <appender-ref ref="CONSOLE"/>
        <appender-ref ref="ASYNC_FILE"/>
        <appender-ref ref="ERROR_FILE"/>
    </root>

</configuration>
```

## Profile-Specific Logging

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>

    <!-- Include Spring Boot defaults -->
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>

    <!-- Development profile -->
    <springProfile name="dev,local">
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <pattern>${CONSOLE_LOG_PATTERN}</pattern>
            </encoder>
        </appender>

        <root level="DEBUG">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>

    <!-- Production profile -->
    <springProfile name="prod,production">
        <appender name="JSON_FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
            <file>/var/log/myapp/application.json</file>
            <encoder class="net.logstash.logback.encoder.LogstashEncoder">
                <includeMdcKeyName>requestId</includeMdcKeyName>
                <includeMdcKeyName>userId</includeMdcKeyName>
            </encoder>
            <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
                <fileNamePattern>/var/log/myapp/application.%d{yyyy-MM-dd}.%i.json.gz</fileNamePattern>
                <maxFileSize>100MB</maxFileSize>
                <maxHistory>7</maxHistory>
            </rollingPolicy>
        </appender>

        <root level="INFO">
            <appender-ref ref="JSON_FILE"/>
        </root>
    </springProfile>

</configuration>
```

## JSON Logging for Production

Add the dependency:

```xml
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>7.4</version>
</dependency>
```

Configure JSON output:

```xml
<appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
    <encoder class="net.logstash.logback.encoder.LogstashEncoder">
        <timestampPattern>yyyy-MM-dd'T'HH:mm:ss.SSSZ</timestampPattern>
        <fieldNames>
            <timestamp>timestamp</timestamp>
            <message>message</message>
            <logger>logger</logger>
            <thread>thread</thread>
            <level>level</level>
            <stackTrace>stack_trace</stackTrace>
        </fieldNames>
        <customFields>{"app":"myapp","env":"${ENV:-development}"}</customFields>
    </encoder>
</appender>
```

Output example:

```json
{
  "timestamp": "2025-12-22T10:30:45.123Z",
  "level": "INFO",
  "thread": "http-nio-8080-exec-1",
  "logger": "com.example.UserController",
  "message": "User created successfully",
  "app": "myapp",
  "env": "production",
  "requestId": "abc-123",
  "userId": "user-456"
}
```

## Using MDC for Context

MDC (Mapped Diagnostic Context) adds contextual information to every log line:

```java
@Component
public class RequestContextFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        try {
            // Add context to MDC
            MDC.put("requestId", UUID.randomUUID().toString());
            MDC.put("clientIp", request.getRemoteAddr());

            HttpServletRequest httpRequest = (HttpServletRequest) request;
            String userId = httpRequest.getHeader("X-User-Id");
            if (userId != null) {
                MDC.put("userId", userId);
            }

            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
```

Include MDC in pattern:

```xml
<pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] [%X{requestId}] [%X{userId}] %logger{36} - %msg%n</pattern>
```

## Logging Best Practices

### Use Appropriate Log Levels

```java
@Service
@Slf4j
public class UserService {

    public User createUser(CreateUserRequest request) {
        log.debug("Creating user with email: {}", request.getEmail());  // Debug details

        try {
            User user = userRepository.save(new User(request));
            log.info("User created: id={}, email={}", user.getId(), user.getEmail());  // Business events
            return user;
        } catch (DataIntegrityViolationException e) {
            log.warn("Duplicate email attempted: {}", request.getEmail());  // Expected issues
            throw new DuplicateEmailException(request.getEmail());
        } catch (Exception e) {
            log.error("Failed to create user: {}", request.getEmail(), e);  // Unexpected errors
            throw e;
        }
    }
}
```

### Log Levels Guide

| Level | When to Use |
|-------|-------------|
| TRACE | Very detailed debugging (method entry/exit, variable values) |
| DEBUG | Diagnostic information useful during development |
| INFO | Business events, application lifecycle events |
| WARN | Potentially harmful situations, recoverable errors |
| ERROR | Errors that prevent specific operations |

### Use Parameterized Logging

```java
// Good - parameters only evaluated if log level is enabled
log.debug("Processing order {} for user {}", orderId, userId);

// Bad - string concatenation always happens
log.debug("Processing order " + orderId + " for user " + userId);

// Good - expensive operations guarded
if (log.isDebugEnabled()) {
    log.debug("Order details: {}", order.toDetailedString());
}
```

### Don't Log Sensitive Data

```java
// Bad - logs password
log.info("User login attempt: email={}, password={}", email, password);

// Good - no sensitive data
log.info("User login attempt: email={}", email);

// Bad - logs full credit card
log.info("Payment processed: card={}", cardNumber);

// Good - masked
log.info("Payment processed: card=****{}", cardNumber.substring(cardNumber.length() - 4));
```

## Performance Logging

```java
@Aspect
@Component
@Slf4j
public class PerformanceLoggingAspect {

    @Around("@annotation(com.example.LogExecutionTime)")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();

        try {
            Object result = joinPoint.proceed();
            long executionTime = System.currentTimeMillis() - startTime;

            log.info("Method {} executed in {} ms",
                joinPoint.getSignature().getName(),
                executionTime);

            if (executionTime > 1000) {
                log.warn("Slow method detected: {} took {} ms",
                    joinPoint.getSignature().toShortString(),
                    executionTime);
            }

            return result;
        } catch (Exception e) {
            long executionTime = System.currentTimeMillis() - startTime;
            log.error("Method {} failed after {} ms",
                joinPoint.getSignature().getName(),
                executionTime, e);
            throw e;
        }
    }
}

// Usage
@LogExecutionTime
public List<User> findAllUsers() {
    return userRepository.findAll();
}
```

## HTTP Request/Response Logging

```java
@Component
@Slf4j
public class RequestLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        long startTime = System.currentTimeMillis();

        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;

            log.info("HTTP {} {} - {} ({} ms)",
                request.getMethod(),
                request.getRequestURI(),
                response.getStatus(),
                duration);
        }
    }
}
```

Or use Spring's built-in:

```properties
# application.properties
logging.level.org.springframework.web.filter.CommonsRequestLoggingFilter=DEBUG
```

```java
@Configuration
public class RequestLoggingConfig {

    @Bean
    public CommonsRequestLoggingFilter requestLoggingFilter() {
        CommonsRequestLoggingFilter filter = new CommonsRequestLoggingFilter();
        filter.setIncludeQueryString(true);
        filter.setIncludePayload(true);
        filter.setMaxPayloadLength(10000);
        filter.setIncludeHeaders(true);
        filter.setAfterMessagePrefix("REQUEST: ");
        return filter;
    }
}
```

## Dynamic Log Level Changes

```java
@RestController
@RequestMapping("/admin/logging")
public class LoggingController {

    @PostMapping("/level")
    public ResponseEntity<String> setLogLevel(
            @RequestParam String logger,
            @RequestParam String level) {

        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
        Logger log = context.getLogger(logger);
        log.setLevel(Level.valueOf(level.toUpperCase()));

        return ResponseEntity.ok("Log level for " + logger + " set to " + level);
    }

    @GetMapping("/level")
    public ResponseEntity<Map<String, String>> getLogLevels() {
        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();

        Map<String, String> levels = context.getLoggerList().stream()
            .filter(logger -> logger.getLevel() != null)
            .collect(Collectors.toMap(
                Logger::getName,
                logger -> logger.getLevel().toString()
            ));

        return ResponseEntity.ok(levels);
    }
}
```

## Summary

| Configuration | Location |
|--------------|----------|
| Basic settings | application.properties/yml |
| Advanced Logback | logback-spring.xml |
| Profile-specific | springProfile in logback-spring.xml |
| JSON logging | Logstash encoder |
| Context data | MDC |
| Runtime changes | Actuator or custom endpoint |

Proper logging configuration makes debugging and monitoring significantly easier. Use appropriate log levels, include contextual information via MDC, and configure JSON output for production environments. Remember to never log sensitive data and use parameterized logging for performance.
