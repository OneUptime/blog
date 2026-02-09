# How to Containerize a Kotlin Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Kotlin, JVM, Ktor, Containerization, DevOps, Microservices

Description: Build production-ready Docker images for Kotlin applications using multi-stage builds with Ktor and Spring Boot frameworks.

---

Kotlin runs on the JVM, which means Docker containerization follows many of the same principles as Java. But Kotlin has its own ecosystem of frameworks and tools that deserve specific attention. This guide covers containerizing Kotlin applications built with both Ktor (Kotlin-native framework) and Spring Boot, with optimized Dockerfiles for each.

## Containerizing a Ktor Application

Ktor is JetBrains' lightweight framework built specifically for Kotlin. It is popular for building APIs and microservices.

Here is a basic Ktor application:

```kotlin
// src/main/kotlin/com/example/Application.kt
package com.example

import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun main() {
    embeddedServer(Netty, port = 8080, host = "0.0.0.0") {
        configureRouting()
    }.start(wait = true)
}

fun Application.configureRouting() {
    routing {
        get("/") {
            call.respondText("Hello from Ktor in Docker!")
        }
        get("/health") {
            call.respondText("{\"status\": \"UP\"}")
        }
    }
}
```

The Gradle build file for the Ktor project:

```kotlin
// build.gradle.kts
plugins {
    kotlin("jvm") version "1.9.21"
    id("io.ktor.plugin") version "2.3.7"
}

application {
    mainClass.set("com.example.ApplicationKt")
}

dependencies {
    implementation("io.ktor:ktor-server-core-jvm")
    implementation("io.ktor:ktor-server-netty-jvm")
    implementation("ch.qos.logback:logback-classic:1.4.11")
}

ktor {
    fatJar {
        archiveFileName.set("app.jar")
    }
}
```

## Optimized Dockerfile for Ktor

Use a multi-stage build that builds with the JDK and runs with only the JRE:

```dockerfile
# Dockerfile - Multi-stage build for Ktor application

# === Build Stage ===
FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /build

# Copy Gradle wrapper and build files first for layer caching
COPY gradlew build.gradle.kts settings.gradle.kts gradle.properties ./
COPY gradle ./gradle

# Download dependencies (this layer is cached unless build files change)
RUN ./gradlew dependencies --no-daemon

# Copy source code
COPY src ./src

# Build the fat JAR
RUN ./gradlew buildFatJar --no-daemon

# === Runtime Stage ===
FROM eclipse-temurin:21-jre-jammy

# Security: run as non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

WORKDIR /app

# Copy the built JAR from the build stage
COPY --from=builder /build/build/libs/app.jar ./app.jar

# Switch to non-root user
USER appuser

EXPOSE 8080

# Health check against the health endpoint
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=20s \
  CMD curl -f http://localhost:8080/health || exit 1

# Container-aware JVM settings
ENV JAVA_OPTS="-XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:+UseG1GC \
  -XX:+ExitOnOutOfMemoryError"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

Build and run:

```bash
# Build the Ktor Docker image
docker build -t ktor-app:1.0 .

# Run it with resource limits
docker run -d \
  --name ktor-app \
  -p 8080:8080 \
  --memory="256m" \
  --cpus="1.0" \
  ktor-app:1.0

# Test the application
curl http://localhost:8080/
curl http://localhost:8080/health
```

## Containerizing Kotlin with Spring Boot

Kotlin works seamlessly with Spring Boot. The Dockerfile differs slightly because Spring Boot uses layered JARs.

Here is a Spring Boot application in Kotlin:

```kotlin
// src/main/kotlin/com/example/app/Application.kt
package com.example.app

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@SpringBootApplication
class Application

fun main(args: Array<String>) {
    runApplication<Application>(*args)
}

@RestController
class HealthController {
    @GetMapping("/health")
    fun health() = mapOf("status" to "UP")

    @GetMapping("/")
    fun home() = "Hello from Kotlin Spring Boot in Docker!"
}
```

The Dockerfile for Spring Boot with Kotlin:

```dockerfile
# Dockerfile.spring - Kotlin Spring Boot with layered JARs

# === Build Stage ===
FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /build

COPY gradlew build.gradle.kts settings.gradle.kts ./
COPY gradle ./gradle

RUN ./gradlew dependencies --no-daemon

COPY src ./src

# Build the Spring Boot JAR
RUN ./gradlew bootJar --no-daemon -x test

# Extract layered JAR for optimal Docker caching
RUN java -Djarmode=layertools -jar build/libs/*.jar extract --destination /extracted

# === Runtime Stage ===
FROM eclipse-temurin:21-jre-jammy

RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

WORKDIR /app

# Copy layers in order of change frequency (least to most)
COPY --from=builder /extracted/dependencies/ ./
COPY --from=builder /extracted/spring-boot-loader/ ./
COPY --from=builder /extracted/snapshot-dependencies/ ./
COPY --from=builder /extracted/application/ ./

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENV JAVA_OPTS="-XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:+UseG1GC \
  -XX:+ExitOnOutOfMemoryError"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]
```

## Kotlin Native with Docker

Kotlin/Native compiles directly to machine code, similar to GraalVM native images. This produces tiny, fast-starting containers.

A simple Kotlin/Native application:

```kotlin
// src/nativeMain/kotlin/Main.kt
import kotlinx.cinterop.*
import platform.posix.*

fun main() {
    println("Starting Kotlin Native server...")
    // Simplified example - in practice, use a Kotlin/Native HTTP library
    println("Server running on port 8080")
}
```

Dockerfile for Kotlin/Native:

```dockerfile
# Dockerfile.native - Kotlin Native compilation
FROM ubuntu:22.04 AS builder

# Install Kotlin/Native dependencies
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    libncurses5 \
    && rm -rf /var/lib/apt/lists/*

# Install Kotlin/Native compiler
WORKDIR /build
COPY gradlew build.gradle.kts settings.gradle.kts ./
COPY gradle ./gradle
COPY src ./src

RUN ./gradlew linkReleaseExecutableNative --no-daemon

# Minimal runtime image
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -r -d /app appuser

WORKDIR /app
COPY --from=builder /build/build/bin/native/releaseExecutable/app.kexe ./app

USER appuser
EXPOSE 8080

ENTRYPOINT ["./app"]
```

## Docker Compose for Development

A development setup with hot reload for Kotlin:

```yaml
# docker-compose.dev.yml - Kotlin development environment
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
      - "5005:5005"  # Debug port
    environment:
      - JAVA_OPTS=-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: kotlinapp
      POSTGRES_USER: kotlin
      POSTGRES_PASSWORD: devpass
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "kotlin"]
      interval: 5s
      retries: 5

volumes:
  pgdata:
```

## Production Docker Compose

A production-ready configuration:

```yaml
# docker-compose.prod.yml - Kotlin application in production
version: "3.9"

services:
  app:
    image: kotlin-app:${VERSION:-latest}
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - JAVA_OPTS=-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC
      - DATABASE_URL=jdbc:postgresql://db:5432/kotlinapp
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 30s
    logging:
      driver: "json-file"
      options:
        max-size: "25m"
        max-file: "5"
```

## Optimizing Build Cache

Kotlin builds can be slow. Maximize Docker layer caching by separating dependency resolution from compilation:

```dockerfile
# Optimal layer ordering for Kotlin builds
FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /build

# Layer 1: Gradle wrapper (almost never changes)
COPY gradlew ./
COPY gradle ./gradle

# Layer 2: Build configuration (changes occasionally)
COPY build.gradle.kts settings.gradle.kts ./

# Layer 3: Download all dependencies (cached unless build files change)
RUN ./gradlew dependencies --no-daemon

# Layer 4: Source code (changes frequently)
COPY src ./src

# Layer 5: Build
RUN ./gradlew buildFatJar --no-daemon
```

When you change source code, only layers 4 and 5 rebuild. The dependency download in layer 3 stays cached.

## Security Best Practices

Follow these practices for production Kotlin containers:

```bash
# Scan for vulnerabilities
docker scout cves kotlin-app:1.0

# Check the image for security issues
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image kotlin-app:1.0
```

Verify your image runs as non-root:

```bash
# Confirm the container runs as a non-root user
docker run --rm kotlin-app:1.0 whoami
# Should output: appuser
```

Kotlin and Docker work well together. Whether you choose Ktor for its Kotlin-native design or Spring Boot for its ecosystem, the containerization patterns are the same: multi-stage builds, proper JVM flags, non-root users, and health checks. Pick the framework that fits your team and apply these Dockerfile patterns for production-ready containers.
