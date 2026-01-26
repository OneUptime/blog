# How to Use Spring Boot with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Spring Boot, MongoDB, Java, NoSQL, Database, REST API, Backend

Description: Learn how to build production-ready Spring Boot applications with MongoDB, covering setup, repositories, queries, and best practices.

---

Spring Boot and MongoDB make a powerful combination for building modern applications that need flexible schemas and horizontal scalability. This guide walks you through setting up a Spring Boot application with MongoDB, from basic CRUD operations to advanced query patterns.

## Project Setup

### Dependencies

Add the following dependencies to your `pom.xml`:

```xml
<dependencies>
    <!-- Spring Boot Starter for MongoDB -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-mongodb</artifactId>
    </dependency>

    <!-- Spring Boot Web Starter for REST APIs -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Validation support -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- Lombok to reduce boilerplate (optional but recommended) -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>

    <!-- Testing -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

For Gradle users, add to `build.gradle`:

```groovy
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-data-mongodb'
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}
```

### Application Configuration

Configure MongoDB connection in `application.yml`:

```yaml
spring:
  data:
    mongodb:
      # Connection URI format: mongodb://user:password@host:port/database
      uri: mongodb://localhost:27017/myapp

      # Or use individual properties
      # host: localhost
      # port: 27017
      # database: myapp
      # username: myuser
      # password: mypassword
      # authentication-database: admin

# Logging for debugging queries (optional)
logging:
  level:
    org.springframework.data.mongodb.core.MongoTemplate: DEBUG
```

For production environments, use environment variables:

```yaml
spring:
  data:
    mongodb:
      uri: ${MONGODB_URI:mongodb://localhost:27017/myapp}
```

## Application Architecture

Here is the typical architecture for a Spring Boot MongoDB application:

```mermaid
graph TB
    subgraph "Spring Boot Application"
        A[REST Controller] --> B[Service Layer]
        B --> C[Repository Layer]
        C --> D[MongoTemplate]
    end

    subgraph "MongoDB"
        D --> E[(Database)]
        E --> F[Collection 1]
        E --> G[Collection 2]
        E --> H[Collection N]
    end

    subgraph "Client"
        I[HTTP Client] --> A
    end
```

## Defining Document Models

### Basic Document

Create a document class representing your MongoDB collection:

```java
package com.example.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.index.CompoundIndex;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

// Maps this class to the "users" collection in MongoDB
@Document(collection = "users")
// Create a compound index on firstName and lastName for faster queries
@CompoundIndex(name = "name_idx", def = "{'firstName': 1, 'lastName': 1}")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    // MongoDB will auto-generate this ID if not provided
    @Id
    private String id;

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50)
    @Field("first_name")  // Custom field name in MongoDB
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50)
    @Field("last_name")
    private String lastName;

    @Email(message = "Invalid email format")
    @Indexed(unique = true)  // Create a unique index on email
    private String email;

    // Nested document - will be stored as embedded document
    private Address address;

    // Array of strings
    private List<String> roles;

    // Reference to another collection (not embedded)
    @Field("department_id")
    private String departmentId;

    private boolean active;

    // Automatically set on document creation
    @CreatedDate
    @Field("created_at")
    private Instant createdAt;

    // Automatically updated on document modification
    @LastModifiedDate
    @Field("updated_at")
    private Instant updatedAt;
}
```

### Embedded Documents

Define embedded documents for nested data:

```java
package com.example.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

// No @Document annotation needed - this is embedded within User
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Address {
    private String street;
    private String city;
    private String state;
    private String zipCode;
    private String country;
}
```

### Enable Auditing

To make `@CreatedDate` and `@LastModifiedDate` work, enable auditing:

```java
package com.example.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@Configuration
@EnableMongoAuditing  // Enables automatic timestamp management
public class MongoConfig {
}
```

## Repository Layer

### Basic Repository

Spring Data MongoDB provides repository support similar to JPA:

```java
package com.example.repository;

import com.example.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {

    // Derived query methods - Spring generates the query from method name

    // Find by single field
    Optional<User> findByEmail(String email);

    // Find by multiple fields with AND
    List<User> findByFirstNameAndLastName(String firstName, String lastName);

    // Find with OR condition
    List<User> findByFirstNameOrLastName(String firstName, String lastName);

    // Find by nested field (address.city)
    List<User> findByAddressCity(String city);

    // Find where field is in a list
    List<User> findByRolesContaining(String role);

    // Find with sorting
    List<User> findByActiveOrderByCreatedAtDesc(boolean active);

    // Check existence
    boolean existsByEmail(String email);

    // Count by field
    long countByActive(boolean active);

    // Delete by field
    void deleteByEmail(String email);
}
```

### Custom Queries with @Query

For complex queries, use the `@Query` annotation:

```java
package com.example.repository;

import com.example.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Update;

import java.time.Instant;
import java.util.List;

public interface UserRepository extends MongoRepository<User, String> {

    // Custom query using MongoDB query syntax
    // ?0 refers to the first method parameter
    @Query("{ 'email': { $regex: ?0, $options: 'i' } }")
    List<User> findByEmailPattern(String pattern);

    // Query with multiple conditions
    @Query("{ 'active': true, 'roles': { $in: ?0 } }")
    List<User> findActiveUsersByRoles(List<String> roles);

    // Query with date range
    @Query("{ 'created_at': { $gte: ?0, $lte: ?1 } }")
    List<User> findByCreatedAtBetween(Instant start, Instant end);

    // Projection - only return specific fields
    // The fields parameter specifies which fields to include (1) or exclude (0)
    @Query(value = "{ 'active': true }", fields = "{ 'firstName': 1, 'lastName': 1, 'email': 1 }")
    List<User> findActiveUsersProjected();

    // Query with nested document field
    @Query("{ 'address.state': ?0, 'address.city': { $in: ?1 } }")
    List<User> findByStateAndCities(String state, List<String> cities);

    // Pagination support
    @Query("{ 'active': ?0 }")
    Page<User> findByActiveWithPagination(boolean active, Pageable pageable);

    // Update query - update matching documents
    @Query("{ 'email': ?0 }")
    @Update("{ '$set': { 'active': ?1 } }")
    long updateActiveStatusByEmail(String email, boolean active);

    // Aggregation pipeline
    @Aggregation(pipeline = {
        "{ $match: { 'active': true } }",
        "{ $group: { _id: '$address.state', count: { $sum: 1 } } }",
        "{ $sort: { count: -1 } }"
    })
    List<StateCount> countActiveUsersByState();
}

// DTO for aggregation result
interface StateCount {
    String getId();  // Maps to _id field
    int getCount();
}
```

## Service Layer

Create a service layer to encapsulate business logic:

```java
package com.example.service;

import com.example.model.User;
import com.example.model.Address;
import com.example.repository.UserRepository;
import com.example.exception.ResourceNotFoundException;
import com.example.exception.DuplicateResourceException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor  // Lombok generates constructor for final fields
@Slf4j  // Lombok generates logger
public class UserService {

    private final UserRepository userRepository;

    // Create a new user
    public User createUser(User user) {
        // Check if email already exists
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new DuplicateResourceException(
                "User with email " + user.getEmail() + " already exists"
            );
        }

        // Set default values
        user.setActive(true);

        User savedUser = userRepository.save(user);
        log.info("Created user with id: {}", savedUser.getId());

        return savedUser;
    }

    // Get user by ID
    public User getUserById(String id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(
                "User not found with id: " + id
            ));
    }

    // Get user by email
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException(
                "User not found with email: " + email
            ));
    }

    // Get all users with pagination
    public Page<User> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable);
    }

    // Get active users by role
    public List<User> getActiveUsersByRole(String role) {
        return userRepository.findByRolesContaining(role);
    }

    // Update user
    public User updateUser(String id, User userDetails) {
        User user = getUserById(id);

        // Check if new email conflicts with existing user
        if (!user.getEmail().equals(userDetails.getEmail())
            && userRepository.existsByEmail(userDetails.getEmail())) {
            throw new DuplicateResourceException(
                "Email " + userDetails.getEmail() + " is already in use"
            );
        }

        user.setFirstName(userDetails.getFirstName());
        user.setLastName(userDetails.getLastName());
        user.setEmail(userDetails.getEmail());
        user.setAddress(userDetails.getAddress());
        user.setRoles(userDetails.getRoles());

        User updatedUser = userRepository.save(user);
        log.info("Updated user with id: {}", id);

        return updatedUser;
    }

    // Update user address only
    public User updateUserAddress(String id, Address address) {
        User user = getUserById(id);
        user.setAddress(address);
        return userRepository.save(user);
    }

    // Deactivate user (soft delete)
    public void deactivateUser(String id) {
        User user = getUserById(id);
        user.setActive(false);
        userRepository.save(user);
        log.info("Deactivated user with id: {}", id);
    }

    // Hard delete user
    public void deleteUser(String id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
        log.info("Deleted user with id: {}", id);
    }

    // Search users by name pattern
    public List<User> searchUsers(String searchTerm) {
        return userRepository.findByFirstNameOrLastName(searchTerm, searchTerm);
    }
}
```

## REST Controller

Create a REST API for your service:

```java
package com.example.controller;

import com.example.model.User;
import com.example.model.Address;
import com.example.service.UserService;
import com.example.dto.UserDTO;
import com.example.dto.CreateUserRequest;
import com.example.dto.UpdateUserRequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // Create a new user
    // POST /api/v1/users
    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody CreateUserRequest request) {
        User user = User.builder()
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .email(request.getEmail())
            .address(request.getAddress())
            .roles(request.getRoles())
            .build();

        User createdUser = userService.createUser(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdUser);
    }

    // Get user by ID
    // GET /api/v1/users/{id}
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable String id) {
        User user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    // Get all users with pagination
    // GET /api/v1/users?page=0&size=20&sort=createdAt,desc
    @GetMapping
    public ResponseEntity<Page<User>> getAllUsers(
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        Page<User> users = userService.getAllUsers(pageable);
        return ResponseEntity.ok(users);
    }

    // Search users by role
    // GET /api/v1/users/role/{role}
    @GetMapping("/role/{role}")
    public ResponseEntity<List<User>> getUsersByRole(@PathVariable String role) {
        List<User> users = userService.getActiveUsersByRole(role);
        return ResponseEntity.ok(users);
    }

    // Update user
    // PUT /api/v1/users/{id}
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(
            @PathVariable String id,
            @Valid @RequestBody UpdateUserRequest request) {
        User userDetails = User.builder()
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .email(request.getEmail())
            .address(request.getAddress())
            .roles(request.getRoles())
            .build();

        User updatedUser = userService.updateUser(id, userDetails);
        return ResponseEntity.ok(updatedUser);
    }

    // Update user address
    // PATCH /api/v1/users/{id}/address
    @PatchMapping("/{id}/address")
    public ResponseEntity<User> updateUserAddress(
            @PathVariable String id,
            @Valid @RequestBody Address address) {
        User updatedUser = userService.updateUserAddress(id, address);
        return ResponseEntity.ok(updatedUser);
    }

    // Deactivate user (soft delete)
    // DELETE /api/v1/users/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateUser(@PathVariable String id) {
        userService.deactivateUser(id);
        return ResponseEntity.noContent().build();
    }

    // Hard delete user
    // DELETE /api/v1/users/{id}/permanent
    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
```

## Request Flow

Here is the flow of a typical request through the application:

```mermaid
sequenceDiagram
    participant C as Client
    participant R as REST Controller
    participant S as Service Layer
    participant Repo as Repository
    participant M as MongoDB

    C->>R: POST /api/v1/users
    R->>R: Validate request body
    R->>S: createUser(user)
    S->>Repo: existsByEmail(email)
    Repo->>M: Query
    M-->>Repo: false
    Repo-->>S: false
    S->>Repo: save(user)
    Repo->>M: Insert document
    M-->>Repo: Saved document
    Repo-->>S: User with ID
    S-->>R: Created user
    R-->>C: 201 Created + User JSON
```

## Advanced Queries with MongoTemplate

For complex queries that cannot be expressed with repository methods, use `MongoTemplate`:

```java
package com.example.repository;

import com.example.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class UserCustomRepository {

    private final MongoTemplate mongoTemplate;

    // Complex query with multiple conditions
    public List<User> findUsersWithComplexCriteria(
            String state,
            List<String> roles,
            boolean active,
            Instant createdAfter) {

        // Build query with multiple criteria
        Query query = new Query();

        // AND condition: all criteria must match
        query.addCriteria(
            new Criteria().andOperator(
                Criteria.where("active").is(active),
                Criteria.where("address.state").is(state),
                Criteria.where("roles").in(roles),
                Criteria.where("created_at").gte(createdAfter)
            )
        );

        // Add sorting
        query.with(Sort.by(Sort.Direction.DESC, "created_at"));

        // Limit results
        query.limit(100);

        return mongoTemplate.find(query, User.class);
    }

    // OR condition query
    public List<User> findByNameOrEmail(String searchTerm) {
        Query query = new Query();

        // OR condition: any criteria can match
        query.addCriteria(
            new Criteria().orOperator(
                Criteria.where("firstName").regex(searchTerm, "i"),
                Criteria.where("lastName").regex(searchTerm, "i"),
                Criteria.where("email").regex(searchTerm, "i")
            )
        );

        return mongoTemplate.find(query, User.class);
    }

    // Update multiple documents at once
    public long bulkUpdateStatus(List<String> userIds, boolean active) {
        Query query = new Query(Criteria.where("_id").in(userIds));

        Update update = new Update()
            .set("active", active)
            .currentDate("updated_at");  // Set to current date

        // updateMulti updates all matching documents
        return mongoTemplate.updateMulti(query, update, User.class)
            .getModifiedCount();
    }

    // Upsert - update if exists, insert if not
    public void upsertUser(String email, User user) {
        Query query = new Query(Criteria.where("email").is(email));

        Update update = new Update()
            .set("firstName", user.getFirstName())
            .set("lastName", user.getLastName())
            .set("address", user.getAddress())
            .set("roles", user.getRoles())
            .setOnInsert("email", email)  // Only set on insert
            .setOnInsert("active", true)
            .currentDate("updated_at");

        mongoTemplate.upsert(query, update, User.class);
    }

    // Aggregation pipeline for analytics
    public List<UserStatsByState> getUserStatsByState() {
        // Build aggregation pipeline
        Aggregation aggregation = Aggregation.newAggregation(
            // Stage 1: Match active users only
            Aggregation.match(Criteria.where("active").is(true)),

            // Stage 2: Group by state and calculate statistics
            Aggregation.group("address.state")
                .count().as("userCount")
                .first("address.state").as("state")
                .addToSet("roles").as("allRoles"),

            // Stage 3: Sort by user count descending
            Aggregation.sort(Sort.Direction.DESC, "userCount"),

            // Stage 4: Limit to top 10 states
            Aggregation.limit(10)
        );

        // Execute aggregation
        AggregationResults<UserStatsByState> results = mongoTemplate.aggregate(
            aggregation,
            "users",  // Collection name
            UserStatsByState.class
        );

        return results.getMappedResults();
    }

    // Find distinct values
    public List<String> findDistinctStates() {
        return mongoTemplate.findDistinct(
            new Query(Criteria.where("active").is(true)),
            "address.state",
            User.class,
            String.class
        );
    }

    // Text search (requires text index on collection)
    public List<User> textSearch(String searchText) {
        Query query = new Query();
        query.addCriteria(Criteria.where("$text")
            .is(new org.bson.Document("$search", searchText)));

        return mongoTemplate.find(query, User.class);
    }
}

// DTO for aggregation results
class UserStatsByState {
    private String state;
    private int userCount;
    private List<List<String>> allRoles;

    // Getters and setters
}
```

## Exception Handling

Create a global exception handler for consistent error responses:

```java
package com.example.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // Handle resource not found
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(
            ResourceNotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            HttpStatus.NOT_FOUND.value(),
            "Not Found",
            ex.getMessage(),
            Instant.now()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    // Handle duplicate resource
    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateResource(
            DuplicateResourceException ex) {
        log.warn("Duplicate resource: {}", ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            HttpStatus.CONFLICT.value(),
            "Conflict",
            ex.getMessage(),
            Instant.now()
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    // Handle validation errors
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidationErrors(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();

        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        ValidationErrorResponse response = new ValidationErrorResponse(
            HttpStatus.BAD_REQUEST.value(),
            "Validation Failed",
            errors,
            Instant.now()
        );

        return ResponseEntity.badRequest().body(response);
    }

    // Handle MongoDB duplicate key error
    @ExceptionHandler(org.springframework.dao.DuplicateKeyException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateKey(
            org.springframework.dao.DuplicateKeyException ex) {
        log.warn("Duplicate key error: {}", ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            HttpStatus.CONFLICT.value(),
            "Duplicate Key",
            "A record with this key already exists",
            Instant.now()
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    // Catch-all for unexpected errors
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericError(Exception ex) {
        log.error("Unexpected error", ex);

        ErrorResponse error = new ErrorResponse(
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "Internal Server Error",
            "An unexpected error occurred",
            Instant.now()
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}

// Error response DTOs
record ErrorResponse(
    int status,
    String error,
    String message,
    Instant timestamp
) {}

record ValidationErrorResponse(
    int status,
    String error,
    Map<String, String> fieldErrors,
    Instant timestamp
) {}
```

Custom exception classes:

```java
package com.example.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}

public class DuplicateResourceException extends RuntimeException {
    public DuplicateResourceException(String message) {
        super(message);
    }
}
```

## Testing

Write integration tests for your MongoDB repository:

```java
package com.example.repository;

import com.example.model.User;
import com.example.model.Address;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataMongoTest  // Only loads MongoDB-related components
@Testcontainers  // Enables Testcontainers support
class UserRepositoryTest {

    // Start a MongoDB container for testing
    @Container
    static MongoDBContainer mongoDBContainer = new MongoDBContainer("mongo:7.0");

    // Configure Spring to use the test container
    @DynamicPropertySource
    static void setProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongoDBContainer::getReplicaSetUrl);
    }

    @Autowired
    private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        // Create test user before each test
        testUser = User.builder()
            .firstName("John")
            .lastName("Doe")
            .email("john.doe@example.com")
            .address(Address.builder()
                .city("New York")
                .state("NY")
                .country("USA")
                .build())
            .roles(List.of("USER", "ADMIN"))
            .active(true)
            .build();

        testUser = userRepository.save(testUser);
    }

    @AfterEach
    void tearDown() {
        // Clean up after each test
        userRepository.deleteAll();
    }

    @Test
    void shouldFindUserByEmail() {
        Optional<User> found = userRepository.findByEmail("john.doe@example.com");

        assertThat(found).isPresent();
        assertThat(found.get().getFirstName()).isEqualTo("John");
    }

    @Test
    void shouldReturnEmptyWhenEmailNotFound() {
        Optional<User> found = userRepository.findByEmail("nonexistent@example.com");

        assertThat(found).isEmpty();
    }

    @Test
    void shouldFindUsersByCity() {
        // Add another user in the same city
        User user2 = User.builder()
            .firstName("Jane")
            .lastName("Smith")
            .email("jane.smith@example.com")
            .address(Address.builder().city("New York").state("NY").build())
            .active(true)
            .build();
        userRepository.save(user2);

        List<User> users = userRepository.findByAddressCity("New York");

        assertThat(users).hasSize(2);
    }

    @Test
    void shouldFindUsersByRole() {
        List<User> admins = userRepository.findByRolesContaining("ADMIN");

        assertThat(admins).hasSize(1);
        assertThat(admins.get(0).getEmail()).isEqualTo("john.doe@example.com");
    }

    @Test
    void shouldCheckEmailExists() {
        boolean exists = userRepository.existsByEmail("john.doe@example.com");
        boolean notExists = userRepository.existsByEmail("unknown@example.com");

        assertThat(exists).isTrue();
        assertThat(notExists).isFalse();
    }

    @Test
    void shouldCountActiveUsers() {
        // Add inactive user
        User inactiveUser = User.builder()
            .firstName("Inactive")
            .lastName("User")
            .email("inactive@example.com")
            .active(false)
            .build();
        userRepository.save(inactiveUser);

        long activeCount = userRepository.countByActive(true);
        long inactiveCount = userRepository.countByActive(false);

        assertThat(activeCount).isEqualTo(1);
        assertThat(inactiveCount).isEqualTo(1);
    }

    @Test
    void shouldUpdateUser() {
        testUser.setFirstName("Johnny");
        User updated = userRepository.save(testUser);

        assertThat(updated.getFirstName()).isEqualTo("Johnny");
        assertThat(updated.getId()).isEqualTo(testUser.getId());
    }

    @Test
    void shouldDeleteUserByEmail() {
        userRepository.deleteByEmail("john.doe@example.com");

        Optional<User> found = userRepository.findByEmail("john.doe@example.com");
        assertThat(found).isEmpty();
    }
}
```

Add Testcontainers dependency for testing:

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>mongodb</artifactId>
    <version>1.19.3</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>1.19.3</version>
    <scope>test</scope>
</dependency>
```

## Indexing Strategies

Proper indexing is critical for MongoDB performance:

```java
package com.example.config;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class MongoIndexInitializer implements CommandLineRunner {

    private final MongoTemplate mongoTemplate;

    @Override
    public void run(String... args) {
        createUserIndexes();
    }

    private void createUserIndexes() {
        MongoCollection<Document> collection = mongoTemplate
            .getCollection("users");

        // Single field index for email lookups
        collection.createIndex(
            Indexes.ascending("email"),
            new IndexOptions().unique(true).name("email_unique_idx")
        );

        // Compound index for name searches
        collection.createIndex(
            Indexes.compoundIndex(
                Indexes.ascending("firstName"),
                Indexes.ascending("lastName")
            ),
            new IndexOptions().name("name_compound_idx")
        );

        // Index for queries filtering by active status and creation date
        collection.createIndex(
            Indexes.compoundIndex(
                Indexes.ascending("active"),
                Indexes.descending("created_at")
            ),
            new IndexOptions().name("active_created_idx")
        );

        // TTL index - auto-delete inactive users after 90 days
        // Useful for GDPR compliance or cleaning up stale data
        collection.createIndex(
            Indexes.ascending("deactivated_at"),
            new IndexOptions()
                .name("deactivated_ttl_idx")
                .expireAfter(90L, TimeUnit.DAYS)
                .partialFilterExpression(
                    new Document("active", false)
                )
        );

        // Text index for full-text search
        collection.createIndex(
            Indexes.compoundIndex(
                Indexes.text("firstName"),
                Indexes.text("lastName"),
                Indexes.text("email")
            ),
            new IndexOptions().name("user_text_idx")
        );

        log.info("MongoDB indexes created for users collection");
    }
}
```

## Summary

| Component | Purpose |
|-----------|---------|
| **@Document** | Maps Java class to MongoDB collection |
| **MongoRepository** | Provides CRUD operations and derived queries |
| **@Query** | Defines custom MongoDB queries |
| **MongoTemplate** | Programmatic query building for complex operations |
| **@Indexed** | Creates single-field indexes |
| **@CompoundIndex** | Creates multi-field indexes |
| **Aggregation** | Complex data transformations and analytics |
| **Testcontainers** | Integration testing with real MongoDB |

Spring Boot with MongoDB provides a productive development experience while maintaining the flexibility that document databases offer. Start with repository interfaces for simple queries, and use MongoTemplate when you need the full power of MongoDB's query language.

For production deployments, pay attention to indexing strategies, connection pooling, and consider using MongoDB Atlas for managed hosting with built-in monitoring and backups.
