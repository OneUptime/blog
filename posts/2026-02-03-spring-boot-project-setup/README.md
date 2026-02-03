# How to Set Up a Spring Boot Project from Scratch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Maven, Gradle, Backend, REST API

Description: Learn how to set up a Spring Boot project from scratch. This guide covers project initialization, configuration, dependency management, and creating your first REST endpoint.

---

Spring Boot has become the go-to framework for building Java applications. It takes the complexity out of Spring configuration while giving you production-ready features out of the box. Whether you are building a microservice, a REST API, or a full web application, Spring Boot gets you up and running fast.

This guide walks you through setting up a Spring Boot project from scratch. We will cover project initialization using Spring Initializr, understand the project structure, configure dependencies with Maven and Gradle, set up application properties, and create your first REST controller.

## Prerequisites

Before we start, make sure you have the following installed:

- **Java Development Kit (JDK) 17 or later** - Spring Boot 3.x requires Java 17 as the minimum version
- **Maven 3.6+** or **Gradle 7.5+** - for dependency management and building
- **An IDE** - IntelliJ IDEA, Eclipse, or VS Code with Java extensions

You can verify your Java installation by running this command in your terminal.

```bash
java -version
```

You should see output similar to this.

```
openjdk version "17.0.9" 2023-10-17
OpenJDK Runtime Environment (build 17.0.9+9)
OpenJDK 64-Bit Server VM (build 17.0.9+9, mixed mode)
```

## Method 1: Using Spring Initializr (Recommended)

Spring Initializr is the easiest way to bootstrap a new Spring Boot project. It is available as a web interface at [start.spring.io](https://start.spring.io) and is also integrated into most Java IDEs.

### Using the Web Interface

Navigate to [start.spring.io](https://start.spring.io) and configure your project with the following settings.

**Project Settings:**

| Setting | Value | Description |
|---------|-------|-------------|
| Project | Maven or Gradle | Build tool of your choice |
| Language | Java | Programming language |
| Spring Boot | 3.2.x | Latest stable version |
| Group | com.example | Your organization's domain in reverse |
| Artifact | demo | Project name (becomes the JAR name) |
| Name | demo | Display name for the application |
| Description | Demo project for Spring Boot | Brief project description |
| Package name | com.example.demo | Base package for your code |
| Packaging | Jar | Executable JAR with embedded server |
| Java | 17 | Java version to use |

**Dependencies to Add:**

For a basic REST API project, add these dependencies:

- **Spring Web** - For building web applications and REST APIs
- **Spring Boot DevTools** - For automatic restarts during development
- **Spring Boot Actuator** - For production-ready monitoring endpoints
- **Lombok** - To reduce boilerplate code (optional but recommended)

Click "Generate" to download a ZIP file containing your project. Extract it to your preferred location and open it in your IDE.

### Using the Command Line

If you prefer the command line, you can use curl to generate your project directly.

```bash
# Generate a Maven project with Spring Web and Actuator
curl https://start.spring.io/starter.zip \
  -d type=maven-project \
  -d language=java \
  -d bootVersion=3.2.2 \
  -d baseDir=my-spring-app \
  -d groupId=com.example \
  -d artifactId=my-spring-app \
  -d name=my-spring-app \
  -d packageName=com.example.myspringapp \
  -d javaVersion=17 \
  -d dependencies=web,actuator,devtools,lombok \
  -o my-spring-app.zip

# Extract the archive
unzip my-spring-app.zip

# Navigate to the project directory
cd my-spring-app
```

### Using Spring Boot CLI

The Spring Boot CLI provides another way to create projects quickly.

```bash
# Install Spring Boot CLI (macOS with Homebrew)
brew tap spring-io/tap
brew install spring-boot

# Create a new project
spring init --dependencies=web,actuator,devtools \
  --java-version=17 \
  --type=maven-project \
  --group-id=com.example \
  --artifact-id=my-spring-app \
  my-spring-app
```

## Method 2: Manual Project Setup

Sometimes you want more control over the initial setup. Here is how to create a Spring Boot project manually.

### Creating a Maven Project

Create the directory structure for your project.

```bash
mkdir -p my-spring-app/src/main/java/com/example/demo
mkdir -p my-spring-app/src/main/resources
mkdir -p my-spring-app/src/test/java/com/example/demo
cd my-spring-app
```

Create the `pom.xml` file in the project root directory.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <!-- Inherit defaults from Spring Boot parent POM -->
    <!-- This provides dependency management, plugin configuration, and sensible defaults -->
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.2</version>
        <relativePath/> <!-- Lookup parent from Maven repository -->
    </parent>

    <!-- Project coordinates - these uniquely identify your project -->
    <groupId>com.example</groupId>
    <artifactId>demo</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>demo</name>
    <description>Demo project for Spring Boot</description>

    <!-- Properties define reusable values and configuration -->
    <properties>
        <!-- Java version used for compilation -->
        <java.version>17</java.version>
        <!-- Character encoding for source files -->
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <!-- Spring Boot Web Starter -->
        <!-- Includes embedded Tomcat, Spring MVC, and JSON support via Jackson -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- Spring Boot Actuator -->
        <!-- Provides production-ready features like health checks and metrics -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>

        <!-- Spring Boot DevTools -->
        <!-- Enables automatic restart and live reload during development -->
        <!-- scope=runtime means it is not included in production builds -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
            <scope>runtime</scope>
            <optional>true</optional>
        </dependency>

        <!-- Lombok - reduces boilerplate code -->
        <!-- Generates getters, setters, constructors, etc. at compile time -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Spring Boot Test Starter -->
        <!-- Includes JUnit 5, Mockito, and Spring Test utilities -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <!-- Spring Boot Maven Plugin -->
            <!-- Enables running the app with 'mvn spring-boot:run' -->
            <!-- Also packages the app as an executable JAR -->
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <!-- Exclude Lombok from the final JAR since it is only needed at compile time -->
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>

</project>
```

### Creating a Gradle Project

If you prefer Gradle, create `build.gradle` instead.

```groovy
// Apply the Spring Boot and Java plugins
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.2.2'
    id 'io.spring.dependency-management' version '1.1.4'
}

// Project coordinates
group = 'com.example'
version = '0.0.1-SNAPSHOT'

// Java configuration
java {
    sourceCompatibility = '17'
    targetCompatibility = '17'
}

// Lombok annotation processor configuration
configurations {
    compileOnly {
        extendsFrom annotationProcessor
    }
}

// Maven Central repository for downloading dependencies
repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot starters - curated dependency sets that work well together
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'

    // Development tools - only included during development
    developmentOnly 'org.springframework.boot:spring-boot-devtools'

    // Lombok for reducing boilerplate code
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'

    // Testing dependencies
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}

// Configure test task to use JUnit Platform (JUnit 5)
tasks.named('test') {
    useJUnitPlatform()
}
```

For Kotlin DSL, create `build.gradle.kts` instead.

```kotlin
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    java
    id("org.springframework.boot") version "3.2.2"
    id("io.spring.dependency-management") version "1.1.4"
}

group = "com.example"
version = "0.0.1-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_17
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    developmentOnly("org.springframework.boot:spring-boot-devtools")
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

## Understanding the Project Structure

After generating or creating your project, you will have this directory structure.

```
my-spring-app/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── example/
│   │   │           └── demo/
│   │   │               └── DemoApplication.java    # Main application class
│   │   └── resources/
│   │       ├── application.properties              # Main configuration file
│   │       ├── application.yml                     # Alternative YAML config (optional)
│   │       ├── static/                             # Static web resources (CSS, JS, images)
│   │       └── templates/                          # Server-side templates (Thymeleaf, etc.)
│   └── test/
│       └── java/
│           └── com/
│               └── example/
│                   └── demo/
│                       └── DemoApplicationTests.java  # Test class
├── pom.xml                                         # Maven build file
├── build.gradle                                    # Gradle build file (if using Gradle)
├── mvnw                                            # Maven wrapper script (Unix)
├── mvnw.cmd                                        # Maven wrapper script (Windows)
└── .gitignore                                      # Git ignore rules
```

### Key Directories Explained

| Directory | Purpose |
|-----------|---------|
| `src/main/java` | Your application source code |
| `src/main/resources` | Configuration files and static resources |
| `src/test/java` | Test source code |
| `src/test/resources` | Test configuration and test data |

## The Main Application Class

The entry point of every Spring Boot application is a class annotated with `@SpringBootApplication`. This annotation combines three important annotations:

- `@Configuration` - Marks this class as a source of bean definitions
- `@EnableAutoConfiguration` - Tells Spring Boot to automatically configure beans based on classpath dependencies
- `@ComponentScan` - Enables component scanning to find and register beans

Create the main application class at `src/main/java/com/example/demo/DemoApplication.java`.

```java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main entry point for the Spring Boot application.
 *
 * The @SpringBootApplication annotation enables:
 * - Auto-configuration: Spring Boot automatically configures beans based on
 *   the dependencies present in the classpath
 * - Component scanning: Spring scans this package and sub-packages for
 *   components, services, repositories, and controllers
 * - Configuration: This class can define @Bean methods to create custom beans
 */
@SpringBootApplication
public class DemoApplication {

    /**
     * The main method that bootstraps the Spring application.
     *
     * SpringApplication.run() does the following:
     * 1. Creates an ApplicationContext
     * 2. Registers a shutdown hook
     * 3. Refreshes the context (loading beans)
     * 4. Starts the embedded web server (if spring-boot-starter-web is present)
     *
     * @param args Command line arguments passed to the application
     */
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }

}
```

## Configuring Application Properties

Spring Boot uses `application.properties` or `application.yml` files for configuration. These files go in `src/main/resources/`.

### Using application.properties

Create `src/main/resources/application.properties` with commonly used settings.

```properties
# ===========================================
# APPLICATION CONFIGURATION
# ===========================================

# Application name - displayed in logs and actuator info
spring.application.name=my-spring-app

# ===========================================
# SERVER CONFIGURATION
# ===========================================

# The port the embedded server listens on (default is 8080)
server.port=8080

# Context path - all endpoints will be prefixed with this path
# Example: http://localhost:8080/api/v1/your-endpoint
server.servlet.context-path=/api/v1

# Graceful shutdown - allows in-flight requests to complete
server.shutdown=graceful

# Grace period for shutdown (default is 30s)
spring.lifecycle.timeout-per-shutdown-phase=30s

# ===========================================
# LOGGING CONFIGURATION
# ===========================================

# Root logging level (TRACE, DEBUG, INFO, WARN, ERROR)
logging.level.root=INFO

# Package-specific logging levels
logging.level.com.example.demo=DEBUG
logging.level.org.springframework.web=INFO
logging.level.org.hibernate.SQL=DEBUG

# Log file configuration (optional - logs to console by default)
# logging.file.name=logs/application.log
# logging.file.max-size=10MB
# logging.file.max-history=7

# Log pattern for console output
logging.pattern.console=%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n

# ===========================================
# ACTUATOR CONFIGURATION
# ===========================================

# Expose all actuator endpoints (be careful in production)
management.endpoints.web.exposure.include=health,info,metrics,prometheus

# Show full health details
management.endpoint.health.show-details=when-authorized

# Custom actuator base path
management.endpoints.web.base-path=/management

# Application info displayed by /actuator/info
management.info.env.enabled=true
info.app.name=@project.name@
info.app.version=@project.version@
info.app.description=@project.description@

# ===========================================
# JACKSON JSON CONFIGURATION
# ===========================================

# Pretty print JSON responses (disable in production for performance)
spring.jackson.serialization.indent-output=true

# Date format for JSON serialization
spring.jackson.date-format=yyyy-MM-dd HH:mm:ss
spring.jackson.time-zone=UTC

# Don't fail on unknown properties during deserialization
spring.jackson.deserialization.fail-on-unknown-properties=false

# ===========================================
# DATABASE CONFIGURATION (when using JPA)
# ===========================================

# Uncomment these when you add spring-boot-starter-data-jpa

# H2 in-memory database for development
# spring.datasource.url=jdbc:h2:mem:devdb
# spring.datasource.driver-class-name=org.h2.Driver
# spring.datasource.username=sa
# spring.datasource.password=

# PostgreSQL configuration for production
# spring.datasource.url=jdbc:postgresql://localhost:5432/mydb
# spring.datasource.username=${DB_USERNAME}
# spring.datasource.password=${DB_PASSWORD}

# JPA and Hibernate settings
# spring.jpa.hibernate.ddl-auto=validate
# spring.jpa.show-sql=true
# spring.jpa.properties.hibernate.format_sql=true
```

### Using application.yml

Many developers prefer YAML format for its readability. Create `src/main/resources/application.yml` as an alternative.

```yaml
# Application Configuration
spring:
  application:
    name: my-spring-app

  # Jackson JSON settings
  jackson:
    serialization:
      indent-output: true
    date-format: yyyy-MM-dd HH:mm:ss
    time-zone: UTC
    deserialization:
      fail-on-unknown-properties: false

  # Graceful shutdown
  lifecycle:
    timeout-per-shutdown-phase: 30s

# Server Configuration
server:
  port: 8080
  servlet:
    context-path: /api/v1
  shutdown: graceful

# Logging Configuration
logging:
  level:
    root: INFO
    com.example.demo: DEBUG
    org.springframework.web: INFO
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"

# Actuator Configuration
management:
  endpoints:
    web:
      base-path: /management
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when-authorized
  info:
    env:
      enabled: true

# Application Info
info:
  app:
    name: "@project.name@"
    version: "@project.version@"
    description: "@project.description@"
```

### Profile-Specific Configuration

Spring Boot supports different configurations for different environments using profiles.

Create `src/main/resources/application-dev.yml` for development settings.

```yaml
# Development Profile Configuration
spring:
  devtools:
    restart:
      enabled: true
    livereload:
      enabled: true

server:
  port: 8080

logging:
  level:
    root: DEBUG
    com.example.demo: TRACE

# Show SQL in development
spring.jpa.show-sql: true
```

Create `src/main/resources/application-prod.yml` for production settings.

```yaml
# Production Profile Configuration
server:
  port: ${PORT:8080}

logging:
  level:
    root: WARN
    com.example.demo: INFO
  file:
    name: /var/log/myapp/application.log

# Production database
spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5

# Actuator security in production
management:
  endpoints:
    web:
      exposure:
        include: health,info
```

Activate a profile by setting the `SPRING_PROFILES_ACTIVE` environment variable or adding this to your main `application.properties`.

```properties
# Activate the development profile
spring.profiles.active=dev
```

## Creating Your First REST Controller

Now let us create a REST API. Spring MVC provides annotations to easily define endpoints.

### A Simple Hello World Controller

Create `src/main/java/com/example/demo/controller/HelloController.java`.

```java
package com.example.demo.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * A simple REST controller demonstrating basic Spring MVC concepts.
 *
 * @RestController combines @Controller and @ResponseBody, meaning:
 * - This class handles HTTP requests
 * - Return values are automatically serialized to JSON
 */
@RestController
public class HelloController {

    /**
     * Simple GET endpoint that returns a greeting.
     *
     * @GetMapping maps HTTP GET requests to this method.
     * The path "/" means this handles requests to the root URL.
     *
     * @return A greeting message as plain text
     */
    @GetMapping("/")
    public String hello() {
        return "Hello, Spring Boot!";
    }

    /**
     * GET endpoint with a query parameter.
     *
     * @RequestParam binds the 'name' query parameter to the method argument.
     * The defaultValue is used if the parameter is not provided.
     *
     * Example: GET /greet?name=John returns "Hello, John!"
     *
     * @param name The name to greet (optional, defaults to "World")
     * @return A personalized greeting
     */
    @GetMapping("/greet")
    public String greet(@RequestParam(defaultValue = "World") String name) {
        return String.format("Hello, %s!", name);
    }

}
```

### A Complete CRUD REST Controller

For a real application, you will need a controller that handles Create, Read, Update, and Delete operations. Let us build a simple User API.

First, create a data model at `src/main/java/com/example/demo/model/User.java`.

```java
package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * User entity representing a user in the system.
 *
 * Lombok annotations reduce boilerplate:
 * - @Data generates getters, setters, toString, equals, and hashCode
 * - @Builder provides a fluent builder pattern
 * - @NoArgsConstructor generates a no-argument constructor
 * - @AllArgsConstructor generates a constructor with all fields
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

}
```

Create a DTO (Data Transfer Object) for creating users at `src/main/java/com/example/demo/dto/CreateUserRequest.java`.

```java
package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for user creation requests.
 *
 * DTOs help separate the API contract from internal domain models.
 * This allows you to:
 * - Control what data clients can send
 * - Version your API independently of your domain model
 * - Add validation rules specific to the API layer
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserRequest {

    private String firstName;
    private String lastName;
    private String email;

}
```

Create an update DTO at `src/main/java/com/example/demo/dto/UpdateUserRequest.java`.

```java
package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for user update requests.
 *
 * All fields are optional - only provided fields will be updated.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    private String firstName;
    private String lastName;
    private String email;

}
```

Create a service layer at `src/main/java/com/example/demo/service/UserService.java`.

```java
package com.example.demo.service;

import com.example.demo.dto.CreateUserRequest;
import com.example.demo.dto.UpdateUserRequest;
import com.example.demo.model.User;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Service layer for user operations.
 *
 * @Service marks this as a Spring-managed service bean.
 * It will be automatically discovered by component scanning and
 * can be injected into other beans using @Autowired or constructor injection.
 *
 * In a real application, this would interact with a database via a Repository.
 * For demonstration, we use an in-memory map.
 */
@Service
public class UserService {

    // In-memory storage - replace with JPA repository in production
    private final Map<Long, User> users = new ConcurrentHashMap<>();
    private final AtomicLong idGenerator = new AtomicLong(1);

    /**
     * Retrieve all users.
     *
     * @return List of all users in the system
     */
    public List<User> findAll() {
        return new ArrayList<>(users.values());
    }

    /**
     * Find a user by their ID.
     *
     * @param id The user ID to search for
     * @return Optional containing the user if found, empty otherwise
     */
    public Optional<User> findById(Long id) {
        return Optional.ofNullable(users.get(id));
    }

    /**
     * Create a new user from the provided request data.
     *
     * @param request The user creation request containing user details
     * @return The created user with generated ID and timestamps
     */
    public User create(CreateUserRequest request) {
        LocalDateTime now = LocalDateTime.now();

        User user = User.builder()
                .id(idGenerator.getAndIncrement())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .createdAt(now)
                .updatedAt(now)
                .build();

        users.put(user.getId(), user);
        return user;
    }

    /**
     * Update an existing user with the provided data.
     *
     * Only non-null fields in the request will be updated.
     *
     * @param id The ID of the user to update
     * @param request The update request containing fields to change
     * @return Optional containing the updated user, empty if user not found
     */
    public Optional<User> update(Long id, UpdateUserRequest request) {
        User existing = users.get(id);
        if (existing == null) {
            return Optional.empty();
        }

        // Update only provided fields (partial update)
        if (request.getFirstName() != null) {
            existing.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            existing.setLastName(request.getLastName());
        }
        if (request.getEmail() != null) {
            existing.setEmail(request.getEmail());
        }

        existing.setUpdatedAt(LocalDateTime.now());
        users.put(id, existing);

        return Optional.of(existing);
    }

    /**
     * Delete a user by their ID.
     *
     * @param id The ID of the user to delete
     * @return true if the user was deleted, false if not found
     */
    public boolean delete(Long id) {
        return users.remove(id) != null;
    }

}
```

Now create the REST controller at `src/main/java/com/example/demo/controller/UserController.java`.

```java
package com.example.demo.controller;

import com.example.demo.dto.CreateUserRequest;
import com.example.demo.dto.UpdateUserRequest;
import com.example.demo.model.User;
import com.example.demo.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for User CRUD operations.
 *
 * @RestController - Marks this as a controller where every method returns
 *                   a domain object instead of a view. Equivalent to
 *                   @Controller + @ResponseBody on every method.
 *
 * @RequestMapping - Sets the base path for all endpoints in this controller.
 *                   All methods here will be under /users.
 */
@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    /**
     * Constructor injection is the recommended way to inject dependencies.
     *
     * Benefits over @Autowired field injection:
     * - Makes dependencies explicit and required
     * - Easier to test (can pass mock implementations)
     * - Ensures immutability (fields can be final)
     *
     * @param userService The user service to handle business logic
     */
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * GET /users - Retrieve all users.
     *
     * @return List of all users with HTTP 200 OK
     */
    @GetMapping
    public List<User> getAllUsers() {
        return userService.findAll();
    }

    /**
     * GET /users/{id} - Retrieve a specific user by ID.
     *
     * @PathVariable binds the {id} path segment to the method parameter.
     *
     * ResponseEntity allows us to control the HTTP status code:
     * - 200 OK with user data if found
     * - 404 Not Found if user does not exist
     *
     * @param id The user ID from the URL path
     * @return ResponseEntity containing the user or 404 status
     */
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * POST /users - Create a new user.
     *
     * @RequestBody deserializes the JSON request body into the DTO object.
     * Spring uses Jackson for JSON processing by default.
     *
     * @ResponseStatus sets the HTTP status code for successful responses.
     * 201 CREATED is appropriate for resource creation.
     *
     * @param request The user creation request from the request body
     * @return The created user with generated ID
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public User createUser(@RequestBody CreateUserRequest request) {
        return userService.create(request);
    }

    /**
     * PUT /users/{id} - Update an existing user.
     *
     * PUT typically replaces the entire resource. For partial updates,
     * consider using PATCH instead.
     *
     * @param id The user ID from the URL path
     * @param request The update data from the request body
     * @return ResponseEntity with updated user or 404 if not found
     */
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(
            @PathVariable Long id,
            @RequestBody UpdateUserRequest request) {

        return userService.update(id, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * DELETE /users/{id} - Delete a user.
     *
     * Returns 204 No Content on success (no response body needed).
     * Returns 404 Not Found if the user does not exist.
     *
     * @param id The user ID to delete
     * @return ResponseEntity with appropriate status code
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (userService.delete(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

}
```

### Adding Request Validation

Spring Boot integrates with Jakarta Validation (formerly Java Validation) for request validation.

First, add the validation starter to your `pom.xml`.

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

Or in `build.gradle`.

```groovy
implementation 'org.springframework.boot:spring-boot-starter-validation'
```

Update your DTO with validation constraints.

```java
package com.example.demo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for user creation requests with validation.
 *
 * Validation annotations are from jakarta.validation.constraints:
 * - @NotBlank: String must not be null and must contain at least one non-whitespace character
 * - @Size: String length must be within specified bounds
 * - @Email: String must be a valid email format
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserRequest {

    @NotBlank(message = "First name is required")
    @Size(min = 1, max = 100, message = "First name must be between 1 and 100 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 1, max = 100, message = "Last name must be between 1 and 100 characters")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

}
```

Enable validation in the controller with `@Valid`.

```java
@PostMapping
@ResponseStatus(HttpStatus.CREATED)
public User createUser(@Valid @RequestBody CreateUserRequest request) {
    return userService.create(request);
}
```

### Global Exception Handling

Create a global exception handler to return consistent error responses.

```java
package com.example.demo.exception;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Global exception handler for the REST API.
 *
 * @RestControllerAdvice combines @ControllerAdvice and @ResponseBody.
 * It intercepts exceptions thrown by any controller and returns
 * a consistent error response format.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Handle validation errors from @Valid annotations.
     *
     * Extracts field-level errors and returns them in a user-friendly format.
     *
     * @param ex The validation exception containing field errors
     * @return ResponseEntity with field errors and 400 Bad Request status
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(
            MethodArgumentNotValidException ex) {

        Map<String, String> fieldErrors = new HashMap<>();

        // Extract each field error and its message
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            fieldErrors.put(fieldName, errorMessage);
        });

        ErrorResponse response = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Validation failed",
                fieldErrors,
                LocalDateTime.now()
        );

        return ResponseEntity.badRequest().body(response);
    }

    /**
     * Handle all other uncaught exceptions.
     *
     * In production, you should log the full exception details
     * but return a generic message to avoid leaking implementation details.
     *
     * @param ex The uncaught exception
     * @return ResponseEntity with error details and 500 Internal Server Error status
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleAllExceptions(Exception ex) {
        // Log the full exception (use a proper logger in production)
        ex.printStackTrace();

        ErrorResponse response = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "An unexpected error occurred",
                null,
                LocalDateTime.now()
        );

        return ResponseEntity.internalServerError().body(response);
    }

    /**
     * Standard error response format.
     */
    @Data
    @AllArgsConstructor
    public static class ErrorResponse {
        private int status;
        private String message;
        private Map<String, String> errors;
        private LocalDateTime timestamp;
    }

}
```

## Running Your Application

Now that everything is set up, let us run the application.

### Using Maven

```bash
# Run the application
./mvnw spring-boot:run

# Or compile and run the JAR
./mvnw clean package
java -jar target/demo-0.0.1-SNAPSHOT.jar

# Run with a specific profile
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### Using Gradle

```bash
# Run the application
./gradlew bootRun

# Or compile and run the JAR
./gradlew clean build
java -jar build/libs/demo-0.0.1-SNAPSHOT.jar

# Run with a specific profile
./gradlew bootRun --args='--spring.profiles.active=dev'
```

### Verifying the Application

Once the application starts, you should see output like this.

```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v3.2.2)

2024-01-15T10:30:00.123  INFO 12345 --- [main] com.example.demo.DemoApplication : Starting DemoApplication
2024-01-15T10:30:02.456  INFO 12345 --- [main] o.s.b.w.embedded.tomcat.TomcatWebServer : Tomcat started on port(s): 8080
2024-01-15T10:30:02.478  INFO 12345 --- [main] com.example.demo.DemoApplication : Started DemoApplication in 2.5 seconds
```

Test your endpoints using curl or any HTTP client.

```bash
# Test the hello endpoint
curl http://localhost:8080/api/v1/

# Test greeting with parameter
curl "http://localhost:8080/api/v1/greet?name=Developer"

# Create a user
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"firstName": "John", "lastName": "Doe", "email": "john@example.com"}'

# Get all users
curl http://localhost:8080/api/v1/users

# Get a specific user
curl http://localhost:8080/api/v1/users/1

# Update a user
curl -X PUT http://localhost:8080/api/v1/users/1 \
  -H "Content-Type: application/json" \
  -d '{"firstName": "Jane"}'

# Delete a user
curl -X DELETE http://localhost:8080/api/v1/users/1

# Check application health
curl http://localhost:8080/api/v1/management/health

# View application info
curl http://localhost:8080/api/v1/management/info
```

## Writing Tests

Spring Boot provides excellent testing support. Here is how to test your controller.

Create `src/test/java/com/example/demo/controller/UserControllerTest.java`.

```java
package com.example.demo.controller;

import com.example.demo.dto.CreateUserRequest;
import com.example.demo.model.User;
import com.example.demo.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for UserController.
 *
 * @WebMvcTest loads only the web layer, not the full application context.
 * This makes tests faster and more focused.
 *
 * @MockBean creates a mock of the service that we can configure
 * to return specific values for our tests.
 */
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    @Test
    void shouldReturnUserWhenUserExists() throws Exception {
        // Arrange - set up test data and mock behavior
        User user = User.builder()
                .id(1L)
                .firstName("John")
                .lastName("Doe")
                .email("john@example.com")
                .createdAt(LocalDateTime.now())
                .build();

        when(userService.findById(1L)).thenReturn(Optional.of(user));

        // Act and Assert - perform request and verify response
        mockMvc.perform(get("/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.firstName").value("John"))
                .andExpect(jsonPath("$.email").value("john@example.com"));
    }

    @Test
    void shouldReturn404WhenUserNotFound() throws Exception {
        when(userService.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/users/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldCreateUserSuccessfully() throws Exception {
        CreateUserRequest request = new CreateUserRequest("John", "Doe", "john@example.com");

        User createdUser = User.builder()
                .id(1L)
                .firstName("John")
                .lastName("Doe")
                .email("john@example.com")
                .createdAt(LocalDateTime.now())
                .build();

        when(userService.create(any(CreateUserRequest.class))).thenReturn(createdUser);

        mockMvc.perform(post("/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.firstName").value("John"));
    }

    @Test
    void shouldReturn400WhenValidationFails() throws Exception {
        // Missing required fields
        CreateUserRequest invalidRequest = new CreateUserRequest("", "", "invalid-email");

        mockMvc.perform(post("/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

}
```

Run tests with Maven.

```bash
./mvnw test
```

Or with Gradle.

```bash
./gradlew test
```

## Adding Common Dependencies

As your project grows, you will likely need additional dependencies. Here are some common ones.

### Database Access with JPA

```xml
<!-- JPA and Spring Data -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- PostgreSQL driver -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>

<!-- H2 for development and testing -->
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

### Security

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

### OpenAPI Documentation

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.3.0</version>
</dependency>
```

This automatically generates Swagger UI at `/swagger-ui.html`.

### Caching

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
```

## Summary

You now have a fully functional Spring Boot project with:

| Component | Description |
|-----------|-------------|
| **Project Structure** | Standard Maven or Gradle layout |
| **Main Application** | Entry point with @SpringBootApplication |
| **Configuration** | Properties and YAML files with profiles |
| **REST Controllers** | Endpoints with proper HTTP methods and status codes |
| **Service Layer** | Business logic separated from controllers |
| **DTOs** | Data transfer objects for API contracts |
| **Validation** | Request validation with Jakarta Validation |
| **Exception Handling** | Global error responses |
| **Tests** | Unit tests with MockMvc |

## Next Steps

Once your Spring Boot application is running, consider:

- Adding a database with Spring Data JPA
- Implementing security with Spring Security
- Setting up CI/CD pipelines
- Adding OpenAPI documentation
- Configuring monitoring and observability

Speaking of monitoring, keeping your Spring Boot applications healthy in production requires proper observability. **OneUptime** provides comprehensive monitoring for Java and Spring Boot applications, including uptime monitoring, performance metrics, error tracking, and alerting. With OneUptime, you can track response times, monitor your actuator health endpoints, set up alerts for anomalies, and get notified before your users notice any issues.

Check out [OneUptime](https://oneuptime.com) to start monitoring your Spring Boot applications today. It integrates seamlessly with Spring Boot Actuator endpoints and supports custom metrics, giving you full visibility into your application's health and performance.
