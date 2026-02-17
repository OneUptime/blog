# How to Use Jib with Gradle to Push Java Container Images Directly to Artifact Registry Without Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Jib, Gradle, Java, Artifact Registry, Container, Docker

Description: Learn how to use the Jib Gradle plugin to build and push optimized Java container images directly to Google Artifact Registry without needing Docker.

---

Gradle is the build tool of choice for many Java and Kotlin projects, and Jib integrates into it seamlessly. If you are tired of writing Dockerfiles for your Java applications or waiting for Docker to build and push images, Jib with Gradle is the answer. It builds optimized, layered container images directly from your Gradle build and pushes them to Artifact Registry without ever touching a Docker daemon.

This is particularly useful in CI/CD environments where Docker might not be available, or on developer machines where Docker Desktop licensing is a concern.

## Adding Jib to Your Gradle Build

The setup is minimal. Add the Jib plugin to your `build.gradle` file.

```groovy
// build.gradle - Apply the Jib plugin
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.2.0'
    id 'io.spring.dependency-management' version '1.1.4'
    // Add Jib plugin
    id 'com.google.cloud.tools.jib' version '3.4.0'
}

group = 'com.example'
version = '1.0.0'

java {
    sourceCompatibility = '17'
}

repositories {
    mavenCentral()
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}
```

## Configuring Jib for Artifact Registry

Add the Jib configuration block to your `build.gradle`.

```groovy
// build.gradle - Jib configuration for Artifact Registry
jib {
    from {
        // Use Eclipse Temurin JRE as base image
        image = 'eclipse-temurin:17-jre-alpine'
    }
    to {
        // Push to Artifact Registry
        image = 'us-central1-docker.pkg.dev/my-project/my-repo/my-java-app'
        tags = [version, 'latest']
        // Use credential helper for authentication
        credHelper = 'gcloud'
    }
    container {
        // Container runtime configuration
        ports = ['8080']
        jvmFlags = [
            '-Xms256m',
            '-Xmx512m',
            '-XX:+UseG1GC',
            '-Djava.security.egd=file:/dev/./urandom'
        ]
        // Set the main class explicitly
        mainClass = 'com.example.demo.DemoApplication'
        // Use current timestamp for image creation time
        creationTime = 'USE_CURRENT_TIMESTAMP'
        // Set the format to OCI
        format = 'OCI'
    }
}
```

## Setting Up Artifact Registry Authentication

Before you can push images, configure the gcloud credential helper.

```bash
# Configure Docker credential helper for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Verify the repository exists (or create it)
gcloud artifacts repositories create my-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="Java application images"
```

## Building and Pushing

With everything configured, building and pushing is a single Gradle command.

```bash
# Build and push the image to Artifact Registry
./gradlew jib
```

That is it. Gradle compiles your Java code, Jib creates the layered container image, and pushes it directly to Artifact Registry. No Docker running, no Dockerfile, no intermediate build artifacts.

If you want to see what Jib is doing without actually pushing, use the dry run.

```bash
# Build the image to local Docker daemon (requires Docker running)
./gradlew jibDockerBuild

# Or build to a tar file (no Docker needed)
./gradlew jibBuildTar
```

## A Sample Application

Here is a complete Spring Boot application to work with.

```java
// src/main/java/com/example/demo/DemoApplication.java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

```java
// src/main/java/com/example/demo/controller/ApiController.java
package com.example.demo.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ApiController {

    // Returns basic application info
    @GetMapping("/info")
    public Map<String, Object> info() {
        return Map.of(
            "service", "my-java-app",
            "timestamp", Instant.now().toString(),
            "javaVersion", System.getProperty("java.version")
        );
    }

    // Health check endpoint
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
```

## Kotlin DSL Configuration

If you use Kotlin DSL for your Gradle build, here is the equivalent configuration.

```kotlin
// build.gradle.kts - Jib configuration using Kotlin DSL
import com.google.cloud.tools.jib.gradle.JibExtension

plugins {
    java
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
    id("com.google.cloud.tools.jib") version "3.4.0"
}

configure<JibExtension> {
    from {
        image = "eclipse-temurin:17-jre-alpine"
    }
    to {
        image = "us-central1-docker.pkg.dev/my-project/my-repo/my-java-app"
        tags = setOf(project.version.toString(), "latest")
        credHelper = "gcloud"
    }
    container {
        ports = listOf("8080")
        jvmFlags = listOf(
            "-Xms256m",
            "-Xmx512m",
            "-XX:+UseG1GC"
        )
        mainClass = "com.example.demo.DemoApplication"
        creationTime.set("USE_CURRENT_TIMESTAMP")
    }
}
```

## Understanding Jib's Layer Strategy

Jib does not just dump everything into one layer. It creates multiple layers optimized for Docker's caching mechanism.

```text
Layer 1: Base image (eclipse-temurin:17-jre-alpine)
Layer 2: Dependencies (Spring Boot, third-party JARs)
Layer 3: Snapshot dependencies (changes more often)
Layer 4: Project resources (application.properties, etc.)
Layer 5: Application classes (your compiled code)
```

When you change a line of Java code and rebuild, only Layer 5 needs to be rebuilt and pushed. That is typically a few hundred kilobytes instead of the 50-100MB fat JAR.

## Customizing Layers

You can customize how Jib organizes files into layers.

```groovy
// build.gradle - Custom layer configuration
jib {
    from {
        image = 'eclipse-temurin:17-jre-alpine'
    }
    to {
        image = 'us-central1-docker.pkg.dev/my-project/my-repo/my-java-app'
    }
    // Add extra files to the image
    extraDirectories {
        paths {
            path {
                // Include configuration files in a separate layer
                setFrom('src/main/resources/config')
                into = '/app/config'
            }
            path {
                // Include scripts
                setFrom('scripts')
                into = '/app/scripts'
            }
        }
        permissions = [
            // Make scripts executable
            '/app/scripts/*': '755'
        ]
    }
}
```

## Multi-Module Gradle Projects

For projects with multiple modules, you can configure Jib per module.

```groovy
// settings.gradle
rootProject.name = 'my-microservices'
include 'api-service', 'worker-service', 'gateway-service'
```

```groovy
// api-service/build.gradle
plugins {
    id 'com.google.cloud.tools.jib'
}

jib {
    to {
        image = "us-central1-docker.pkg.dev/my-project/my-repo/api-service"
        tags = [version, 'latest']
    }
}
```

```groovy
// worker-service/build.gradle
plugins {
    id 'com.google.cloud.tools.jib'
}

jib {
    to {
        image = "us-central1-docker.pkg.dev/my-project/my-repo/worker-service"
        tags = [version, 'latest']
    }
}
```

Build and push all services at once.

```bash
# Build and push all modules
./gradlew jib
```

## Cloud Build Integration

Here is how to use Jib with Gradle in Cloud Build.

```yaml
# cloudbuild.yaml - Build with Gradle and Jib
steps:
  - name: 'gradle:8.5-jdk17'
    entrypoint: 'gradle'
    args:
      - 'jib'
      - '-Djib.to.image=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-java-app:$SHORT_SHA'
      - '-Djib.to.credHelper=gcloud'
    # Cloud Build provides gcloud credentials automatically
```

No Docker builder step needed. Gradle handles the compilation and Jib handles the containerization and push.

## Wrapping Up

Jib with Gradle eliminates the Docker dependency from your Java build pipeline. You get optimized, layered images pushed directly to Artifact Registry with a single `./gradlew jib` command. The layer strategy means incremental builds only push the layers that changed, which speeds up your CI/CD pipeline significantly. Whether you are working on a single service or a multi-module monorepo, Jib integrates cleanly into the Gradle build lifecycle.
