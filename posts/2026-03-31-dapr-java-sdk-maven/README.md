# How to Use Dapr Java SDK with Maven

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Java, Maven, Build Tool, Dependency Management

Description: Learn how to set up and configure the Dapr Java SDK in a Maven project with the right dependencies, BOM, and plugin configuration.

---

## Introduction

Maven is the most widely used build tool for Java projects. This guide walks through adding the Dapr Java SDK to a Maven project, managing dependency versions, and configuring plugins for a clean build.

## Adding Core Dependencies

Add the Dapr SDK dependencies with explicit version numbers:

```xml
<dependencies>
  <!-- Core Dapr client -->
  <dependency>
    <groupId>io.dapr</groupId>
    <artifactId>dapr-sdk</artifactId>
    <version>1.13.0</version>
  </dependency>

  <!-- Spring Boot integration -->
  <dependency>
    <groupId>io.dapr</groupId>
    <artifactId>dapr-sdk-springboot</artifactId>
    <version>1.13.0</version>
  </dependency>

  <!-- Workflow support -->
  <dependency>
    <groupId>io.dapr</groupId>
    <artifactId>dapr-sdk-workflows</artifactId>
    <version>0.13.0</version>
  </dependency>

  <!-- Spring Boot starter (includes auto-configuration) -->
  <dependency>
    <groupId>io.dapr.spring</groupId>
    <artifactId>dapr-spring-boot-starter</artifactId>
    <version>0.13.0</version>
  </dependency>
</dependencies>
```

## Adding Required Spring Boot Dependencies

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-web</artifactId>
  <version>3.3.0</version>
</dependency>
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-actuator</artifactId>
  <version>3.3.0</version>
</dependency>
```

## Configuring the Maven Wrapper Plugin

Ensure consistent Maven versions across environments:

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-wrapper-plugin</artifactId>
  <version>3.3.2</version>
</plugin>
```

## Configuring the Spring Boot Maven Plugin

Package the application as an executable JAR:

```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-maven-plugin</artifactId>
      <version>3.3.0</version>
      <executions>
        <execution>
          <goals>
            <goal>repackage</goal>
          </goals>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

## Building and Running

```bash
# Build the project
mvn clean package -DskipTests

# Run with Dapr sidecar
dapr run \
  --app-id my-service \
  --app-port 8080 \
  -- java -jar target/my-service-1.0.0.jar
```

## Running Tests

```bash
# Run unit tests only
mvn test

# Run integration tests (requires Dapr sidecar)
mvn verify
```

## Summary

Setting up the Dapr Java SDK in Maven is straightforward when you manage dependency versions consistently across Dapr modules. Pair it with the Spring Boot Maven plugin for packaging and the Dapr CLI for local development runs to get a smooth, repeatable build and deployment workflow.
