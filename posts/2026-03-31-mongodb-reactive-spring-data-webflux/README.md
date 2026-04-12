# How to Use Reactive Spring Data MongoDB with WebFlux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Spring, WebFlux, Reactive, Java

Description: Learn how to build fully non-blocking MongoDB data access in Spring WebFlux using ReactiveMongoRepository and ReactiveMongoTemplate.

---

## Why Reactive MongoDB?

Spring WebFlux enables non-blocking, event-driven request handling. Pairing it with Reactive Spring Data MongoDB ensures the entire request pipeline - from HTTP layer to database - is non-blocking. This reduces thread consumption under high concurrency and makes the application more resource-efficient.

## Dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb-reactive</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

## Configuration

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/reactivedb
```

## Document Class

```java
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "products")
public class Product {
    @Id
    private String id;
    private String name;
    private double price;
    private String category;
    // getters/setters
}
```

## Reactive Repository

```java
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface ProductRepository
    extends ReactiveMongoRepository<Product, String> {

    Flux<Product> findByCategory(String category);

    Flux<Product> findByPriceLessThan(double maxPrice);

    Mono<Product> findByName(String name);

    Mono<Long> countByCategory(String category);
}
```

`Flux` represents 0..N items; `Mono` represents 0..1 item. All operations return reactive types - nothing blocks.

## REST Controller with WebFlux

```java
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository repository;

    public ProductController(ProductRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public Flux<Product> getAllProducts() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public Mono<Product> getProduct(@PathVariable String id) {
        return repository.findById(id)
            .switchIfEmpty(Mono.error(
                new ResponseStatusException(HttpStatus.NOT_FOUND)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<Product> createProduct(@RequestBody Product product) {
        return repository.save(product);
    }

    @DeleteMapping("/{id}")
    public Mono<Void> deleteProduct(@PathVariable String id) {
        return repository.deleteById(id);
    }
}
```

## Using ReactiveMongoTemplate

For complex queries, use `ReactiveMongoTemplate`:

```java
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

@Service
public class ProductService {

    private final ReactiveMongoTemplate mongoTemplate;

    public Flux<Product> findByFilter(String category, double maxPrice) {
        Query query = new Query(
            new Criteria().andOperator(
                Criteria.where("category").is(category),
                Criteria.where("price").lte(maxPrice)
            )
        );
        return mongoTemplate.find(query, Product.class);
    }

    public Mono<Product> decrementStock(String id) {
        return mongoTemplate.findAndModify(
            new Query(Criteria.where("id").is(id)),
            new Update().inc("stock", -1),
            FindAndModifyOptions.options().returnNew(true),
            Product.class
        );
    }
}
```

## Reactive Change Streams

```java
import com.mongodb.client.model.changestream.FullDocument;
import org.springframework.data.mongodb.core.ChangeStreamOptions;
import reactor.core.Disposable;

Disposable subscription = mongoTemplate
    .changeStream(
        ChangeStreamOptions.builder()
            .fullDocumentLookup(FullDocument.UPDATE_LOOKUP)
            .build(),
        Product.class
    )
    .doOnNext(event ->
        System.out.println("Change: " + event.getBody()))
    .subscribe();
```

## Backpressure and Streaming HTTP Responses

Return `Flux<Product>` from a controller with `produces = MediaType.APPLICATION_NDJSON_VALUE` to stream results as newline-delimited JSON to clients - ideal for large result sets:

```java
@GetMapping(value = "/stream",
            produces = MediaType.APPLICATION_NDJSON_VALUE)
public Flux<Product> streamProducts() {
    return repository.findAll();
}
```

## Summary

Reactive Spring Data MongoDB with WebFlux delivers fully non-blocking data access by returning `Flux` and `Mono` throughout the stack. Extend `ReactiveMongoRepository` for common CRUD and derived queries, use `ReactiveMongoTemplate` for complex filters and atomic updates, and leverage reactive Change Streams for real-time event processing. Always keep the reactive chain unbroken - avoid calling `.block()` in production code.
