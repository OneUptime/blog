# How to Speed Up Docker Build for Java/Maven Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, java, maven, build optimization, layer caching, multi-stage builds, gradle

Description: Reduce Java and Maven Docker build times with dependency caching and multi-stage build strategies

---

Java Docker builds are notoriously slow. A medium-sized Spring Boot project easily takes 5-10 minutes to build inside Docker, with Maven downloading half the internet on every clean build. The problem gets worse in CI/CD pipelines where each build starts fresh. But with proper layer caching, BuildKit cache mounts, and smart Dockerfile structuring, you can bring those builds down to under 2 minutes. Let's walk through the techniques that deliver the biggest gains.

## The Slow Way

Here is the Dockerfile most Java developers start with:

```dockerfile
# BAD: Downloads ALL Maven dependencies on every code change
FROM maven:3.9-eclipse-temurin-21
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests
CMD ["java", "-jar", "target/myapp.jar"]
```

Every source file change invalidates the `COPY . .` layer and triggers a full Maven build, which starts by downloading every dependency. For a Spring Boot project, that means 200+ JARs totaling hundreds of megabytes.

## Technique 1: Separate Dependency Resolution from Compilation

Copy the POM file first, resolve dependencies, then copy source code:

```dockerfile
# GOOD: Maven dependencies cached unless pom.xml changes
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app

# Copy only the POM file first
COPY pom.xml .

# Download all dependencies - cached unless pom.xml changes
RUN mvn dependency:go-offline -B

# Now copy source code
COPY src ./src

# Build the application - only recompiles Java sources
RUN mvn package -DskipTests -o

CMD ["java", "-jar", "target/myapp.jar"]
```

The `mvn dependency:go-offline` command downloads every dependency specified in the POM. The `-B` flag runs Maven in batch mode (no interactive prompts). The subsequent `mvn package -o` runs in offline mode, using only the already-downloaded dependencies.

## Technique 2: BuildKit Cache Mounts for Maven Repository

Cache mounts persist Maven's local repository between builds, even when the Docker layer cache is invalidated:

```dockerfile
# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app

COPY pom.xml .
COPY src ./src

# Mount Maven's local repo as a cache - persists across builds
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn clean package -DskipTests -B

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
```

```bash
# BuildKit must be enabled for cache mounts
DOCKER_BUILDKIT=1 docker build -t myapp .
```

Even when you change `pom.xml`, Maven only downloads new or updated dependencies. Previously downloaded artifacts remain in the cache mount. This eliminates the "download the world" problem.

## Technique 3: Multi-Module Maven Projects

For multi-module Maven projects, copy all POM files before downloading dependencies:

```dockerfile
# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app

# Copy parent POM
COPY pom.xml .

# Copy all module POMs preserving directory structure
COPY module-api/pom.xml module-api/pom.xml
COPY module-core/pom.xml module-core/pom.xml
COPY module-web/pom.xml module-web/pom.xml

# Resolve all dependencies for all modules at once
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn dependency:go-offline -B

# Copy all source code
COPY . .

# Build everything
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn package -DskipTests -B

FROM eclipse-temurin:21-jre
COPY --from=builder /app/module-web/target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
```

## Technique 4: Use JRE Instead of JDK for Runtime

The JDK image contains compilers, debugging tools, and development utilities that your production application does not need:

```bash
# Compare JDK vs JRE image sizes
docker images --format "{{.Repository}}:{{.Tag}}\t{{.Size}}" | grep temurin
# eclipse-temurin:21         ~450MB (JDK)
# eclipse-temurin:21-jre     ~270MB (JRE)
# eclipse-temurin:21-jre-alpine  ~140MB (JRE on Alpine)
```

```dockerfile
# Multi-stage: build with JDK, run with JRE
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn clean package -DskipTests -B

# Runtime: JRE is enough to run the application
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

# Use non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
```

## Technique 5: Use jlink for Custom JRE

For the smallest possible image, create a custom JRE that includes only the modules your application uses:

```dockerfile
# Stage 1: Build the application
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn clean package -DskipTests -B

# Stage 2: Analyze dependencies and create minimal JRE
FROM eclipse-temurin:21 AS jre-builder
COPY --from=builder /app/target/*.jar /app.jar

# List required Java modules
RUN jdeps --ignore-missing-deps \
    --print-module-deps \
    --multi-release 21 \
    /app.jar > /modules.txt

# Build a custom JRE with only the necessary modules
RUN jlink \
    --add-modules $(cat /modules.txt) \
    --strip-debug \
    --no-man-pages \
    --no-header-files \
    --compress=zip-6 \
    --output /custom-jre

# Stage 3: Minimal runtime image
FROM debian:bookworm-slim
COPY --from=jre-builder /custom-jre /opt/java
COPY --from=builder /app/target/*.jar /app/app.jar

ENV PATH="/opt/java/bin:$PATH"
EXPOSE 8080
CMD ["java", "-jar", "/app/app.jar"]
```

This can produce a final image under 100MB, compared to 270MB+ with the standard JRE image.

## Technique 6: Spring Boot Layered JARs

Spring Boot 2.3+ supports layered JARs that split dependencies from application code. This dramatically improves layer caching:

```dockerfile
# Stage 1: Build the Spring Boot JAR
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn clean package -DskipTests -B

# Stage 2: Extract layers from the Spring Boot JAR
FROM eclipse-temurin:21-jre-alpine AS extractor
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
# Extract the layered JAR into separate directories
RUN java -Djarmode=layertools -jar app.jar extract

# Stage 3: Build the final image with separate layers
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy layers in order of change frequency (least to most)
COPY --from=extractor /app/dependencies/ ./
COPY --from=extractor /app/spring-boot-loader/ ./
COPY --from=extractor /app/snapshot-dependencies/ ./
COPY --from=extractor /app/application/ ./

EXPOSE 8080
CMD ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

The layers are ordered by how frequently they change. Dependencies change rarely and get cached effectively. Application code changes on every build but is a small layer (usually under 5MB). This means incremental builds only copy the thin application layer.

## Technique 7: Gradle Builds

For Gradle projects, the same principles apply but with different commands:

```dockerfile
# syntax=docker/dockerfile:1
FROM gradle:8.5-jdk21 AS builder
WORKDIR /app

# Copy Gradle wrapper and build files first
COPY build.gradle.kts settings.gradle.kts gradle.properties ./
COPY gradle ./gradle

# Download dependencies only
RUN --mount=type=cache,target=/home/gradle/.gradle \
    gradle dependencies --no-daemon

# Copy source code and build
COPY src ./src
RUN --mount=type=cache,target=/home/gradle/.gradle \
    gradle bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
```

The `--no-daemon` flag is important. The Gradle daemon makes sense for interactive development but wastes memory inside Docker builds since the daemon exits after the build anyway.

## Technique 8: Use a .dockerignore File

```
# .dockerignore - exclude build artifacts and IDE files
.git
.gitignore
target
build
.gradle
.idea
.vscode
*.iml
*.md
docker-compose*.yml
Dockerfile*
.dockerignore
```

Excluding `target/` and `build/` directories prevents sending hundreds of megabytes of compiled artifacts to the Docker daemon as build context.

## Build Time Comparison

| Approach | Clean Build | Incremental Build |
|---|---|---|
| Naive Dockerfile | 8-10 min | 8-10 min |
| Separated dependencies | 8-10 min | 1-2 min |
| BuildKit cache mounts | 3-4 min | 30-60 sec |
| Spring Boot layers + cache | 3-4 min | 10-20 sec |

The combination of BuildKit cache mounts and Spring Boot layered JARs gives you the best of both worlds: cached Maven downloads for clean builds and thin application layers for incremental builds. Start with cache mounts since they require the least Dockerfile change, then add layered JARs if you use Spring Boot.
