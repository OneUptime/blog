# How to Create a Multi-Stage Docker Build for a Java Quarkus Native Application Targeting Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Quarkus, Docker, Cloud Run, Java, GraalVM, Native Image

Description: Learn how to create a multi-stage Docker build for a Quarkus native application and deploy it to Google Cloud Run for fast startup times.

---

Java has a reputation for slow startup times and high memory usage. That reputation was earned back in the days of application servers and heavyweight frameworks. Quarkus changes the game by compiling Java applications into native executables using GraalVM. A Quarkus native application can start in under 50 milliseconds and use a fraction of the memory that a traditional JVM application needs.

This makes Quarkus native images a perfect fit for Cloud Run, where you are billed per request and cold starts matter. The faster your application starts, the better the user experience and the lower your costs.

The challenge is that building native images requires GraalVM and a lot of memory. A multi-stage Docker build lets you use a heavy build image with all the tools and produce a tiny runtime image that Cloud Run actually serves.

## Creating a Quarkus Application

If you do not already have a Quarkus project, create one with the CLI.

```bash
# Create a new Quarkus project with REST support
quarkus create app com.example:my-quarkus-app \
  --extension='resteasy-reactive,resteasy-reactive-jackson'

cd my-quarkus-app
```

Here is a simple REST endpoint.

```java
// src/main/java/com/example/GreetingResource.java
package com.example;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/api")
public class GreetingResource {

    // Returns a simple greeting - this is our test endpoint
    @GET
    @Path("/hello")
    @Produces(MediaType.TEXT_PLAIN)
    public String hello() {
        return "Hello from Quarkus Native on Cloud Run!";
    }

    // Health check endpoint for Cloud Run
    @GET
    @Path("/health")
    @Produces(MediaType.TEXT_PLAIN)
    public String health() {
        return "OK";
    }
}
```

## The Multi-Stage Dockerfile

This is the core of the setup. The Dockerfile has two stages: one for building the native binary and one for the runtime.

```dockerfile
# Stage 1: Build the native executable using GraalVM
FROM quay.io/quarkus/ubi-quarkus-mandrel-builder-image:jdk-21 AS builder

# Copy the project files
COPY --chown=quarkus:quarkus mvnw /code/mvnw
COPY --chown=quarkus:quarkus .mvn /code/.mvn
COPY --chown=quarkus:quarkus pom.xml /code/

# Set the working directory
USER quarkus
WORKDIR /code

# Download dependencies first (cached layer)
RUN ./mvnw -B org.apache.maven.plugins:maven-dependency-plugin:3.6.0:go-offline

# Copy source code
COPY src /code/src

# Build the native executable
# -Dquarkus.native.additional-build-args adds GraalVM build options
RUN ./mvnw package -Dnative \
    -DskipTests \
    -Dquarkus.native.additional-build-args="--initialize-at-build-time"

# Stage 2: Create the minimal runtime image
FROM quay.io/quarkus/quarkus-micro-image:2.0

WORKDIR /work/

# Copy just the native binary from the build stage
COPY --from=builder /code/target/*-runner /work/application

# Make it executable
RUN chmod 775 /work/application

# Expose the port Cloud Run expects
EXPOSE 8080

# Run the native binary
CMD ["./application", "-Dquarkus.http.host=0.0.0.0"]
```

Let me explain the key decisions here.

The build stage uses the Mandrel builder image. Mandrel is Red Hat's distribution of GraalVM, optimized for building Quarkus applications. It includes everything needed for native compilation.

We copy the `pom.xml` and download dependencies before copying the source code. This way, Docker caches the dependency download layer. When you change only source code, the build skips the dependency download entirely.

The runtime stage uses `quarkus-micro-image`, which is a minimal base image designed for Quarkus native binaries. It is only about 10MB and includes just enough to run a statically compiled application.

## Configuring Quarkus for Cloud Run

Add some Cloud Run specific configuration to your `application.properties`.

```properties
# src/main/resources/application.properties

# Cloud Run sets the PORT environment variable
quarkus.http.port=${PORT:8080}

# Enable graceful shutdown for Cloud Run scaling
quarkus.shutdown.timeout=10

# Health check configuration
quarkus.smallrye-health.root-path=/health

# Log in JSON format for Cloud Logging integration
quarkus.log.console.json=true
quarkus.log.console.json.date-format=yyyy-MM-dd'T'HH:mm:ss.SSSZ
```

## Building and Pushing the Image

Build the Docker image and push it to Artifact Registry.

```bash
# Create an Artifact Registry repository if you do not have one
gcloud artifacts repositories create my-repo \
  --repository-format=docker \
  --location=us-central1

# Build the image (this takes a few minutes for the native compilation)
docker build -t us-central1-docker.pkg.dev/my-project/my-repo/quarkus-app:v1 .

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/my-project/my-repo/quarkus-app:v1
```

Alternatively, you can use Cloud Build to avoid running the native build on your laptop (native builds are resource-intensive).

```yaml
# cloudbuild.yaml - Build native image using Cloud Build
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/quarkus-app:$SHORT_SHA'
      - '.'
    # Native builds need more resources
options:
  machineType: 'E2_HIGHCPU_32'
  diskSizeGb: 100
images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/quarkus-app:$SHORT_SHA'
```

## Deploying to Cloud Run

Deploy the built image to Cloud Run.

```bash
# Deploy to Cloud Run with optimized settings for native images
gcloud run deploy quarkus-app \
  --image=us-central1-docker.pkg.dev/my-project/my-repo/quarkus-app:v1 \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --concurrency=250 \
  --port=8080
```

Notice the `--memory=256Mi`. A traditional Spring Boot app might need 512MB or more. Quarkus native images typically run comfortably with 128-256MB.

## Verifying the Deployment

Once deployed, Cloud Run gives you a URL. Test it.

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe quarkus-app \
  --region=us-central1 \
  --format='value(status.url)')

# Test the endpoint
curl $SERVICE_URL/api/hello
# Output: Hello from Quarkus Native on Cloud Run!

# Check the startup time in the logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=quarkus-app" \
  --limit=5 \
  --format='value(textPayload)'
```

You should see startup times in the range of 20-50ms. Compare that to the 2-5 seconds a typical Spring Boot JVM application takes.

## Optimizing the Build Further

There are a few tricks to make the native build faster and the resulting image smaller.

You can enable static linking to produce a fully static binary that does not need any shared libraries.

```properties
# application.properties - Enable static native image
quarkus.native.additional-build-args=--static,--libc=musl
```

With a fully static binary, you can use the scratch base image.

```dockerfile
# Alternative Stage 2 with scratch base (smallest possible image)
FROM scratch
COPY --from=builder /code/target/*-runner /application
EXPOSE 8080
ENTRYPOINT ["/application", "-Dquarkus.http.host=0.0.0.0"]
```

This produces images as small as 20-30MB for a complete web application.

## Handling Native Image Gotchas

GraalVM native compilation has some limitations you should know about:

**Reflection**: GraalVM needs to know at build time which classes use reflection. Quarkus handles most of this automatically, but if you use libraries that rely on reflection, you may need to add configuration.

**Dynamic class loading**: Not supported in native mode. Quarkus extensions handle this for supported libraries.

**Build time**: Native compilation is slow, typically 3-5 minutes for a small application and 10+ minutes for larger ones. Always use Cloud Build with a high-CPU machine type for CI/CD.

## Wrapping Up

A multi-stage Docker build for Quarkus native applications gives you the best of both worlds: a full build environment with GraalVM for compilation and a tiny runtime image for production. On Cloud Run, the near-instant startup time means your application scales from zero without users noticing, and the low memory footprint keeps your costs down. If you are building Java microservices for Cloud Run, this approach is hard to beat.
