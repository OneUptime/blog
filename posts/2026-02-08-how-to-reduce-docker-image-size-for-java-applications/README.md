# How to Reduce Docker Image Size for Java Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, java, image optimization, jlink, multi-stage builds, spring boot, jre

Description: Shrink Java Docker images from 600MB+ to under 80MB with jlink, multi-stage builds, and layering

---

Java Docker images are notoriously large. A basic Spring Boot application on the default JDK image can exceed 600MB. That size slows deployments, increases registry costs, and expands your attack surface. The good news is that modern Java provides excellent tools for creating minimal container images. Between multi-stage builds, JRE-only runtimes, custom JREs with jlink, and Spring Boot layering, you can get a production Java image well under 100MB. Here is how to do it step by step.

## The Oversized Default

Most Java developers start with something like this:

```dockerfile
# BAD: Full JDK, build tools, and source code in the production image
FROM maven:3.9-eclipse-temurin-21
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests
CMD ["java", "-jar", "target/myapp.jar"]
```

```bash
docker build -t myapp:bloated .
docker images myapp:bloated --format "{{.Size}}"
# 680MB
```

This image contains Maven, the entire JDK (including the Java compiler, debugging tools, and development utilities), your source code, test files, and the Maven repository cache. None of this is needed at runtime.

## Step 1: Multi-Stage Build with JRE

The simplest and most impactful change is using a multi-stage build that separates the Maven build from the runtime:

```dockerfile
# Stage 1: Build with full JDK and Maven
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# Stage 2: Run with JRE only (no JDK, no Maven, no source)
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
```

```bash
docker build -t myapp:jre .
docker images myapp:jre --format "{{.Size}}"
# 300MB
```

This cuts the image size roughly in half by eliminating the JDK and Maven.

## Step 2: Use Alpine-Based JRE

Alpine Linux uses musl libc and is much smaller than Debian:

```dockerfile
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# Alpine JRE: much smaller than Debian-based JRE
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
```

```bash
docker images myapp:alpine-jre --format "{{.Size}}"
# 190MB
```

## Step 3: Custom JRE with jlink

The JRE includes every standard Java module, but most applications use only a subset. `jlink` creates a custom runtime that includes only the modules your application needs:

```dockerfile
# Stage 1: Build the application
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# Stage 2: Analyze which Java modules are required
FROM eclipse-temurin:21 AS jre-builder
COPY --from=builder /app/target/*.jar /app.jar

# Determine required modules
RUN jdeps \
    --ignore-missing-deps \
    --print-module-deps \
    --multi-release 21 \
    /app.jar > /modules.txt && \
    echo "Modules needed: $(cat /modules.txt)"

# Build a stripped-down custom JRE
RUN jlink \
    --add-modules $(cat /modules.txt) \
    --strip-debug \
    --no-man-pages \
    --no-header-files \
    --compress=zip-6 \
    --output /custom-jre

# Stage 3: Minimal runtime with custom JRE
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=jre-builder /custom-jre /opt/java
COPY --from=builder /app/target/*.jar /app/app.jar

ENV JAVA_HOME=/opt/java
ENV PATH="${JAVA_HOME}/bin:${PATH}"

RUN useradd --create-home appuser
USER appuser

EXPOSE 8080
CMD ["java", "-jar", "/app/app.jar"]
```

```bash
docker images myapp:jlink --format "{{.Size}}"
# 110MB
```

The jlink custom JRE is typically 40-60MB compared to 180MB for the full JRE. Your application JAR is usually 20-50MB. That gives you a total image under 120MB.

## Step 4: jlink with Alpine

Combine jlink's custom JRE with Alpine's small base for the smallest possible image:

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn package -DskipTests -B

FROM eclipse-temurin:21-alpine AS jre-builder
COPY --from=builder /app/target/*.jar /app.jar

RUN jdeps --ignore-missing-deps --print-module-deps --multi-release 21 \
    /app.jar > /modules.txt

RUN jlink \
    --add-modules $(cat /modules.txt) \
    --strip-debug \
    --no-man-pages \
    --no-header-files \
    --compress=zip-6 \
    --output /custom-jre

# Alpine base with custom JRE
FROM alpine:3.19
RUN apk add --no-cache ca-certificates

COPY --from=jre-builder /custom-jre /opt/java
COPY --from=builder /app/target/*.jar /app/app.jar

ENV JAVA_HOME=/opt/java
ENV PATH="${JAVA_HOME}/bin:${PATH}"

RUN adduser -D appuser
USER appuser

EXPOSE 8080
CMD ["java", "-jar", "/app/app.jar"]
```

```bash
docker images myapp:jlink-alpine --format "{{.Size}}"
# 75MB
```

## Step 5: Spring Boot Layered JARs

Spring Boot applications can be split into layers that Docker caches independently:

```dockerfile
# Stage 1: Build
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# Stage 2: Extract layers from the JAR
FROM eclipse-temurin:21-jre-alpine AS extractor
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

# Stage 3: Build final image with layers ordered by change frequency
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Dependencies layer - changes rarely, ~40-60MB
COPY --from=extractor /app/dependencies/ ./

# Spring Boot loader - almost never changes, ~0.5MB
COPY --from=extractor /app/spring-boot-loader/ ./

# Snapshot dependencies - changes occasionally
COPY --from=extractor /app/snapshot-dependencies/ ./

# Application code - changes on every build, ~1-5MB
COPY --from=extractor /app/application/ ./

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8080
CMD ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

This does not reduce the total image size, but it dramatically improves rebuild and push times. When only your application code changes, Docker reuses the cached dependency layer and only transfers the thin application layer.

## Step 6: Use GraalVM Native Image

For the ultimate size reduction, compile your Java application to a native binary:

```dockerfile
# Stage 1: Build native image with GraalVM
FROM ghcr.io/graalvm/graalvm-community:21 AS builder
RUN gu install native-image
WORKDIR /app

COPY pom.xml .
COPY src ./src

# Build with Maven (assumes spring-boot-maven-plugin with native profile)
RUN mvn -Pnative package -DskipTests -B

# Stage 2: Minimal image with just the native binary
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/myapp /app/myapp

RUN useradd --create-home appuser
USER appuser

EXPOSE 8080
CMD ["/app/myapp"]
```

```bash
docker images myapp:native --format "{{.Size}}"
# 90MB (but with ~50ms startup time instead of 5 seconds)
```

GraalVM native images start in milliseconds instead of seconds, use less memory, and produce small binaries. The trade-off is a much longer build time (10-20 minutes) and some Java features (reflection, proxies) require explicit configuration.

## Step 7: Use Distroless

Google's distroless Java image provides a runtime without a shell:

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn package -DskipTests -B

FROM gcr.io/distroless/java21-debian12
COPY --from=builder /app/target/*.jar /app/app.jar
EXPOSE 8080
CMD ["app.jar"]
```

## Size Comparison

Results for a Spring Boot REST API with JPA, PostgreSQL driver, and Jackson:

| Approach | Image Size |
|---|---|
| maven:3.9 + JDK (naive) | 680 MB |
| Multi-stage + JRE | 300 MB |
| Multi-stage + Alpine JRE | 190 MB |
| Distroless Java | 220 MB |
| jlink + Debian slim | 110 MB |
| jlink + Alpine | 75 MB |
| GraalVM native + slim | 90 MB |

## Recommended Approach

For most teams, the sweet spot is **Alpine JRE with multi-stage builds**. It cuts the image by 70% with minimal Dockerfile complexity. Add jlink when you want to push below 100MB, and invest in GraalVM native images when startup time and memory footprint are critical (serverless, scale-to-zero workloads).

Start with step 2 (Alpine JRE multi-stage), measure, and proceed to jlink only if the size reduction justifies the added build complexity. The layered JAR approach from step 5 is always worth adding for Spring Boot applications regardless of which base image strategy you choose.
