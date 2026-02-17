# How to Build a Quarkus Native Application and Deploy It to Cloud Run with Minimal Cold Start

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Quarkus, Java, GraalVM, Native Image, Google Cloud

Description: Build a Quarkus native application using GraalVM and deploy it to Cloud Run for sub-second cold starts and minimal memory usage.

---

Java is known for slower startup times compared to languages like Go or Node.js, which has traditionally been a problem for serverless platforms like Cloud Run where cold starts directly affect user experience. Quarkus changes this equation. By compiling your Java application to a native binary using GraalVM, Quarkus produces executables that start in milliseconds instead of seconds and use a fraction of the memory.

In this post, I will show you how to build a Quarkus REST API, compile it to a native image, and deploy it to Cloud Run with cold start times under 100 milliseconds.

## Why Quarkus Native for Cloud Run

Regular Java applications on Cloud Run can take 3-10 seconds for a cold start. A Quarkus native application typically starts in 20-80 milliseconds. This means:

- Your scale-from-zero experience is nearly instant
- You can run with min-instances set to 0 and still have fast responses
- Memory usage drops from 200-500MB to 20-50MB
- You can use smaller (cheaper) instance sizes

## Creating the Quarkus Project

```bash
# Create a new Quarkus project with REST extensions
mvn io.quarkus.platform:quarkus-maven-plugin:3.6.0:create \
  -DprojectGroupId=com.example \
  -DprojectArtifactId=quarkus-cloudrun \
  -Dextensions="rest-jackson,health,smallrye-openapi" \
  -DnoCode

cd quarkus-cloudrun
```

This creates a project with RESTEasy Reactive (for REST endpoints), Jackson (for JSON), SmallRye Health (for health checks), and OpenAPI (for API documentation).

## Building the REST API

```java
// src/main/java/com/example/model/Task.java
package com.example.model;

import java.time.Instant;
import java.util.UUID;

public class Task {
    private String id;
    private String title;
    private String description;
    private String status;
    private Instant createdAt;

    public Task() {
        this.id = UUID.randomUUID().toString();
        this.status = "TODO";
        this.createdAt = Instant.now();
    }

    public Task(String title, String description) {
        this();
        this.title = title;
        this.description = description;
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
```

```java
// src/main/java/com/example/resource/TaskResource.java
package com.example.resource;

import com.example.model.Task;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Path("/api/tasks")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TaskResource {

    private static final Logger LOG = Logger.getLogger(TaskResource.class);

    // In-memory storage (use a database in production)
    private final Map<String, Task> tasks = new ConcurrentHashMap<>();

    @GET
    public List<Task> listTasks(@QueryParam("status") String status) {
        LOG.infof("Listing tasks, filter status: %s", status);

        if (status != null) {
            return tasks.values().stream()
                .filter(t -> t.getStatus().equalsIgnoreCase(status))
                .toList();
        }
        return new ArrayList<>(tasks.values());
    }

    @GET
    @Path("/{id}")
    public Response getTask(@PathParam("id") String id) {
        Task task = tasks.get(id);
        if (task == null) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(Map.of("error", "Task not found"))
                .build();
        }
        return Response.ok(task).build();
    }

    @POST
    public Response createTask(Task task) {
        task.setId(java.util.UUID.randomUUID().toString());
        task.setCreatedAt(java.time.Instant.now());
        if (task.getStatus() == null) {
            task.setStatus("TODO");
        }

        tasks.put(task.getId(), task);
        LOG.infof("Created task: %s", task.getId());

        return Response.status(Response.Status.CREATED).entity(task).build();
    }

    @PUT
    @Path("/{id}")
    public Response updateTask(@PathParam("id") String id, Task updated) {
        Task existing = tasks.get(id);
        if (existing == null) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(Map.of("error", "Task not found"))
                .build();
        }

        if (updated.getTitle() != null) existing.setTitle(updated.getTitle());
        if (updated.getDescription() != null) existing.setDescription(updated.getDescription());
        if (updated.getStatus() != null) existing.setStatus(updated.getStatus());

        return Response.ok(existing).build();
    }

    @DELETE
    @Path("/{id}")
    public Response deleteTask(@PathParam("id") String id) {
        Task removed = tasks.remove(id);
        if (removed == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.noContent().build();
    }
}
```

## Adding a Startup Time Endpoint

This is useful for verifying cold start performance.

```java
// src/main/java/com/example/resource/InfoResource.java
package com.example.resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.lang.management.ManagementFactory;
import java.util.Map;

@Path("/api/info")
@Produces(MediaType.APPLICATION_JSON)
public class InfoResource {

    private final long startupTime = ManagementFactory.getRuntimeMXBean().getUptime();

    @GET
    public Map<String, Object> getInfo() {
        Runtime runtime = Runtime.getRuntime();

        return Map.of(
            "startupTimeMs", startupTime,
            "uptimeMs", ManagementFactory.getRuntimeMXBean().getUptime(),
            "memoryUsedMB", (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024),
            "memoryMaxMB", runtime.maxMemory() / (1024 * 1024),
            "availableProcessors", runtime.availableProcessors(),
            "javaVersion", System.getProperty("java.version"),
            "nativeImage", isNativeImage()
        );
    }

    private boolean isNativeImage() {
        // Check if running as a GraalVM native image
        try {
            Class.forName("org.graalvm.nativeimage.ImageInfo");
            return true;
        } catch (ClassNotFoundException e) {
            return false;
        }
    }
}
```

## Application Configuration

```properties
# src/main/resources/application.properties

# Server configuration - Cloud Run sets PORT
quarkus.http.port=${PORT:8080}
quarkus.http.host=0.0.0.0

# Health check endpoints
quarkus.health.openapi.included=true

# Native image configuration
quarkus.native.additional-build-args=--initialize-at-build-time

# Logging
quarkus.log.level=INFO
quarkus.log.console.format=%d{yyyy-MM-dd HH:mm:ss} %-5p [%c{2.}] %s%e%n

# OpenAPI
quarkus.smallrye-openapi.info-title=Task API
quarkus.smallrye-openapi.info-version=1.0.0
```

## Building the Native Image

Quarkus provides a multi-stage Dockerfile that handles the native image compilation.

```dockerfile
# Dockerfile.native-micro - Optimized native image build
# Stage 1: Build the native image using GraalVM
FROM quay.io/quarkus/ubi-quarkus-mandrel-builder-image:jdk-21 AS build
USER root
WORKDIR /code

# Copy Maven files first for better layer caching
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN chmod +x mvnw && ./mvnw dependency:go-offline

# Copy source code and build native image
COPY src ./src
RUN ./mvnw package -Dnative -DskipTests \
  -Dquarkus.native.additional-build-args="--initialize-at-build-time"

# Stage 2: Create minimal runtime image
FROM quay.io/quarkus/quarkus-micro-image:2.0
WORKDIR /work

# Copy the native binary
COPY --from=build /code/target/*-runner /work/application

# Set correct permissions
RUN chmod 775 /work/application

# Expose the port
EXPOSE 8080

# Run the native binary directly - no JVM needed
CMD ["./application", "-Dquarkus.http.host=0.0.0.0"]
```

The `quarkus-micro-image` base image is only about 30MB, and your native binary adds another 50-80MB. The total image size is typically under 120MB, compared to 300-500MB for a JVM-based image.

## Building with Cloud Build

You can build the native image using Cloud Build, which has enough memory for the GraalVM compilation.

```yaml
# cloudbuild.yaml - Build native image with Cloud Build
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-f'
      - 'Dockerfile.native-micro'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/repo/quarkus-app:$COMMIT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/repo/quarkus-app:latest'
      - '.'
    timeout: '1800s'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/repo/quarkus-app:$COMMIT_SHA'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/repo/quarkus-app:latest'

options:
  machineType: 'E2_HIGHCPU_8'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/repo/quarkus-app:$COMMIT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/repo/quarkus-app:latest'
```

Native image compilation is memory-intensive. Use at least an `E2_HIGHCPU_8` machine type in Cloud Build.

```bash
# Submit the build
gcloud builds submit --config=cloudbuild.yaml --timeout=30m
```

## Deploying to Cloud Run

```bash
# Deploy the native image to Cloud Run
gcloud run deploy quarkus-app \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT/repo/quarkus-app:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 128Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 20 \
  --concurrency 100 \
  --timeout 30
```

Notice the `--memory 128Mi`. A Quarkus native application can run comfortably with 128MB of memory, which is significantly less than the 512MB-1GB typically needed for JVM-based Java applications.

## Verifying Cold Start Performance

After deploying, test the cold start time by hitting the info endpoint after a period of inactivity.

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe quarkus-app --region us-central1 --format='value(status.url)')

# Wait for scale-to-zero (about 15 minutes of inactivity)
# Then hit the endpoint to trigger a cold start
time curl ${SERVICE_URL}/api/info
```

You should see startup times under 100ms. Compare this with a typical Spring Boot JVM application that takes 3-8 seconds.

## Testing the API

```bash
# Create a task
curl -X POST ${SERVICE_URL}/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Quarkus", "description": "Verify native performance"}'

# List tasks
curl ${SERVICE_URL}/api/tasks

# Check health
curl ${SERVICE_URL}/q/health

# View startup metrics
curl ${SERVICE_URL}/api/info
```

## JVM vs Native Comparison

Here is a rough comparison of what you can expect:

| Metric | JVM Mode | Native Mode |
|--------|----------|-------------|
| Cold start | 3-8 seconds | 20-80 ms |
| Memory usage | 200-500 MB | 20-50 MB |
| Image size | 300-500 MB | 80-120 MB |
| Build time | 30 seconds | 5-10 minutes |
| Peak throughput | Higher | Slightly lower |

The trade-off is clear: native mode excels at startup and memory efficiency, while JVM mode offers better peak throughput for long-running workloads. On Cloud Run, where cold starts happen frequently and you pay per 100ms of execution, native mode is usually the better choice.

## Limitations of Native Mode

There are some things to be aware of:

- Reflection requires explicit registration (Quarkus handles most of this automatically)
- Dynamic class loading does not work
- Some Java libraries are not compatible with native compilation
- Build times are significantly longer
- Debugging is more difficult than JVM mode

Quarkus with GraalVM native compilation is the best answer to Java's cold start problem on serverless platforms. With sub-100ms startup times and memory usage under 50MB, you can run Java on Cloud Run with the same scale-to-zero efficiency as Go or Rust, while still writing code in a familiar Java framework with dependency injection, configuration management, and a rich ecosystem of extensions.
