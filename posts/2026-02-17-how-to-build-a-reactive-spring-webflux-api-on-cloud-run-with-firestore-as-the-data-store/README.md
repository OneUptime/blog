# How to Build a Reactive Spring WebFlux API on Cloud Run with Firestore as the Data Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Spring WebFlux, Firestore, Reactive, Java

Description: Build a fully reactive REST API using Spring WebFlux on Cloud Run with Firestore as the backend data store, leveraging non-blocking I/O for high throughput.

---

Reactive programming and Cloud Run are a natural fit. Cloud Run charges you for request-processing time, and reactive applications make the most of that time by never blocking threads while waiting for I/O. Pair Spring WebFlux with Firestore - a serverless document database - and you get a stack that scales to zero when idle and handles bursts of traffic without wasting compute resources on blocked threads.

In this post, I will build a reactive REST API with Spring WebFlux, connect it to Firestore, and deploy it to Cloud Run.

## Project Dependencies

Set up the project with WebFlux and Firestore dependencies:

```xml
<!-- Spring WebFlux for reactive HTTP handling -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>

<!-- Spring Cloud GCP Firestore starter -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>spring-cloud-gcp-starter-data-firestore</artifactId>
</dependency>

<!-- Reactive Firestore support -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>spring-cloud-gcp-data-firestore</artifactId>
</dependency>
```

Configure the application:

```properties
# GCP project configuration
spring.cloud.gcp.project-id=my-project-id
spring.cloud.gcp.firestore.database-id=(default)

# Server configuration for Cloud Run
server.port=${PORT:8080}
```

## Defining the Document Entity

Firestore entities in Spring Cloud GCP use the `@Document` annotation:

```java
// Firestore document entity representing a product
@Document(collectionName = "products")
public class Product {

    @DocumentId
    private String id;

    private String name;
    private String description;
    private BigDecimal price;
    private String category;
    private int stockCount;
    private Instant createdAt;
    private Instant updatedAt;

    public Product() {}

    public Product(String name, String description, BigDecimal price,
                   String category, int stockCount) {
        this.name = name;
        this.description = description;
        this.price = price;
        this.category = category;
        this.stockCount = stockCount;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public int getStockCount() { return stockCount; }
    public void setStockCount(int stockCount) { this.stockCount = stockCount; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
```

## The Reactive Repository

Spring Cloud GCP provides `FirestoreReactiveRepository`, which returns `Flux` and `Mono` types:

```java
// Reactive repository for Firestore operations - returns Flux and Mono
public interface ProductRepository extends FirestoreReactiveRepository<Product> {

    // Derived query method - Spring generates the Firestore query
    Flux<Product> findByCategory(String category);

    // Find products with price less than a threshold
    Flux<Product> findByPriceLessThan(BigDecimal maxPrice);

    // Find products with stock below a threshold
    Flux<Product> findByStockCountLessThan(int threshold);
}
```

## Building the Reactive Service Layer

The service layer composes reactive operations. Every method returns a `Mono` or `Flux`:

```java
@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    // Get all products as a reactive stream
    public Flux<Product> getAllProducts() {
        return productRepository.findAll();
    }

    // Find a single product by ID
    public Mono<Product> getProductById(String id) {
        return productRepository.findById(id);
    }

    // Create a new product
    public Mono<Product> createProduct(Product product) {
        product.setUpdatedAt(Instant.now());
        return productRepository.save(product);
    }

    // Update an existing product reactively
    public Mono<Product> updateProduct(String id, Product updated) {
        return productRepository.findById(id)
                .flatMap(existing -> {
                    existing.setName(updated.getName());
                    existing.setDescription(updated.getDescription());
                    existing.setPrice(updated.getPrice());
                    existing.setCategory(updated.getCategory());
                    existing.setStockCount(updated.getStockCount());
                    existing.setUpdatedAt(Instant.now());
                    return productRepository.save(existing);
                });
    }

    // Delete a product and return a completion signal
    public Mono<Void> deleteProduct(String id) {
        return productRepository.deleteById(id);
    }

    // Get products by category
    public Flux<Product> getProductsByCategory(String category) {
        return productRepository.findByCategory(category);
    }

    // Get low stock products for alerts
    public Flux<Product> getLowStockProducts(int threshold) {
        return productRepository.findByStockCountLessThan(threshold);
    }
}
```

## The Reactive Controller

The controller returns reactive types directly. WebFlux handles the subscription and streaming:

```java
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    // Stream all products - uses application/json by default
    @GetMapping
    public Flux<Product> getAllProducts() {
        return productService.getAllProducts();
    }

    // Get a single product or return 404
    @GetMapping("/{id}")
    public Mono<ResponseEntity<Product>> getProduct(@PathVariable String id) {
        return productService.getProductById(id)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // Create a product and return 201
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<Product> createProduct(@RequestBody Product product) {
        return productService.createProduct(product);
    }

    // Update a product or return 404 if not found
    @PutMapping("/{id}")
    public Mono<ResponseEntity<Product>> updateProduct(
            @PathVariable String id, @RequestBody Product product) {
        return productService.updateProduct(id, product)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // Delete a product
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deleteProduct(@PathVariable String id) {
        return productService.deleteProduct(id);
    }

    // Filter products by category
    @GetMapping("/category/{category}")
    public Flux<Product> getByCategory(@PathVariable String category) {
        return productService.getProductsByCategory(category);
    }

    // Stream low-stock products as server-sent events
    @GetMapping(value = "/low-stock", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<Product> getLowStockStream(@RequestParam(defaultValue = "10") int threshold) {
        return productService.getLowStockProducts(threshold)
                .delayElements(Duration.ofMillis(100)); // Throttle for SSE
    }
}
```

## Error Handling

Add a global error handler for reactive endpoints:

```java
@ControllerAdvice
public class GlobalErrorHandler {

    // Handle not found errors
    @ExceptionHandler(ResponseStatusException.class)
    public Mono<ResponseEntity<Map<String, String>>> handleResponseStatus(
            ResponseStatusException ex) {
        return Mono.just(ResponseEntity
                .status(ex.getStatusCode())
                .body(Map.of("error", ex.getReason() != null ? ex.getReason() : "Unknown error")));
    }

    // Handle validation and other runtime errors
    @ExceptionHandler(RuntimeException.class)
    public Mono<ResponseEntity<Map<String, String>>> handleRuntime(RuntimeException ex) {
        return Mono.just(ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", ex.getMessage())));
    }
}
```

## Dockerizing for Cloud Run

Create a Dockerfile optimized for Cloud Run:

```dockerfile
# Multi-stage build for smaller image
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY . .
RUN ./mvnw package -DskipTests

# Runtime stage with JRE only
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Cloud Run sets the PORT environment variable
EXPOSE 8080

# JVM settings optimized for containers
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
```

## Deploying to Cloud Run

Build and deploy:

```bash
# Build the container image
gcloud builds submit --tag gcr.io/my-project/product-api

# Deploy to Cloud Run
gcloud run deploy product-api \
    --image gcr.io/my-project/product-api:latest \
    --platform managed \
    --region us-central1 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --set-env-vars SPRING_CLOUD_GCP_PROJECT_ID=my-project \
    --allow-unauthenticated
```

## Performance Considerations

WebFlux uses a small number of event loop threads (typically equal to the number of CPU cores). On Cloud Run with 1 vCPU, you get about 4 event loop threads. Because nothing blocks, those 4 threads can handle hundreds of concurrent requests.

Firestore operations are network I/O, and the reactive driver does not block threads while waiting for responses. This means your Cloud Run instance stays busy processing requests instead of waiting.

One thing to watch: do not accidentally block in a reactive pipeline. Calling `.block()` on a Mono inside a WebFlux handler defeats the purpose. If you need to integrate with a blocking library, use `Schedulers.boundedElastic()` to offload the blocking call to a separate thread pool.

## Wrapping Up

Spring WebFlux with Firestore on Cloud Run gives you a fully reactive, serverless API stack. The non-blocking I/O model means you serve more requests per compute dollar. Firestore scales automatically, Cloud Run scales to zero, and WebFlux makes the most of every CPU cycle while waiting for database responses. The reactive repository from Spring Cloud GCP keeps the programming model clean with Flux and Mono types flowing from the data layer through the service layer to the controller.
