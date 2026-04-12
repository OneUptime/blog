# How to Use Spring Data MongoDB Repositories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Spring, Java, Repository, Spring Data

Description: Learn how to use Spring Data MongoDB repositories to perform CRUD and custom query operations on MongoDB collections without writing boilerplate data access code.

---

Spring Data MongoDB repositories follow the Repository pattern to eliminate boilerplate data access code. By extending one of Spring Data's repository interfaces, you get CRUD operations, pagination, sorting, and custom queries derived automatically from method names.

## Adding the Dependency

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb</artifactId>
</dependency>
```

Configure the connection in `application.properties`:

```text
spring.data.mongodb.uri=mongodb://localhost:27017/myapp
```

## Defining a Document Class

```java
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

@Document(collection = "products")
public class Product {

    @Id
    private String id;

    @Indexed(unique = true)
    private String sku;

    private String name;
    private double price;
    private String category;

    // constructors, getters, setters
}
```

## Creating a Repository Interface

Extend `MongoRepository<T, ID>` to get full CRUD support:

```java
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends MongoRepository<Product, String> {

    // Derived query methods - no implementation needed
    Optional<Product> findBySku(String sku);
    List<Product> findByCategory(String category);
    List<Product> findByPriceLessThan(double maxPrice);
    List<Product> findByCategoryAndPriceLessThan(String category, double maxPrice);

    // Existence check
    boolean existsBySku(String sku);

    // Count
    long countByCategory(String category);

    // Delete
    void deleteBySku(String sku);
}
```

Spring Data generates the implementation at runtime by parsing the method names.

## Using the Repository

Inject the repository into your service class:

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

    public List<Product> getAffordableProducts(String category, double maxPrice) {
        return repository.findByCategoryAndPriceLessThan(category, maxPrice);
    }

    public void deleteProduct(String id) {
        repository.deleteById(id);
    }
}
```

## Custom Queries with @Query

For complex queries, use the `@Query` annotation with MongoDB JSON syntax:

```java
import org.springframework.data.mongodb.repository.Query;

public interface ProductRepository extends MongoRepository<Product, String> {

    @Query("{ 'price': { $gte: ?0, $lte: ?1 } }")
    List<Product> findByPriceRange(double minPrice, double maxPrice);

    @Query("{ 'category': ?0 }")
    List<Product> findByCategorySorted(String category, org.springframework.data.domain.Sort sort);

    // Projection - return only name and price fields
    @Query(value = "{ 'category': ?0 }", fields = "{ 'name': 1, 'price': 1 }")
    List<Product> findNameAndPriceByCategory(String category);
}
```

## Pagination and Sorting

`MongoRepository` extends `PagingAndSortingRepository`, so pagination is built in:

```java
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

Page<Product> page = repository.findAll(
    PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "price"))
);

List<Product> products = page.getContent();
long totalElements = page.getTotalElements();
int totalPages = page.getTotalPages();
```

## Summary

Spring Data MongoDB repositories remove the need to write data access code manually. Method name-derived queries handle the majority of use cases, while `@Query` annotations accommodate complex MongoDB queries. Pagination and sorting support is built in through `MongoRepository`, and dependency injection makes the repository easy to use throughout your Spring application.
