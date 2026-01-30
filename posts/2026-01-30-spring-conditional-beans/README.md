# How to Build Conditional Beans in Spring Boot

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Java, Spring Boot, Configuration, Dependency Injection

Description: Control bean creation in Spring Boot with @Conditional annotations for profile-based, property-based, and custom condition configurations.

---

Spring Boot applications often need different beans depending on the environment, available classes, or configuration properties. Instead of writing complex if-else logic scattered throughout your codebase, Spring provides a clean solution through conditional bean creation.

This guide walks through the various `@Conditional` annotations, shows you how to create custom conditions, and demonstrates testing strategies for conditional beans.

## Understanding Conditional Bean Creation

Conditional beans allow Spring to decide at startup whether to register a bean in the application context. This decision happens during the configuration phase, before any beans are instantiated.

Here is a simple example:

```java
@Configuration
public class MessagingConfig {

    @Bean
    @ConditionalOnProperty(name = "messaging.enabled", havingValue = "true")
    public MessageService messageService() {
        return new MessageService();
    }
}
```

The `MessageService` bean only gets created when `messaging.enabled=true` exists in your application properties.

## @ConditionalOnProperty

This annotation is the most commonly used conditional. It checks for the presence and value of configuration properties.

### Basic Property Check

```java
@Configuration
public class CacheConfig {

    // Bean created only when cache.type property equals "redis"
    @Bean
    @ConditionalOnProperty(name = "cache.type", havingValue = "redis")
    public CacheManager redisCacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheManager cacheManager = RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(RedisCacheConfiguration.defaultCacheConfig())
            .build();
        return cacheManager;
    }

    // Bean created only when cache.type property equals "caffeine"
    @Bean
    @ConditionalOnProperty(name = "cache.type", havingValue = "caffeine")
    public CacheManager caffeineCacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(10)));
        return cacheManager;
    }
}
```

### Property with Default Behavior

The `matchIfMissing` attribute controls what happens when the property does not exist:

```java
@Configuration
public class SecurityConfig {

    // Security is enabled by default when property is missing
    @Bean
    @ConditionalOnProperty(
        name = "app.security.enabled",
        havingValue = "true",
        matchIfMissing = true
    )
    public SecurityFilter securityFilter() {
        return new SecurityFilter();
    }

    // Debug mode is disabled by default
    @Bean
    @ConditionalOnProperty(
        name = "app.debug.mode",
        havingValue = "true",
        matchIfMissing = false
    )
    public DebugInterceptor debugInterceptor() {
        return new DebugInterceptor();
    }
}
```

### Multiple Properties

Check multiple properties at once:

```java
@Configuration
public class NotificationConfig {

    // Requires both properties to be set to "true"
    @Bean
    @ConditionalOnProperty(
        name = {"notifications.email.enabled", "notifications.sms.enabled"},
        havingValue = "true"
    )
    public MultiChannelNotifier multiChannelNotifier() {
        return new MultiChannelNotifier();
    }
}
```

### Property Prefix

Use `prefix` to avoid repetition:

```java
@Configuration
public class FeatureFlagConfig {

    @Bean
    @ConditionalOnProperty(prefix = "features", name = "dark-mode", havingValue = "true")
    public DarkModeService darkModeService() {
        return new DarkModeService();
    }

    @Bean
    @ConditionalOnProperty(prefix = "features", name = "beta-ui", havingValue = "true")
    public BetaUIService betaUIService() {
        return new BetaUIService();
    }
}
```

The corresponding application.properties:

```properties
features.dark-mode=true
features.beta-ui=false
```

## @ConditionalOnClass and @ConditionalOnMissingClass

These annotations check for the presence of classes on the classpath. They are particularly useful for auto-configuration that adapts to available libraries.

### Conditional on Class Presence

```java
@Configuration
public class HttpClientConfig {

    // Use OkHttp when available on classpath
    @Bean
    @ConditionalOnClass(name = "okhttp3.OkHttpClient")
    public HttpClient okHttpClient() {
        return new OkHttpClientAdapter();
    }

    // Fall back to Apache HttpClient otherwise
    @Bean
    @ConditionalOnClass(name = "org.apache.http.client.HttpClient")
    @ConditionalOnMissingClass("okhttp3.OkHttpClient")
    public HttpClient apacheHttpClient() {
        return new ApacheHttpClientAdapter();
    }
}
```

### Auto-Configuration Example

Here is a pattern commonly used in Spring Boot starters:

```java
@Configuration
@ConditionalOnClass(DataSource.class)
public class DataSourceAutoConfiguration {

    @Bean
    @ConditionalOnClass(name = "com.zaxxer.hikari.HikariDataSource")
    @ConditionalOnProperty(name = "spring.datasource.type", havingValue = "hikari", matchIfMissing = true)
    public DataSource hikariDataSource(DataSourceProperties properties) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(properties.getUrl());
        config.setUsername(properties.getUsername());
        config.setPassword(properties.getPassword());
        config.setMaximumPoolSize(10);
        return new HikariDataSource(config);
    }

    @Bean
    @ConditionalOnClass(name = "org.apache.tomcat.jdbc.pool.DataSource")
    @ConditionalOnMissingBean(DataSource.class)
    public DataSource tomcatDataSource(DataSourceProperties properties) {
        org.apache.tomcat.jdbc.pool.DataSource dataSource =
            new org.apache.tomcat.jdbc.pool.DataSource();
        dataSource.setUrl(properties.getUrl());
        dataSource.setUsername(properties.getUsername());
        dataSource.setPassword(properties.getPassword());
        return dataSource;
    }
}
```

## @ConditionalOnBean and @ConditionalOnMissingBean

These annotations check for the presence of other beans in the application context.

### Conditional on Existing Bean

```java
@Configuration
public class ServiceLayerConfig {

    // Only create if a DataSource bean exists
    @Bean
    @ConditionalOnBean(DataSource.class)
    public UserRepository userRepository(DataSource dataSource) {
        return new JdbcUserRepository(dataSource);
    }

    // Only create if UserRepository exists
    @Bean
    @ConditionalOnBean(UserRepository.class)
    public UserService userService(UserRepository userRepository) {
        return new UserServiceImpl(userRepository);
    }
}
```

### Providing Default Implementations

```java
@Configuration
public class DefaultsConfig {

    // Only create if no PasswordEncoder bean exists
    @Bean
    @ConditionalOnMissingBean(PasswordEncoder.class)
    public PasswordEncoder defaultPasswordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Only create if no ObjectMapper bean exists
    @Bean
    @ConditionalOnMissingBean(ObjectMapper.class)
    public ObjectMapper defaultObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }
}
```

### Combining Bean Conditions

```java
@Configuration
public class IntegrationConfig {

    @Bean
    @ConditionalOnBean({DataSource.class, TransactionManager.class})
    @ConditionalOnMissingBean(AuditService.class)
    public AuditService auditService(DataSource dataSource, TransactionManager txManager) {
        return new DatabaseAuditService(dataSource, txManager);
    }
}
```

## @Profile Annotation

Profiles provide environment-specific bean configuration. Unlike other conditionals, profiles are typically set at application startup.

### Basic Profile Usage

```java
@Configuration
public class EnvironmentConfig {

    @Bean
    @Profile("development")
    public DataSource developmentDataSource() {
        // H2 in-memory database for development
        return new EmbeddedDatabaseBuilder()
            .setType(EmbeddedDatabaseType.H2)
            .addScript("schema.sql")
            .addScript("test-data.sql")
            .build();
    }

    @Bean
    @Profile("production")
    public DataSource productionDataSource() {
        // Production PostgreSQL connection pool
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(System.getenv("DATABASE_URL"));
        config.setUsername(System.getenv("DATABASE_USER"));
        config.setPassword(System.getenv("DATABASE_PASSWORD"));
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        return new HikariDataSource(config);
    }
}
```

### Profile Expressions

Spring supports logical operators in profile expressions:

```java
@Configuration
public class LoggingConfig {

    // Active in development OR test profiles
    @Bean
    @Profile("development | test")
    public LoggingFilter verboseLoggingFilter() {
        LoggingFilter filter = new LoggingFilter();
        filter.setLogLevel(Level.DEBUG);
        filter.setIncludePayload(true);
        return filter;
    }

    // Active only in production AND when not running tests
    @Bean
    @Profile("production & !test")
    public LoggingFilter productionLoggingFilter() {
        LoggingFilter filter = new LoggingFilter();
        filter.setLogLevel(Level.INFO);
        filter.setIncludePayload(false);
        return filter;
    }

    // Active when NOT in production
    @Bean
    @Profile("!production")
    public MockEmailService mockEmailService() {
        return new MockEmailService();
    }
}
```

### Profile-Specific Configuration Classes

```java
@Configuration
@Profile("cloud")
public class CloudServicesConfig {

    @Bean
    public StorageService cloudStorageService() {
        return new S3StorageService();
    }

    @Bean
    public MessageQueue cloudMessageQueue() {
        return new SQSMessageQueue();
    }
}

@Configuration
@Profile("local")
public class LocalServicesConfig {

    @Bean
    public StorageService localStorageService() {
        return new FileSystemStorageService("/tmp/storage");
    }

    @Bean
    public MessageQueue localMessageQueue() {
        return new InMemoryMessageQueue();
    }
}
```

## Comparison of Conditional Annotations

| Annotation | Checks For | Common Use Case |
|------------|-----------|-----------------|
| @ConditionalOnProperty | Configuration property value | Feature flags, environment settings |
| @ConditionalOnClass | Class on classpath | Library-specific implementations |
| @ConditionalOnMissingClass | Class NOT on classpath | Fallback implementations |
| @ConditionalOnBean | Bean in context | Dependent services |
| @ConditionalOnMissingBean | Bean NOT in context | Default implementations |
| @Profile | Active Spring profile | Environment-specific configs |
| @ConditionalOnResource | Resource file exists | Configuration file detection |
| @ConditionalOnWebApplication | Running as web app | Web-specific beans |
| @ConditionalOnExpression | SpEL expression | Complex conditions |

## Creating Custom Conditions

When built-in annotations do not cover your use case, create a custom `Condition` implementation.

### Basic Custom Condition

```java
public class OnWeekdayCondition implements Condition {

    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        DayOfWeek today = LocalDate.now().getDayOfWeek();
        return today != DayOfWeek.SATURDAY && today != DayOfWeek.SUNDAY;
    }
}

// Usage
@Configuration
public class SchedulerConfig {

    @Bean
    @Conditional(OnWeekdayCondition.class)
    public WeekdayReportScheduler weekdayReportScheduler() {
        return new WeekdayReportScheduler();
    }
}
```

### Condition with Configuration Properties

```java
public class OnMinimumMemoryCondition implements Condition {

    private static final long DEFAULT_MIN_MEMORY_MB = 512;

    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        Environment env = context.getEnvironment();

        // Get minimum required memory from properties
        long requiredMemoryMb = Long.parseLong(
            env.getProperty("app.minimum.memory.mb", String.valueOf(DEFAULT_MIN_MEMORY_MB))
        );

        // Check available heap memory
        long maxHeapMb = Runtime.getRuntime().maxMemory() / (1024 * 1024);

        return maxHeapMb >= requiredMemoryMb;
    }
}
```

### Creating a Custom Conditional Annotation

For reusable conditions, create a custom annotation:

```java
// The custom annotation
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Conditional(OnOperatingSystemCondition.class)
public @interface ConditionalOnOperatingSystem {
    String[] value();
}

// The condition implementation
public class OnOperatingSystemCondition implements Condition {

    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        Map<String, Object> attributes = metadata.getAnnotationAttributes(
            ConditionalOnOperatingSystem.class.getName()
        );

        if (attributes == null) {
            return true;
        }

        String[] requiredOs = (String[]) attributes.get("value");
        String currentOs = System.getProperty("os.name").toLowerCase();

        for (String os : requiredOs) {
            if (currentOs.contains(os.toLowerCase())) {
                return true;
            }
        }

        return false;
    }
}

// Usage
@Configuration
public class PlatformConfig {

    @Bean
    @ConditionalOnOperatingSystem({"linux", "unix"})
    public FileWatcher inotifyFileWatcher() {
        return new InotifyFileWatcher();
    }

    @Bean
    @ConditionalOnOperatingSystem("windows")
    public FileWatcher windowsFileWatcher() {
        return new WindowsFileWatcher();
    }

    @Bean
    @ConditionalOnOperatingSystem("mac")
    public FileWatcher fsEventsFileWatcher() {
        return new FSEventsFileWatcher();
    }
}
```

### Complex Condition with Multiple Checks

```java
public class OnDatabaseAvailableCondition implements Condition {

    private static final Logger log = LoggerFactory.getLogger(OnDatabaseAvailableCondition.class);

    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        Environment env = context.getEnvironment();

        String url = env.getProperty("spring.datasource.url");
        String username = env.getProperty("spring.datasource.username");
        String password = env.getProperty("spring.datasource.password");

        // Check if connection properties exist
        if (url == null || username == null) {
            log.debug("Database properties not configured");
            return false;
        }

        // Try to establish connection
        try (Connection conn = DriverManager.getConnection(url, username, password)) {
            log.info("Database connection verified successfully");
            return true;
        } catch (SQLException e) {
            log.warn("Database connection failed: {}", e.getMessage());
            return false;
        }
    }
}
```

## Conditional Auto-Configuration

When building Spring Boot starters, combine multiple conditions for robust auto-configuration.

### Complete Auto-Configuration Example

```java
@Configuration
@ConditionalOnClass(RedisTemplate.class)
@EnableConfigurationProperties(RedisCacheProperties.class)
@AutoConfigureAfter(RedisAutoConfiguration.class)
public class RedisCacheAutoConfiguration {

    private final RedisCacheProperties properties;

    public RedisCacheAutoConfiguration(RedisCacheProperties properties) {
        this.properties = properties;
    }

    @Bean
    @ConditionalOnMissingBean(CacheManager.class)
    @ConditionalOnBean(RedisConnectionFactory.class)
    @ConditionalOnProperty(prefix = "cache.redis", name = "enabled", havingValue = "true", matchIfMissing = true)
    public RedisCacheManager redisCacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(properties.getTtlMinutes()))
            .serializeKeysWith(
                RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer())
            )
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer())
            );

        if (!properties.isCacheNullValues()) {
            config = config.disableCachingNullValues();
        }

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(config)
            .build();
    }

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnBean(CacheManager.class)
    public CacheStatisticsCollector cacheStatisticsCollector(CacheManager cacheManager) {
        return new CacheStatisticsCollector(cacheManager);
    }
}
```

### Properties Class for Auto-Configuration

```java
@ConfigurationProperties(prefix = "cache.redis")
public class RedisCacheProperties {

    private boolean enabled = true;
    private int ttlMinutes = 60;
    private boolean cacheNullValues = false;
    private String keyPrefix = "";

    // Getters and setters
    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getTtlMinutes() {
        return ttlMinutes;
    }

    public void setTtlMinutes(int ttlMinutes) {
        this.ttlMinutes = ttlMinutes;
    }

    public boolean isCacheNullValues() {
        return cacheNullValues;
    }

    public void setCacheNullValues(boolean cacheNullValues) {
        this.cacheNullValues = cacheNullValues;
    }

    public String getKeyPrefix() {
        return keyPrefix;
    }

    public void setKeyPrefix(String keyPrefix) {
        this.keyPrefix = keyPrefix;
    }
}
```

### Registering Auto-Configuration

Create `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`:

```
com.example.cache.RedisCacheAutoConfiguration
```

## Testing Conditional Beans

Testing conditional beans requires careful setup to verify beans are created or excluded correctly.

### Testing with @SpringBootTest

```java
@SpringBootTest(properties = {
    "cache.type=redis",
    "cache.redis.enabled=true"
})
class RedisCacheConfigTest {

    @Autowired
    private ApplicationContext context;

    @Test
    void shouldCreateRedisCacheManager() {
        assertThat(context.containsBean("redisCacheManager")).isTrue();
        assertThat(context.getBean(CacheManager.class))
            .isInstanceOf(RedisCacheManager.class);
    }
}

@SpringBootTest(properties = {
    "cache.type=caffeine"
})
class CaffeineCacheConfigTest {

    @Autowired
    private ApplicationContext context;

    @Test
    void shouldCreateCaffeineCacheManager() {
        assertThat(context.containsBean("redisCacheManager")).isFalse();
        assertThat(context.getBean(CacheManager.class))
            .isInstanceOf(CaffeineCacheManager.class);
    }
}
```

### Testing with ApplicationContextRunner

The `ApplicationContextRunner` provides a fluent API for testing auto-configuration:

```java
class HttpClientAutoConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withConfiguration(AutoConfigurations.of(HttpClientAutoConfiguration.class));

    @Test
    void shouldCreateOkHttpClientWhenOnClasspath() {
        contextRunner
            .withClassLoader(new FilteredClassLoader(ApacheHttpClient.class))
            .withPropertyValues("http.client.type=okhttp")
            .run(context -> {
                assertThat(context).hasSingleBean(HttpClient.class);
                assertThat(context.getBean(HttpClient.class))
                    .isInstanceOf(OkHttpClientAdapter.class);
            });
    }

    @Test
    void shouldCreateApacheClientAsFallback() {
        contextRunner
            .withClassLoader(new FilteredClassLoader(OkHttpClient.class))
            .run(context -> {
                assertThat(context).hasSingleBean(HttpClient.class);
                assertThat(context.getBean(HttpClient.class))
                    .isInstanceOf(ApacheHttpClientAdapter.class);
            });
    }

    @Test
    void shouldNotCreateBeanWhenDisabled() {
        contextRunner
            .withPropertyValues("http.client.enabled=false")
            .run(context -> {
                assertThat(context).doesNotHaveBean(HttpClient.class);
            });
    }
}
```

### Testing Profile-Specific Beans

```java
@SpringBootTest
@ActiveProfiles("development")
class DevelopmentProfileTest {

    @Autowired
    private ApplicationContext context;

    @Test
    void shouldLoadDevelopmentBeans() {
        assertThat(context.containsBean("developmentDataSource")).isTrue();
        assertThat(context.containsBean("productionDataSource")).isFalse();
    }
}

@SpringBootTest
@ActiveProfiles("production")
class ProductionProfileTest {

    @Autowired
    private ApplicationContext context;

    @Test
    void shouldLoadProductionBeans() {
        assertThat(context.containsBean("productionDataSource")).isTrue();
        assertThat(context.containsBean("developmentDataSource")).isFalse();
    }
}
```

### Testing Custom Conditions

```java
class OnMinimumMemoryConditionTest {

    @Test
    void shouldMatchWhenSufficientMemory() {
        ApplicationContextRunner runner = new ApplicationContextRunner()
            .withPropertyValues("app.minimum.memory.mb=256")
            .withUserConfiguration(TestConfig.class);

        runner.run(context -> {
            assertThat(context).hasSingleBean(MemoryIntensiveService.class);
        });
    }

    @Test
    void shouldNotMatchWhenInsufficientMemory() {
        ApplicationContextRunner runner = new ApplicationContextRunner()
            .withPropertyValues("app.minimum.memory.mb=999999")
            .withUserConfiguration(TestConfig.class);

        runner.run(context -> {
            assertThat(context).doesNotHaveBean(MemoryIntensiveService.class);
        });
    }

    @Configuration
    static class TestConfig {
        @Bean
        @Conditional(OnMinimumMemoryCondition.class)
        public MemoryIntensiveService memoryIntensiveService() {
            return new MemoryIntensiveService();
        }
    }
}
```

## Best Practices

### 1. Order Your Conditions Efficiently

Place fast-to-evaluate conditions first:

```java
@Bean
@ConditionalOnProperty(name = "feature.enabled", havingValue = "true")  // Fast: property lookup
@ConditionalOnClass(SomeLibrary.class)                                   // Medium: classpath scan
@ConditionalOnBean(DataSource.class)                                     // Slow: context search
public MyService myService() {
    return new MyService();
}
```

### 2. Provide Clear Logging

```java
public class OnExternalServiceCondition implements Condition {

    private static final Logger log = LoggerFactory.getLogger(OnExternalServiceCondition.class);

    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        String serviceUrl = context.getEnvironment().getProperty("external.service.url");

        if (serviceUrl == null) {
            log.info("External service condition: SKIP - no URL configured");
            return false;
        }

        boolean available = checkServiceHealth(serviceUrl);
        log.info("External service condition: {} - service at {} is {}",
            available ? "MATCH" : "SKIP",
            serviceUrl,
            available ? "available" : "unavailable");

        return available;
    }
}
```

### 3. Document Conditional Beans

```java
/**
 * Creates a Redis-backed session store.
 *
 * Conditions:
 * - Redis classes on classpath (spring-data-redis dependency)
 * - RedisConnectionFactory bean available
 * - session.store.type property set to "redis"
 *
 * @see InMemorySessionStoreConfig for fallback implementation
 */
@Bean
@ConditionalOnClass(RedisTemplate.class)
@ConditionalOnBean(RedisConnectionFactory.class)
@ConditionalOnProperty(name = "session.store.type", havingValue = "redis")
public SessionStore redisSessionStore(RedisConnectionFactory factory) {
    return new RedisSessionStore(factory);
}
```

### 4. Avoid Circular Condition Dependencies

Do not create conditions that depend on beans that themselves have conditions:

```java
// Problematic: circular dependency potential
@Bean
@ConditionalOnBean(ServiceA.class)
public ServiceB serviceB(ServiceA serviceA) { ... }

@Bean
@ConditionalOnBean(ServiceB.class)
public ServiceA serviceA(ServiceB serviceB) { ... }  // Never created!
```

## Summary

Conditional beans give you fine-grained control over your Spring Boot application's configuration. The key annotations to remember are:

- `@ConditionalOnProperty` for configuration-driven beans
- `@ConditionalOnClass` and `@ConditionalOnMissingClass` for classpath detection
- `@ConditionalOnBean` and `@ConditionalOnMissingBean` for context-aware configuration
- `@Profile` for environment-specific beans

For complex scenarios, implement the `Condition` interface to create custom conditions. Always test your conditional beans thoroughly using `ApplicationContextRunner` or profile-specific test configurations.

The conditional bean system is what makes Spring Boot auto-configuration work. Understanding these patterns helps you build cleaner, more maintainable applications that adapt to their runtime environment without manual intervention.
