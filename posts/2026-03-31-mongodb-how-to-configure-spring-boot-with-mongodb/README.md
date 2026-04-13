# How to Configure Spring Boot with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Spring Boot, Spring Data MongoDB, Java, REST API

Description: Learn how to configure Spring Boot with MongoDB using Spring Data MongoDB, define document models, and build a CRUD repository with minimal boilerplate.

---

## Overview

Spring Data MongoDB integrates MongoDB into Spring Boot applications through auto-configuration, repository abstractions, and a `MongoTemplate` for custom queries. With a few lines of configuration and an interface definition, you get a fully functional data access layer.

## Adding the Dependency

### Maven

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb</artifactId>
</dependency>
```

### Gradle

```groovy
implementation 'org.springframework.boot:spring-boot-starter-data-mongodb'
```

## Application Properties

```properties
# application.properties
spring.data.mongodb.uri=mongodb://localhost:27017/myapp
spring.data.mongodb.auto-index-creation=true
```

For MongoDB Atlas:

```properties
spring.data.mongodb.uri=mongodb+srv://username:password@cluster.mongodb.net/myapp?retryWrites=true&w=majority
```

## Defining a Document Model

```java
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;

@Document(collection = "users")
public class User {

    @Id
    private String id;

    private String name;

    @Indexed(unique = true)
    private String email;

    private boolean active = true;

    private Date createdAt = new Date();

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}
```

## Creating a Repository

```java
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    List<User> findByActiveTrue();

    List<User> findByNameContainingIgnoreCase(String name);

    long countByActiveTrue();

    @Query("{ 'email': { $regex: ?0, $options: 'i' } }")
    List<User> searchByEmailPattern(String pattern);
}
```

## Using the Repository in a Service

```java
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.List;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public User createUser(User user) {
        return userRepository.save(user);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserById(String id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found: " + id));
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    public User updateUser(String id, User updates) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setName(updates.getName());
        user.setActive(updates.isActive());
        return userRepository.save(user);
    }

    public void deleteUser(String id) {
        userRepository.deleteById(id);
    }
}
```

## Using MongoTemplate for Custom Queries

```java
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

@Service
public class UserQueryService {

    @Autowired
    private MongoTemplate mongoTemplate;

    public List<User> findActiveUsersOlderThan(Date date) {
        Query query = new Query(
            Criteria.where("active").is(true)
                    .and("createdAt").lt(date)
        );
        query.limit(100);
        return mongoTemplate.find(query, User.class);
    }

    public void deactivateUser(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        Update update = new Update().set("active", false);
        mongoTemplate.updateFirst(query, update, User.class);
    }
}
```

## REST Controller Example

```java
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable String id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody User user) {
        return ResponseEntity.status(201).body(userService.createUser(user));
    }

    @PutMapping("/{id}")
    public User updateUser(@PathVariable String id, @RequestBody User updates) {
        return userService.updateUser(id, updates);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
```

## Summary

Spring Boot with Spring Data MongoDB provides an auto-configured, convention-over-configuration approach to MongoDB access. Annotate your POJOs with `@Document`, extend `MongoRepository` for standard CRUD and derived-query methods, and use `MongoTemplate` for complex custom queries. The auto-configuration handles connection pooling and client lifecycle, requiring only a URI in `application.properties` to get started.
