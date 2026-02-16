# How to Implement Azure Cosmos DB CRUD Operations with the Java SDK in a REST API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Cosmos DB, Java, REST API, Spring Boot, SDK, CRUD, NoSQL

Description: Implement full CRUD operations against Azure Cosmos DB using the Java SDK within a Spring Boot REST API with proper error handling.

---

Azure Cosmos DB is a globally distributed, multi-model database service that offers single-digit millisecond latency. When you are building Java applications, the Azure Cosmos DB Java SDK gives you direct control over how you interact with the database, including partition key management, consistency levels, and throughput configuration.

In this post, we will build a REST API using Spring Boot that performs full CRUD operations against Cosmos DB using the Java SDK (not Spring Data - the raw SDK gives you more control and better understanding of how things work under the hood).

## Prerequisites

- Java 17 or later
- Maven
- An Azure Cosmos DB account (NoSQL API)
- The database and container created in the Azure portal

## Step 1: Create the Cosmos DB Resources

Before writing code, set up the database resources in Azure.

```bash
# Create a Cosmos DB account
az cosmosdb create \
  --name my-products-db \
  --resource-group cosmos-rg \
  --kind GlobalDocumentDB \
  --default-consistency-level Session

# Create a database
az cosmosdb sql database create \
  --account-name my-products-db \
  --resource-group cosmos-rg \
  --name ProductsDB

# Create a container with a partition key
az cosmosdb sql container create \
  --account-name my-products-db \
  --resource-group cosmos-rg \
  --database-name ProductsDB \
  --name Products \
  --partition-key-path /category \
  --throughput 400
```

## Step 2: Add Dependencies

Add the Cosmos DB Java SDK to your `pom.xml`.

```xml
<!-- pom.xml - Cosmos DB SDK dependency -->
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-cosmos</artifactId>
    <version>4.53.0</version>
</dependency>
```

## Step 3: Configure the Cosmos DB Client

Create a configuration class that initializes the Cosmos DB client as a Spring bean.

```java
// src/main/java/com/example/config/CosmosConfig.java
// Configures the Cosmos DB client as a Spring bean
package com.example.config;

import com.azure.cosmos.CosmosClient;
import com.azure.cosmos.CosmosClientBuilder;
import com.azure.cosmos.ConsistencyLevel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CosmosConfig {

    @Value("${cosmos.endpoint}")
    private String endpoint;

    @Value("${cosmos.key}")
    private String key;

    @Bean
    public CosmosClient cosmosClient() {
        // Build the client with session consistency for read-your-own-writes
        return new CosmosClientBuilder()
            .endpoint(endpoint)
            .key(key)
            .consistencyLevel(ConsistencyLevel.SESSION)
            .contentResponseOnWriteEnabled(true) // Returns the document on write operations
            .buildClient();
    }
}
```

## Step 4: Define the Product Model

```java
// src/main/java/com/example/model/Product.java
// POJO that maps to a Cosmos DB document
package com.example.model;

public class Product {
    private String id;
    private String name;
    private String category;  // This is our partition key
    private double price;
    private String description;
    private int stockCount;

    // Default constructor needed for deserialization
    public Product() {}

    public Product(String id, String name, String category, double price,
                   String description, int stockCount) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.price = price;
        this.description = description;
        this.stockCount = stockCount;
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public int getStockCount() { return stockCount; }
    public void setStockCount(int stockCount) { this.stockCount = stockCount; }
}
```

## Step 5: Build the Repository

The repository class encapsulates all Cosmos DB operations.

```java
// src/main/java/com/example/repository/ProductRepository.java
// Handles all Cosmos DB CRUD operations for products
package com.example.repository;

import com.azure.cosmos.*;
import com.azure.cosmos.models.*;
import com.example.model.Product;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
public class ProductRepository {

    private final CosmosContainer container;

    public ProductRepository(CosmosClient cosmosClient) {
        // Get a reference to the container
        CosmosDatabase database = cosmosClient.getDatabase("ProductsDB");
        this.container = database.getContainer("Products");
    }

    // CREATE - Insert a new product document
    public Product create(Product product) {
        CosmosItemResponse<Product> response = container.createItem(
            product,
            new PartitionKey(product.getCategory()),
            new CosmosItemRequestOptions()
        );
        // Log the RU charge for monitoring
        System.out.println("Create RU charge: " + response.getRequestCharge());
        return response.getItem();
    }

    // READ - Get a product by ID and partition key
    public Product findById(String id, String category) {
        try {
            CosmosItemResponse<Product> response = container.readItem(
                id,
                new PartitionKey(category),
                Product.class
            );
            System.out.println("Read RU charge: " + response.getRequestCharge());
            return response.getItem();
        } catch (CosmosException e) {
            if (e.getStatusCode() == 404) {
                return null; // Not found
            }
            throw e;
        }
    }

    // READ - Query products by category using SQL
    public List<Product> findByCategory(String category) {
        // Parameterized query to prevent injection
        String query = "SELECT * FROM c WHERE c.category = @category";
        SqlQuerySpec querySpec = new SqlQuerySpec(query,
            List.of(new SqlParameter("@category", category)));

        CosmosQueryRequestOptions options = new CosmosQueryRequestOptions();
        options.setPartitionKey(new PartitionKey(category));

        List<Product> results = new ArrayList<>();
        container.queryItems(querySpec, options, Product.class)
            .iterableByPage()
            .forEach(page -> {
                System.out.println("Query RU charge: " + page.getRequestCharge());
                results.addAll(page.getResults());
            });
        return results;
    }

    // READ - Get all products (cross-partition query)
    public List<Product> findAll() {
        String query = "SELECT * FROM c ORDER BY c._ts DESC OFFSET 0 LIMIT 100";
        CosmosQueryRequestOptions options = new CosmosQueryRequestOptions();

        List<Product> results = new ArrayList<>();
        container.queryItems(query, options, Product.class)
            .iterableByPage()
            .forEach(page -> results.addAll(page.getResults()));
        return results;
    }

    // UPDATE - Replace an existing product document
    public Product update(Product product) {
        CosmosItemResponse<Product> response = container.replaceItem(
            product,
            product.getId(),
            new PartitionKey(product.getCategory()),
            new CosmosItemRequestOptions()
        );
        System.out.println("Update RU charge: " + response.getRequestCharge());
        return response.getItem();
    }

    // DELETE - Remove a product by ID and partition key
    public void delete(String id, String category) {
        container.deleteItem(
            id,
            new PartitionKey(category),
            new CosmosItemRequestOptions()
        );
    }
}
```

## Step 6: Create the REST Controller

```java
// src/main/java/com/example/controller/ProductController.java
// REST controller exposing product CRUD endpoints
package com.example.controller;

import com.example.model.Product;
import com.example.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository repository;

    public ProductController(ProductRepository repository) {
        this.repository = repository;
    }

    @PostMapping
    public ResponseEntity<Product> create(@RequestBody Product product) {
        // Generate an ID if not provided
        if (product.getId() == null || product.getId().isEmpty()) {
            product.setId(UUID.randomUUID().toString());
        }
        Product created = repository.create(product);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getById(
            @PathVariable String id,
            @RequestParam String category) {
        Product product = repository.findById(id, category);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(product);
    }

    @GetMapping
    public ResponseEntity<List<Product>> list(
            @RequestParam(required = false) String category) {
        List<Product> products;
        if (category != null) {
            products = repository.findByCategory(category);
        } else {
            products = repository.findAll();
        }
        return ResponseEntity.ok(products);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Product> update(
            @PathVariable String id,
            @RequestBody Product product) {
        product.setId(id);
        Product updated = repository.update(product);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable String id,
            @RequestParam String category) {
        repository.delete(id, category);
        return ResponseEntity.noContent().build();
    }
}
```

## Step 7: Application Properties

```yaml
# src/main/resources/application.yml
# Cosmos DB connection configuration
cosmos:
  endpoint: ${COSMOS_ENDPOINT:https://my-products-db.documents.azure.com:443/}
  key: ${COSMOS_KEY:your-key-here}

server:
  port: 8080
```

## Understanding Partition Keys

The partition key is the most important design decision you make with Cosmos DB. In our case, we use `category` as the partition key. This means:

- All products in the same category are stored together on the same physical partition
- Queries that filter by category are fast because they target a single partition
- Cross-partition queries (like listing all products) fan out to all partitions and cost more RUs

Choose a partition key that distributes data evenly and aligns with your most common query patterns.

## Error Handling

Add a global exception handler for Cosmos DB errors.

```java
// src/main/java/com/example/exception/CosmosExceptionHandler.java
// Global handler that translates Cosmos DB exceptions to HTTP responses
package com.example.exception;

import com.azure.cosmos.CosmosException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class CosmosExceptionHandler {

    @ExceptionHandler(CosmosException.class)
    public ResponseEntity<Map<String, String>> handleCosmosException(CosmosException ex) {
        // Map Cosmos DB status codes to HTTP status codes
        HttpStatus status = switch (ex.getStatusCode()) {
            case 404 -> HttpStatus.NOT_FOUND;
            case 409 -> HttpStatus.CONFLICT;
            case 429 -> HttpStatus.TOO_MANY_REQUESTS;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };

        return ResponseEntity.status(status).body(Map.of(
            "error", ex.getMessage(),
            "statusCode", String.valueOf(ex.getStatusCode()),
            "requestCharge", String.valueOf(ex.getRequestCharge())
        ));
    }
}
```

## Performance Tips

- Always provide the partition key when reading a single document. A point read with both `id` and partition key costs about 1 RU and is the cheapest operation in Cosmos DB.
- Use parameterized queries to leverage query plan caching.
- Monitor your RU consumption. If you are consistently exceeding your provisioned throughput, consider scaling up or switching to autoscale.
- Enable content response on write only when you need the returned document. Disabling it saves bandwidth.

## Summary

We built a complete REST API in Spring Boot that performs CRUD operations against Azure Cosmos DB using the Java SDK. The raw SDK approach gives you full control over partition key routing, consistency levels, and RU monitoring. Understanding these low-level details matters because Cosmos DB pricing is based on request units, and inefficient queries can get expensive fast. The key takeaway is to design your partition key strategy early, always provide it in your operations, and monitor RU charges to keep costs under control.
