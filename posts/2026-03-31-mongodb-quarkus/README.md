# How to Use MongoDB with Quarkus Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Quarkus, Java, Panache, Repository

Description: Learn how to integrate MongoDB with Quarkus using the Panache MongoDB extension for simplified active record and repository patterns.

---

## Overview

Quarkus provides first-class MongoDB support through its Panache extension. Panache brings the active record pattern and repository pattern to MongoDB, reducing boilerplate significantly. Quarkus compiles your application to a native binary or a fast-starting JVM application, making it well-suited for cloud and serverless environments.

## Adding the Extension

```bash
quarkus extension add quarkus-mongodb-panache
```

Or add to `pom.xml`:

```xml
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-mongodb-panache</artifactId>
</dependency>
```

## Configuration

```properties
quarkus.mongodb.connection-string=mongodb://localhost:27017
quarkus.mongodb.database=shopdb
```

## Active Record Pattern

Extend `PanacheMongoEntity` to give your class built-in persistence methods:

```java
import io.quarkus.mongodb.panache.PanacheMongoEntity;
import io.quarkus.mongodb.panache.common.MongoEntity;
import java.util.List;

@MongoEntity(collection = "products")
public class Product extends PanacheMongoEntity {

    public String name;
    public double price;
    public String category;
    public int stock;

    // Static finder methods
    public static List<Product> findByCategory(String category) {
        return list("category", category);
    }

    public static List<Product> findAffordable(double maxPrice) {
        return list("price <= ?1", maxPrice);
    }

    public static long countByCategory(String category) {
        return count("category", category);
    }
}
```

Usage:

```java
// Create
Product p = new Product();
p.name = "Wireless Keyboard";
p.price = 49.99;
p.category = "electronics";
p.stock = 100;
p.persist();

// Read
List<Product> electronics = Product.findByCategory("electronics");
Product kb = Product.find("name", "Wireless Keyboard").firstResult();

// Update - modify fields and persist
kb.price = 44.99;
kb.update();

// Delete
kb.delete();
Product.delete("category", "discontinued");
```

## Repository Pattern

For separation of concerns, use `PanacheMongoRepository`:

```java
import io.quarkus.mongodb.panache.PanacheMongoRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

@ApplicationScoped
public class ProductRepository implements PanacheMongoRepository<Product> {

    public List<Product> findByCategory(String category) {
        return list("category", category);
    }

    public List<Product> findLowStock(int threshold) {
        return list("stock <= ?1", threshold);
    }

    public void restock(String category, int additionalStock) {
        update("{'$inc': {'stock': ?1}}", additionalStock)
            .where("category", category);
    }
}
```

Inject and use:

```java
@Inject
ProductRepository productRepository;

List<Product> items = productRepository.findByCategory("electronics");
```

## Sorting and Pagination

```java
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;

// Sort
List<Product> sorted = Product.listAll(Sort.by("price").ascending());

// Paginate
PanacheQuery<Product> query =
    Product.find("category", Sort.by("price"), "electronics");
List<Product> page1 = query.page(Page.ofSize(10)).list();
List<Product> page2 = query.page(Page.of(1, 10)).list();
long total = query.count();
```

## Reactive Panache

For non-blocking workloads, use `ReactivePanacheMongoEntity`:

```java
import io.quarkus.mongodb.panache.reactive.ReactivePanacheMongoEntity;
import io.smallrye.mutiny.Uni;
import io.smallrye.mutiny.Multi;

@MongoEntity(collection = "products")
public class Product extends ReactivePanacheMongoEntity {
    public String name;
    public double price;

    public static Multi<Product> streamByCategory(String category) {
        return stream("category", category);
    }

    public static Uni<Long> countByCategory(String category) {
        return count("category", category);
    }
}
```

## REST Endpoint

```java
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/products")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ProductResource {

    @GET
    @Path("/{category}")
    public List<Product> byCategory(@PathParam("category") String category) {
        return Product.findByCategory(category);
    }

    @POST
    public Product create(Product product) {
        product.persist();
        return product;
    }
}
```

## Summary

Quarkus MongoDB Panache provides two patterns: the active record model via `PanacheMongoEntity` (static finders on the entity class) and the repository model via `PanacheMongoRepository` (injected repository bean). Both support BSON query strings, sorting, pagination, and reactive variants. Choose the active record pattern for simplicity and the repository pattern when you need testability through mocking or interface-based abstraction.
