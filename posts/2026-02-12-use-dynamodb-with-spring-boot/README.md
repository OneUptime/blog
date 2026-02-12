# How to Use DynamoDB with Spring Boot

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, Spring Boot, Java

Description: Learn how to integrate Amazon DynamoDB with Spring Boot using the AWS SDK for Java, including configuration, CRUD operations, and repository patterns.

---

Spring Boot and DynamoDB make a solid combination for building scalable backend services. Unlike relational databases, there's no Spring Data module that auto-generates everything for you (well, there's a community one, but the official AWS SDK approach is more reliable). Let's set up a production-ready integration from scratch.

## Project Setup

Start by adding the AWS SDK dependencies to your `pom.xml`. We'll use the AWS SDK v2 for Java, which is the current recommended version.

```xml
<!-- AWS SDK v2 for DynamoDB -->
<dependencies>
    <dependency>
        <groupId>software.amazon.awssdk</groupId>
        <artifactId>dynamodb</artifactId>
        <version>2.25.16</version>
    </dependency>
    <dependency>
        <groupId>software.amazon.awssdk</groupId>
        <artifactId>dynamodb-enhanced</artifactId>
        <version>2.25.16</version>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
</dependencies>
```

The `dynamodb-enhanced` module gives you a higher-level, annotation-based mapping similar to JPA. It's much nicer to work with than raw attribute maps.

## Configuration

Create a configuration class that sets up the DynamoDB client and enhanced client beans.

```java
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

@Configuration
public class DynamoDbConfig {

    @Value("${aws.region:us-east-1}")
    private String awsRegion;

    @Value("${dynamodb.endpoint:}")
    private String dynamoDbEndpoint;

    // Create the low-level DynamoDB client
    @Bean
    public DynamoDbClient dynamoDbClient() {
        var builder = DynamoDbClient.builder()
                .region(Region.of(awsRegion))
                .credentialsProvider(DefaultCredentialsProvider.create());

        // Allow endpoint override for local development with DynamoDB Local
        if (dynamoDbEndpoint != null && !dynamoDbEndpoint.isEmpty()) {
            builder.endpointOverride(java.net.URI.create(dynamoDbEndpoint));
        }

        return builder.build();
    }

    // Create the enhanced client for annotation-based table mapping
    @Bean
    public DynamoDbEnhancedClient dynamoDbEnhancedClient(DynamoDbClient dynamoDbClient) {
        return DynamoDbEnhancedClient.builder()
                .dynamoDbClient(dynamoDbClient)
                .build();
    }
}
```

Add these properties to your `application.yml`.

```yaml
aws:
  region: us-east-1

# For local development with DynamoDB Local
dynamodb:
  endpoint: http://localhost:8000

# For production, remove the endpoint override
# and let the SDK use the default AWS endpoint
```

## Defining Your Entity

Use the enhanced client annotations to map a Java class to a DynamoDB table.

```java
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;
import java.time.Instant;

// Maps this class to the "Users" DynamoDB table
@DynamoDbBean
public class User {

    private String userId;
    private String email;
    private String name;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;

    // Partition key
    @DynamoDbPartitionKey
    @DynamoDbAttribute("user_id")
    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    // GSI partition key for querying by email
    @DynamoDbSecondaryPartitionKey(indexNames = "email-index")
    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    // GSI partition key for querying by status
    @DynamoDbSecondaryPartitionKey(indexNames = "status-index")
    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    @DynamoDbAttribute("created_at")
    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    @DynamoDbAttribute("updated_at")
    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
```

## Building the Repository Layer

Create a repository class that encapsulates all DynamoDB operations.

```java
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.*;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
public class UserRepository {

    private final DynamoDbTable<User> userTable;
    private final DynamoDbIndex<User> emailIndex;

    public UserRepository(DynamoDbEnhancedClient enhancedClient) {
        // Map the User class to the "Users" table
        this.userTable = enhancedClient.table("Users",
                TableSchema.fromBean(User.class));
        this.emailIndex = userTable.index("email-index");
    }

    // Create a new user
    public User create(User user) {
        user.setUserId(UUID.randomUUID().toString());
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());
        user.setStatus("ACTIVE");

        userTable.putItem(user);
        return user;
    }

    // Get a user by ID
    public Optional<User> findById(String userId) {
        User user = userTable.getItem(Key.builder()
                .partitionValue(userId)
                .build());
        return Optional.ofNullable(user);
    }

    // Find a user by email using the GSI
    public Optional<User> findByEmail(String email) {
        QueryConditional condition = QueryConditional
                .keyEqualTo(Key.builder().partitionValue(email).build());

        List<User> results = emailIndex.query(QueryEnhancedRequest.builder()
                        .queryConditional(condition)
                        .limit(1)
                        .build())
                .stream()
                .flatMap(page -> page.items().stream())
                .collect(Collectors.toList());

        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    // Update a user (full replace)
    public User update(User user) {
        user.setUpdatedAt(Instant.now());
        userTable.putItem(user);
        return user;
    }

    // Partial update using UpdateItem expression
    public void updateEmail(String userId, String newEmail) {
        userTable.updateItem(UpdateItemEnhancedRequest.builder(User.class)
                .item(buildPartialUser(userId, newEmail))
                .ignoreNulls(true)  // Only update non-null fields
                .build());
    }

    // Delete a user
    public void delete(String userId) {
        userTable.deleteItem(Key.builder()
                .partitionValue(userId)
                .build());
    }

    // Scan with pagination
    public List<User> findAll(int limit) {
        return userTable.scan(ScanEnhancedRequest.builder()
                        .limit(limit)
                        .build())
                .stream()
                .flatMap(page -> page.items().stream())
                .limit(limit)
                .collect(Collectors.toList());
    }

    private User buildPartialUser(String userId, String email) {
        User user = new User();
        user.setUserId(userId);
        user.setEmail(email);
        user.setUpdatedAt(Instant.now());
        return user;
    }
}
```

## The REST Controller

Wire everything together with a simple REST controller.

```java
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody CreateUserRequest request) {
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());

        User created = userRepository.create(user);
        return ResponseEntity.ok(created);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<User> getUser(@PathVariable String userId) {
        return userRepository.findById(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-email")
    public ResponseEntity<User> getUserByEmail(@RequestParam String email) {
        return userRepository.findByEmail(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<User>> listUsers(
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(userRepository.findAll(limit));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable String userId) {
        userRepository.delete(userId);
        return ResponseEntity.noContent().build();
    }
}
```

## Local Development with DynamoDB Local

For local development, use DynamoDB Local via Docker.

```bash
# Start DynamoDB Local with Docker
docker run -d -p 8000:8000 amazon/dynamodb-local

# Create the Users table locally
aws dynamodb create-table \
  --table-name Users \
  --attribute-definitions \
    AttributeName=user_id,AttributeType=S \
    AttributeName=email,AttributeType=S \
    AttributeName=status,AttributeType=S \
  --key-schema AttributeName=user_id,KeyType=HASH \
  --global-secondary-indexes \
    'IndexName=email-index,KeySchema=[{AttributeName=email,KeyType=HASH}],Projection={ProjectionType=ALL}' \
    'IndexName=status-index,KeySchema=[{AttributeName=status,KeyType=HASH}],Projection={ProjectionType=ALL}' \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000
```

## Error Handling

Add proper error handling for DynamoDB-specific exceptions.

```java
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException;
import software.amazon.awssdk.services.dynamodb.model.ProvisionedThroughputExceededException;

@RestControllerAdvice
public class DynamoDbExceptionHandler {

    // Handle throttling - return 429 so clients can retry
    @ExceptionHandler(ProvisionedThroughputExceededException.class)
    public ResponseEntity<ErrorResponse> handleThrottling(
            ProvisionedThroughputExceededException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(new ErrorResponse("Service is busy, please retry"));
    }

    // Handle conditional check failures - return 409 Conflict
    @ExceptionHandler(ConditionalCheckFailedException.class)
    public ResponseEntity<ErrorResponse> handleConflict(
            ConditionalCheckFailedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("Item was modified by another request"));
    }
}
```

This setup gives you a clean, production-ready integration between Spring Boot and DynamoDB. The enhanced client handles the mapping between Java objects and DynamoDB items, while the repository pattern keeps your data access code organized and testable.
