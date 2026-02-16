# How to Fix 'No bean named X available' Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Dependency Injection, Bean Configuration, Troubleshooting, Spring Framework

Description: Learn how to diagnose and fix 'No bean named X available' errors in Spring Boot. This guide covers common causes including missing annotations, component scanning issues, and conditional beans.

---

> The "No bean named X available" error occurs when Spring cannot find a bean with the requested name in its application context. This guide helps you understand why this happens and how to fix it quickly.

This error typically appears as `NoSuchBeanDefinitionException: No bean named 'userService' available` and indicates Spring's dependency injection system cannot locate the required component.

---

## Understanding the Error

The full error message usually looks like:

```
org.springframework.beans.factory.NoSuchBeanDefinitionException:
No bean named 'userService' available
```

Or when injecting by type:

```
org.springframework.beans.factory.NoSuchBeanDefinitionException:
No qualifying bean of type 'com.example.UserService' available
```

---

## Bean Resolution Flow

```mermaid
flowchart TD
    A[Bean Requested] --> B{Bean Name Specified?}
    B -->|Yes| C[Search by Name]
    B -->|No| D[Search by Type]
    C --> E{Bean Found?}
    D --> E
    E -->|No| F[NoSuchBeanDefinitionException]
    E -->|Yes| G{Multiple Beans?}
    G -->|Yes| H{@Primary or @Qualifier?}
    H -->|No| I[NoUniqueBeanDefinitionException]
    H -->|Yes| J[Return Bean]
    G -->|No| J
```

---

## Common Causes and Solutions

### 1. Missing @Component or @Service Annotation

The most common cause - the class isn't registered as a bean.

```java
// Wrong - no annotation
public class UserService {
    public User findById(Long id) {
        // implementation
    }
}

// Correct - add @Service annotation
@Service
public class UserService {
    public User findById(Long id) {
        // implementation
    }
}
```

### 2. Class Not in Component Scan Path

Spring only scans packages under your main application class by default.

```java
// Main application in com.example.app
@SpringBootApplication
public class MyApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyApplication.class, args);
    }
}

// Service in different package - NOT scanned
// com.other.services.UserService - Won't be found!

// Solution 1: Move to scanned package
// com.example.app.services.UserService - Will be found

// Solution 2: Add explicit component scan
@SpringBootApplication
@ComponentScan(basePackages = {"com.example.app", "com.other.services"})
public class MyApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyApplication.class, args);
    }
}
```

### 3. Bean Name Mismatch

When requesting a bean by name, the name must match exactly.

```java
// Bean defined with default name "userService"
@Service
public class UserService {
}

// Wrong - trying to get "UserService" (capital U)
@Autowired
@Qualifier("UserService")  // Won't work - name is "userService"
private UserService service;

// Correct - use exact bean name
@Autowired
@Qualifier("userService")
private UserService service;

// Or define custom name
@Service("myUserService")
public class UserService {
}

@Autowired
@Qualifier("myUserService")
private UserService service;
```

### 4. Conditional Bean Not Created

Beans with conditions might not be created if conditions aren't met.

```java
@Service
@ConditionalOnProperty(name = "features.users.enabled", havingValue = "true")
public class UserService {
}

// If property is missing or false, bean won't be created
// Solution: Add the property
// application.yml
// features:
//   users:
//     enabled: true
```

```java
@Configuration
public class ServiceConfig {

    @Bean
    @ConditionalOnMissingBean(UserService.class)
    public UserService defaultUserService() {
        return new DefaultUserService();
    }

    @Bean
    @Profile("production")
    public UserService productionUserService() {
        return new ProductionUserService();
    }
}
```

### 5. Interface Without Implementation

When autowiring an interface, Spring needs a concrete implementation.

```java
// Interface
public interface UserRepository {
    User findById(Long id);
}

// Wrong - no implementation bean
@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;  // No bean available!
}

// Correct - add implementation
@Repository
public class JpaUserRepository implements UserRepository {
    @Override
    public User findById(Long id) {
        // implementation
    }
}
```

---

## Debugging Bean Issues

### List All Beans in Context

```java
@Component
public class BeanLogger implements ApplicationListener<ApplicationReadyEvent> {

    private static final Logger log = LoggerFactory.getLogger(BeanLogger.class);

    private final ApplicationContext context;

    public BeanLogger(ApplicationContext context) {
        this.context = context;
    }

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        String[] beanNames = context.getBeanDefinitionNames();
        Arrays.sort(beanNames);

        log.info("Registered beans ({}):", beanNames.length);
        for (String beanName : beanNames) {
            log.info("  - {}", beanName);
        }
    }
}
```

### Check if Specific Bean Exists

```java
@Component
public class BeanChecker {

    private final ApplicationContext context;

    public BeanChecker(ApplicationContext context) {
        this.context = context;
    }

    public void checkBeans() {
        // Check by name
        boolean existsByName = context.containsBean("userService");
        System.out.println("userService exists by name: " + existsByName);

        // Check by type
        String[] beanNames = context.getBeanNamesForType(UserService.class);
        System.out.println("UserService beans: " + Arrays.toString(beanNames));

        // Get bean info
        if (existsByName) {
            Object bean = context.getBean("userService");
            System.out.println("Bean class: " + bean.getClass().getName());
        }
    }
}
```

### Enable Debug Logging

```yaml
# application.yml
logging:
  level:
    org.springframework.beans: DEBUG
    org.springframework.context: DEBUG
```

---

## Working with Multiple Beans of Same Type

### Using @Primary

```java
@Service
@Primary
public class DefaultUserService implements UserService {
    // This will be injected by default
}

@Service("adminUserService")
public class AdminUserService implements UserService {
    // This requires @Qualifier to inject
}

@Component
public class UserController {

    @Autowired
    private UserService userService;  // Gets DefaultUserService

    @Autowired
    @Qualifier("adminUserService")
    private UserService adminService;  // Gets AdminUserService
}
```

### Using @Qualifier

```java
@Configuration
public class DataSourceConfig {

    @Bean("primaryDataSource")
    public DataSource primaryDataSource() {
        return DataSourceBuilder.create()
            .url("jdbc:postgresql://primary:5432/db")
            .build();
    }

    @Bean("replicaDataSource")
    public DataSource replicaDataSource() {
        return DataSourceBuilder.create()
            .url("jdbc:postgresql://replica:5432/db")
            .build();
    }
}

@Repository
public class UserRepository {

    private final DataSource primaryDataSource;
    private final DataSource replicaDataSource;

    public UserRepository(
            @Qualifier("primaryDataSource") DataSource primary,
            @Qualifier("replicaDataSource") DataSource replica) {
        this.primaryDataSource = primary;
        this.replicaDataSource = replica;
    }
}
```

### Injecting All Beans of a Type

```java
@Component
public class NotificationManager {

    private final List<NotificationService> notificationServices;

    // Injects all beans implementing NotificationService
    public NotificationManager(List<NotificationService> services) {
        this.notificationServices = services;
    }

    public void notifyAll(String message) {
        for (NotificationService service : notificationServices) {
            service.send(message);
        }
    }
}
```

---

## Configuration Class Issues

### @Configuration Without @Bean

```java
// Wrong - method not marked as @Bean
@Configuration
public class AppConfig {

    public UserService userService() {  // Not a bean!
        return new UserService();
    }
}

// Correct - add @Bean annotation
@Configuration
public class AppConfig {

    @Bean
    public UserService userService() {
        return new UserService();
    }
}
```

### Static @Bean Methods

```java
@Configuration
public class AppConfig {

    // For BeanFactoryPostProcessor beans, use static
    @Bean
    public static PropertySourcesPlaceholderConfigurer propertyConfigurer() {
        return new PropertySourcesPlaceholderConfigurer();
    }

    // Regular beans don't need static
    @Bean
    public UserService userService() {
        return new UserService();
    }
}
```

---

## Test Configuration Issues

### Missing Bean in Tests

```java
// This test will fail - UserService not available
@SpringBootTest(classes = {UserController.class})
class UserControllerTest {

    @Autowired
    private UserController controller;

    @Test
    void test() {
        // UserService dependency not satisfied
    }
}

// Solution 1: Include the service
@SpringBootTest(classes = {UserController.class, UserService.class})

// Solution 2: Use @MockBean
@SpringBootTest(classes = {UserController.class})
class UserControllerTest {

    @MockBean
    private UserService userService;

    @Autowired
    private UserController controller;
}

// Solution 3: Full context
@SpringBootTest
class UserControllerTest {
    // All beans loaded
}
```

### Test-Specific Configuration

```java
@TestConfiguration
public class TestConfig {

    @Bean
    public UserService testUserService() {
        return new MockUserService();
    }
}

@SpringBootTest
@Import(TestConfig.class)
class MyTest {
    // Uses TestConfig beans
}
```

---

## Lazy Initialization Issues

```java
// Bean created lazily
@Service
@Lazy
public class ExpensiveService {
}

// Won't fail at startup, but will fail when first accessed
@Component
public class Consumer {

    @Autowired
    @Lazy
    private ExpensiveService service;  // Created on first use

    public void doWork() {
        service.process();  // Error happens here if bean can't be created
    }
}

// Force eager validation in tests
@SpringBootTest(properties = "spring.main.lazy-initialization=false")
class EagerValidationTest {
    // All beans created at startup
}
```

---

## Quick Reference Checklist

| Check | Solution |
|-------|----------|
| Missing annotation | Add @Component, @Service, @Repository, or @Controller |
| Wrong package | Move class or add @ComponentScan |
| Name mismatch | Use correct bean name with @Qualifier |
| Conditional not met | Check @Conditional* conditions |
| No implementation | Add implementing class with stereotype annotation |
| Test context | Use @MockBean or include dependencies |

---

## Conclusion

The "No bean named X available" error is usually straightforward to fix once you understand Spring's bean resolution. Key checks:

- **Verify annotations** - Class has @Component, @Service, etc.
- **Check package structure** - Class is in scanned package
- **Validate bean names** - Names match when using @Qualifier
- **Review conditions** - @Conditional* conditions are met
- **Test configuration** - Test has required beans or mocks

Understanding how Spring finds and creates beans helps you quickly resolve these dependency injection issues.

---

*Need to monitor your Spring Boot application for errors? [OneUptime](https://oneuptime.com) provides comprehensive error tracking and logging for Java applications with instant alerts.*

**Related Reading:**
- [How to Fix "Unable to find a @SpringBootConfiguration" Errors](/blog/post/2025-12-22-unable-find-springbootconfiguration/view)
