# How to Containerize a Java Spring Boot Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Java, Spring Boot, Containerization, JVM, DevOps, Production

Description: Build optimized Docker images for Java Spring Boot applications with multi-stage builds, proper JVM tuning, and production-ready configuration.

---

Spring Boot is the most popular Java framework for building web applications and microservices. Containerizing it with Docker brings consistency across environments and simplifies deployment. But a naive Dockerfile for a Spring Boot app produces a bloated, slow-starting image. This guide shows you how to build lean, fast, production-ready Docker images for Spring Boot applications.

## A Simple Spring Boot Application

For this guide, we will work with a standard Spring Boot web application. Here is a minimal application entry point:

```java
// src/main/java/com/example/app/Application.java
package com.example.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

    @GetMapping("/health")
    public String health() {
        return "ok";
    }

    @GetMapping("/")
    public String home() {
        return "Hello from Spring Boot in Docker!";
    }
}
```

## The Naive Dockerfile (Do Not Use This)

Many tutorials show this approach, but it has significant problems:

```dockerfile
# BAD EXAMPLE - Do not use this in production
FROM openjdk:17
COPY target/app.jar /app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

Problems with this approach:
- Uses the full JDK image (over 400MB) instead of just the JRE
- No multi-stage build, so build tools end up in the final image
- No JVM tuning for containers
- Runs as root
- No health check
- Every code change rebuilds the entire layer

## The Optimized Multi-Stage Dockerfile

Build the application in one stage and copy only the runtime artifacts to a slim final image:

```dockerfile
# Dockerfile - Optimized multi-stage build for Spring Boot

# === Build Stage ===
FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /build

# Copy dependency files first for better layer caching
# These change less frequently than source code
COPY pom.xml mvnw ./
COPY .mvn .mvn

# Download dependencies (cached unless pom.xml changes)
RUN ./mvnw dependency:resolve -B

# Copy the source code
COPY src ./src

# Build the application, skip tests (tests should run in CI, not in Docker build)
RUN ./mvnw package -DskipTests -B

# Extract the layered JAR for better Docker layer caching
RUN java -Djarmode=layertools -jar target/*.jar extract --destination /extracted

# === Runtime Stage ===
FROM eclipse-temurin:21-jre-jammy

# Create a non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

WORKDIR /app

# Copy the extracted layers in order of change frequency
# Dependencies change least often, application code changes most often
COPY --from=builder /extracted/dependencies/ ./
COPY --from=builder /extracted/spring-boot-loader/ ./
COPY --from=builder /extracted/snapshot-dependencies/ ./
COPY --from=builder /extracted/application/ ./

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 8080

# Health check that tests the application's health endpoint
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# JVM flags optimized for containers
# -XX:+UseContainerSupport enables container-aware memory settings
# -XX:MaxRAMPercentage sets heap as a percentage of container memory limit
# -XX:+UseG1GC uses the G1 garbage collector for balanced throughput and latency
ENV JAVA_OPTS="-XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:+UseG1GC \
  -XX:+ExitOnOutOfMemoryError \
  -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]
```

## Understanding Spring Boot Layered JARs

Spring Boot 3.x supports layered JAR extraction. Instead of copying a single fat JAR, you extract it into layers ordered by change frequency:

1. **dependencies** - Third-party libraries (changes rarely)
2. **spring-boot-loader** - Spring Boot loader classes (changes almost never)
3. **snapshot-dependencies** - Snapshot versions (changes occasionally)
4. **application** - Your code (changes frequently)

Docker caches each layer independently. When you change your application code, only the last layer rebuilds. The dependency layers stay cached, making rebuilds fast.

## Building and Running

Build the Docker image:

```bash
# Build the optimized Docker image
docker build -t myapp:1.0 .
```

Check the image size:

```bash
# Compare image sizes
docker images myapp
```

The optimized image should be around 250-300MB, compared to 600MB+ with the naive approach.

Run the container:

```bash
# Run the container with proper resource limits
docker run -d \
  --name myapp \
  -p 8080:8080 \
  --memory="512m" \
  --cpus="1.0" \
  myapp:1.0
```

Test the application:

```bash
# Verify the application is responding
curl http://localhost:8080/
curl http://localhost:8080/actuator/health
```

## JVM Tuning for Containers

The JVM needs to know it is running inside a container. Without proper flags, it will try to use the host's full memory, not the container's limit.

Key JVM flags for containers:

```bash
# Essential container-aware JVM settings
JAVA_OPTS="
  -XX:+UseContainerSupport          # Enable container detection (default in JDK 11+)
  -XX:MaxRAMPercentage=75.0         # Use 75% of container memory for heap
  -XX:InitialRAMPercentage=50.0     # Start with 50% heap allocation
  -XX:+UseG1GC                      # G1 collector for balanced performance
  -XX:+ExitOnOutOfMemoryError       # Exit cleanly on OOM so Docker can restart
  -XX:+HeapDumpOnOutOfMemoryError   # Create heap dump for debugging
  -XX:HeapDumpPath=/tmp/heapdump    # Heap dump location
  -Xss512k                          # Thread stack size
"
```

The `MaxRAMPercentage=75.0` setting is important. If you set it to 100%, the JVM heap takes all container memory, leaving nothing for native memory, threads, and I/O buffers, causing the container to get OOM-killed.

## Docker Compose for Development

Create a Compose file for local development with hot reload:

```yaml
# docker-compose.dev.yml - Development setup with live reload
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
      - "5005:5005"  # Remote debug port
    environment:
      - SPRING_PROFILES_ACTIVE=dev
      - JAVA_OPTS=-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005
    volumes:
      # Mount source code for development (Spring Boot DevTools handles restart)
      - ./src:/app/src:ro
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: myapp
      POSTGRES_PASSWORD: devpassword
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "myapp"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

## Docker Compose for Production

Create a production-ready Compose file:

```yaml
# docker-compose.prod.yml - Production deployment
version: "3.9"

services:
  app:
    image: myapp:${VERSION:-latest}
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=production
      - JAVA_OPTS=-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 1G
        reservations:
          cpus: "0.5"
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 45s
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"
```

## Using Gradle Instead of Maven

If your project uses Gradle, adjust the build stage:

```dockerfile
# Build stage for Gradle projects
FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /build

# Copy Gradle wrapper and config files
COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle

# Download dependencies
RUN ./gradlew dependencies --no-daemon

# Copy source and build
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# Extract layers
RUN java -Djarmode=layertools -jar build/libs/*.jar extract --destination /extracted

# Runtime stage is the same as the Maven version
FROM eclipse-temurin:21-jre-jammy
# ... (same as above)
```

## Optimizing Startup Time

Spring Boot applications can be slow to start. Several techniques speed this up in containers:

```dockerfile
# Add these JVM flags to reduce startup time
ENV JAVA_OPTS="-XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:+UseG1GC \
  -XX:+ExitOnOutOfMemoryError \
  -XX:TieredStopAtLevel=1 \
  -Dspring.jmx.enabled=false \
  -noverify"
```

The `-XX:TieredStopAtLevel=1` flag reduces JIT compilation overhead at startup, at the cost of slightly lower peak throughput. Remove it for long-running production services where peak performance matters more than startup time.

## Security Scanning

Scan your Docker image for vulnerabilities before deploying:

```bash
# Scan the image for known vulnerabilities
docker scout cves myapp:1.0

# Alternative: use Trivy
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image myapp:1.0
```

A properly containerized Spring Boot application starts fast, uses resources efficiently, and is easy to deploy. The multi-stage build keeps the image lean, layered JARs make rebuilds fast, and container-aware JVM settings prevent memory issues. Start with this template and adjust the JVM flags based on your application's specific needs.
