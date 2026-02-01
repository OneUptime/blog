# How to Optimize Spring Boot Startup Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Performance, Startup, Optimization, GraalVM

Description: A practical guide to reducing Spring Boot startup time using lazy initialization, native images, and optimization techniques.

---

Spring Boot applications have a reputation for slow startup times. A typical microservice can take anywhere from 5 to 30 seconds to boot, which is painful during development and problematic in production environments where fast scaling matters. The good news is that you can drastically cut this time with the right optimizations.

I've spent years tuning Java applications, and I'll share the techniques that actually move the needle. We'll cover everything from quick configuration changes to building native images with GraalVM.

## Understanding What Slows Down Startup

Before optimizing, you need to understand where time goes during Spring Boot startup:

1. **JVM initialization** - Loading the Java runtime itself
2. **Classpath scanning** - Finding and loading classes annotated with Spring stereotypes
3. **Bean instantiation** - Creating all the beans in the application context
4. **Auto-configuration processing** - Evaluating conditions and configuring beans automatically
5. **Database connection pools** - Initializing connections to databases

Most applications spend the majority of startup time on classpath scanning and bean instantiation. That's where we'll focus.

## Measuring Your Baseline

You can't improve what you don't measure. Spring Boot Actuator provides a startup endpoint that breaks down exactly where time is spent.

Add the actuator dependency to your project:

```xml
<!-- Add Spring Boot Actuator for startup metrics and health endpoints -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

Enable the startup endpoint in your application properties:

```yaml
# Enable the startup actuator endpoint to measure startup time breakdown
management:
  endpoints:
    web:
      exposure:
        include: startup, health, info
  endpoint:
    startup:
      enabled: true
```

You also need to capture startup events by using `BufferingApplicationStartup`:

```java
// Configure the application to buffer startup events for later analysis
// Set the buffer size based on your application complexity - 2048 is usually enough
@SpringBootApplication
public class MyApplication {
    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(MyApplication.class);
        app.setApplicationStartup(new BufferingApplicationStartup(2048));
        app.run(args);
    }
}
```

After starting your application, hit the endpoint to see the breakdown:

```bash
curl http://localhost:8080/actuator/startup | jq '.timeline.events | sort_by(.duration) | reverse | .[:10]'
```

This shows the 10 slowest steps during startup. Use this data to identify your bottlenecks.

## Enable Lazy Initialization

The simplest optimization is lazy initialization. By default, Spring creates all beans at startup. With lazy initialization, beans are created only when first accessed.

```yaml
# Enable lazy initialization globally - beans load on first use instead of at startup
# Warning: This moves startup cost to first request, so test your critical paths
spring:
  main:
    lazy-initialization: true
```

This single line can cut startup time by 50% or more. However, there's a trade-off - the first request to your application will be slower because it triggers bean creation. For development, this trade-off is almost always worth it. In production, it depends on your use case.

You can also selectively mark beans as lazy:

```java
// Mark specific slow-to-initialize beans as lazy
// Use this when you can't enable global lazy init but have specific heavy beans
@Service
@Lazy
public class ExpensiveReportService {
    
    public ExpensiveReportService() {
        // This initialization now happens on first use, not at startup
        loadExpensiveResources();
    }
}
```

Or exclude specific beans from lazy initialization when you need them ready immediately:

```java
// Ensure critical beans initialize at startup even with global lazy init enabled
// Use @Lazy(false) for beans that must be ready before first request
@Service
@Lazy(false)
public class CacheWarmupService {
    
    @PostConstruct
    public void warmupCache() {
        // This runs at startup regardless of lazy init settings
    }
}
```

## Reduce Classpath Scanning

Spring scans your entire classpath looking for annotated classes. The more classes and packages you have, the longer this takes.

Narrow down the packages Spring scans:

```java
// Explicitly specify which packages to scan instead of letting Spring scan everything
// This is especially important in large monoliths with many unrelated packages
@SpringBootApplication
@ComponentScan(basePackages = {
    "com.mycompany.myapp.controller",
    "com.mycompany.myapp.service",
    "com.mycompany.myapp.repository"
})
public class MyApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyApplication.class, args);
    }
}
```

You can also use a component scan filter to exclude packages:

```java
// Exclude packages that contain classes you don't need in this deployment
// Useful when sharing a codebase between multiple microservices
@SpringBootApplication
@ComponentScan(
    basePackages = "com.mycompany.myapp",
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.REGEX,
        pattern = "com.mycompany.myapp.unused.*"
    )
)
public class MyApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyApplication.class, args);
    }
}
```

## Conditional Bean Loading

Spring auto-configuration is convenient but creates many beans you might not need. Use conditional annotations to load beans only when necessary.

```java
// Only create this bean when a specific property is set
// Great for feature flags or environment-specific configurations
@Configuration
public class EmailConfiguration {
    
    @Bean
    @ConditionalOnProperty(name = "email.enabled", havingValue = "true")
    public EmailService emailService() {
        return new SmtpEmailService();
    }
}
```

You can also conditionally load beans based on profiles:

```java
// Create different beans for different environments
// Dev gets a fast stub, production gets the real implementation
@Configuration
public class StorageConfiguration {
    
    @Bean
    @Profile("dev")
    public StorageService localStorageService() {
        return new LocalFileStorageService();
    }
    
    @Bean
    @Profile("prod")
    public StorageService s3StorageService() {
        return new S3StorageService();
    }
}
```

To see which auto-configurations are being applied, add this to your properties:

```yaml
# Log which auto-configurations are applied and which are excluded
# Useful for debugging but disable in production
debug: true
```

Then exclude the ones you don't need:

```java
// Exclude auto-configurations you definitely don't need
// Check your logs to identify candidates for exclusion
@SpringBootApplication(exclude = {
    DataSourceAutoConfiguration.class,
    HibernateJpaAutoConfiguration.class,
    MongoAutoConfiguration.class,
    RedisAutoConfiguration.class
})
public class MyApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyApplication.class, args);
    }
}
```

## Spring AOT (Ahead-of-Time) Processing

Spring 6 introduced AOT processing, which shifts work from runtime to build time. The compiler analyzes your application and generates optimized code.

Add the AOT Maven plugin:

```xml
<!-- Spring AOT plugin pre-computes bean definitions at build time -->
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <executions>
        <execution>
            <id>process-aot</id>
            <goals>
                <goal>process-aot</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

For Gradle users:

```groovy
// Enable AOT processing in Gradle builds
// This generates optimized bean definitions at compile time
plugins {
    id 'org.springframework.boot' version '3.2.0'
}

tasks.named("processAot") {
    // AOT processing automatically enabled with Spring Boot 3.x
}
```

Run your application with AOT optimizations:

```bash
java -Dspring.aot.enabled=true -jar myapp.jar
```

AOT processing typically reduces startup time by 10-20% while maintaining full compatibility with standard JVM deployment.

## GraalVM Native Images

For the most dramatic improvement, compile your application to a native executable using GraalVM. Native images start in milliseconds instead of seconds.

First, add the native build tools:

```xml
<!-- GraalVM native image support - compiles Java to native executable -->
<plugin>
    <groupId>org.graalvm.buildtools</groupId>
    <artifactId>native-maven-plugin</artifactId>
    <configuration>
        <buildArgs>
            <!-- Enable build-time initialization for faster startup -->
            <buildArg>--initialize-at-build-time</buildArg>
            <!-- Include resources that would otherwise be missed -->
            <buildArg>-H:+AddAllCharsets</buildArg>
        </buildArgs>
    </configuration>
</plugin>
```

Build the native image:

```bash
# This takes several minutes and requires significant RAM (8GB+ recommended)
./mvnw -Pnative native:compile
```

The resulting executable starts extremely fast:

```bash
# Native image typically starts in 50-200ms vs 5-15 seconds for JVM
./target/myapp
```

There are limitations to know about. Native images don't support runtime reflection well, so some libraries won't work out of the box. Spring does heavy lifting to support native compilation, but you might need to add hints for custom reflection usage:

```java
// Register classes that need reflection support in native images
// Required when libraries use reflection that GraalVM can't detect automatically
@Configuration
@ImportRuntimeHints(MyRuntimeHints.class)
public class NativeConfiguration {
}

public class MyRuntimeHints implements RuntimeHintsRegistrar {
    
    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        // Register classes that use reflection
        hints.reflection().registerType(MyDynamicClass.class,
            MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
            MemberCategory.INVOKE_DECLARED_METHODS);
    }
}
```

## Other Quick Wins

Here are additional optimizations that add up:

**Disable JMX if you don't need it:**

```yaml
# JMX adds startup overhead - disable unless you're using JMX monitoring
spring:
  jmx:
    enabled: false
```

**Use a faster random source:**

```bash
# Entropy gathering can block startup - use urandom instead
java -Djava.security.egd=file:/dev/./urandom -jar myapp.jar
```

**Reduce logging at startup:**

```yaml
# Less logging means faster startup - tune based on what you actually need
logging:
  level:
    root: WARN
    org.springframework: WARN
    org.hibernate: WARN
```

**Optimize database connection pool:**

```yaml
# Start with fewer connections and grow as needed
spring:
  datasource:
    hikari:
      # Don't pre-create all connections at startup
      minimum-idle: 2
      maximum-pool-size: 10
      # Initialize lazily
      initialization-fail-timeout: -1
```

## Benchmarking Your Optimizations

Create a simple script to benchmark startup time consistently:

```bash
#!/bin/bash
# benchmark-startup.sh - Run multiple times and average the results

RUNS=5
TOTAL=0

for i in $(seq 1 $RUNS); do
    # Capture startup time from Spring Boot's log message
    START_TIME=$(java -jar target/myapp.jar &
        PID=$!
        grep -m 1 "Started.*in" <(tail -f nohup.out 2>/dev/null) | 
        sed -n 's/.*in \([0-9.]*\) seconds.*/\1/p'
        kill $PID 2>/dev/null
    )
    TOTAL=$(echo "$TOTAL + $START_TIME" | bc)
    echo "Run $i: ${START_TIME}s"
done

AVG=$(echo "scale=2; $TOTAL / $RUNS" | bc)
echo "Average startup time: ${AVG}s"
```

Compare results before and after each optimization. Keep notes on what worked and by how much.

## Real-World Results

Here's what you can expect from these optimizations on a typical Spring Boot microservice:

| Optimization | Time Saved |
|--------------|------------|
| Lazy initialization | 30-50% |
| Reduced classpath scanning | 10-20% |
| Exclude unused auto-configs | 10-15% |
| Spring AOT | 10-20% |
| GraalVM native image | 90-95% |

A microservice that starts in 12 seconds can often be tuned to start in 4-6 seconds with JVM optimizations, or under 200 milliseconds as a native image.

## Choosing the Right Approach

Not every application needs native images. Here's a simple decision framework:

- **Development:** Enable lazy initialization and call it good
- **Production with fast scaling needs:** Use all JVM optimizations plus Spring AOT
- **Serverless or edge deployment:** Go native with GraalVM
- **Legacy applications with lots of reflection:** Stick with JVM optimizations

Start with the simplest changes and measure their impact before moving to more complex solutions. Often, lazy initialization and excluding unused auto-configurations give you 80% of the benefit with minimal effort.

The key is measuring before and after each change. What works for one application might not work for another, depending on dependencies and architecture. Use the startup actuator endpoint, track your metrics, and optimize based on data rather than assumptions.

---

*Monitor Spring Boot startup metrics with [OneUptime](https://oneuptime.com) - track deployment performance.*
