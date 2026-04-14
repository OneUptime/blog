# How to Use Dapr Java SDK with Gradle

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Java, Gradle, Build Tool, Dependency Management

Description: Learn how to set up and configure the Dapr Java SDK in a Gradle project with Kotlin DSL, dependency management, and task configuration.

---

## Introduction

Gradle is a popular alternative to Maven for Java build automation. This guide shows how to add the Dapr Java SDK to a Gradle project using the Kotlin DSL, including version catalog setup, Spring Boot integration, and useful build tasks.

## Setting Up the Build Script

In `build.gradle.kts`:

```kotlin
plugins {
    id("org.springframework.boot") version "3.3.0"
    id("io.spring.dependency-management") version "1.1.5"
    kotlin("jvm") version "2.0.0"
    kotlin("plugin.spring") version "2.0.0"
}

group = "com.example"
version = "1.0.0"

java {
    sourceCompatibility = JavaVersion.VERSION_21
}

repositories {
    mavenCentral()
}
```

## Adding Dapr Dependencies

Add the Dapr SDK dependencies with explicit versions:

```kotlin
dependencies {
    // Core Dapr client
    implementation("io.dapr:dapr-sdk:1.13.0")

    // Spring Boot integration
    implementation("io.dapr:dapr-sdk-springboot:1.13.0")

    // Workflow support
    implementation("io.dapr:dapr-sdk-workflows:0.13.0")

    // Spring Boot starter
    implementation("io.dapr.spring:dapr-spring-boot-starter:0.13.0")

    // Spring Boot web
    implementation("org.springframework.boot:spring-boot-starter-web")

    // Testing
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.mockito:mockito-core:5.11.0")
}
```

## Using a Version Catalog

Define versions centrally in `gradle/libs.versions.toml`:

```toml
[versions]
dapr = "1.13.0"
dapr-workflows = "0.13.0"
dapr-spring = "0.13.0"
spring-boot = "3.3.0"

[libraries]
dapr-sdk = { group = "io.dapr", name = "dapr-sdk", version.ref = "dapr" }
dapr-sdk-springboot = { group = "io.dapr", name = "dapr-sdk-springboot", version.ref = "dapr" }
dapr-sdk-workflows = { group = "io.dapr", name = "dapr-sdk-workflows", version.ref = "dapr-workflows" }
dapr-spring-starter = { group = "io.dapr.spring", name = "dapr-spring-boot-starter", version.ref = "dapr-spring" }
```

Reference in `build.gradle.kts`:

```kotlin
dependencies {
    implementation(libs.dapr.sdk)
    implementation(libs.dapr.sdk.springboot)
    implementation(libs.dapr.sdk.workflows)
    implementation(libs.dapr.spring.starter)
}
```

## Custom Gradle Task to Run with Dapr

Define a task that launches the app with the Dapr CLI:

```kotlin
tasks.register<Exec>("daprRun") {
    dependsOn("bootJar")
    commandLine(
        "dapr", "run",
        "--app-id", "my-service",
        "--app-port", "8080",
        "--",
        "java", "-jar", "build/libs/my-service-1.0.0.jar"
    )
}
```

Run it with:

```bash
./gradlew daprRun
```

## Building and Testing

```bash
# Build the project
./gradlew clean build

# Run tests
./gradlew test

# Build without tests
./gradlew build -x test

# Build executable JAR
./gradlew bootJar
```

## Summary

Configuring the Dapr Java SDK in a Gradle project with Kotlin DSL is clean and type-safe. Using a Gradle version catalog keeps versions consistent across all SDK modules, and a custom `daprRun` task makes it easy to launch your application with the Dapr sidecar during local development.
