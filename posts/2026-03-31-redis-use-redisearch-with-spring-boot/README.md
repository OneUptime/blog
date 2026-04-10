# How to Use RediSearch with Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Spring Boot, RediSearch, Full-Text Search, Java

Description: Integrate RediSearch with Spring Boot using Redis OM Spring to build full-text search, secondary indexing, and vector similarity queries on Redis data.

---

## Introduction

RediSearch is a Redis module that adds full-text search, secondary indexing, and aggregations on top of Redis data structures. Redis OM Spring integrates RediSearch into Spring Boot through familiar JPA-like repositories and annotations. This guide covers setup, entity modeling, and querying.

## Dependencies

Add the Redis OM Spring dependency to `pom.xml`:

```xml
<dependency>
    <groupId>com.redis.om</groupId>
    <artifactId>redis-om-spring</artifactId>
    <version>0.9.0</version>
</dependency>
```

## Configuration

In `application.properties`:

```properties
spring.data.redis.host=localhost
spring.data.redis.port=6379
```

Enable Redis repositories in your main class:

```java
import com.redis.om.spring.annotations.EnableRedisDocumentRepositories;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@EnableRedisDocumentRepositories(basePackages = "com.example.demo")
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

## Entity Model with RediSearch Annotations

```java
import com.redis.om.spring.annotations.Document;
import com.redis.om.spring.annotations.Searchable;
import com.redis.om.spring.annotations.Indexed;
import org.springframework.data.annotation.Id;
import lombok.Data;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;

@Data
@RequiredArgsConstructor
@Document
public class Product {

    @Id
    private String id;

    @NonNull
    @Searchable
    private String name;

    @NonNull
    @Searchable
    private String description;

    @NonNull
    @Indexed
    private String category;

    @NonNull
    @Indexed
    private Double price;

    @Indexed
    private Integer stock;
}
```

## Repository Interface

```java
import com.redis.om.spring.repository.RedisDocumentRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProductRepository extends RedisDocumentRepository<Product, String> {

    // Full-text search on name field
    List<Product> findByName(String name);

    // Exact match on indexed field
    List<Product> findByCategory(String category);

    // Range query on numeric field
    List<Product> findByPriceBetween(Double min, Double max);

    // Combined search
    List<Product> findByCategoryAndPriceBetween(String category, Double min, Double max);
}
```

## Service Layer

```java
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ProductService {

    private final ProductRepository repository;

    public ProductService(ProductRepository repository) {
        this.repository = repository;
    }

    public Product save(Product product) {
        return repository.save(product);
    }

    public List<Product> searchByName(String query) {
        return repository.findByName(query);
    }

    public List<Product> findByCategory(String category) {
        return repository.findByCategory(category);
    }

    public List<Product> findInPriceRange(Double min, Double max) {
        return repository.findByPriceBetween(min, max);
    }
}
```

## REST Controller

```java
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService service;

    public ProductController(ProductService service) {
        this.service = service;
    }

    @PostMapping
    public Product create(@RequestBody Product product) {
        return service.save(product);
    }

    @GetMapping("/search")
    public List<Product> search(@RequestParam String q) {
        return service.searchByName(q);
    }

    @GetMapping("/category/{cat}")
    public List<Product> byCategory(@PathVariable String cat) {
        return service.findByCategory(cat);
    }

    @GetMapping("/price")
    public List<Product> byPrice(
        @RequestParam Double min,
        @RequestParam Double max
    ) {
        return service.findInPriceRange(min, max);
    }
}
```

## Loading Sample Data

```java
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataLoader implements CommandLineRunner {

    private final ProductRepository repository;

    public DataLoader(ProductRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        repository.save(new Product("Wireless Headphones", "High quality audio", "Electronics", 79.99));
        repository.save(new Product("Running Shoes", "Lightweight trail runners", "Sports", 129.99));
        repository.save(new Product("Coffee Maker", "Drip coffee machine with timer", "Kitchen", 49.99));
    }
}
```

## Summary

Redis OM Spring brings RediSearch capabilities into Spring Boot through `@Document`, `@Searchable`, and `@Indexed` annotations. Entities annotated with `@Searchable` are indexed for full-text search, while `@Indexed` fields support exact match and range queries. Repositories extending `RedisDocumentRepository` automatically generate query methods, making it straightforward to build fast search functionality backed entirely by Redis without a separate search engine.
