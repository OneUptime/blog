# How to Use Jib to Build Optimized Docker Images for Spring Boot Applications Without a Docker Daemon

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Jib, Spring Boot, Docker, Java, Container, Artifact Registry

Description: Learn how to use Google Jib to build optimized Docker images for Spring Boot apps without needing Docker installed, pushing directly to Artifact Registry.

---

Building Docker images for Java applications has traditionally been a two-step dance. You write a Dockerfile, install Docker on your machine or CI server, and hope the build does not eat up all your disk space with intermediate layers. For Spring Boot applications, the default approach of copying a fat JAR into an image produces layers that are not cache-friendly at all. Change one line of code and the entire JAR layer gets rebuilt.

Jib takes a completely different approach. It is a Java container image builder from Google that builds optimized Docker images directly from your Maven or Gradle project. No Dockerfile needed. No Docker daemon running. It understands Java application structure and creates layered images that separate your dependencies from your application code.

## Why Jib Over Traditional Docker Builds

When you build a Spring Boot application into a Docker image the traditional way, you typically end up with something like this:

```dockerfile
# Traditional approach - one big layer for the entire fat JAR
FROM eclipse-temurin:17-jre
COPY target/my-app.jar /app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

The problem is that `my-app.jar` contains everything - your code, all your dependencies, Spring Boot itself. When you change a single line of code, Docker has to rebuild and re-push the entire layer, which can be 100MB or more.

Jib splits your application into multiple layers:

1. Base image layers (JRE)
2. Dependency JARs (changes rarely)
3. Snapshot dependencies (changes sometimes)
4. Application resources (changes occasionally)
5. Application classes (changes frequently)

This means that on most builds, only the application classes layer gets rebuilt and pushed. That is typically just a few hundred kilobytes instead of 100MB.

## Setting Up Jib with Maven

Add the Jib Maven plugin to your `pom.xml`.

```xml
<!-- pom.xml - Add Jib plugin to the build section -->
<build>
  <plugins>
    <plugin>
      <groupId>com.google.cloud.tools</groupId>
      <artifactId>jib-maven-plugin</artifactId>
      <version>3.4.0</version>
      <configuration>
        <!-- Target Artifact Registry in GCP -->
        <to>
          <image>us-central1-docker.pkg.dev/my-project/my-repo/my-spring-app</image>
          <tags>
            <tag>latest</tag>
            <tag>${project.version}</tag>
          </tags>
        </to>
        <from>
          <!-- Use Eclipse Temurin as the base image -->
          <image>eclipse-temurin:17-jre-alpine</image>
        </from>
        <container>
          <!-- Configure the container settings -->
          <ports>
            <port>8080</port>
          </ports>
          <jvmFlags>
            <jvmFlag>-Xms256m</jvmFlag>
            <jvmFlag>-Xmx512m</jvmFlag>
          </jvmFlags>
          <creationTime>USE_CURRENT_TIMESTAMP</creationTime>
        </container>
      </configuration>
    </plugin>
  </plugins>
</build>
```

## Building and Pushing to Artifact Registry

Before building, make sure your Artifact Registry repository exists and you are authenticated.

```bash
# Create an Artifact Registry Docker repository
gcloud artifacts repositories create my-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker images for my Spring Boot apps"

# Configure Docker credential helper for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev
```

Now build and push with a single command.

```bash
# Build the image and push directly to Artifact Registry - no Docker needed
mvn compile jib:build
```

That is it. No Docker daemon, no Dockerfile, no `docker build`, no `docker push`. Jib reads your project structure, creates the layered image, and pushes it directly to Artifact Registry.

## A Complete Spring Boot Example

Let me walk through a full example. Here is a simple Spring Boot application.

```java
// src/main/java/com/example/demo/DemoApplication.java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }

    // Simple health endpoint
    @GetMapping("/health")
    public String health() {
        return "OK";
    }

    // API endpoint
    @GetMapping("/api/greeting")
    public String greeting() {
        return "Hello from Jib-built container!";
    }
}
```

With the Jib plugin configured as shown above, running `mvn compile jib:build` produces an image that is typically 30-50% smaller than a traditional Docker build of the same application.

## Building to a Local Docker Daemon

Sometimes you want to test the image locally before pushing to a registry. Jib supports that too (though it does need Docker running for this particular mode).

```bash
# Build to local Docker daemon for testing
mvn compile jib:dockerBuild
```

If you do not have Docker at all and want to build to a tarball, use the following.

```bash
# Build to a tar file - no Docker or registry needed
mvn compile jib:buildTar

# The tar file can be loaded into Docker later
docker load --input target/jib-image.tar
```

## Customizing the Image Layers

You can control how Jib organizes layers for your specific application.

```xml
<!-- pom.xml - Custom layer configuration -->
<plugin>
  <groupId>com.google.cloud.tools</groupId>
  <artifactId>jib-maven-plugin</artifactId>
  <version>3.4.0</version>
  <configuration>
    <to>
      <image>us-central1-docker.pkg.dev/my-project/my-repo/my-spring-app</image>
    </to>
    <!-- Add extra files to the image -->
    <extraDirectories>
      <paths>
        <path>
          <!-- Include config files in a separate layer -->
          <from>src/main/resources/config</from>
          <into>/app/config</into>
        </path>
      </paths>
    </extraDirectories>
    <container>
      <ports>
        <port>8080</port>
      </ports>
      <!-- Set environment variables -->
      <environment>
        <SPRING_PROFILES_ACTIVE>production</SPRING_PROFILES_ACTIVE>
      </environment>
      <!-- Use the Spring Boot application as the entrypoint -->
      <mainClass>com.example.demo.DemoApplication</mainClass>
    </container>
  </configuration>
</plugin>
```

## Using Jib with Spring Boot 3 Native Images

If you are using Spring Boot 3 with GraalVM native images, Jib still works. You just need to adjust the base image and configuration.

```xml
<!-- pom.xml - Jib config for native Spring Boot 3 -->
<configuration>
  <from>
    <!-- Use a minimal base for native images -->
    <image>gcr.io/distroless/base-debian12</image>
  </from>
  <to>
    <image>us-central1-docker.pkg.dev/my-project/my-repo/my-native-app</image>
  </to>
  <container>
    <!-- Native images do not use a JVM -->
    <entrypoint>
      <entry>/app/my-native-app</entry>
    </entrypoint>
  </container>
  <pluginExtensions>
    <pluginExtension>
      <implementation>com.google.cloud.tools.jib.maven.extension.nativeimage.JibNativeImageExtension</implementation>
    </pluginExtension>
  </pluginExtensions>
</configuration>
```

## Integrating with Cloud Build

You can run Jib inside Cloud Build for automated CI/CD.

```yaml
# cloudbuild.yaml - Build Spring Boot image with Jib in Cloud Build
steps:
  - name: 'maven:3.9-eclipse-temurin-17'
    entrypoint: 'mvn'
    args:
      - 'compile'
      - 'jib:build'
      - '-Djib.to.image=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-spring-app:$SHORT_SHA'
    # Cloud Build automatically provides credentials
```

Notice that you do not need a Docker build step in Cloud Build. Jib handles everything within the Maven build, which simplifies your pipeline.

## Comparing Image Sizes

Here is a rough comparison based on a typical Spring Boot application with several dependencies:

- Traditional fat JAR approach: ~280MB
- Jib with Temurin JRE base: ~190MB
- Jib with Alpine JRE base: ~140MB
- Jib with distroless base: ~170MB

The size savings come from both the layering strategy and the fact that Jib does not include build tools in the final image.

## Performance Tips

A few things I have learned from running Jib in production:

**Use a JRE base, not a JDK.** Your application does not need the compiler at runtime. Switch from `eclipse-temurin:17` to `eclipse-temurin:17-jre` or its Alpine variant.

**Set `creationTime` to `USE_CURRENT_TIMESTAMP`.** Without this, Jib sets the creation time to epoch zero for reproducibility. This confuses some tools that sort images by creation date.

**Pin your base image digest.** In production, use the full digest instead of a tag to ensure reproducible builds.

```xml
<from>
  <image>eclipse-temurin:17-jre-alpine@sha256:abc123...</image>
</from>
```

**Configure authentication once.** Use `gcloud auth configure-docker` or set up credential helpers so Jib can push to Artifact Registry without manual token management.

## Wrapping Up

Jib removes the friction from containerizing Spring Boot applications. You do not need Docker installed, you do not need to write Dockerfiles, and the resulting images are better optimized than what most hand-written Dockerfiles produce. When you combine it with Artifact Registry and Cloud Build, you get a Java container pipeline that is both fast and reliable.
