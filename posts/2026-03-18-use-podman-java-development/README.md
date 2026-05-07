# How to Use Podman for Java Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Java, Container, Spring Boot, Maven, Development

Description: A practical guide to using Podman for Java development, covering JDK setup, Maven and Gradle builds, Spring Boot workflows, and debugging.

---

> Podman lets you containerize your Java development environment so every team member runs the same JDK version, the same build tools, and the same system libraries, regardless of what is installed on their machine.

Java projects are notorious for environment-specific issues. One developer runs JDK 17, another runs JDK 21. Maven versions differ. System library versions diverge. The project builds on one machine but fails on another. Containers solve this by packaging the entire environment alongside the code. Podman handles this without requiring a background daemon or root access, making it a natural fit for development machines.

This guide covers setting up Java development inside Podman containers, from basic compilation to full Spring Boot application development with databases.

---

## Choosing a Java Base Image

Several organizations publish Java container images. The most common choices:

```bash
# Eclipse Temurin (formerly AdoptOpenJDK) - community-driven, widely used

podman pull docker.io/library/eclipse-temurin:21-jdk

# Amazon Corretto - Amazon's OpenJDK distribution
podman pull docker.io/library/amazoncorretto:21

# IBM Semeru Runtimes - OpenJDK with the OpenJ9 JVM
podman pull docker.io/library/ibm-semeru-runtimes:open-21-jdk
```

Eclipse Temurin is the most popular choice for container-based Java development. Use the `-jdk` tag for development (includes the compiler) and `-jre` for production (runtime only). The Docker Official `openjdk` image is deprecated and only publishes early-access builds, so use a vendor-maintained distribution for current GA releases.

## Compiling and Running a Simple Java Application

```bash
# Compile and run a single Java file
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  docker.io/library/eclipse-temurin:21-jdk \
  bash -c "javac Main.java && java Main"
```

For a quick interactive Java environment:

```bash
# Start a JShell session (Java REPL)
podman run -it --rm \
  docker.io/library/eclipse-temurin:21-jdk \
  jshell
```

## Setting Up a Maven Project

Most Java projects use Maven or Gradle for build management. Here is a `Containerfile` for a Maven-based project:

```dockerfile
FROM docker.io/library/eclipse-temurin:21-jdk

# Install Maven
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the pom.xml first and download dependencies (for layer caching)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

EXPOSE 8080

# Run the application with Maven
CMD ["mvn", "spring-boot:run"]
```

Build and run:

```bash
# Build the development image
podman build -t java-dev .

# Run with source code mounted
podman run -it --rm \
  -v $(pwd)/src:/app/src:Z \
  -v $(pwd)/pom.xml:/app/pom.xml:Z \
  -p 8080:8080 \
  java-dev
```

### Caching Maven Dependencies

Maven downloads dependencies every time you rebuild unless you cache the local repository. Use a named volume:

```bash
# Create a volume for the Maven cache
podman volume create maven-cache

# Run with the cache mounted
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v maven-cache:/root/.m2 \
  -w /app \
  -p 8080:8080 \
  docker.io/library/maven:3.9-eclipse-temurin-21 \
  mvn spring-boot:run
```

The `maven-cache` volume persists between container runs, so dependencies are only downloaded once.

## Setting Up a Gradle Project

For Gradle-based projects, the workflow is similar:

```dockerfile
FROM docker.io/library/eclipse-temurin:21-jdk

# Install Gradle
RUN apt-get update && apt-get install -y wget unzip \
    && wget -q https://services.gradle.org/distributions/gradle-8.5-bin.zip \
    && unzip -d /opt gradle-8.5-bin.zip \
    && rm gradle-8.5-bin.zip \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/opt/gradle-8.5/bin:${PATH}"

WORKDIR /app

# Copy Gradle wrapper and config files first for caching
COPY build.gradle settings.gradle ./
COPY gradle ./gradle
RUN gradle dependencies --no-daemon || true

COPY src ./src

EXPOSE 8080

CMD ["gradle", "bootRun", "--no-daemon"]
```

If your project uses the Gradle Wrapper (which most do), you can skip installing Gradle and use `./gradlew` instead:

```bash
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v gradle-cache:/root/.gradle \
  -w /app \
  -p 8080:8080 \
  docker.io/library/eclipse-temurin:21-jdk \
  ./gradlew bootRun
```

## Developing a Spring Boot Application

Spring Boot is the most common Java web framework. Here is a complete development setup.

Create a `docker-compose.yml` for Spring Boot with PostgreSQL:

```yaml
services:
  app:
    build: .
    ports:
      - "8080:8080"
      - "5005:5005"
    volumes:
      - ./src:/app/src:Z
      - maven-cache:/root/.m2
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/myapp
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: postgres
      JAVA_TOOL_OPTIONS: "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
    depends_on:
      - db

  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  maven-cache:
  pgdata:
```

Notice the `JAVA_TOOL_OPTIONS` environment variable. It enables remote debugging on port 5005, which you can connect to from your IDE.

Start the stack:

```bash
# Start the application and database
podman-compose up -d

# Watch application logs
podman-compose logs -f app

# Run a specific Maven command
podman-compose exec app mvn test
```

## Debugging Java in a Container

### Remote Debugging with IntelliJ IDEA

The `JAVA_TOOL_OPTIONS` variable in the compose file above enables JDWP debugging. In IntelliJ:

1. Go to Run > Edit Configurations
2. Add a new Remote JVM Debug configuration
3. Set Host to `localhost` and Port to `5005`
4. Click Debug

Your breakpoints will work as if the code were running locally.

### Remote Debugging with VS Code

Add this to your `.vscode/launch.json`:

```json
{
  "type": "java",
  "name": "Attach to Container",
  "request": "attach",
  "hostName": "localhost",
  "port": 5005
}
```

## Running Tests

```bash
# Run all tests with Maven
podman run --rm \
  -v $(pwd):/app:Z \
  -v maven-cache:/root/.m2 \
  -w /app \
  docker.io/library/maven:3.9-eclipse-temurin-21 \
  mvn test

# Run a specific test class
podman run --rm \
  -v $(pwd):/app:Z \
  -v maven-cache:/root/.m2 \
  -w /app \
  docker.io/library/maven:3.9-eclipse-temurin-21 \
  mvn test -Dtest=UserServiceTest

# Run tests with Gradle
podman run --rm \
  -v $(pwd):/app:Z \
  -v gradle-cache:/root/.gradle \
  -w /app \
  docker.io/library/eclipse-temurin:21-jdk \
  ./gradlew test
```

## Testing Against Multiple JDK Versions

```bash
# Test with JDK 17
podman run --rm -v $(pwd):/app:Z -v maven-cache:/root/.m2 -w /app \
  docker.io/library/maven:3.9-eclipse-temurin-17 \
  mvn test

# Test with JDK 21
podman run --rm -v $(pwd):/app:Z -v maven-cache:/root/.m2 -w /app \
  docker.io/library/maven:3.9-eclipse-temurin-21 \
  mvn test
```

## Building a Production Image with Multi-Stage Build

Java production images should use the JRE (not the JDK) and be as small as possible:

```dockerfile
# Stage 1: Build the application
FROM docker.io/library/maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# Stage 2: Create the runtime image
FROM docker.io/library/eclipse-temurin:21-jre
WORKDIR /app

# Create a non-root user
RUN useradd -m -s /bin/bash appuser
USER appuser

# Copy the built JAR from the builder stage
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

# Configure JVM for containers (respects container memory limits)
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

Build the production image:

```bash
podman build -t my-java-app:prod -f Containerfile.prod .

# Test it locally
podman run --rm -p 8080:8080 my-java-app:prod
```

Modern JDKs already enable container awareness by default. The `-XX:MaxRAMPercentage=75.0` flag limits heap usage to 75% of the container's allocated memory, leaving room for non-heap memory and the OS.

## Conclusion

Podman provides a clean environment for Java development without the overhead of a Docker daemon. The main patterns to remember are: cache your Maven or Gradle dependencies in a named volume so builds stay fast, mount only the `src` directory for live reloading rather than the entire project, and enable JDWP debugging via `JAVA_TOOL_OPTIONS` for seamless IDE integration. For production, multi-stage builds with a JRE-only final image keep your deployments lean and secure.
