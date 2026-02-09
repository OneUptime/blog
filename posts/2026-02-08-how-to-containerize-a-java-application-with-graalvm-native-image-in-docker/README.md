# How to Containerize a Java Application with GraalVM Native Image in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Java, GraalVM, Native Image, Performance, AOT Compilation, DevOps

Description: Build Docker containers with GraalVM native images for instant startup, minimal memory footprint, and no JVM overhead.

---

GraalVM native image compiles Java applications ahead-of-time (AOT) into standalone executables. No JVM is needed at runtime. The result is a container that starts in milliseconds instead of seconds, uses a fraction of the memory, and produces a Docker image that can be as small as 30MB. This is ideal for serverless functions, CLI tools, and microservices where startup time and resource efficiency matter.

## Why GraalVM Native Image for Docker

Traditional Java containers carry the full JRE and use significant memory for JIT compilation and class loading. GraalVM native image eliminates all of this:

- **Startup time**: 50-100ms instead of 3-10 seconds
- **Memory usage**: 50-100MB instead of 200-500MB
- **Image size**: 30-80MB instead of 250-400MB
- **No JVM warmup**: Full performance from the first request

The trade-off is a longer build time (several minutes) and some Java features that require additional configuration (reflection, dynamic proxies, JNI).

## Prerequisites

You need GraalVM with the native image tool. The easiest approach uses Docker multi-stage builds so you do not need GraalVM installed locally.

## A Sample Spring Boot Application

Create a simple Spring Boot 3 application that we will compile natively:

```java
// src/main/java/com/example/app/Application.java
package com.example.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.time.Instant;

@SpringBootApplication
@RestController
public class Application {

    private final Instant startTime = Instant.now();

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

    @GetMapping("/")
    public String home() {
        return "Hello from GraalVM Native Image!";
    }

    @GetMapping("/health")
    public String health() {
        return "{\"status\": \"UP\", \"started\": \"" + startTime + "\"}";
    }
}
```

Configure the Maven build for native image support:

```xml
<!-- pom.xml - Key sections for GraalVM native image -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
</parent>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>org.graalvm.buildtools</groupId>
            <artifactId>native-maven-plugin</artifactId>
        </plugin>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
        </plugin>
    </plugins>
</build>
```

## The Multi-Stage Dockerfile for Native Image

This Dockerfile compiles the application to a native binary and packages it in a minimal container:

```dockerfile
# Dockerfile.native - GraalVM native image multi-stage build

# === Stage 1: Build the native image ===
FROM ghcr.io/graalvm/native-image-community:21 AS builder

WORKDIR /build

# Install Maven (the GraalVM image does not include it)
RUN microdnf install -y maven && microdnf clean all

# Copy dependency definition first for layer caching
COPY pom.xml ./
RUN mvn dependency:resolve -B

# Copy the source code
COPY src ./src

# Build the native image
# -Pnative activates the Spring Boot native profile
# -DskipTests skips tests during the Docker build
RUN mvn -Pnative native:compile -DskipTests -B

# === Stage 2: Create the minimal runtime image ===
# Using a distroless base image for minimal attack surface
FROM gcr.io/distroless/base-debian12

WORKDIR /app

# Copy the native binary from the build stage
COPY --from=builder /build/target/app /app/app

# Expose the application port
EXPOSE 8080

# Health check using the native binary itself
HEALTHCHECK --interval=10s --timeout=3s --retries=3 --start-period=5s \
  CMD ["/app/app", "--health-check"]

# Run the native binary directly - no JVM needed
ENTRYPOINT ["/app/app"]
```

Build it:

```bash
# Build the native image Docker container
# This takes 5-10 minutes due to AOT compilation
docker build -f Dockerfile.native -t myapp-native:1.0 .
```

## Comparing Image Sizes

Compare the native image container with a traditional JVM container:

```bash
# Check image sizes
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep myapp
```

Typical results:

```
myapp-native    1.0    78MB
myapp-jvm       1.0    310MB
```

## Testing Startup Time

Measure the startup time of the native container:

```bash
# Measure startup time by checking when the health endpoint responds
time (docker run -d --name native-test -p 8080:8080 myapp-native:1.0 && \
  until curl -sf http://localhost:8080/health > /dev/null 2>&1; do sleep 0.1; done && \
  echo "Application ready")
```

Native images typically respond within 100-200ms of container start, compared to 3-10 seconds for JVM-based containers.

## Handling Reflection and Dynamic Features

GraalVM native image analyzes your code at build time and only includes reachable classes. If your application uses reflection, dynamic proxies, or JNI, you need to tell the native image compiler about them.

Spring Boot 3 handles most of this automatically through its AOT processing. But if you have custom reflection usage, create a reflection configuration file:

```json
[
  {
    "name": "com.example.app.model.User",
    "allDeclaredConstructors": true,
    "allDeclaredMethods": true,
    "allDeclaredFields": true
  },
  {
    "name": "com.example.app.dto.ApiResponse",
    "allDeclaredConstructors": true,
    "allDeclaredMethods": true,
    "allDeclaredFields": true
  }
]
```

Reference the configuration in your native image build arguments:

```xml
<!-- pom.xml - Native image configuration -->
<plugin>
    <groupId>org.graalvm.buildtools</groupId>
    <artifactId>native-maven-plugin</artifactId>
    <configuration>
        <buildArgs>
            <buildArg>-H:ReflectionConfigurationFiles=src/main/resources/META-INF/native-image/reflect-config.json</buildArg>
            <buildArg>--enable-url-protocols=http,https</buildArg>
            <buildArg>--initialize-at-build-time</buildArg>
        </buildArgs>
    </configuration>
</plugin>
```

## Using the GraalVM Tracing Agent

If you are not sure what reflection configuration you need, use the GraalVM tracing agent to generate it automatically:

```bash
# Run the application with the tracing agent to collect configuration
docker run --rm \
  -v $(pwd)/src/main/resources/META-INF/native-image:/config \
  ghcr.io/graalvm/native-image-community:21 \
  java -agentlib:native-image-agent=config-output-dir=/config \
  -jar target/app.jar &

# Exercise all application endpoints
curl http://localhost:8080/
curl http://localhost:8080/health
curl http://localhost:8080/api/users
# ... test all endpoints and features

# Stop the application
docker stop $(docker ps -q --filter ancestor=ghcr.io/graalvm/native-image-community:21)
```

The agent generates `reflect-config.json`, `resource-config.json`, and other configuration files in the specified directory.

## Optimizing the Native Image Build

Native image builds are resource-intensive. Allocate sufficient resources:

```bash
# Build with more memory for the native image compiler
docker build \
  --memory=8g \
  --build-arg MAVEN_OPTS="-Xmx4g" \
  -f Dockerfile.native \
  -t myapp-native:1.0 .
```

For faster builds during development, use the quick build mode:

```dockerfile
# Development-focused native build (faster but less optimized)
RUN mvn -Pnative native:compile -DskipTests -B \
  -Dspring-boot.native-image.argline="-Ob"
```

The `-Ob` flag reduces build time significantly by skipping some optimizations. Use it for development, not for production images.

## Using Alpine Linux for Smaller Images

For even smaller images, compile a statically linked binary and use Alpine:

```dockerfile
# Stage 2 with Alpine instead of distroless
FROM alpine:3.19

# Add required runtime libraries
RUN apk add --no-cache libstdc++

WORKDIR /app

COPY --from=builder /build/target/app /app/app

# Create non-root user
RUN addgroup -S appuser && adduser -S appuser -G appuser
USER appuser

EXPOSE 8080
ENTRYPOINT ["/app/app"]
```

## Docker Compose for the Full Stack

Run the native image container alongside its dependencies:

```yaml
# docker-compose.yml - Native image application with dependencies
version: "3.9"

services:
  app:
    image: myapp-native:1.0
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/myapp
      - SPRING_DATASOURCE_USERNAME=myapp
      - SPRING_DATASOURCE_PASSWORD=secretpass
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 128M   # Native images need far less memory than JVM
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 5s  # Much shorter than JVM containers

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: myapp
      POSTGRES_PASSWORD: secretpass
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Notice the memory limit is 128MB, which would be far too low for a JVM-based container but is generous for a native image.

## When to Use Native Image vs JVM

Native image is best for:
- Microservices that need fast startup
- Serverless functions
- CLI tools
- Applications where memory efficiency matters
- Services that scale up and down frequently

JVM is still better for:
- Long-running applications where peak throughput matters more than startup
- Applications with heavy use of dynamic features (runtime code generation, extensive reflection)
- When build time is a concern (native compilation is slow)

GraalVM native image combined with Docker gives you the smallest, fastest Java containers possible. The trade-off in build complexity and time is worth it for applications where startup speed and resource efficiency are priorities.
