# How to Deploy a Quarkus Java Application to Azure Container Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Quarkus, Azure Container Apps, Java, Docker, Cloud Native, GraalVM, Serverless Containers

Description: Learn how to build a Quarkus Java application with native compilation and deploy it to Azure Container Apps for fast startup and low memory usage.

---

Quarkus is a Java framework designed for cloud-native applications. It starts in milliseconds, uses a fraction of the memory that traditional Java frameworks need, and supports ahead-of-time compilation with GraalVM for native executables. Azure Container Apps provides a serverless container platform with automatic scaling, built-in service discovery, and KEDA-based scaling rules. Together, they give you a Java stack that starts faster and costs less than traditional Spring Boot deployments.

In this post, we will build a Quarkus REST API, containerize it (with both JVM and native options), and deploy it to Azure Container Apps.

## Why Quarkus on Azure Container Apps?

Container Apps charges based on resource consumption. The faster your application starts and the less memory it uses, the less you pay. Quarkus is optimized for exactly this scenario:

- JVM mode: Starts in about 1 second with ~100MB memory
- Native mode: Starts in under 100 milliseconds with ~30MB memory
- Compared to a typical Spring Boot app: 5-10 seconds startup, 300MB+ memory

For serverless workloads that scale to zero, startup time directly impacts user-perceived latency. A native Quarkus app can start and serve a request before a Spring Boot app finishes loading its context.

## Creating the Quarkus Project

Use the Quarkus CLI or Maven plugin to scaffold a new project.

```bash
# Using the Quarkus CLI
quarkus create app com.example:azure-quarkus-demo \
  --extension='resteasy-reactive-jackson,smallrye-health,micrometer'

cd azure-quarkus-demo
```

Or with Maven:

```bash
mvn io.quarkus.platform:quarkus-maven-plugin:3.6.0:create \
  -DprojectGroupId=com.example \
  -DprojectArtifactId=azure-quarkus-demo \
  -Dextensions="resteasy-reactive-jackson,smallrye-health,micrometer"
```

The generated project includes a RESTEasy Reactive endpoint (non-blocking by default), health checks (used by Container Apps for probes), and Micrometer for metrics.

## Building the REST API

Create a simple product management API.

```java
package com.example;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Path("/api/products")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ProductResource {

    // In-memory store for demo purposes
    private static final Map<String, Product> products = new ConcurrentHashMap<>();

    static {
        // Seed some initial data
        addProduct("Laptop", "Electronics", 999.99);
        addProduct("Headphones", "Electronics", 79.99);
        addProduct("Coffee Maker", "Kitchen", 49.99);
    }

    // List all products
    @GET
    public List<Product> listProducts() {
        return List.copyOf(products.values());
    }

    // Get a product by ID
    @GET
    @Path("/{id}")
    public Response getProduct(@PathParam("id") String id) {
        Product product = products.get(id);
        if (product == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(product).build();
    }

    // Create a new product
    @POST
    public Response createProduct(Product product) {
        product.setId(UUID.randomUUID().toString());
        products.put(product.getId(), product);
        return Response.status(Response.Status.CREATED).entity(product).build();
    }

    // Update a product
    @PUT
    @Path("/{id}")
    public Response updateProduct(@PathParam("id") String id, Product product) {
        if (!products.containsKey(id)) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        product.setId(id);
        products.put(id, product);
        return Response.ok(product).build();
    }

    // Delete a product
    @DELETE
    @Path("/{id}")
    public Response deleteProduct(@PathParam("id") String id) {
        products.remove(id);
        return Response.noContent().build();
    }

    private static void addProduct(String name, String category, double price) {
        String id = UUID.randomUUID().toString();
        products.put(id, new Product(id, name, category, price));
    }
}
```

The Product model class:

```java
package com.example;

// Simple product model for the REST API
public class Product {
    private String id;
    private String name;
    private String category;
    private double price;

    public Product() {}

    public Product(String id, String name, String category, double price) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.price = price;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
}
```

## Adding Health Checks

Azure Container Apps uses health probes to determine if your container is healthy. Quarkus provides these through the SmallRye Health extension.

```java
package com.example;

import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Liveness;
import org.eclipse.microprofile.health.Readiness;

import jakarta.enterprise.context.ApplicationScoped;

// Liveness check - is the application alive?
@Liveness
@ApplicationScoped
public class LivenessCheck implements HealthCheck {

    @Override
    public HealthCheckResponse call() {
        return HealthCheckResponse.up("Application is running");
    }
}

// Readiness check - is the application ready to serve traffic?
@Readiness
@ApplicationScoped
public class ReadinessCheck implements HealthCheck {

    @Override
    public HealthCheckResponse call() {
        // Check if dependencies are available
        // In a real app, check database connectivity, etc.
        return HealthCheckResponse.named("ready")
            .up()
            .withData("productsLoaded", true)
            .build();
    }
}
```

The health endpoints are automatically available at `/q/health/live` and `/q/health/ready`.

## Application Configuration

Configure the application in `application.properties`.

```properties
# application.properties

# HTTP port (Container Apps forwards to this port)
quarkus.http.port=8080

# Health endpoint path
quarkus.smallrye-health.root-path=/q/health

# Enable CORS for development
quarkus.http.cors=true

# Logging
quarkus.log.level=INFO
quarkus.log.console.format=%d{yyyy-MM-dd HH:mm:ss} %-5p [%c{2.}] %s%e%n

# Container image settings for building with Jib
quarkus.container-image.build=true
quarkus.container-image.group=myregistry.azurecr.io
quarkus.container-image.name=quarkus-demo
quarkus.container-image.tag=latest
```

## Building the Docker Image

Quarkus provides multiple Dockerfiles. Let's look at both JVM and native options.

**JVM Dockerfile** - faster to build, larger image, slower startup:

```dockerfile
# Dockerfile.jvm
FROM registry.access.redhat.com/ubi8/openjdk-17:1.18

ENV LANGUAGE='en_US:en'

# Copy the built application
COPY --chown=185 target/quarkus-app/lib/ /deployments/lib/
COPY --chown=185 target/quarkus-app/*.jar /deployments/
COPY --chown=185 target/quarkus-app/app/ /deployments/app/
COPY --chown=185 target/quarkus-app/quarkus/ /deployments/quarkus/

EXPOSE 8080
USER 185

# Java options for container environments
ENV JAVA_OPTS_APPEND="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"
ENV JAVA_APP_JAR="/deployments/quarkus-run.jar"

ENTRYPOINT ["java", "-jar", "/deployments/quarkus-run.jar"]
```

**Native Dockerfile** - slower to build, tiny image, instant startup:

```dockerfile
# Dockerfile.native
FROM quay.io/quarkus/quarkus-micro-image:2.0

WORKDIR /work/
COPY target/*-runner /work/application

RUN chmod 775 /work /work/application

EXPOSE 8080
USER 1001

CMD ["./application", "-Dquarkus.http.host=0.0.0.0"]
```

Build the application:

```bash
# JVM build
mvn clean package -DskipTests
docker build -f src/main/docker/Dockerfile.jvm -t quarkus-demo:jvm .

# Native build (requires GraalVM or uses container build)
mvn clean package -Dnative -DskipTests \
  -Dquarkus.native.container-build=true
docker build -f src/main/docker/Dockerfile.native -t quarkus-demo:native .
```

## Deploying to Azure Container Apps

Set up the Azure resources and deploy.

```bash
# Create a resource group
az group create --name quarkus-demo-rg --location eastus

# Create an Azure Container Registry
az acr create --name myquarkusregistry --resource-group quarkus-demo-rg --sku Basic

# Build and push the image using ACR Tasks
az acr build --registry myquarkusregistry --image quarkus-demo:v1 \
  --file src/main/docker/Dockerfile.jvm .

# Create a Container Apps environment
az containerapp env create \
  --name quarkus-env \
  --resource-group quarkus-demo-rg \
  --location eastus

# Deploy the application
az containerapp create \
  --name quarkus-api \
  --resource-group quarkus-demo-rg \
  --environment quarkus-env \
  --image myquarkusregistry.azurecr.io/quarkus-demo:v1 \
  --registry-server myquarkusregistry.azurecr.io \
  --target-port 8080 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 10 \
  --cpu 0.25 \
  --memory 0.5Gi
```

Notice `--min-replicas 0`. This enables scale-to-zero, which means you pay nothing when there is no traffic. When a request arrives, Container Apps spins up an instance. With a native Quarkus image, that instance is ready in under 100 milliseconds.

## Configuring Health Probes

Set up liveness and readiness probes using the Quarkus health endpoints.

```bash
az containerapp update \
  --name quarkus-api \
  --resource-group quarkus-demo-rg \
  --set-env-vars "QUARKUS_PROFILE=prod"
```

Container Apps automatically detects common health endpoint patterns. For explicit configuration:

```json
{
  "probes": [
    {
      "type": "liveness",
      "httpGet": {
        "path": "/q/health/live",
        "port": 8080
      },
      "periodSeconds": 10
    },
    {
      "type": "readiness",
      "httpGet": {
        "path": "/q/health/ready",
        "port": 8080
      },
      "periodSeconds": 5
    }
  ]
}
```

## Scaling Configuration

Configure auto-scaling based on HTTP traffic.

```bash
# Scale based on concurrent HTTP requests
az containerapp update \
  --name quarkus-api \
  --resource-group quarkus-demo-rg \
  --min-replicas 0 \
  --max-replicas 20 \
  --scale-rule-name http-scaling \
  --scale-rule-type http \
  --scale-rule-http-concurrency 50
```

The scaling flow looks like this:

```mermaid
graph LR
    A[No Traffic] -->|0 replicas| B[Scale to Zero]
    C[First Request] -->|Cold Start| D[1 Replica]
    D -->|50+ concurrent| E[Scale Out]
    E -->|Traffic drops| F[Scale In]
    F -->|No traffic| A
```

## Performance Comparison

Here is a rough comparison of startup times and memory usage for the different build modes:

| Mode | Startup Time | Memory Usage | Image Size |
|------|-------------|--------------|------------|
| JVM | ~1 second | ~100 MB | ~300 MB |
| Native | ~50 ms | ~30 MB | ~70 MB |
| Spring Boot (JVM) | ~5 seconds | ~300 MB | ~400 MB |

For scale-to-zero workloads, the native build is clearly the winner. For workloads that stay warm, the JVM build offers better peak throughput because of the JIT compiler.

## Wrapping Up

Quarkus on Azure Container Apps is a powerful combination for cloud-native Java applications. The framework's low memory footprint and fast startup time align perfectly with the serverless, pay-per-use model of Container Apps. Use the JVM build for development and warm workloads where peak throughput matters. Use the native build for scale-to-zero workloads where startup time is critical. Either way, you get a modern Java API platform with automatic scaling and no infrastructure to manage.
