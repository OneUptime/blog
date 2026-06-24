# How to Set Up a Java/Spring Boot Development Environment with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Java, Spring Boot, Development Environment, Docker, Maven, Gradle

Description: Learn how to set up a Java Spring Boot development environment with hot-reload using Spring DevTools in a Docker container managed by Portainer.

---

Running your Java Spring Boot development environment in Docker helps keep JDK versions consistent and reduces environment-specific issues. With Spring DevTools restarts after recompilation and remote JVM debugging, you can keep a productive development workflow inside the container.

## Dev Environment Compose Stack

```yaml
services:
  spring-dev:
    image: eclipse-temurin:21-jdk-alpine
    restart: unless-stopped
    ports:
      - "8080:8080"    # Application
      - "5005:5005"    # Remote JVM debugger
    environment:
      SPRING_PROFILES_ACTIVE: dev
    volumes:
      # Use an absolute host path when deploying this stack in Portainer
      - /path/to/myapp:/app
      # Cache Maven dependencies
      - maven_cache:/root/.m2
    working_dir: /app
    # Install Maven in the container and run the app
    command: sh -c "apk add --no-cache maven && mvn spring-boot:run -Dspring-boot.run.jvmArguments='-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005'"

volumes:
  maven_cache:
```

## Spring Boot application.properties for Dev

```properties
# src/main/resources/application-dev.properties

# Show SQL queries in development

spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

# DevTools restart configuration
# Source changes must be recompiled to trigger a restart
spring.devtools.restart.enabled=true
spring.devtools.livereload.enabled=true

# Use H2 in-memory DB for development
spring.datasource.url=jdbc:h2:mem:devdb
spring.h2.console.enabled=true
```

## pom.xml Dependencies for Dev

```xml
<!-- Add Spring DevTools for automatic restart during development -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

## Remote Debugging with VS Code/IntelliJ

**VS Code:**
```json
{
  "type": "java",
  "request": "attach",
  "name": "Attach to Container",
  "hostName": "localhost",
  "port": 5005
}
```

**IntelliJ IDEA:**
1. Run > Edit Configurations > Add > Remote JVM Debug.
2. Set host to `localhost`, port to `5005`.

## Gradle Alternative

```yaml
command: sh -c "apk add --no-cache gradle && gradle bootRun --args='--spring.profiles.active=dev'"
```
