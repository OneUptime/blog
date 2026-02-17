# How to Fix 'No serializer found' Jackson Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Java, Spring Boot, Jackson, JSON, Serialization, Backend

Description: Learn how to diagnose and fix Jackson 'No serializer found' errors in Spring Boot with solutions for common serialization problems.

---

The "No serializer found for class" error occurs when Jackson cannot figure out how to convert a Java object to JSON. This usually happens with objects that have no accessible properties - no public fields and no getters. This guide covers the common causes and solutions.

## Understanding the Error

```
com.fasterxml.jackson.databind.exc.InvalidDefinitionException:
No serializer found for class com.example.User and no properties discovered
to create BeanSerializer (to avoid exception, disable SerializationFeature.FAIL_ON_EMPTY_BEANS)
```

## Common Causes and Solutions

### Cause 1: Missing Getters

Jackson needs either public fields or getter methods to serialize an object.

```java
// Problem: No getters
public class User {
    private Long id;
    private String name;
    private String email;

    public User(Long id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }
    // No getters - Jackson can't access fields!
}

// Solution 1: Add getters
public class User {
    private Long id;
    private String name;
    private String email;

    public User(Long id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
}

// Solution 2: Use Lombok
@Getter
public class User {
    private Long id;
    private String name;
    private String email;
}

// Solution 3: Use Java Record (Java 17+)
public record User(Long id, String name, String email) {}

// Solution 4: Make fields public (not recommended for production)
public class User {
    public Long id;
    public String name;
    public String email;
}
```

### Cause 2: Private Inner Classes

```java
// Problem: Private inner class
@RestController
public class UserController {

    @GetMapping("/user")
    public Response getUser() {
        return new Response("success", new UserData(1L, "John"));
    }

    // Private inner class - Jackson can't access it
    private class Response {
        private String status;
        private UserData data;

        public Response(String status, UserData data) {
            this.status = status;
            this.data = data;
        }
    }

    private class UserData {
        private Long id;
        private String name;

        public UserData(Long id, String name) {
            this.id = id;
            this.name = name;
        }
    }
}

// Solution: Make classes public or static
@RestController
public class UserController {

    @GetMapping("/user")
    public Response getUser() {
        return new Response("success", new UserData(1L, "John"));
    }

    // Static nested class - accessible to Jackson
    @Getter
    @AllArgsConstructor
    public static class Response {
        private String status;
        private UserData data;
    }

    @Getter
    @AllArgsConstructor
    public static class UserData {
        private Long id;
        private String name;
    }
}
```

### Cause 3: Hibernate Proxies

```java
// Problem: Serializing uninitialized Hibernate proxy
@Entity
public class Order {
    @Id
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private User user;  // Hibernate proxy when lazy loaded
}

// Controller returns entity directly
@GetMapping("/order/{id}")
public Order getOrder(@PathVariable Long id) {
    return orderRepository.findById(id).orElseThrow();
    // user is a proxy, not the actual User object
}
```

**Solution 1: Use DTOs**

```java
@GetMapping("/order/{id}")
public OrderDTO getOrder(@PathVariable Long id) {
    Order order = orderRepository.findById(id).orElseThrow();
    return new OrderDTO(order.getId(), order.getUser().getId());  // Access what you need
}
```

**Solution 2: Configure Jackson for Hibernate**

```xml
<dependency>
    <groupId>com.fasterxml.jackson.datatype</groupId>
    <artifactId>jackson-datatype-hibernate6</artifactId>
</dependency>
```

```java
@Configuration
public class JacksonConfig {

    @Bean
    public Module hibernateModule() {
        Hibernate6Module module = new Hibernate6Module();
        module.configure(Hibernate6Module.Feature.FORCE_LAZY_LOADING, false);
        module.configure(Hibernate6Module.Feature.SERIALIZE_IDENTIFIER_FOR_LAZY_NOT_LOADED_OBJECTS, true);
        return module;
    }
}
```

### Cause 4: Empty Objects

```java
// Problem: Empty object with no properties
public class EmptyResponse {
    // No fields, no getters
}

@GetMapping("/ping")
public EmptyResponse ping() {
    return new EmptyResponse();  // Error!
}
```

**Solution 1: Add at least one property**

```java
public class EmptyResponse {
    private final String status = "ok";

    public String getStatus() {
        return status;
    }
}
```

**Solution 2: Configure Jackson to allow empty beans**

```yaml
# application.yml
spring:
  jackson:
    serialization:
      fail-on-empty-beans: false
```

Or programmatically:

```java
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
        return mapper;
    }
}
```

### Cause 5: Circular References

```java
// Problem: Circular reference between entities
@Entity
public class User {
    @Id
    private Long id;

    @OneToMany(mappedBy = "user")
    private List<Order> orders;  // User -> Orders
}

@Entity
public class Order {
    @Id
    private Long id;

    @ManyToOne
    private User user;  // Order -> User (circular!)
}
```

**Solution 1: Use @JsonIgnore**

```java
@Entity
public class Order {
    @Id
    private Long id;

    @ManyToOne
    @JsonIgnore
    private User user;
}
```

**Solution 2: Use @JsonManagedReference and @JsonBackReference**

```java
@Entity
public class User {
    @Id
    private Long id;

    @OneToMany(mappedBy = "user")
    @JsonManagedReference
    private List<Order> orders;
}

@Entity
public class Order {
    @Id
    private Long id;

    @ManyToOne
    @JsonBackReference
    private User user;
}
```

**Solution 3: Use @JsonIdentityInfo**

```java
@Entity
@JsonIdentityInfo(
    generator = ObjectIdGenerators.PropertyGenerator.class,
    property = "id"
)
public class User {
    @Id
    private Long id;

    @OneToMany(mappedBy = "user")
    private List<Order> orders;
}
```

**Solution 4: Use DTOs (Recommended)**

```java
public record UserDTO(Long id, String name, List<OrderSummaryDTO> orders) {}
public record OrderSummaryDTO(Long id, BigDecimal total) {}
```

### Cause 6: Third-Party Objects

```java
// Problem: Trying to serialize a third-party class
@GetMapping("/result")
public ResponseEntity<Path> getPath() {
    return ResponseEntity.ok(Paths.get("/some/path"));  // Can't serialize Path
}
```

**Solution: Wrap in a DTO or use a custom serializer**

```java
// Solution 1: Return a string
@GetMapping("/result")
public ResponseEntity<Map<String, String>> getPath() {
    return ResponseEntity.ok(Map.of("path", "/some/path"));
}

// Solution 2: Custom serializer
public class PathSerializer extends JsonSerializer<Path> {
    @Override
    public void serialize(Path value, JsonGenerator gen, SerializerProvider provider)
            throws IOException {
        gen.writeString(value.toString());
    }
}

@Configuration
public class JacksonConfig {
    @Bean
    public Module customModule() {
        SimpleModule module = new SimpleModule();
        module.addSerializer(Path.class, new PathSerializer());
        return module;
    }
}
```

## Jackson Configuration Options

```yaml
# application.yml
spring:
  jackson:
    # Serialization settings
    serialization:
      fail-on-empty-beans: false
      write-dates-as-timestamps: false
      indent-output: true

    # Deserialization settings
    deserialization:
      fail-on-unknown-properties: false

    # Default property inclusion
    default-property-inclusion: non_null

    # Date format
    date-format: yyyy-MM-dd HH:mm:ss
    time-zone: UTC
```

## Custom ObjectMapper Bean

```java
@Configuration
public class JacksonConfig {

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();

        // Don't fail on empty beans
        mapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);

        // Don't fail on unknown properties
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        // Include only non-null values
        mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);

        // Pretty print
        mapper.enable(SerializationFeature.INDENT_OUTPUT);

        // Date/time handling
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // Hibernate module
        Hibernate6Module hibernateModule = new Hibernate6Module();
        hibernateModule.configure(Hibernate6Module.Feature.FORCE_LAZY_LOADING, false);
        mapper.registerModule(hibernateModule);

        return mapper;
    }
}
```

## Debugging Serialization Issues

```java
@Component
public class JacksonDebugger {

    @Autowired
    private ObjectMapper objectMapper;

    public void debugSerialization(Object obj) {
        try {
            String json = objectMapper.writeValueAsString(obj);
            System.out.println("Serialized successfully: " + json);
        } catch (JsonProcessingException e) {
            System.err.println("Serialization failed: " + e.getMessage());

            // Try to get more details
            try {
                JavaType type = objectMapper.getTypeFactory()
                    .constructType(obj.getClass());
                BeanDescription desc = objectMapper.getSerializationConfig()
                    .introspect(type);

                System.out.println("Properties found:");
                desc.findProperties().forEach(prop ->
                    System.out.println("  - " + prop.getName()));
            } catch (Exception ex) {
                System.err.println("Could not introspect: " + ex.getMessage());
            }
        }
    }
}
```

## Checklist for Serialization Errors

| Issue | Solution |
|-------|----------|
| No getters | Add getter methods or use Lombok @Getter |
| Private inner class | Make class public or static |
| Hibernate proxy | Use DTOs or configure jackson-datatype-hibernate |
| Empty object | Add properties or disable fail-on-empty-beans |
| Circular reference | Use @JsonIgnore, @JsonBackReference, or DTOs |
| Third-party object | Create custom serializer or wrap in DTO |
| Unknown type | Register appropriate Jackson module |

## Summary

Jackson serialization errors are usually straightforward to fix once you understand what Jackson needs: either public fields or getter methods to access data. For complex cases involving Hibernate entities, circular references, or third-party objects, the best solution is often to use DTOs that give you complete control over what gets serialized. When in doubt, configure Jackson to be more lenient with `fail-on-empty-beans: false` and `fail-on-unknown-properties: false`, but be aware that this might hide other issues.
