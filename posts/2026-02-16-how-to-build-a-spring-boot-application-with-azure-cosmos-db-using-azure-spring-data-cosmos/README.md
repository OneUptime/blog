# How to Build a Spring Boot Application with Azure Cosmos DB Using azure-spring-data-cosmos

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Spring Boot, Azure Cosmos DB, Spring Data Cosmos, Java, NoSQL, Cloud Database, Azure SDK

Description: Learn how to build a Spring Boot application with Azure Cosmos DB using the azure-spring-data-cosmos library for seamless NoSQL data access.

---

Azure Cosmos DB pairs well with Spring Boot through the `azure-spring-data-cosmos` library. This library brings the familiar Spring Data repository pattern to Cosmos DB, so if you have used Spring Data JPA or Spring Data MongoDB, you already know how to work with it. You define an entity, create a repository interface, and Spring handles the rest.

In this post, we will build a Spring Boot application that uses Cosmos DB as its data store. We will cover configuration, entity mapping, repository operations, custom queries, and some important performance considerations.

## Why Spring Data Cosmos?

You can use the raw Cosmos DB Java SDK directly, but the Spring Data abstraction gives you several advantages:

- Repository pattern with standard CRUD methods out of the box
- Annotation-based entity mapping
- Spring's dependency injection and configuration management
- Derived query methods from method names
- Pagination and sorting support
- Integration with Spring Boot's auto-configuration

The trade-off is that you lose some fine-grained control over things like request options and consistency levels. For most applications, the convenience outweighs the limitations.

## Setting Up the Project

Create a new Spring Boot project with the necessary dependencies.

```xml
<!-- pom.xml -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
</parent>

<dependencies>
    <!-- Spring Boot Web for REST endpoints -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Azure Spring Data Cosmos for Cosmos DB integration -->
    <dependency>
        <groupId>com.azure</groupId>
        <artifactId>azure-spring-data-cosmos</artifactId>
        <version>5.9.0</version>
    </dependency>
</dependencies>
```

## Configuring the Cosmos DB Connection

Add your Cosmos DB credentials to `application.properties`.

```properties
# application.properties
# Azure Cosmos DB connection settings
azure.cosmos.uri=https://your-account.documents.azure.com:443/
azure.cosmos.key=your-primary-key
azure.cosmos.database=productdb

# Optional: set the default consistency level
azure.cosmos.consistency-level=SESSION

# Enable response diagnostics for debugging (disable in production)
azure.cosmos.populate-query-metrics=true
```

Create a configuration class that sets up the Cosmos DB client.

```java
import com.azure.cosmos.CosmosClientBuilder;
import com.azure.spring.data.cosmos.config.AbstractCosmosConfiguration;
import com.azure.spring.data.cosmos.config.CosmosConfig;
import com.azure.spring.data.cosmos.repository.config.EnableCosmosRepositories;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableCosmosRepositories  // Enables Spring Data repository scanning
public class CosmosConfiguration extends AbstractCosmosConfiguration {

    @Value("${azure.cosmos.uri}")
    private String cosmosUri;

    @Value("${azure.cosmos.key}")
    private String cosmosKey;

    @Value("${azure.cosmos.database}")
    private String cosmosDatabase;

    // Build the Cosmos client with connection settings
    @Bean
    public CosmosClientBuilder cosmosClientBuilder() {
        return new CosmosClientBuilder()
            .endpoint(cosmosUri)
            .key(cosmosKey)
            .directMode();  // Use Direct mode for better performance
    }

    // Configure additional Cosmos options
    @Bean
    public CosmosConfig cosmosConfig() {
        return CosmosConfig.builder()
            .enableQueryMetrics(true)  // Track query performance metrics
            .build();
    }

    @Override
    protected String getDatabaseName() {
        return cosmosDatabase;
    }
}
```

## Defining Entities

Cosmos DB entities are annotated with `@Container` and need a partition key.

```java
import com.azure.spring.data.cosmos.core.mapping.Container;
import com.azure.spring.data.cosmos.core.mapping.PartitionKey;
import org.springframework.data.annotation.Id;

// Map this class to a Cosmos DB container named "products"
@Container(containerName = "products", ru = "400")
public class Product {

    @Id  // Cosmos DB document ID
    private String id;

    @PartitionKey  // Partition key for data distribution
    private String category;

    private String name;
    private String description;
    private double price;
    private int stockQuantity;
    private boolean active;

    // Default constructor required by Spring Data
    public Product() {}

    public Product(String id, String category, String name,
                   String description, double price, int stockQuantity) {
        this.id = id;
        this.category = category;
        this.name = name;
        this.description = description;
        this.price = price;
        this.stockQuantity = stockQuantity;
        this.active = true;
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
    public int getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(int stockQuantity) { this.stockQuantity = stockQuantity; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
```

Choosing the right partition key is critical. The `category` field works well here because product queries often filter by category, and the data is distributed across multiple categories.

## Creating the Repository

Spring Data repositories give you CRUD operations for free. You can also define custom query methods.

```java
import com.azure.spring.data.cosmos.repository.CosmosRepository;
import com.azure.spring.data.cosmos.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends CosmosRepository<Product, String> {

    // Derived query: Spring generates the query from the method name
    List<Product> findByCategory(String category);

    // Find products by name containing a string (case-sensitive)
    List<Product> findByNameContaining(String keyword);

    // Find active products in a price range
    List<Product> findByActiveTrueAndPriceBetween(double minPrice, double maxPrice);

    // Custom query using Cosmos DB SQL syntax
    @Query("SELECT * FROM c WHERE c.category = @category AND c.price < @maxPrice")
    List<Product> findByCategoryAndMaxPrice(
        @Param("category") String category,
        @Param("maxPrice") double maxPrice);

    // Count products in a category
    long countByCategory(String category);

    // Delete all products in a category
    void deleteByCategory(String category);
}
```

## Building the REST Controller

Create a controller that exposes the product operations as a REST API.

```java
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository productRepository;

    public ProductController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    // Create a new product
    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        if (product.getId() == null || product.getId().isEmpty()) {
            product.setId(UUID.randomUUID().toString());
        }
        Product saved = productRepository.save(product);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // Get a product by ID (requires partition key for efficient lookup)
    @GetMapping("/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable String id) {
        Optional<Product> product = productRepository.findById(id);
        return product.map(ResponseEntity::ok)
                      .orElse(ResponseEntity.notFound().build());
    }

    // List all products in a category
    @GetMapping("/category/{category}")
    public List<Product> getByCategory(@PathVariable String category) {
        return productRepository.findByCategory(category);
    }

    // Search products by keyword
    @GetMapping("/search")
    public List<Product> searchProducts(@RequestParam String keyword) {
        return productRepository.findByNameContaining(keyword);
    }

    // Find products by category and max price using custom query
    @GetMapping("/category/{category}/under/{maxPrice}")
    public List<Product> findAffordable(
            @PathVariable String category,
            @PathVariable double maxPrice) {
        return productRepository.findByCategoryAndMaxPrice(category, maxPrice);
    }

    // Update a product
    @PutMapping("/{id}")
    public ResponseEntity<Product> updateProduct(
            @PathVariable String id,
            @RequestBody Product product) {
        if (!productRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        product.setId(id);
        Product updated = productRepository.save(product);
        return ResponseEntity.ok(updated);
    }

    // Delete a product
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable String id) {
        productRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
```

## Pagination and Sorting

For large datasets, you need pagination. Spring Data Cosmos supports both `Pageable` and `Slice`.

```java
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

// In your repository interface
Page<Product> findByCategory(String category, Pageable pageable);

// In your controller
@GetMapping("/category/{category}/paged")
public Page<Product> getPagedProducts(
        @PathVariable String category,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {

    // Sort by price ascending, paginate with given page and size
    Pageable pageable = org.springframework.data.domain.PageRequest.of(
        page, size, Sort.by("price").ascending());

    return productRepository.findByCategory(category, pageable);
}
```

## Performance Considerations

Working with Cosmos DB efficiently requires understanding how it handles queries.

**Point reads are fastest.** When you query by both ID and partition key, Cosmos DB can go directly to the right partition and document. This costs roughly 1 RU. Cross-partition queries are much more expensive because they fan out to every partition.

**Always filter by partition key when possible.** The `findByCategory` method is efficient because `category` is the partition key. A query like `findByPriceBetween` would be a cross-partition query and much slower.

**Watch your RU consumption.** Every operation in Cosmos DB costs Request Units. Simple reads are cheap (1-5 RUs), but complex queries with large result sets can cost hundreds or thousands of RUs. The query metrics you enabled in the configuration will help you track this.

**Use the right consistency level.** Session consistency is the default and works well for most applications. If you need stronger guarantees, you can use Strong consistency at the cost of higher latency and RU consumption.

## Testing with the Cosmos DB Emulator

For local development, you can use the Cosmos DB Emulator instead of a live Azure account.

```properties
# application-dev.properties
# Cosmos DB Emulator settings
azure.cosmos.uri=https://localhost:8081
azure.cosmos.key=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==
azure.cosmos.database=productdb
```

The emulator runs locally and provides the same API as the real service. Use it for development and testing to avoid Azure costs.

## Wrapping Up

The `azure-spring-data-cosmos` library makes it easy to use Azure Cosmos DB with Spring Boot. The Spring Data repository pattern reduces boilerplate, derived query methods save you from writing SQL, and the auto-configuration gets you connected quickly. Focus on choosing the right partition key, keep an eye on your RU consumption, and use the emulator for local development. With those fundamentals in place, you have a solid foundation for building Spring Boot applications backed by a globally distributed database.
