# How to Build a gRPC Service in Java with Spring Boot and Deploy It to Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, gRPC, Spring Boot, Java, Microservices

Description: Build a gRPC service using Spring Boot with the grpc-spring-boot-starter, define Protocol Buffer schemas, and deploy to Cloud Run with HTTP/2 support.

---

gRPC is the go-to protocol for high-performance service-to-service communication. It uses Protocol Buffers for serialization and HTTP/2 for transport, giving you typed contracts, streaming, and significantly less overhead compared to REST with JSON. Cloud Run has native support for gRPC, making it a solid platform for deploying gRPC services without managing infrastructure.

In this post, I will build a gRPC service with Spring Boot, define the service contract with Protocol Buffers, implement the server, and deploy it to Cloud Run.

## Project Setup

You need the Protocol Buffer compiler plugin and the gRPC Spring Boot starter:

```xml
<!-- gRPC Spring Boot starter -->
<dependency>
    <groupId>net.devh</groupId>
    <artifactId>grpc-server-spring-boot-starter</artifactId>
    <version>2.15.0.RELEASE</version>
</dependency>

<!-- Protocol Buffers -->
<dependency>
    <groupId>io.grpc</groupId>
    <artifactId>grpc-protobuf</artifactId>
    <version>1.60.0</version>
</dependency>

<!-- gRPC stub generation -->
<dependency>
    <groupId>io.grpc</groupId>
    <artifactId>grpc-stub</artifactId>
    <version>1.60.0</version>
</dependency>

<!-- Required for Java 9+ -->
<dependency>
    <groupId>javax.annotation</groupId>
    <artifactId>javax.annotation-api</artifactId>
    <version>1.3.2</version>
</dependency>
```

Add the Protocol Buffer Maven plugin to generate Java code from your `.proto` files:

```xml
<build>
    <extensions>
        <extension>
            <groupId>kr.motd.maven</groupId>
            <artifactId>os-maven-plugin</artifactId>
            <version>1.7.1</version>
        </extension>
    </extensions>
    <plugins>
        <plugin>
            <groupId>org.xolstice.maven.plugins</groupId>
            <artifactId>protobuf-maven-plugin</artifactId>
            <version>0.6.1</version>
            <configuration>
                <protocArtifact>
                    com.google.protobuf:protoc:3.25.1:exe:${os.detected.classifier}
                </protocArtifact>
                <pluginId>grpc-java</pluginId>
                <pluginArtifact>
                    io.grpc:protoc-gen-grpc-java:1.60.0:exe:${os.detected.classifier}
                </pluginArtifact>
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

## Defining the Service Contract

Create a Protocol Buffer definition file at `src/main/proto/product_service.proto`:

```protobuf
// product_service.proto - defines the gRPC service contract
syntax = "proto3";

package com.example.grpc;

option java_multiple_files = true;
option java_package = "com.example.grpc";

// The product service definition
service ProductService {
    // Unary RPC - get a single product
    rpc GetProduct(GetProductRequest) returns (ProductResponse);

    // Unary RPC - create a product
    rpc CreateProduct(CreateProductRequest) returns (ProductResponse);

    // Server streaming RPC - list all products
    rpc ListProducts(ListProductsRequest) returns (stream ProductResponse);

    // Unary RPC - update a product
    rpc UpdateProduct(UpdateProductRequest) returns (ProductResponse);

    // Unary RPC - delete a product
    rpc DeleteProduct(DeleteProductRequest) returns (DeleteProductResponse);
}

message GetProductRequest {
    string product_id = 1;
}

message CreateProductRequest {
    string name = 1;
    string description = 2;
    double price = 3;
    string category = 4;
}

message UpdateProductRequest {
    string product_id = 1;
    string name = 2;
    string description = 3;
    double price = 4;
}

message DeleteProductRequest {
    string product_id = 1;
}

message ProductResponse {
    string product_id = 1;
    string name = 2;
    string description = 3;
    double price = 4;
    string category = 5;
    string created_at = 6;
}

message ListProductsRequest {
    string category = 1;  // Optional filter by category
    int32 page_size = 2;
}

message DeleteProductResponse {
    bool success = 1;
    string message = 2;
}
```

Run `mvn compile` to generate the Java classes from the proto file.

## Implementing the Service

Create the gRPC service implementation:

```java
// gRPC service implementation - annotated with @GrpcService for auto-registration
@GrpcService
public class ProductServiceImpl extends ProductServiceGrpc.ProductServiceImplBase {

    private final Map<String, ProductData> products = new ConcurrentHashMap<>();

    // Handle GetProduct RPC
    @Override
    public void getProduct(GetProductRequest request,
                           StreamObserver<ProductResponse> responseObserver) {

        ProductData product = products.get(request.getProductId());

        if (product == null) {
            responseObserver.onError(
                    Status.NOT_FOUND
                            .withDescription("Product not found: " + request.getProductId())
                            .asRuntimeException());
            return;
        }

        responseObserver.onNext(toResponse(product));
        responseObserver.onCompleted();
    }

    // Handle CreateProduct RPC
    @Override
    public void createProduct(CreateProductRequest request,
                              StreamObserver<ProductResponse> responseObserver) {

        String id = UUID.randomUUID().toString();
        ProductData product = new ProductData(
                id, request.getName(), request.getDescription(),
                request.getPrice(), request.getCategory(),
                Instant.now().toString());

        products.put(id, product);

        responseObserver.onNext(toResponse(product));
        responseObserver.onCompleted();
    }

    // Handle ListProducts server streaming RPC
    @Override
    public void listProducts(ListProductsRequest request,
                             StreamObserver<ProductResponse> responseObserver) {

        String categoryFilter = request.getCategory();

        products.values().stream()
                .filter(p -> categoryFilter.isEmpty() || p.category().equals(categoryFilter))
                .limit(request.getPageSize() > 0 ? request.getPageSize() : Long.MAX_VALUE)
                .forEach(p -> responseObserver.onNext(toResponse(p)));

        responseObserver.onCompleted();
    }

    // Handle DeleteProduct RPC
    @Override
    public void deleteProduct(DeleteProductRequest request,
                              StreamObserver<DeleteProductResponse> responseObserver) {

        ProductData removed = products.remove(request.getProductId());

        DeleteProductResponse response = DeleteProductResponse.newBuilder()
                .setSuccess(removed != null)
                .setMessage(removed != null ? "Product deleted" : "Product not found")
                .build();

        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }

    // Convert internal data to protobuf response
    private ProductResponse toResponse(ProductData product) {
        return ProductResponse.newBuilder()
                .setProductId(product.id())
                .setName(product.name())
                .setDescription(product.description())
                .setPrice(product.price())
                .setCategory(product.category())
                .setCreatedAt(product.createdAt())
                .build();
    }

    // Internal data record
    private record ProductData(String id, String name, String description,
                               double price, String category, String createdAt) {}
}
```

## Application Configuration

Configure the gRPC server in `application.properties`:

```properties
# gRPC server port - Cloud Run requires using the PORT env variable
grpc.server.port=${PORT:9090}

# Enable health service for probes
grpc.server.health-service-enabled=true

# Enable reflection for debugging with grpcurl
grpc.server.reflection-service-enabled=true

# Actuator for HTTP health checks
management.server.port=8081
management.endpoints.web.exposure.include=health
```

## Dockerfile for Cloud Run

Cloud Run needs the gRPC service to listen on the port specified by the `PORT` environment variable:

```dockerfile
# Build stage
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY . .
RUN ./mvnw package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# Cloud Run sets PORT to 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

## Deploying to Cloud Run

Deploy with HTTP/2 enabled for gRPC support:

```bash
# Build and push the container image
gcloud builds submit --tag gcr.io/my-project/grpc-product-service

# Deploy to Cloud Run with HTTP/2 enabled
gcloud run deploy grpc-product-service \
    --image gcr.io/my-project/grpc-product-service:latest \
    --platform managed \
    --region us-central1 \
    --use-http2 \
    --port 8080 \
    --memory 512Mi \
    --allow-unauthenticated
```

The `--use-http2` flag is critical. gRPC requires HTTP/2, and Cloud Run needs to be explicitly configured to use it.

## Testing with grpcurl

Once deployed, test the service with grpcurl:

```bash
# List available services (requires reflection to be enabled)
grpcurl your-service-url.run.app:443 list

# Create a product
grpcurl -d '{"name": "Widget", "description": "A fine widget", "price": 9.99, "category": "gadgets"}' \
    your-service-url.run.app:443 \
    com.example.grpc.ProductService/CreateProduct

# Get a product
grpcurl -d '{"product_id": "some-uuid"}' \
    your-service-url.run.app:443 \
    com.example.grpc.ProductService/GetProduct

# List all products (server streaming)
grpcurl -d '{"page_size": 10}' \
    your-service-url.run.app:443 \
    com.example.grpc.ProductService/ListProducts
```

## Error Handling with gRPC Status Codes

Use proper gRPC status codes instead of generic errors:

```java
// Return appropriate gRPC status codes for different error conditions
@Override
public void getProduct(GetProductRequest request,
                       StreamObserver<ProductResponse> responseObserver) {

    if (request.getProductId().isEmpty()) {
        responseObserver.onError(
                Status.INVALID_ARGUMENT
                        .withDescription("product_id is required")
                        .asRuntimeException());
        return;
    }

    ProductData product = products.get(request.getProductId());

    if (product == null) {
        responseObserver.onError(
                Status.NOT_FOUND
                        .withDescription("Product not found: " + request.getProductId())
                        .asRuntimeException());
        return;
    }

    responseObserver.onNext(toResponse(product));
    responseObserver.onCompleted();
}
```

## Wrapping Up

Building a gRPC service with Spring Boot and deploying it to Cloud Run is straightforward once you have the build pipeline set up. Define your service contract in Protocol Buffers, implement the generated base class, and deploy with `--use-http2`. The grpc-spring-boot-starter handles server setup and service registration. gRPC gives you typed contracts, efficient serialization, and streaming support - all things that make service-to-service communication faster and more reliable than REST with JSON.
