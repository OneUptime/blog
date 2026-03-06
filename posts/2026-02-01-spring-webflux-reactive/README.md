# How to Build Reactive Applications with Spring WebFlux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, WebFlux, Reactive, Mono, Flux

Description: A practical guide to building reactive applications with Spring WebFlux using Mono and Flux for non-blocking I/O.

---

If you've built web applications with Spring MVC, you know the drill - one request comes in, a thread handles it, and that thread sits blocked while waiting for database calls or external API responses. This works fine until you need to handle thousands of concurrent connections, and suddenly your thread pool becomes the bottleneck.

Spring WebFlux offers a different approach. Instead of blocking threads, it uses reactive streams to handle requests asynchronously. Your application can serve way more concurrent users with fewer resources. Let's dig into how this actually works and build something real.

## Why Reactive Programming Matters

Traditional servlet-based applications allocate one thread per request. If your app handles 500 concurrent requests and each waits 200ms for a database response, you need 500 threads just sitting idle. Threads are expensive - each one consumes memory and CPU cycles for context switching.

Reactive programming flips this model. A small number of threads handle many requests by never blocking. When a request needs to wait for I/O, the thread moves on to other work and comes back when data is ready. This event-loop style architecture is similar to what Node.js does, but with Java's type safety and mature ecosystem.

## Setting Up a WebFlux Project

Start with Spring Initializr and include these dependencies:

```xml
<!-- Core WebFlux dependency - replaces spring-boot-starter-web -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>

<!-- Reactive database driver for PostgreSQL -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-r2dbc</artifactId>
</dependency>

<!-- PostgreSQL R2DBC driver -->
<dependency>
    <groupId>io.r2dbc</groupId>
    <artifactId>r2dbc-postgresql</artifactId>
    <scope>runtime</scope>
</dependency>

<!-- Testing support for reactive streams -->
<dependency>
    <groupId>io.projectreactor</groupId>
    <artifactId>reactor-test</artifactId>
    <scope>test</scope>
</dependency>
```

Notice we're using `spring-boot-starter-webflux` instead of `spring-boot-starter-web`. These two starters are mutually exclusive - WebFlux runs on Netty by default, not a servlet container.

## Understanding Mono and Flux

The reactive types in Project Reactor are the foundation of WebFlux. There are two main types you'll use constantly:

**Mono** represents zero or one element. Use it when you expect a single result - fetching one user by ID, saving an entity, or making an API call that returns one object.

**Flux** represents zero to many elements. Use it for collections - listing all users, streaming events, or processing a batch of records.

Here's the thing that trips up newcomers: these types are lazy. Nothing happens until someone subscribes. Let's look at some examples:

```java
// This Mono does nothing until subscribed
// It's just a declaration of intent, not an execution
Mono<String> greeting = Mono.just("Hello, WebFlux");

// This prints nothing - no subscription happened
greeting.map(s -> {
    System.out.println("Mapping: " + s);
    return s.toUpperCase();
});

// Now it executes because we subscribed
greeting.map(String::toUpperCase)
        .subscribe(System.out::println);  // Prints: HELLO, WEBFLUX
```

Flux works similarly but handles multiple elements:

```java
// Create a Flux from multiple items
// Each element flows through the pipeline independently
Flux<Integer> numbers = Flux.just(1, 2, 3, 4, 5);

// Transform and filter the stream
// Operations chain together declaratively
numbers.filter(n -> n % 2 == 0)     // Keep only even numbers
       .map(n -> n * 10)             // Multiply each by 10
       .subscribe(System.out::println);  // Prints: 20, 40
```

## Building Reactive REST Endpoints

Controllers in WebFlux look almost identical to Spring MVC. The key difference is your return types - wrap everything in Mono or Flux:

```java
@RestController
@RequestMapping("/api/products")
public class ProductController {
    
    private final ProductService productService;
    
    // Constructor injection - same as always
    public ProductController(ProductService productService) {
        this.productService = productService;
    }
    
    // Return Flux for collections
    // WebFlux streams each element as it becomes available
    @GetMapping
    public Flux<Product> getAllProducts() {
        return productService.findAll();
    }
    
    // Return Mono for single items
    // The response completes when the Mono emits or completes empty
    @GetMapping("/{id}")
    public Mono<ResponseEntity<Product>> getProduct(@PathVariable Long id) {
        return productService.findById(id)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }
    
    // Request body can also be reactive
    // Useful for streaming uploads or processing large payloads
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<Product> createProduct(@RequestBody Mono<Product> productMono) {
        return productMono.flatMap(productService::save);
    }
    
    // Delete returns Mono<Void> - signals completion without a value
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deleteProduct(@PathVariable Long id) {
        return productService.deleteById(id);
    }
}
```

The magic happens when WebFlux subscribes to your returned Mono or Flux. It handles backpressure automatically - if the client can't keep up with a Flux stream, the server slows down.

## Reactive Database Access with R2DBC

R2DBC (Reactive Relational Database Connectivity) brings non-blocking database access to relational databases. Unlike JDBC, R2DBC never blocks while waiting for query results.

Configure your connection in `application.yml`:

```yaml
spring:
  r2dbc:
    url: r2dbc:postgresql://localhost:5432/mydb
    username: postgres
    password: secret
  # Schema initialization for development
  sql:
    init:
      mode: always
```

Define your entity and repository:

```java
// R2DBC entities use @Table instead of @Entity
// Keep it simple - R2DBC has fewer features than JPA
@Table("products")
public class Product {
    
    @Id
    private Long id;
    private String name;
    private BigDecimal price;
    private Integer quantity;
    
    // Constructors, getters, setters omitted for brevity
}

// Extends ReactiveCrudRepository instead of JpaRepository
// All methods return Mono or Flux
public interface ProductRepository extends ReactiveCrudRepository<Product, Long> {
    
    // Derived query methods work like Spring Data JPA
    // Returns Flux because multiple products might match
    Flux<Product> findByPriceGreaterThan(BigDecimal price);
    
    // Custom query with @Query annotation
    // Use native SQL - R2DBC doesn't support JPQL
    @Query("SELECT * FROM products WHERE quantity < :threshold")
    Flux<Product> findLowStock(@Param("threshold") Integer threshold);
}
```

Your service layer ties it together:

```java
@Service
public class ProductService {
    
    private final ProductRepository repository;
    
    public ProductService(ProductRepository repository) {
        this.repository = repository;
    }
    
    public Flux<Product> findAll() {
        return repository.findAll();
    }
    
    public Mono<Product> findById(Long id) {
        return repository.findById(id);
    }
    
    // flatMap unwraps the inner Mono from save()
    // Use map for synchronous transforms, flatMap for async
    public Mono<Product> save(Product product) {
        return repository.save(product);
    }
    
    public Mono<Void> deleteById(Long id) {
        return repository.deleteById(id);
    }
}
```

## Making External API Calls with WebClient

WebClient is the reactive replacement for RestTemplate. It's non-blocking and integrates seamlessly with WebFlux:

```java
@Service
public class ExternalApiService {
    
    private final WebClient webClient;
    
    // Configure WebClient with base URL and default headers
    // Build once, reuse everywhere
    public ExternalApiService(WebClient.Builder builder) {
        this.webClient = builder
                .baseUrl("https://api.external-service.com")
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
    
    // GET request returning a single item
    // The retrieve() method handles response extraction
    public Mono<ExternalData> fetchData(String id) {
        return webClient.get()
                .uri("/data/{id}", id)
                .retrieve()
                .bodyToMono(ExternalData.class);
    }
    
    // GET request returning multiple items as a stream
    // Flux allows processing items as they arrive
    public Flux<ExternalData> fetchAllData() {
        return webClient.get()
                .uri("/data")
                .retrieve()
                .bodyToFlux(ExternalData.class);
    }
    
    // POST request with a body
    // bodyValue() serializes the object to JSON
    public Mono<ExternalData> createData(ExternalData data) {
        return webClient.post()
                .uri("/data")
                .bodyValue(data)
                .retrieve()
                .bodyToMono(ExternalData.class);
    }
    
    // Handle specific HTTP status codes
    // onStatus() lets you customize error handling
    public Mono<ExternalData> fetchWithErrorHandling(String id) {
        return webClient.get()
                .uri("/data/{id}", id)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, 
                    response -> Mono.error(new NotFoundException("Data not found")))
                .onStatus(HttpStatusCode::is5xxServerError,
                    response -> Mono.error(new ServiceException("External service error")))
                .bodyToMono(ExternalData.class);
    }
}
```

You can also combine multiple API calls efficiently:

```java
// Execute multiple calls in parallel and combine results
// zip() waits for all Monos to complete
public Mono<CombinedResult> fetchCombinedData(String userId) {
    Mono<User> userMono = fetchUser(userId);
    Mono<List<Order>> ordersMono = fetchOrders(userId).collectList();
    Mono<Preferences> prefsMono = fetchPreferences(userId);
    
    return Mono.zip(userMono, ordersMono, prefsMono)
            .map(tuple -> new CombinedResult(
                    tuple.getT1(),   // User
                    tuple.getT2(),   // List<Order>
                    tuple.getT3()    // Preferences
            ));
}
```

## Error Handling in Reactive Streams

Error handling in reactive code requires a different mindset. Exceptions propagate through the stream and terminate it unless you handle them:

```java
@RestController
@RequestMapping("/api/products")
public class ProductController {
    
    @GetMapping("/{id}")
    public Mono<ResponseEntity<Product>> getProduct(@PathVariable Long id) {
        return productService.findById(id)
                .map(ResponseEntity::ok)
                // Handle specific exceptions with onErrorResume
                // Returns an alternative Mono when error occurs
                .onErrorResume(NotFoundException.class, 
                    e -> Mono.just(ResponseEntity.notFound().build()))
                // Log errors without changing the stream
                .doOnError(e -> log.error("Error fetching product {}: {}", id, e.getMessage()))
                // Provide a fallback for any unhandled errors
                .onErrorReturn(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build());
    }
}
```

For global exception handling, use `@ControllerAdvice`:

```java
@ControllerAdvice
public class GlobalExceptionHandler {
    
    // Handle specific exception types
    // Returns a Mono just like regular endpoints
    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Mono<ErrorResponse> handleNotFound(NotFoundException ex) {
        return Mono.just(new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                ex.getMessage(),
                Instant.now()
        ));
    }
    
    // Catch-all for unexpected exceptions
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Mono<ErrorResponse> handleGeneral(Exception ex) {
        return Mono.just(new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "An unexpected error occurred",
                Instant.now()
        ));
    }
}
```

## Testing Reactive Code

Testing reactive streams requires the `StepVerifier` from reactor-test. It lets you subscribe to a publisher and assert expectations:

```java
@SpringBootTest
class ProductServiceTest {
    
    @Autowired
    private ProductService productService;
    
    @Test
    void findAll_returnsAllProducts() {
        // StepVerifier subscribes and verifies elements in order
        // expectNextCount() checks the number of emitted elements
        StepVerifier.create(productService.findAll())
                .expectNextCount(3)  // Expect exactly 3 products
                .verifyComplete();   // Verify the stream completed normally
    }
    
    @Test
    void findById_existingProduct_returnsProduct() {
        // expectNextMatches() allows custom assertions on elements
        StepVerifier.create(productService.findById(1L))
                .expectNextMatches(product -> 
                        product.getName().equals("Expected Name"))
                .verifyComplete();
    }
    
    @Test
    void findById_nonExistent_returnsEmpty() {
        // For empty Mono, just verify it completes without elements
        StepVerifier.create(productService.findById(999L))
                .verifyComplete();
    }
    
    @Test
    void save_validProduct_returnsWithId() {
        Product newProduct = new Product(null, "New Product", BigDecimal.TEN, 100);
        
        // Chain assertions for saved entity
        StepVerifier.create(productService.save(newProduct))
                .assertNext(saved -> {
                    assertNotNull(saved.getId());
                    assertEquals("New Product", saved.getName());
                })
                .verifyComplete();
    }
}
```

For testing WebClient calls, use `MockWebServer`:

```java
@ExtendWith(MockitoExtension.class)
class ExternalApiServiceTest {
    
    private MockWebServer mockServer;
    private ExternalApiService service;
    
    @BeforeEach
    void setup() throws IOException {
        // Start a mock server that simulates the external API
        mockServer = new MockWebServer();
        mockServer.start();
        
        // Point WebClient at the mock server
        WebClient webClient = WebClient.builder()
                .baseUrl(mockServer.url("/").toString())
                .build();
        service = new ExternalApiService(webClient);
    }
    
    @AfterEach
    void tearDown() throws IOException {
        mockServer.shutdown();
    }
    
    @Test
    void fetchData_returnsData() {
        // Queue a mock response
        mockServer.enqueue(new MockResponse()
                .setBody("{\"id\": \"123\", \"value\": \"test\"}")
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE));
        
        // Verify the service correctly parses the response
        StepVerifier.create(service.fetchData("123"))
                .assertNext(data -> {
                    assertEquals("123", data.getId());
                    assertEquals("test", data.getValue());
                })
                .verifyComplete();
    }
}
```

## Performance Considerations

A few things to keep in mind when building reactive applications:

First, avoid blocking calls at all costs. One blocking call in a reactive pipeline blocks the entire event loop thread, destroying performance. If you must call blocking code, wrap it with `Mono.fromCallable()` and execute on a bounded elastic scheduler:

```java
// Wrap blocking code so it runs on a separate thread pool
// subscribeOn() switches execution to the specified scheduler
Mono.fromCallable(() -> legacyBlockingService.fetchData())
    .subscribeOn(Schedulers.boundedElastic())
    .flatMap(data -> processReactively(data));
```

Second, use appropriate backpressure strategies. When a Flux produces data faster than consumers can handle, you need to decide what happens - buffer elements, drop them, or signal an error.

Third, profile your application. Reactive doesn't automatically mean faster. The overhead of scheduling and context switching can hurt performance for simple, fast operations. Reactive shines when you have many concurrent connections with significant I/O wait times.

## Wrapping Up

Spring WebFlux opens the door to highly concurrent applications without the thread-per-request overhead. The learning curve is real - reactive thinking requires abandoning some ingrained habits from imperative programming. But once it clicks, you'll have a powerful tool for building scalable services.

Start with a small service, get comfortable with Mono and Flux operators, and gradually expand from there. The reactive ecosystem keeps growing, with better tooling and more database drivers becoming available. It's worth the investment.

---

*Monitor reactive Spring apps with [OneUptime](https://oneuptime.com) - track response times and throughput.*
