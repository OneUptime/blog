# How to Use MongoDB with Micronaut Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Micronaut, Java, Repository, Driver

Description: Learn how to integrate MongoDB with the Micronaut framework using Micronaut Data MongoDB for repository-based and reactive data access.

---

## Overview

Micronaut is a JVM framework optimized for low memory footprint and fast startup. It compiles dependency injection and AOP at build time rather than runtime. Micronaut Data MongoDB provides a repository abstraction similar to Spring Data but with compile-time query generation - making it ideal for serverless and containerized workloads.

## Dependencies

Add to your `build.gradle` (or equivalent Maven pom):

```groovy
dependencies {
    implementation("io.micronaut.data:micronaut-data-mongodb")
    implementation("org.mongodb:mongodb-driver-sync:5.1.0")
    annotationProcessor("io.micronaut.data:micronaut-data-document-processor")
}
```

## Configuration

```yaml
micronaut:
  application:
    name: shop-service

mongodb:
  uri: mongodb://localhost:27017/shopdb
```

## Defining a Document Entity

```java
import io.micronaut.data.annotation.Id;
import io.micronaut.data.annotation.MappedEntity;
import org.bson.types.ObjectId;

@MappedEntity("products")
public class Product {

    @Id
    private ObjectId id;
    private String name;
    private double price;
    private String category;
    private int stock;

    // constructors, getters, setters
}
```

## Creating a Repository

```java
import io.micronaut.data.mongodb.annotation.MongoRepository;
import io.micronaut.data.repository.CrudRepository;
import java.util.List;
import java.util.Optional;

@MongoRepository
public interface ProductRepository extends CrudRepository<Product, ObjectId> {

    List<Product> findByCategory(String category);

    List<Product> findByPriceLessThan(double maxPrice);

    Optional<Product> findByName(String name);

    long countByCategory(String category);
}
```

Micronaut Data generates all implementations at compile time using annotation processing - no runtime reflection or proxies.

## Using the Repository in a Service

```java
import jakarta.inject.Singleton;
import java.util.List;

@Singleton
public class ProductService {

    private final ProductRepository repository;

    public ProductService(ProductRepository repository) {
        this.repository = repository;
    }

    public Product save(Product product) {
        return repository.save(product);
    }

    public List<Product> listByCategory(String category) {
        return repository.findByCategory(category);
    }

    public void deleteById(ObjectId id) {
        repository.deleteById(id);
    }
}
```

## Custom Queries with @MongoFindQuery

```java
import io.micronaut.data.mongodb.annotation.MongoFindQuery;
import java.util.List;

@MongoRepository
public interface ProductRepository extends CrudRepository<Product, ObjectId> {

    @MongoFindQuery("{ category: :category, price: { $lte: :maxPrice } }")
    List<Product> findByCategoryAndMaxPrice(String category, double maxPrice);

    @MongoFindQuery(filter = "{ stock: { $lte: 5 } }",
                   project = "{ name: 1, stock: 1 }",
                   sort = "{ stock: 1 }")
    List<Product> findLowStock();
}
```

## Pagination

```java
import io.micronaut.data.model.Page;
import io.micronaut.data.model.Pageable;
import io.micronaut.data.model.Sort;

Page<Product> page = repository.findAll(
    Pageable.from(0, 10, Sort.of(Sort.Order.desc("price")))
);
System.out.println("Total: " + page.getTotalSize());
page.getContent().forEach(p -> System.out.println(p.getName()));
```

## Reactive Support with Micronaut Reactor

Add the reactive driver and extend `ReactorCrudRepository`:

```groovy
implementation("org.mongodb:mongodb-driver-reactivestreams:5.1.0")
implementation("io.micronaut.reactor:micronaut-reactor")
```

```java
import io.micronaut.data.mongodb.annotation.MongoRepository;
import io.micronaut.data.repository.reactive.ReactorCrudRepository;
import reactor.core.publisher.Flux;
import org.bson.types.ObjectId;

@MongoRepository
public interface ReactiveProductRepository
    extends ReactorCrudRepository<Product, ObjectId> {

    Flux<Product> findByCategory(String category);
}
```

## HTTP Controller

```java
import io.micronaut.http.annotation.*;
import java.util.List;

@Controller("/products")
public class ProductController {

    private final ProductService service;

    public ProductController(ProductService service) {
        this.service = service;
    }

    @Get("/{category}")
    public List<Product> byCategory(String category) {
        return service.listByCategory(category);
    }

    @Post
    public Product create(@Body Product product) {
        return service.save(product);
    }
}
```

## Summary

Micronaut Data MongoDB combines Micronaut's compile-time DI model with a repository abstraction over MongoDB. Use `@MappedEntity` for document classes, `@MongoRepository` for repositories, and `@MongoFindQuery` for custom filter expressions. All queries are validated and generated at build time, resulting in faster startup, lower memory use, and early detection of query errors compared to reflection-based frameworks.
