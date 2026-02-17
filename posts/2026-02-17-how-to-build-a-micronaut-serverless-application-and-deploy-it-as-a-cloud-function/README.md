# How to Build a Micronaut Serverless Application and Deploy It as a Cloud Function

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, Micronaut, Serverless, Java

Description: Step-by-step guide to building a serverless application with the Micronaut framework and deploying it as a Google Cloud Function with fast cold start times.

---

Micronaut is a JVM framework that was built from the ground up for serverless and microservices. Unlike Spring Boot, Micronaut does dependency injection at compile time instead of runtime, which means significantly faster startup times. That matters a lot when you are deploying to Cloud Functions, where cold starts directly impact response latency.

In this post, I will walk through building a Micronaut application and deploying it as a Google Cloud Function.

## Why Micronaut for Cloud Functions?

The cold start problem is real on Cloud Functions. A typical Spring Boot application might take 5-10 seconds to start up on the Java runtime. Micronaut can start in under 2 seconds because it does not rely on reflection-based dependency injection. It generates the necessary code at compile time, so the runtime overhead is minimal.

Micronaut also has a dedicated module for Google Cloud Functions that handles the integration between the Functions Framework and the Micronaut application context.

## Creating the Project

The fastest way to create a Micronaut project for Cloud Functions is with the Micronaut CLI or the Launch tool at launch.micronaut.io. For a manual setup, here is the Gradle build file:

```groovy
// build.gradle - Micronaut Cloud Function project setup
plugins {
    id("io.micronaut.application") version "4.2.1"
    id("com.google.cloud.tools.jib") version "3.4.0"
    id("com.github.johnrengelman.shadow") version "8.1.1"
}

dependencies {
    // Micronaut Google Cloud Function support
    implementation("io.micronaut.gcp:micronaut-gcp-function-http")

    // JSON serialization
    implementation("io.micronaut.serde:micronaut-serde-jackson")

    // Annotation processing for compile-time DI
    annotationProcessor("io.micronaut.serde:micronaut-serde-processor")

    // Testing
    testImplementation("io.micronaut:micronaut-http-client")
    testImplementation("io.micronaut.test:micronaut-test-junit5")
}

application {
    mainClass.set("com.example.Application")
}

micronaut {
    runtime("google_function")
    processing {
        incremental(true)
        annotations("com.example.*")
    }
}
```

## The Application Entry Point

Micronaut Cloud Functions use a specific entry point class that bridges the Google Cloud Functions framework with the Micronaut context.

```java
package com.example;

import io.micronaut.gcp.function.http.HttpFunction;

// This class is the entry point for the Cloud Function
// It extends HttpFunction which initializes the Micronaut application context
// and routes incoming HTTP requests to your controllers
public class Application extends HttpFunction {
    // No additional code needed - the parent class handles everything
}
```

That is it for the entry point. The `HttpFunction` class starts the Micronaut application context when the function cold starts and delegates HTTP requests to your controllers.

## Building a Controller

Controllers in Micronaut for Cloud Functions work exactly like they do in a regular Micronaut HTTP application:

```java
package com.example.controllers;

import io.micronaut.http.annotation.*;
import io.micronaut.http.HttpResponse;
import jakarta.inject.Inject;

// Standard Micronaut controller - routes map to Cloud Function HTTP triggers
@Controller("/api")
public class TaskController {

    private final TaskService taskService;

    // Constructor injection - resolved at compile time
    @Inject
    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @Get("/tasks")
    public HttpResponse<List<Task>> listTasks() {
        List<Task> tasks = taskService.getAllTasks();
        return HttpResponse.ok(tasks);
    }

    @Post("/tasks")
    public HttpResponse<Task> createTask(@Body TaskRequest request) {
        Task created = taskService.createTask(request.getTitle(), request.getDescription());
        return HttpResponse.created(created);
    }

    @Get("/tasks/{id}")
    public HttpResponse<Task> getTask(String id) {
        return taskService.findById(id)
                .map(HttpResponse::ok)
                .orElse(HttpResponse.notFound());
    }

    @Delete("/tasks/{id}")
    public HttpResponse<Void> deleteTask(String id) {
        taskService.delete(id);
        return HttpResponse.noContent();
    }
}
```

## The Service Layer

Create a service with business logic. Micronaut's `@Singleton` annotation works similarly to Spring's `@Service`:

```java
package com.example.services;

import jakarta.inject.Singleton;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

// Singleton service managed by Micronaut's DI container
@Singleton
public class TaskService {

    // In-memory store for demonstration - replace with Firestore or Cloud SQL
    private final Map<String, Task> tasks = new ConcurrentHashMap<>();

    public List<Task> getAllTasks() {
        return new ArrayList<>(tasks.values());
    }

    public Task createTask(String title, String description) {
        String id = UUID.randomUUID().toString();
        Task task = new Task(id, title, description);
        tasks.put(id, task);
        return task;
    }

    public Optional<Task> findById(String id) {
        return Optional.ofNullable(tasks.get(id));
    }

    public void delete(String id) {
        tasks.remove(id);
    }
}
```

## Data Transfer Objects

Micronaut Serde handles serialization. Annotate your data classes:

```java
package com.example.models;

import io.micronaut.serde.annotation.Serdeable;

// Serdeable annotation enables compile-time serialization generation
@Serdeable
public class Task {
    private String id;
    private String title;
    private String description;
    private boolean completed;

    public Task(String id, String title, String description) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.completed = false;
    }

    // Getters and setters
    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }
}

@Serdeable
public class TaskRequest {
    private String title;
    private String description;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
```

## Testing Locally

Micronaut has good testing support. You can test your function locally using the built-in HTTP client:

```java
@MicronautTest
public class TaskControllerTest {

    @Inject
    @Client("/")
    HttpClient client;

    @Test
    void testCreateAndListTasks() {
        // Create a task
        HttpResponse<Task> createResponse = client.toBlocking()
                .exchange(HttpRequest.POST("/api/tasks",
                        Map.of("title", "Test Task", "description", "A test")),
                        Task.class);

        assertEquals(HttpStatus.CREATED, createResponse.getStatus());
        assertNotNull(createResponse.body().getId());

        // List tasks
        List<Task> tasks = client.toBlocking()
                .retrieve(HttpRequest.GET("/api/tasks"),
                        Argument.listOf(Task.class));

        assertEquals(1, tasks.size());
        assertEquals("Test Task", tasks.get(0).getTitle());
    }
}
```

You can also run the function locally using the Functions Framework:

```bash
# Build the shadow jar and run locally with the Functions Framework
./gradlew shadowJar

java -jar build/libs/my-function-0.1-all.jar
```

## Deploying to Cloud Functions

Build the deployment artifact and deploy:

```bash
# Build the fat jar for deployment
./gradlew shadowJar

# Deploy to Cloud Functions Gen 2
gcloud functions deploy my-micronaut-function \
    --gen2 \
    --runtime java17 \
    --trigger-http \
    --entry-point com.example.Application \
    --source build/libs \
    --memory 512MB \
    --timeout 60s \
    --region us-central1 \
    --allow-unauthenticated
```

The `--gen2` flag deploys to Cloud Functions 2nd generation, which runs on Cloud Run under the hood and gives you better performance and longer timeout limits.

## Optimizing Cold Start Performance

A few tricks to minimize cold start time:

First, set the memory allocation to at least 512MB. More memory means more CPU, and the JVM needs CPU for class loading during startup.

Second, enable tiered compilation to speed up the JVM warmup:

```yaml
# Set JVM flags in the function configuration
# This tells the JVM to use the client compiler initially for faster startup
JAVA_TOOL_OPTIONS: "-XX:+TieredCompilation -XX:TieredStopAtLevel=1"
```

Third, keep your dependency count low. Every jar that needs to be loaded adds to startup time. Micronaut's compile-time approach already helps here, but removing unused dependencies makes it even better.

## Adding GCP Service Integration

Micronaut has modules for GCP services. For example, to add Firestore:

```groovy
// Add Firestore support
implementation("io.micronaut.gcp:micronaut-gcp-common")
implementation("com.google.cloud:google-cloud-firestore")
```

```java
@Singleton
public class FirestoreTaskService {

    private final Firestore firestore;

    public FirestoreTaskService(Firestore firestore) {
        this.firestore = firestore;
    }

    // Save a task to Firestore
    public Task createTask(String title, String description) throws Exception {
        String id = UUID.randomUUID().toString();
        Task task = new Task(id, title, description);

        firestore.collection("tasks").document(id).set(task).get();
        return task;
    }
}
```

## Wrapping Up

Micronaut's compile-time dependency injection makes it a strong choice for Cloud Functions on GCP. The cold start times are significantly better than reflection-heavy frameworks, and the programming model is familiar if you have worked with Spring or similar frameworks. The `micronaut-gcp-function-http` module handles the integration with the Functions Framework, so your controllers work the same way they do in a standard Micronaut HTTP application. Deploy with `gcloud functions deploy`, tune the memory and JVM settings, and you have a fast-starting serverless Java application.
