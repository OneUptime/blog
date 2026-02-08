# How to Containerize a Groovy Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Groovy, Containerization, DevOps, JVM, Gradle, Micronaut

Description: How to containerize Groovy applications with Docker, covering Gradle builds, Micronaut framework, GraalVM native images, and JVM optimization.

---

Groovy runs on the JVM and offers a more dynamic, expressive syntax than Java. It powers Gradle, Grails, and Jenkins pipelines, and it is a solid choice for web services and scripting. Docker containerization brings consistency to Groovy deployments and solves the common "which JVM version?" problem. This guide covers containerizing Groovy applications from Gradle-based projects to Micronaut microservices.

## Prerequisites

Docker needs to be installed. Familiarity with Groovy and Gradle is helpful. We will build a complete Micronaut application, which is one of the most popular modern frameworks for Groovy.

## Creating a Sample Groovy Application

Let's build a Micronaut web API in Groovy.

Create the `build.gradle` file:

```groovy
// build.gradle - Gradle build configuration for Micronaut Groovy app
plugins {
    id 'groovy'
    id 'io.micronaut.application' version '4.2.1'
    id 'com.github.johnrengelman.shadow' version '8.1.1'
}

version = '0.1'
group = 'com.example'

repositories {
    mavenCentral()
}

dependencies {
    // Micronaut framework
    implementation 'io.micronaut:micronaut-http-server-netty'
    implementation 'io.micronaut.groovy:micronaut-runtime-groovy'
    implementation 'io.micronaut.serde:micronaut-serde-jackson'

    // Groovy
    implementation 'org.apache.groovy:groovy'

    // Logging
    runtimeOnly 'ch.qos.logback:logback-classic'

    // Testing
    testImplementation 'io.micronaut.test:micronaut-test-spock'
}

application {
    mainClass.set('com.example.Application')
}

micronaut {
    runtime 'netty'
    testRuntime 'spock'
}

// Configure the shadow jar (fat jar)
shadowJar {
    archiveBaseName.set('app')
    archiveClassifier.set('')
    archiveVersion.set('')
}
```

Create the main application class:

```groovy
// src/main/groovy/com/example/Application.groovy
package com.example

import io.micronaut.runtime.Micronaut

class Application {
    static void main(String[] args) {
        Micronaut.run(Application, args)
    }
}
```

Create a controller:

```groovy
// src/main/groovy/com/example/ApiController.groovy
package com.example

import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Produces
import io.micronaut.http.MediaType

@Controller('/')
class ApiController {

    @Get('/')
    @Produces(MediaType.TEXT_PLAIN)
    String index() {
        'Hello from Groovy in Docker!'
    }

    @Get('/health')
    Map<String, Object> health() {
        [
            status: 'ok',
            language: 'Groovy',
            groovyVersion: GroovySystem.version,
            javaVersion: System.getProperty('java.version'),
            framework: 'Micronaut'
        ]
    }

    @Get('/compute/{n}')
    Map<String, Object> compute(int n) {
        // Compute prime count up to n
        def primes = (2..n).findAll { num ->
            (2..Math.sqrt(num).intValue()).every { num % it != 0 }
        }
        [
            limit: n,
            primeCount: primes.size(),
            largestPrime: primes ? primes.last() : null
        ]
    }
}
```

Create `application.yml`:

```yaml
# src/main/resources/application.yml - Micronaut configuration
micronaut:
  application:
    name: groovyDockerDemo
  server:
    port: ${PORT:8080}
    host: 0.0.0.0
```

## Basic Dockerfile

```dockerfile
# Basic Groovy/Gradle Dockerfile
FROM gradle:8.5-jdk21 AS builder

WORKDIR /app

# Copy build files first for dependency caching
COPY build.gradle settings.gradle ./
COPY gradle/ gradle/
RUN gradle dependencies --no-daemon

# Copy source and build the shadow jar
COPY src/ src/
RUN gradle shadowJar --no-daemon

# Runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=builder /app/build/libs/app.jar /app/app.jar

RUN adduser -D -H appuser
USER appuser

EXPOSE 8080

CMD ["java", "-jar", "/app/app.jar"]
```

## Optimized Production Build

```dockerfile
# Stage 1: Build the fat jar with Gradle
FROM gradle:8.5-jdk21 AS builder

WORKDIR /app

# Copy only dependency-related files first
COPY build.gradle settings.gradle ./
COPY gradle/ gradle/

# Download dependencies (cached layer)
RUN gradle dependencies --no-daemon --quiet

# Copy source code and build
COPY src/ src/
RUN gradle shadowJar --no-daemon --quiet

# Stage 2: Minimal JRE runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy the fat jar
COPY --from=builder /app/build/libs/app.jar /app/app.jar

# Create non-root user
RUN adduser -D -H appuser
USER appuser

EXPOSE 8080

# JVM container-aware flags
CMD ["java", \
     "-XX:+UseContainerSupport", \
     "-XX:MaxRAMPercentage=75.0", \
     "-XX:+UseG1GC", \
     "-XX:MaxGCPauseMillis=100", \
     "-Dmicronaut.environments=production", \
     "-jar", "/app/app.jar"]
```

## GraalVM Native Image

Micronaut supports GraalVM native image compilation, which eliminates JVM startup overhead:

```dockerfile
# Stage 1: Build native image
FROM ghcr.io/graalvm/native-image:ol9-java21 AS builder

WORKDIR /app

# Install Gradle
RUN curl -L https://services.gradle.org/distributions/gradle-8.5-bin.zip -o gradle.zip && \
    unzip -q gradle.zip && \
    ln -s /app/gradle-8.5/bin/gradle /usr/local/bin/gradle && \
    rm gradle.zip

COPY build.gradle settings.gradle ./
COPY gradle/ gradle/
RUN gradle dependencies --no-daemon

COPY src/ src/

# Build the native image through Micronaut's Gradle plugin
RUN gradle nativeCompile --no-daemon

# Stage 2: Distroless runtime
FROM gcr.io/distroless/base-debian12

COPY --from=builder /app/build/native/nativeCompile/app /app

EXPOSE 8080
CMD ["/app"]
```

The native image starts in milliseconds instead of seconds and uses significantly less memory.

## The .dockerignore File

```text
# .dockerignore
.git/
.gradle/
build/
out/
*.iml
.idea/
README.md
Dockerfile
docker-compose.yml
```

## Gradle Caching Strategy

Gradle builds can be slow. Use BuildKit cache mounts for the Gradle cache:

```dockerfile
# Optimized Gradle caching
FROM gradle:8.5-jdk21 AS builder

WORKDIR /app

COPY build.gradle settings.gradle ./
COPY gradle/ gradle/

# Cache the Gradle wrapper and dependency downloads
RUN --mount=type=cache,target=/home/gradle/.gradle/caches \
    --mount=type=cache,target=/home/gradle/.gradle/wrapper \
    gradle dependencies --no-daemon

COPY src/ src/

RUN --mount=type=cache,target=/home/gradle/.gradle/caches \
    --mount=type=cache,target=/home/gradle/.gradle/wrapper \
    gradle shadowJar --no-daemon

FROM eclipse-temurin:21-jre-alpine
COPY --from=builder /app/build/libs/app.jar /app/app.jar
EXPOSE 8080
CMD ["java", "-jar", "/app/app.jar"]
```

## Docker Compose for Development

```yaml
# docker-compose.yml - development environment
version: "3.8"
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    volumes:
      - ./src:/app/src
    environment:
      - PORT=8080
      - MICRONAUT_ENVIRONMENTS=development

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: groovy
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: groovyapp
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Development Dockerfile with continuous compilation:

```dockerfile
# Dockerfile.dev - development image with Gradle continuous build
FROM gradle:8.5-jdk21

WORKDIR /app

COPY build.gradle settings.gradle ./
COPY gradle/ gradle/
RUN gradle dependencies --no-daemon

COPY . .

EXPOSE 8080

# Use Gradle's continuous build mode for auto-restart
CMD ["gradle", "run", "--continuous", "--no-daemon"]
```

## Groovy Script Execution in Docker

For simpler Groovy scripts that don't need a full build, you can run them directly:

```dockerfile
# Dockerfile for standalone Groovy scripts
FROM groovy:4.0-jdk21-alpine

WORKDIR /app
COPY script.groovy /app/

CMD ["groovy", "script.groovy"]
```

This is useful for utility scripts, ETL jobs, and automation tasks.

## Health Checks

```dockerfile
# Health check using wget (available in Alpine)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
```

The `--start-period=15s` accounts for JVM startup time. With GraalVM native images, you can reduce this to 3 seconds.

## JVM Tuning for Containers

```bash
# Production run with tuned JVM settings
docker run -d \
  --name groovy-app \
  -p 8080:8080 \
  -m 512m \
  -e JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC" \
  groovy-app:latest
```

Key JVM flags for containers:
- `-XX:+UseContainerSupport` - respects container memory limits (default in modern JVMs)
- `-XX:MaxRAMPercentage=75.0` - use at most 75% of available RAM for heap
- `-XX:+UseG1GC` - G1 garbage collector, good balance of throughput and latency

## Monitoring

Groovy applications on the JVM expose metrics through standard JMX. For external monitoring, configure [OneUptime](https://oneuptime.com) to watch your `/health` endpoint and track JVM metrics like heap usage and GC activity. Micronaut's built-in health endpoints provide detailed information about application state.

## Summary

Containerizing Groovy applications follows standard JVM patterns: build a fat jar with Gradle, copy it to a JRE runtime image, and configure JVM flags for container awareness. Micronaut provides excellent Docker support with fast startup and low memory overhead compared to traditional frameworks. For maximum performance, GraalVM native images eliminate JVM startup entirely, producing containers that start in milliseconds. Whether you are running full web services or simple Groovy scripts, Docker gives you a consistent deployment target.
