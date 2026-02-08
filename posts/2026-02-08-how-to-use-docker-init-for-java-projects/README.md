# How to Use docker init for Java Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Init, Java, Spring Boot, Maven, Gradle, Containerization, DevOps, JVM

Description: A complete guide to using docker init with Java projects, covering Maven, Gradle, Spring Boot, and JVM tuning for containerized deployments.

---

Java applications bring their own set of containerization challenges. The JVM needs tuning for container environments. Build tools like Maven and Gradle download half the internet during dependency resolution. Multi-stage builds are essential to keep the JDK out of the production image. The `docker init` command detects Java projects by looking for pom.xml or build.gradle files and generates a Dockerfile that handles all of this.

## Setting Up a Sample Spring Boot Project

Create a basic Spring Boot application. You can use Spring Initializr or set one up manually:

```bash
# Using Spring Initializr via curl
curl https://start.spring.io/starter.tgz \
  -d dependencies=web,actuator \
  -d javaVersion=21 \
  -d type=maven-project \
  -d name=demo \
  -d artifactId=demo \
  | tar -xzf -
cd demo
```

The generated project includes a basic web application. Add a simple controller:

```java
// src/main/java/com/example/demo/HelloController.java
package com.example.demo;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class HelloController {

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "healthy");
    }

    @GetMapping("/api/greeting")
    public Map<String, String> greeting() {
        return Map.of("message", "Hello from containerized Java!");
    }
}
```

## Running docker init

With the project ready, run docker init:

```bash
docker init
```

Docker init detects the pom.xml and identifies the project as Java:

```
? What application platform does your project use? Java
? What version of Java do you want to use? 21
? What port does your server listen on? 8080
? What is the relative directory for your app? (e.g., ./target for Maven) ./target
```

## Understanding the Generated Dockerfile

The generated Dockerfile uses a multi-stage build that separates compilation from runtime:

```dockerfile
# syntax=docker/dockerfile:1

# Build stage - compile with Maven
FROM eclipse-temurin:21-jdk-jammy as build
WORKDIR /app

# Cache Maven dependencies by copying pom.xml first
COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw dependency:resolve

# Copy source and build
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw package -DskipTests

# Runtime stage - use JRE only (no JDK)
FROM eclipse-temurin:21-jre-jammy as final

# Create non-root user
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser
USER appuser

# Copy the built JAR from the build stage
COPY --from=build /app/target/*.jar /app/app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

The critical design decisions here:

- **eclipse-temurin** is the recommended OpenJDK distribution for containers
- **JDK in build stage, JRE in runtime** keeps the final image smaller by hundreds of megabytes
- **Maven wrapper (mvnw)** ensures consistent Maven versions
- **Cache mount for .m2** prevents re-downloading dependencies on every build

## Gradle Projects

If your project uses Gradle instead of Maven, docker init adapts. The generated Dockerfile changes the build commands:

```dockerfile
# syntax=docker/dockerfile:1

# Build stage - compile with Gradle
FROM eclipse-temurin:21-jdk-jammy as build
WORKDIR /app

# Cache Gradle dependencies
COPY gradle/ gradle/
COPY gradlew build.gradle settings.gradle ./
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew dependencies --no-daemon

# Copy source and build
COPY src ./src
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew bootJar --no-daemon

# Runtime stage
FROM eclipse-temurin:21-jre-jammy as final

ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser
USER appuser

COPY --from=build /app/build/libs/*.jar /app/app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

The `--no-daemon` flag is important for Docker builds. The Gradle daemon persists between builds on your local machine, but inside a container it wastes memory and provides no benefit.

## JVM Tuning for Containers

The default JVM settings are designed for traditional servers, not containers. Modern JVMs (Java 17+) detect container memory limits automatically, but you should still tune some parameters.

Add JVM flags to the entrypoint:

```dockerfile
# Tuned ENTRYPOINT with container-aware JVM settings
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-XX:InitialRAMPercentage=50.0", \
    "-XX:+UseG1GC", \
    "-XX:+UseStringDeduplication", \
    "-jar", "/app/app.jar"]
```

These flags tell the JVM to:

- **UseContainerSupport** - Detect container memory and CPU limits (on by default in Java 17+)
- **MaxRAMPercentage=75.0** - Use up to 75% of container memory for the heap
- **InitialRAMPercentage=50.0** - Start with 50% of container memory
- **UseG1GC** - Use the G1 garbage collector, which works well in containers
- **UseStringDeduplication** - Reduce memory usage by deduplicating String objects

## Using Spring Boot Layered JARs

Spring Boot 2.3+ supports layered JARs that improve Docker layer caching. Instead of copying one fat JAR, you extract layers so that dependencies and application code are in separate Docker layers.

```dockerfile
# syntax=docker/dockerfile:1

FROM eclipse-temurin:21-jdk-jammy as build
WORKDIR /app

COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN --mount=type=cache,target=/root/.m2 ./mvnw dependency:resolve

COPY src ./src
RUN --mount=type=cache,target=/root/.m2 ./mvnw package -DskipTests

# Extract layers from the built JAR
RUN java -Djarmode=layertools -jar target/*.jar extract --destination extracted

# Runtime stage with layered copying
FROM eclipse-temurin:21-jre-jammy as final

ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser
USER appuser

WORKDIR /app

# Copy layers in order of change frequency (least to most)
COPY --from=build /app/extracted/dependencies/ ./
COPY --from=build /app/extracted/spring-boot-loader/ ./
COPY --from=build /app/extracted/snapshot-dependencies/ ./
COPY --from=build /app/extracted/application/ ./

EXPOSE 8080
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

With layered JARs, changing your application code only invalidates the last layer. Dependencies (which change rarely) stay cached.

## compose.yaml with Supporting Services

Extend the generated compose.yaml for a typical Java application stack:

```yaml
# compose.yaml - Java app with PostgreSQL and Redis
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/myapp
      - SPRING_DATASOURCE_USERNAME=app
      - SPRING_DATASOURCE_PASSWORD=secret
      - SPRING_DATA_REDIS_HOST=redis
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    deploy:
      resources:
        limits:
          memory: 512M

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine

volumes:
  pgdata:
```

Setting a memory limit on the app service is important for Java. Without it, the JVM might consume all available host memory.

## Java-Specific .dockerignore

```
# Build output (compiled inside the container)
target
build
.gradle

# IDE files
.idea
*.iml
.vscode
.classpath
.project
.settings

# Version control
.git
.gitignore

# Docker files
Dockerfile
compose.yaml
.dockerignore

# Documentation
*.md
```

## Building and Testing

```bash
# Build the image
docker build -t my-java-app:latest .

# Run the container with memory limits
docker run -p 8080:8080 -m 512m my-java-app:latest

# Use compose for the full stack
docker compose up --build

# Test the endpoints
curl http://localhost:8080/health
curl http://localhost:8080/api/greeting

# Check the actuator for runtime metrics
curl http://localhost:8080/actuator/health
```

Docker init takes the guesswork out of containerizing Java applications. It generates the right base images, handles build tool caching, and separates the build from runtime. From there, tune the JVM for your container's memory limits, consider layered JARs for better caching, and set resource constraints in your compose file. Java in containers performs well when configured correctly, and docker init gives you the right starting point.
