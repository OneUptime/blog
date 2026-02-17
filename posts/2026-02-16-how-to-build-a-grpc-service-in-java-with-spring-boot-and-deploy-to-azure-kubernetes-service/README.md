# How to Build a gRPC Service in Java with Spring Boot and Deploy to Azure Kubernetes Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Java, Spring Boot, Azure, Kubernetes, AKS, Microservices

Description: Learn how to build a gRPC service using Java and Spring Boot, then deploy it to Azure Kubernetes Service with full configuration details.

---

gRPC has become one of the go-to choices for building high-performance microservices. If you have worked with REST APIs for a while, you probably know their limitations when it comes to strict typing, bidirectional streaming, and efficient binary serialization. gRPC addresses all of these by using Protocol Buffers and HTTP/2 under the hood.

In this post, we will build a gRPC service in Java using Spring Boot, containerize it with Docker, and deploy it to Azure Kubernetes Service (AKS). By the end, you will have a production-ready gRPC microservice running in the cloud.

## Why gRPC with Spring Boot?

Spring Boot gives you a batteries-included framework for building Java applications. When you combine it with gRPC, you get the developer experience of Spring (dependency injection, auto-configuration, health checks) alongside the performance benefits of gRPC. This combination is particularly powerful for internal service-to-service communication where you do not need browser compatibility.

## Prerequisites

Before diving in, make sure you have:

- Java 17 or later installed
- Maven or Gradle
- Docker installed locally
- An Azure account with a subscription
- Azure CLI installed and configured
- kubectl installed

## Step 1: Define the Protobuf Schema

Start by creating a `.proto` file that defines your service contract. This file describes the messages and RPC methods your service exposes.

```protobuf
// src/main/proto/product.proto
// Defines the ProductService with CRUD operations
syntax = "proto3";

package com.example.product;

option java_multiple_files = true;
option java_package = "com.example.product.grpc";

// Request message for getting a product by ID
message GetProductRequest {
  string id = 1;
}

// Response message containing product details
message ProductResponse {
  string id = 1;
  string name = 2;
  double price = 3;
  string description = 4;
}

// Request message for creating a new product
message CreateProductRequest {
  string name = 1;
  double price = 2;
  string description = 3;
}

// The ProductService exposes two RPC methods
service ProductService {
  rpc GetProduct(GetProductRequest) returns (ProductResponse);
  rpc CreateProduct(CreateProductRequest) returns (ProductResponse);
}
```

## Step 2: Configure the Spring Boot Project

Your `pom.xml` needs the gRPC Spring Boot starter and the protobuf compiler plugin. Here is the relevant dependency and plugin configuration.

```xml
<!-- pom.xml dependencies for gRPC with Spring Boot -->
<dependencies>
    <dependency>
        <groupId>net.devh</groupId>
        <artifactId>grpc-server-spring-boot-starter</artifactId>
        <version>2.15.0.RELEASE</version>
    </dependency>
    <dependency>
        <groupId>io.grpc</groupId>
        <artifactId>grpc-protobuf</artifactId>
        <version>1.59.0</version>
    </dependency>
    <dependency>
        <groupId>io.grpc</groupId>
        <artifactId>grpc-stub</artifactId>
        <version>1.59.0</version>
    </dependency>
</dependencies>

<build>
    <extensions>
        <!-- OS plugin helps protobuf plugin detect the correct binary -->
        <extension>
            <groupId>kr.motd.maven</groupId>
            <artifactId>os-maven-plugin</artifactId>
            <version>1.7.1</version>
        </extension>
    </extensions>
    <plugins>
        <!-- Protobuf Maven plugin compiles .proto files into Java classes -->
        <plugin>
            <groupId>org.xolstice.maven.plugins</groupId>
            <artifactId>protobuf-maven-plugin</artifactId>
            <version>0.6.1</version>
            <configuration>
                <protocArtifact>com.google.protobuf:protoc:3.24.0:exe:${os.detected.classifier}</protocArtifact>
                <pluginId>grpc-java</pluginId>
                <pluginArtifact>io.grpc:protoc-gen-grpc-java:1.59.0:exe:${os.detected.classifier}</pluginArtifact>
            </configuration>
            <executions>
                <execution>
                    <goals>
                        <goal>compile</goal>
                        <goal>compile-custom</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

## Step 3: Implement the gRPC Service

Now implement the actual service logic. The `@GrpcService` annotation from the Spring Boot starter registers this class as a gRPC service endpoint.

```java
// src/main/java/com/example/product/ProductServiceImpl.java
// Implements the gRPC service defined in our protobuf schema
package com.example.product;

import com.example.product.grpc.*;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@GrpcService
public class ProductServiceImpl extends ProductServiceGrpc.ProductServiceImplBase {

    // In-memory store for demonstration; replace with a real database in production
    private final Map<String, ProductResponse> products = new ConcurrentHashMap<>();

    @Override
    public void getProduct(GetProductRequest request, StreamObserver<ProductResponse> responseObserver) {
        // Look up product by ID and return it
        ProductResponse product = products.get(request.getId());
        if (product != null) {
            responseObserver.onNext(product);
            responseObserver.onCompleted();
        } else {
            responseObserver.onError(
                io.grpc.Status.NOT_FOUND
                    .withDescription("Product not found: " + request.getId())
                    .asRuntimeException()
            );
        }
    }

    @Override
    public void createProduct(CreateProductRequest request, StreamObserver<ProductResponse> responseObserver) {
        // Generate a unique ID and store the product
        String id = UUID.randomUUID().toString();
        ProductResponse product = ProductResponse.newBuilder()
            .setId(id)
            .setName(request.getName())
            .setPrice(request.getPrice())
            .setDescription(request.getDescription())
            .build();
        products.put(id, product);

        responseObserver.onNext(product);
        responseObserver.onCompleted();
    }
}
```

## Step 4: Configure the Application

Set the gRPC server port in your Spring Boot configuration file.

```yaml
# src/main/resources/application.yml
grpc:
  server:
    port: 9090  # gRPC listens on this port
spring:
  application:
    name: product-grpc-service
```

## Step 5: Containerize with Docker

Create a multi-stage Dockerfile to keep the final image small.

```dockerfile
# Dockerfile - Multi-stage build for the gRPC Spring Boot service
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
# Build the application and skip tests for faster builds
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
# Copy only the built JAR from the build stage
COPY --from=build /app/target/*.jar app.jar
EXPOSE 9090
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Build and push the image to Azure Container Registry.

```bash
# Build the Docker image locally
docker build -t product-grpc-service:latest .

# Log in to Azure Container Registry
az acr login --name myregistry

# Tag and push the image
docker tag product-grpc-service:latest myregistry.azurecr.io/product-grpc-service:v1
docker push myregistry.azurecr.io/product-grpc-service:v1
```

## Step 6: Create an AKS Cluster

If you do not already have an AKS cluster, create one.

```bash
# Create a resource group for the cluster
az group create --name grpc-rg --location eastus

# Create an AKS cluster with 2 nodes
az aks create \
  --resource-group grpc-rg \
  --name grpc-aks-cluster \
  --node-count 2 \
  --generate-ssh-keys \
  --attach-acr myregistry

# Get credentials for kubectl
az aks get-credentials --resource-group grpc-rg --name grpc-aks-cluster
```

## Step 7: Deploy to AKS

Create a Kubernetes deployment and service manifest. Note that gRPC requires HTTP/2, so we use `appProtocol: grpc` on the service port.

```yaml
# k8s/deployment.yaml
# Deployment and Service for the gRPC product service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-grpc-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: product-grpc-service
  template:
    metadata:
      labels:
        app: product-grpc-service
    spec:
      containers:
        - name: product-grpc-service
          image: myregistry.azurecr.io/product-grpc-service:v1
          ports:
            - containerPort: 9090
              protocol: TCP
          # Resource limits to keep the pod well-behaved
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          # Health check using gRPC health protocol
          readinessProbe:
            grpc:
              port: 9090
            initialDelaySeconds: 10
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: product-grpc-service
spec:
  selector:
    app: product-grpc-service
  ports:
    - port: 9090
      targetPort: 9090
      protocol: TCP
      appProtocol: grpc
  type: LoadBalancer
```

Apply the manifest to your cluster.

```bash
# Deploy the service to AKS
kubectl apply -f k8s/deployment.yaml

# Verify the pods are running
kubectl get pods -l app=product-grpc-service

# Get the external IP of the service
kubectl get svc product-grpc-service
```

## Step 8: Test the Deployed Service

Use `grpcurl` to verify the service is responding correctly.

```bash
# Replace EXTERNAL_IP with the LoadBalancer IP from kubectl get svc
grpcurl -plaintext EXTERNAL_IP:9090 list

# Create a product
grpcurl -plaintext -d '{"name":"Widget","price":19.99,"description":"A fine widget"}' \
  EXTERNAL_IP:9090 com.example.product.ProductService/CreateProduct
```

## Adding gRPC Health Checks

For production workloads, you should add the gRPC health checking protocol. The Spring Boot gRPC starter includes it by default, but you can configure it explicitly.

```java
// Health service configuration is automatic with grpc-server-spring-boot-starter
// Just add the dependency and it registers the health service
// You can customize it by implementing HealthIndicator beans
```

## Scaling Considerations

When running gRPC on Kubernetes, keep these things in mind:

- **Connection pooling**: gRPC uses long-lived HTTP/2 connections. A single connection can multiplex many requests, which means Kubernetes round-robin load balancing at the connection level might not distribute traffic evenly. Consider using a service mesh like Linkerd or Istio for request-level load balancing.
- **Horizontal Pod Autoscaler**: Configure HPA based on CPU or custom metrics so your service scales with demand.
- **TLS termination**: In production, you should use TLS. You can terminate TLS at the ingress controller level or configure mutual TLS through a service mesh.

## Monitoring and Observability

Add gRPC interceptors for metrics collection. The Spring Boot gRPC starter integrates with Micrometer, so you can export metrics to Azure Monitor or Prometheus.

```yaml
# Add to application.yml for metrics
management:
  endpoints:
    web:
      exposure:
        include: health,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
```

## Wrapping Up

We built a gRPC service in Java with Spring Boot, containerized it, and deployed it to AKS. The combination of Protocol Buffers for strict contracts, HTTP/2 for efficient transport, and Kubernetes for orchestration gives you a solid foundation for microservice communication. From here, you can extend the service with streaming RPCs, add interceptors for authentication, or integrate it with other Azure services like Cosmos DB for persistent storage. The key takeaway is that gRPC and Spring Boot play nicely together, and AKS provides a managed environment where you do not have to worry about the underlying infrastructure.
