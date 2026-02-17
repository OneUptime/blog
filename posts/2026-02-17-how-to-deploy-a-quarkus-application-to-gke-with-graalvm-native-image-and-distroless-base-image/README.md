# How to Deploy a Quarkus Application to GKE with GraalVM Native Image and Distroless Base Image

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Quarkus, GraalVM, Native Image, Kubernetes, Java

Description: Deploy a Quarkus application to Google Kubernetes Engine using GraalVM native image compilation and distroless base images for minimal footprint and instant startup.

---

Quarkus was designed for cloud-native Java. When you compile a Quarkus application to a native binary with GraalVM, you get startup times measured in milliseconds instead of seconds, memory usage measured in tens of megabytes instead of hundreds, and a self-contained binary that does not need a JVM. Pair that with a distroless base image and you have a minimal, secure container that is perfect for GKE.

In this post, I will walk through building a Quarkus application, compiling it to a native image, packaging it in a distroless container, and deploying it to GKE.

## Creating the Quarkus Project

Start with a Quarkus project that has the dependencies you need:

```bash
# Generate a Quarkus project with REST and health extensions
mvn io.quarkus.platform:quarkus-maven-plugin:3.6.0:create \
    -DprojectGroupId=com.example \
    -DprojectArtifactId=quarkus-gke-app \
    -Dextensions="resteasy-reactive-jackson,smallrye-health,micrometer-registry-prometheus"
```

## The Application Code

Here is a simple REST resource with a service layer:

```java
// REST resource for product operations
@Path("/api/products")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ProductResource {

    @Inject
    ProductService productService;

    @GET
    public List<Product> list() {
        return productService.listAll();
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") String id) {
        return productService.findById(id)
                .map(p -> Response.ok(p).build())
                .orElse(Response.status(Response.Status.NOT_FOUND).build());
    }

    @POST
    public Response create(Product product) {
        Product created = productService.create(product);
        return Response.status(Response.Status.CREATED).entity(created).build();
    }
}
```

```java
// Service with business logic
@ApplicationScoped
public class ProductService {

    // In-memory store for this example
    private final Map<String, Product> products = new ConcurrentHashMap<>();

    public List<Product> listAll() {
        return new ArrayList<>(products.values());
    }

    public Optional<Product> findById(String id) {
        return Optional.ofNullable(products.get(id));
    }

    public Product create(Product product) {
        product.setId(UUID.randomUUID().toString());
        products.put(product.getId(), product);
        return product;
    }
}
```

## Native Image Compilation

Quarkus makes native compilation straightforward. You have two options: compile locally with GraalVM installed, or use a multistage Docker build.

For the Docker-based approach, create a multistage Dockerfile:

```dockerfile
# Stage 1: Build the native binary using a GraalVM builder image
FROM quay.io/quarkus/ubi-quarkus-mandrel-builder-image:jdk-21 AS build
USER root
WORKDIR /app

# Copy project files
COPY pom.xml .
COPY src ./src

# Build the native binary
# -Pnative activates the native profile in the Quarkus Maven plugin
RUN ./mvnw package -Pnative -DskipTests \
    -Dquarkus.native.additional-build-args="--initialize-at-build-time"

# Stage 2: Create the minimal runtime image using distroless
FROM gcr.io/distroless/base-debian12

WORKDIR /app

# Copy the native binary from the build stage
COPY --from=build /app/target/*-runner /app/application

# Expose the application port
EXPOSE 8080

# Run the native binary directly - no JVM needed
ENTRYPOINT ["/app/application"]
```

## Why Distroless?

The `gcr.io/distroless/base-debian12` image contains only the runtime libraries needed to execute a binary. It has no shell, no package manager, no utilities. This means:

- Smaller attack surface - there is nothing in the image for an attacker to use
- Smaller image size - typically 20-30MB total for your application
- Faster pulls - less data to download when GKE scales up pods

Compare the image sizes:

```
ubuntu:22.04        ~  77MB
eclipse-temurin:17  ~ 300MB
distroless/base     ~  20MB
Your native app      ~  50MB
Total with distroless: ~70MB vs ~350MB+ with a JVM image
```

## Building and Pushing the Image

Use Cloud Build to build the image in the cloud:

```bash
# Build the container image with Cloud Build
gcloud builds submit \
    --tag gcr.io/my-project/quarkus-gke-app:latest \
    --timeout=20m \
    --machine-type=e2-highcpu-8
```

The native compilation step is CPU-intensive, so using a larger build machine saves time. Expect the build to take 5-10 minutes.

## Kubernetes Deployment Manifest

Create the deployment and service for GKE:

```yaml
# deployment.yaml - Quarkus native application on GKE
apiVersion: apps/v1
kind: Deployment
metadata:
  name: quarkus-gke-app
  labels:
    app: quarkus-gke-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: quarkus-gke-app
  template:
    metadata:
      labels:
        app: quarkus-gke-app
      annotations:
        # Prometheus scraping for Micrometer metrics
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/q/metrics"
    spec:
      containers:
        - name: app
          image: gcr.io/my-project/quarkus-gke-app:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              # Native images need far less memory than JVM apps
              memory: "64Mi"
              cpu: "100m"
            limits:
              memory: "128Mi"
              cpu: "500m"
          # Startup probe - native apps start in milliseconds
          startupProbe:
            httpGet:
              path: /q/health/started
              port: 8080
            initialDelaySeconds: 1
            periodSeconds: 2
            failureThreshold: 5
          # Liveness probe
          livenessProbe:
            httpGet:
              path: /q/health/live
              port: 8080
            periodSeconds: 10
            failureThreshold: 3
          # Readiness probe
          readinessProbe:
            httpGet:
              path: /q/health/ready
              port: 8080
            periodSeconds: 5
            failureThreshold: 3
          env:
            - name: QUARKUS_HTTP_PORT
              value: "8080"
---
# Service to expose the deployment
apiVersion: v1
kind: Service
metadata:
  name: quarkus-gke-app
spec:
  selector:
    app: quarkus-gke-app
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

Notice the resource requests. A native Quarkus app needs only 64MB of memory to run, compared to 256-512MB for a typical JVM application. This means you can fit more pods on each node.

## Health Checks

Quarkus SmallRye Health provides Kubernetes-style health endpoints out of the box:

```java
// Custom health check for application-specific readiness
@Readiness
@ApplicationScoped
public class DatabaseHealthCheck implements HealthCheck {

    @Inject
    ProductService productService;

    @Override
    public HealthCheckResponse call() {
        try {
            // Verify the service layer is functional
            productService.listAll();
            return HealthCheckResponse.up("database-check");
        } catch (Exception e) {
            return HealthCheckResponse.down("database-check");
        }
    }
}
```

## Deploying to GKE

Apply the manifests to your GKE cluster:

```bash
# Get credentials for your GKE cluster
gcloud container clusters get-credentials my-cluster --region us-central1

# Apply the deployment and service
kubectl apply -f deployment.yaml

# Check the rollout status
kubectl rollout status deployment/quarkus-gke-app

# Verify pods are running
kubectl get pods -l app=quarkus-gke-app
```

## Horizontal Pod Autoscaler

Take advantage of the fast startup times with aggressive autoscaling:

```yaml
# hpa.yaml - Scale based on CPU utilization
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: quarkus-gke-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: quarkus-gke-app
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Pods
          value: 4
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
```

Because native images start in milliseconds, new pods become ready almost immediately. This means autoscaling can respond to traffic spikes much faster than with traditional JVM applications.

## GraalVM Native Image Gotchas

A few things to watch out for with native images:

Reflection needs to be configured at build time. Quarkus handles this for its own extensions, but if you use a library that relies on reflection, you may need to add `@RegisterForReflection` annotations or provide reflection configuration files.

Some Java libraries do not work with native images. Check the Quarkus extension ecosystem first - if there is a Quarkus extension for a library, it will work with native compilation.

Build times are long. A native compilation can take 5-15 minutes depending on the size of your application. Use JVM mode during development and only compile to native for CI/CD and production builds.

## Wrapping Up

Quarkus with GraalVM native image on GKE gives you the best of both worlds: a familiar Java programming model with the runtime characteristics of a compiled language. Distroless base images minimize the attack surface and image size. The result is containers that start in milliseconds, use minimal memory, and scale quickly. The trade-off is longer build times and some restrictions around reflection, but for production workloads where startup time and resource efficiency matter, it is well worth it.
