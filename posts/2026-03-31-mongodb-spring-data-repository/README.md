# How to Use Spring Data MongoDB for Repository-Based Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Spring, Repository, Spring Data, Java

Description: Learn how to use Spring Data MongoDB repositories to perform database operations with minimal boilerplate using the repository pattern.

---

## What Is Spring Data MongoDB?

Spring Data MongoDB provides a familiar Spring Data programming model for MongoDB. Its repository abstraction generates query implementations at runtime from method names, eliminating most boilerplate DAO code. You define an interface, Spring wires the implementation.

## Maven Dependency

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb</artifactId>
</dependency>
```

## Application Properties

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/shopdb
```

## Defining the Document Class

```java
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "products")
public class Product {

    @Id
    private String id;

    private String name;

    @Field("unit_price")
    private double price;

    private String category;
    private int stock;

    // constructors, getters, setters
}
```

## Creating the Repository Interface

```java
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends MongoRepository<Product, String> {

    // Derived queries - Spring generates the implementation
    List<Product> findByCategory(String category);

    List<Product> findByPriceLessThan(double maxPrice);

    Optional<Product> findByName(String name);

    long countByCategory(String category);

    void deleteByCategory(String category);
}
```

## Using the Repository in a Service

```java
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ProductService {

    private final ProductRepository repository;

    public ProductService(ProductRepository repository) {
        this.repository = repository;
    }

    public Product createProduct(Product product) {
        return repository.save(product);
    }

    public List<Product> getByCategory(String category) {
        return repository.findByCategory(category);
    }

    public List<Product> getAffordableProducts(double maxPrice) {
        return repository.findByPriceLessThan(maxPrice);
    }

    public void removeProduct(String id) {
        repository.deleteById(id);
    }
}
```

## Sorting and Pagination

```java
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

// Sorted list
List<Product> sorted = repository.findAll(Sort.by(Sort.Direction.ASC, "price"));

// Paginated result
Page<Product> page = repository.findAll(PageRequest.of(0, 10,
    Sort.by("price").descending()));

System.out.println("Total pages: " + page.getTotalPages());
page.getContent().forEach(p -> System.out.println(p.getName()));
```

## Derived Query Keywords

Spring Data MongoDB understands a rich set of keywords for method names:

```text
findBy          - equality
findByXGreaterThan / LessThan / Between
findByXLike / Regex
findByXIn / NotIn
findByXExists
findByXAndY / OrY
findFirst10By   - limit results
findTopBy       - first result
```

## Custom Queries with @Query

```java
import org.springframework.data.mongodb.repository.Query;

public interface ProductRepository extends MongoRepository<Product, String> {

    @Query("{ 'category': ?0, 'price': { $lt: ?1 } }")
    List<Product> findByCategoryAndMaxPrice(String category, double maxPrice);

    @Query(value = "{ 'stock': { $lte: 5 } }", fields = "{ 'name': 1, 'stock': 1 }")
    List<Product> findLowStockProducts();
}
```

## Summary

Spring Data MongoDB repositories eliminate DAO boilerplate by generating query implementations from method names at runtime. Define your document class with `@Document`, extend `MongoRepository`, and declare query methods following Spring Data naming conventions. Use `Page` and `Sort` for pagination, and fall back to `@Query` with JSON filter strings when derived queries become complex.
