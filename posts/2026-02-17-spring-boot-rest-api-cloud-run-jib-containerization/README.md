# How to Build a Spring Boot REST API and Deploy It to Cloud Run with Jib Containerization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Spring Boot, Java, Jib, Docker, Google Cloud

Description: Build a Spring Boot REST API and deploy it to Cloud Run using Jib for fast, Dockerfile-less container builds with optimized Java layers.

---

Spring Boot is the dominant framework for building Java web applications, and Cloud Run is an excellent platform for running them. But containerizing Java applications has traditionally been painful - writing Dockerfiles for Java requires dealing with multi-stage builds, JDK vs JRE decisions, and layer optimization. Google's Jib tool eliminates all of this by building optimized Docker images directly from your Maven or Gradle project, without requiring a Docker daemon.

In this post, I will walk through building a Spring Boot REST API and deploying it to Cloud Run using Jib for containerization. We will cover the application code, Jib configuration, Cloud Run deployment, and performance tuning.

## Creating the Spring Boot Project

Use Spring Initializr to create the project or set it up manually with Maven.

```xml
<!-- pom.xml - Spring Boot project with dependencies -->
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
  https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
  </parent>

  <groupId>com.example</groupId>
  <artifactId>cloudrun-api</artifactId>
  <version>1.0.0</version>

  <properties>
    <java.version>21</java.version>
    <jib-maven-plugin.version>3.4.0</jib-maven-plugin.version>
  </properties>

  <dependencies>
    <!-- Spring Boot Web Starter -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <!-- Actuator for health checks -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
    <!-- Validation -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
      <!-- Jib plugin for containerization -->
      <plugin>
        <groupId>com.google.cloud.tools</groupId>
        <artifactId>jib-maven-plugin</artifactId>
        <version>${jib-maven-plugin.version}</version>
        <configuration>
          <!-- Base image - Eclipse Temurin JRE for smaller size -->
          <from>
            <image>eclipse-temurin:21-jre-alpine</image>
          </from>
          <!-- Target image in Artifact Registry -->
          <to>
            <image>us-central1-docker.pkg.dev/YOUR_PROJECT/repo/cloudrun-api</image>
            <tags>
              <tag>latest</tag>
              <tag>${project.version}</tag>
            </tags>
          </to>
          <container>
            <!-- Cloud Run provides PORT environment variable -->
            <ports>
              <port>8080</port>
            </ports>
            <!-- JVM flags optimized for containers -->
            <jvmFlags>
              <jvmFlag>-XX:+UseContainerSupport</jvmFlag>
              <jvmFlag>-XX:MaxRAMPercentage=75.0</jvmFlag>
              <jvmFlag>-XX:+UseG1GC</jvmFlag>
              <jvmFlag>-Djava.security.egd=file:/dev/./urandom</jvmFlag>
            </jvmFlags>
            <environment>
              <SPRING_PROFILES_ACTIVE>production</SPRING_PROFILES_ACTIVE>
            </environment>
          </container>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

## Application Configuration

```yaml
# src/main/resources/application.yml
server:
  # Cloud Run sets the PORT environment variable
  port: ${PORT:8080}
  # Reduce startup time by disabling unnecessary features
  servlet:
    register-default-servlet: false

spring:
  application:
    name: cloudrun-api
  # Disable the banner for cleaner logs
  main:
    banner-mode: off
  jackson:
    # ISO 8601 date format
    date-format: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
    time-zone: UTC
    serialization:
      write-dates-as-timestamps: false

# Actuator configuration
management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: always

# Logging
logging:
  level:
    root: INFO
    com.example: DEBUG
  pattern:
    console: "%d{ISO8601} [%thread] %-5level %logger{36} - %msg%n"
```

## Building the REST API

```java
// src/main/java/com/example/cloudrunapi/model/Task.java
package com.example.cloudrunapi.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public class Task {
    private String id;

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must be under 200 characters")
    private String title;

    private String description;
    private TaskStatus status;
    private Instant createdAt;
    private Instant updatedAt;

    public Task() {
        this.id = UUID.randomUUID().toString();
        this.status = TaskStatus.TODO;
        this.createdAt = Instant.now();
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public enum TaskStatus {
        TODO, IN_PROGRESS, DONE
    }
}
```

```java
// src/main/java/com/example/cloudrunapi/controller/TaskController.java
package com.example.cloudrunapi.controller;

import com.example.cloudrunapi.model.Task;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    // In-memory storage (use a database in production)
    private final Map<String, Task> tasks = new ConcurrentHashMap<>();

    // List all tasks with optional status filter
    @GetMapping
    public ResponseEntity<List<Task>> listTasks(
            @RequestParam(required = false) Task.TaskStatus status) {
        List<Task> result = tasks.values().stream()
            .filter(t -> status == null || t.getStatus() == status)
            .sorted(Comparator.comparing(Task::getCreatedAt).reversed())
            .toList();
        return ResponseEntity.ok(result);
    }

    // Get a single task by ID
    @GetMapping("/{id}")
    public ResponseEntity<Task> getTask(@PathVariable String id) {
        Task task = tasks.get(id);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(task);
    }

    // Create a new task
    @PostMapping
    public ResponseEntity<Task> createTask(@Valid @RequestBody Task task) {
        task.setId(UUID.randomUUID().toString());
        task.setCreatedAt(Instant.now());
        task.setStatus(Task.TaskStatus.TODO);
        tasks.put(task.getId(), task);
        return ResponseEntity.status(HttpStatus.CREATED).body(task);
    }

    // Update a task
    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(
            @PathVariable String id,
            @Valid @RequestBody Task updated) {
        Task existing = tasks.get(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }

        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        if (updated.getStatus() != null) {
            existing.setStatus(updated.getStatus());
        }
        existing.setUpdatedAt(Instant.now());

        return ResponseEntity.ok(existing);
    }

    // Delete a task
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable String id) {
        Task removed = tasks.remove(id);
        if (removed == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }
}
```

## Global Exception Handler

```java
// src/main/java/com/example/cloudrunapi/exception/GlobalExceptionHandler.java
package com.example.cloudrunapi.exception;

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
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String field = ((FieldError) error).getField();
            String message = error.getDefaultMessage();
            errors.put(field, message);
        });

        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", Instant.now().toString());
        response.put("status", 400);
        response.put("errors", errors);

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", Instant.now().toString());
        response.put("status", 500);
        response.put("error", "Internal Server Error");

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
```

## Building and Pushing the Image with Jib

Jib builds and pushes the container image without needing Docker installed.

```bash
# Build and push to Artifact Registry
# Make sure you have authenticated with gcloud
gcloud auth configure-docker us-central1-docker.pkg.dev

# Create the Artifact Registry repository (one-time)
gcloud artifacts repositories create repo \
  --repository-format=docker \
  --location=us-central1

# Build and push the image
mvn compile jib:build -Djib.to.image=us-central1-docker.pkg.dev/YOUR_PROJECT/repo/cloudrun-api:latest
```

For local testing without pushing to a registry, build to the local Docker daemon.

```bash
# Build to local Docker daemon
mvn compile jib:dockerBuild

# Test locally
docker run -p 8080:8080 -e PORT=8080 cloudrun-api:latest
```

## Deploying to Cloud Run

```bash
# Deploy the image to Cloud Run
gcloud run deploy cloudrun-api \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT/repo/cloudrun-api:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --cpu-boost \
  --set-env-vars "SPRING_PROFILES_ACTIVE=production"
```

The `--cpu-boost` flag gives extra CPU during startup, which significantly helps Spring Boot's initialization time.

## Reducing Cold Start Time

Java applications on Cloud Run can have noticeable cold starts. Here are several strategies to reduce them:

```yaml
# application-production.yml - Production optimizations
spring:
  jmx:
    enabled: false
  main:
    lazy-initialization: true  # Lazy-init beans to speed up startup
  autoconfigure:
    # Exclude auto-configurations you do not need
    exclude:
      - org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
      - org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration
```

In your Jib configuration, use AppCDS (Application Class Data Sharing) for faster class loading.

```xml
<!-- Additional JVM flags for faster startup -->
<jvmFlags>
  <jvmFlag>-XX:+UseContainerSupport</jvmFlag>
  <jvmFlag>-XX:MaxRAMPercentage=75.0</jvmFlag>
  <jvmFlag>-Dspring.main.lazy-initialization=true</jvmFlag>
  <jvmFlag>-XX:TieredStopAtLevel=1</jvmFlag>
  <jvmFlag>-Dspring.jmx.enabled=false</jvmFlag>
</jvmFlags>
```

## Testing the API

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe cloudrun-api --region us-central1 --format='value(status.url)')

# Create a task
curl -X POST ${SERVICE_URL}/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Deploy to Cloud Run", "description": "Use Jib for containerization"}'

# List all tasks
curl ${SERVICE_URL}/api/tasks

# Check health
curl ${SERVICE_URL}/actuator/health
```

Jib makes containerizing Spring Boot applications for Cloud Run remarkably simple. You get optimized, layered Docker images without writing a Dockerfile, and the build-and-push workflow integrates naturally into your Maven or Gradle build. Combined with Cloud Run's startup CPU boost and Spring Boot's lazy initialization, you can keep cold starts reasonable even for Java applications.
