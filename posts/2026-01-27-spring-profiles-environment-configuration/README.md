# How to Use Spring Profiles for Environment Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Spring Boot, Java, Configuration, Environment, Profiles, DevOps

Description: Learn how to use Spring Profiles to manage environment-specific configuration for development, staging, and production environments with practical examples.

---

> Spring Profiles provide a way to segregate parts of your application configuration and make it only available in certain environments. This eliminates the need for conditional logic scattered throughout your code.

## What Are Spring Profiles?

Spring Profiles allow you to define different configurations for different environments. Instead of maintaining separate builds or using complex conditional logic, you can:

- Define environment-specific properties files
- Activate profile-specific beans
- Switch configurations without changing code
- Test with different configurations easily

A common setup includes profiles for `dev`, `test`, `staging`, and `prod` environments.

## Creating Profile-Specific Properties Files

Spring Boot automatically loads properties from files named `application-{profile}.yml` or `application-{profile}.properties`.

### Base Configuration

```yaml
# application.yml - shared configuration across all profiles
spring:
  application:
    name: my-service

# Default profile settings (used when no profile is active)
server:
  port: 8080

logging:
  level:
    root: INFO
```

### Development Profile

```yaml
# application-dev.yml - development-specific settings
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/myapp_dev
    username: dev_user
    password: dev_password
  jpa:
    # Show SQL queries in development for debugging
    show-sql: true
    hibernate:
      ddl-auto: update

# Enable all actuator endpoints in dev
management:
  endpoints:
    web:
      exposure:
        include: "*"

logging:
  level:
    # Verbose logging for debugging
    com.mycompany: DEBUG
    org.hibernate.SQL: DEBUG
```

### Production Profile

```yaml
# application-prod.yml - production-specific settings
spring:
  datasource:
    # Use environment variables for sensitive data
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}
    hikari:
      # Connection pool settings for production load
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
  jpa:
    show-sql: false
    hibernate:
      ddl-auto: validate

# Restrict actuator endpoints in production
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics

logging:
  level:
    root: WARN
    com.mycompany: INFO
```

### Staging Profile

```yaml
# application-staging.yml - staging environment
spring:
  datasource:
    url: jdbc:postgresql://staging-db.internal:5432/myapp_staging
    username: ${STAGING_DB_USER}
    password: ${STAGING_DB_PASSWORD}
  jpa:
    show-sql: false
    hibernate:
      ddl-auto: validate

logging:
  level:
    com.mycompany: DEBUG
```

## Activating Profiles

There are several ways to activate a Spring profile.

### Command Line Argument

```bash
# Activate single profile
java -jar myapp.jar --spring.profiles.active=prod

# Activate multiple profiles
java -jar myapp.jar --spring.profiles.active=prod,metrics
```

### Environment Variable

```bash
# Set environment variable before running
export SPRING_PROFILES_ACTIVE=prod
java -jar myapp.jar

# Or inline
SPRING_PROFILES_ACTIVE=prod java -jar myapp.jar
```

### JVM System Property

```bash
java -Dspring.profiles.active=prod -jar myapp.jar
```

### In application.yml (Default Profile)

```yaml
# application.yml - set default active profile
spring:
  profiles:
    active: dev
```

### Programmatically

```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MyApplication {
    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(MyApplication.class);

        // Set profile programmatically based on conditions
        String profile = System.getenv("ENVIRONMENT");
        if (profile != null) {
            app.setAdditionalProfiles(profile);
        }

        app.run(args);
    }
}
```

### Docker and Kubernetes

```dockerfile
# Dockerfile
FROM eclipse-temurin:17-jre
COPY target/myapp.jar app.jar
# Profile passed as environment variable
ENTRYPOINT ["java", "-jar", "app.jar"]
```

```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    spec:
      containers:
        - name: my-service
          image: my-service:latest
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "prod"
```

## Profile-Specific Beans with @Profile

Use the `@Profile` annotation to conditionally create beans based on the active profile.

### Basic Usage

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
public class DataSourceConfig {

    // Only created when 'dev' profile is active
    @Bean
    @Profile("dev")
    public DataSource devDataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:h2:mem:devdb");
        ds.setUsername("sa");
        ds.setPassword("");
        return ds;
    }

    // Only created when 'prod' profile is active
    @Bean
    @Profile("prod")
    public DataSource prodDataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(System.getenv("DATABASE_URL"));
        ds.setUsername(System.getenv("DATABASE_USERNAME"));
        ds.setPassword(System.getenv("DATABASE_PASSWORD"));
        ds.setMaximumPoolSize(20);
        return ds;
    }
}
```

### Profile Expressions

```java
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

// Active when 'dev' OR 'test' profile is active
@Service
@Profile({"dev", "test"})
public class MockPaymentService implements PaymentService {
    @Override
    public PaymentResult process(Payment payment) {
        // Return mock success for testing
        return new PaymentResult(true, "MOCK-" + UUID.randomUUID());
    }
}

// Active when 'prod' profile is active
@Service
@Profile("prod")
public class StripePaymentService implements PaymentService {
    private final StripeClient stripeClient;

    public StripePaymentService(StripeClient stripeClient) {
        this.stripeClient = stripeClient;
    }

    @Override
    public PaymentResult process(Payment payment) {
        // Real payment processing
        return stripeClient.charge(payment);
    }
}
```

### Negation and Complex Expressions

```java
// Active when 'prod' is NOT active
@Service
@Profile("!prod")
public class VerboseLoggingService implements LoggingService {
    // Detailed logging for non-production
}

// Active when 'prod' AND 'cloud' are both active
@Configuration
@Profile("prod & cloud")
public class CloudProductionConfig {
    // Cloud-specific production settings
}

// Active when 'dev' OR (NOT 'prod')
@Service
@Profile("dev | !prod")
public class DebugHelper {
    // Available in dev or any non-prod environment
}
```

### Profile on Classes

```java
// Entire configuration class is profile-specific
@Configuration
@Profile("dev")
public class DevSecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // Relaxed security for development
        return http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .build();
    }
}

@Configuration
@Profile("prod")
public class ProdSecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // Strict security for production
        return http
            .csrf(csrf -> csrf.enable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated())
            .build();
    }
}
```

## Profile Groups (Spring Boot 2.4+)

Profile groups let you activate multiple profiles with a single name. This is useful for grouping related configurations.

### Defining Profile Groups

```yaml
# application.yml
spring:
  profiles:
    # When 'production' is activated, also activate 'prod', 'metrics', and 'security'
    group:
      production:
        - prod
        - metrics
        - security
      development:
        - dev
        - debug
        - local-db
      testing:
        - test
        - mock-services
```

### Using Profile Groups

```bash
# Activates prod, metrics, and security profiles
java -jar myapp.jar --spring.profiles.active=production

# Activates dev, debug, and local-db profiles
java -jar myapp.jar --spring.profiles.active=development
```

### Separate Configuration Files for Groups

```yaml
# application-metrics.yml - metrics-specific configuration
management:
  metrics:
    export:
      prometheus:
        enabled: true
  endpoints:
    web:
      exposure:
        include: prometheus,metrics

# application-security.yml - security-specific configuration
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${AUTH_SERVER_URL}

# application-debug.yml - debug-specific configuration
logging:
  level:
    org.springframework: DEBUG
    org.hibernate: DEBUG
```

## Testing with Profiles

### Using @ActiveProfiles

```java
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class UserServiceTest {

    @Autowired
    private UserService userService;

    @Autowired
    private DataSource dataSource; // Will be test profile datasource

    @Test
    void shouldCreateUser() {
        User user = userService.create("test@example.com");
        assertThat(user.getId()).isNotNull();
    }
}
```

### Test-Specific Configuration

```yaml
# src/test/resources/application-test.yml
spring:
  datasource:
    # Use in-memory H2 for tests
    url: jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop
    database-platform: org.hibernate.dialect.H2Dialect

# Disable external services in tests
external:
  payment-service:
    enabled: false
  notification-service:
    enabled: false
```

### Multiple Profiles in Tests

```java
// Combine test profile with specific feature profiles
@SpringBootTest
@ActiveProfiles({"test", "mock-services"})
class IntegrationTest {
    // Uses both test and mock-services configurations
}
```

### Profile-Specific Test Beans

```java
@TestConfiguration
@Profile("test")
public class TestConfig {

    // Mock external services in tests
    @Bean
    public PaymentClient paymentClient() {
        return Mockito.mock(PaymentClient.class);
    }

    @Bean
    public NotificationService notificationService() {
        // Return a no-op implementation
        return notification -> CompletableFuture.completedFuture(null);
    }
}
```

## Common Patterns and Best Practices

### 1. Use Environment Variables for Secrets

```yaml
# Never commit secrets - use environment variables
spring:
  datasource:
    password: ${DB_PASSWORD}

# Or use Spring Cloud Config / Vault for secrets management
```

### 2. Profile Hierarchy

```yaml
# application.yml - base configuration
# application-common.yml - shared non-default settings
# application-dev.yml - development overrides
# application-prod.yml - production overrides

spring:
  profiles:
    group:
      dev:
        - common
        - dev-specific
      prod:
        - common
        - prod-specific
```

### 3. Feature Toggles with Profiles

```java
@Configuration
@Profile("feature-new-checkout")
public class NewCheckoutConfig {

    @Bean
    public CheckoutService checkoutService() {
        return new NewCheckoutService();
    }
}

// Enable with: --spring.profiles.active=prod,feature-new-checkout
```

### 4. Validate Required Properties

```java
@Configuration
@Profile("prod")
public class ProductionValidation {

    @Value("${spring.datasource.url}")
    private String dbUrl;

    @Value("${spring.datasource.password}")
    private String dbPassword;

    @PostConstruct
    public void validate() {
        // Fail fast if production config is incomplete
        if (dbUrl == null || dbUrl.contains("localhost")) {
            throw new IllegalStateException(
                "Production database URL must be configured");
        }
        if (dbPassword == null || dbPassword.length() < 16) {
            throw new IllegalStateException(
                "Production database password must be at least 16 characters");
        }
    }
}
```

### 5. Log Active Profiles on Startup

```java
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class ProfileLogger {

    private final Environment environment;

    public ProfileLogger(Environment environment) {
        this.environment = environment;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void logActiveProfiles() {
        String[] profiles = environment.getActiveProfiles();
        if (profiles.length == 0) {
            System.out.println("No active profiles - using default configuration");
        } else {
            System.out.println("Active profiles: " + String.join(", ", profiles));
        }
    }
}
```

## Summary

| Concept | Usage |
|---------|-------|
| **Properties files** | `application-{profile}.yml` for environment-specific config |
| **Activation** | CLI args, env vars, JVM props, or programmatically |
| **@Profile** | Conditional bean creation with profile expressions |
| **Profile groups** | Combine multiple profiles under one name (Spring Boot 2.4+) |
| **Testing** | `@ActiveProfiles` annotation for test-specific configuration |
| **Best practice** | Keep secrets in env vars, validate prod config, log active profiles |

Spring Profiles provide a clean separation between environment configurations without requiring code changes or multiple builds. Combined with environment variables for secrets and profile groups for complex setups, you can manage configurations across development, staging, and production environments effectively.

For monitoring your Spring Boot applications across all environments, [OneUptime](https://oneuptime.com) provides comprehensive observability with support for metrics, logs, and traces from your Java applications.
