# How to Build Non-Blocking APIs with Spring WebFlux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring WebFlux, Reactive, Non-Blocking, API

Description: A practical guide to building high-performance, non-blocking REST APIs with Spring WebFlux, covering reactive streams, functional endpoints, and real-world patterns for handling concurrent requests efficiently.

---

Traditional Spring MVC assigns one thread per request. This works fine until your application needs to handle thousands of concurrent connections or wait on slow external services. That is where Spring WebFlux comes in - it lets you build APIs that handle many requests with fewer threads by never blocking.

I have seen teams cut their server costs in half after migrating to WebFlux, simply because they could handle the same load with fewer instances. But the reactive programming model takes some getting used to. This guide walks through building non-blocking APIs from the ground up.

## Understanding the Reactive Model

In traditional blocking code, when you call a database or external service, the thread waits until the response comes back. With WebFlux, you describe what should happen when data arrives, and the framework handles the actual waiting efficiently.

WebFlux uses Project Reactor, which provides two core types:

- **Mono<T>**: Represents 0 or 1 element (like an Optional that might arrive later)
- **Flux<T>**: Represents 0 to N elements (like a stream that emits values over time)

```java
// Blocking approach - thread waits here
User user = userRepository.findById(id); // Thread blocked

// Reactive approach - no blocking
Mono<User> userMono = userRepository.findById(id); // Returns immediately
```

## Setting Up a WebFlux Project

Add the WebFlux starter to your pom.xml. Note that you should not include spring-boot-starter-web, as that pulls in the blocking Tomcat server.

```xml
<dependencies>
    <!-- WebFlux with Netty server -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webflux</artifactId>
    </dependency>

    <!-- Reactive MongoDB driver -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-mongodb-reactive</artifactId>
    </dependency>

    <!-- For testing reactive streams -->
    <dependency>
        <groupId>io.projectreactor</groupId>
        <artifactId>reactor-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

## Building Your First Reactive Controller

WebFlux supports annotation-based controllers that look similar to Spring MVC. The key difference is the return types.

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Returns a stream of users - data flows as it becomes available
    @GetMapping
    public Flux<User> getAllUsers() {
        return userRepository.findAll();
    }

    // Returns a single user wrapped in Mono
    @GetMapping("/{id}")
    public Mono<ResponseEntity<User>> getUserById(@PathVariable String id) {
        return userRepository.findById(id)
            .map(user -> ResponseEntity.ok(user))
            .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // Creating a user - request body is also reactive
    @PostMapping
    public Mono<ResponseEntity<User>> createUser(@RequestBody Mono<User> userMono) {
        return userMono
            .flatMap(userRepository::save)
            .map(saved -> ResponseEntity
                .created(URI.create("/api/users/" + saved.getId()))
                .body(saved));
    }

    // Updating with proper error handling
    @PutMapping("/{id}")
    public Mono<ResponseEntity<User>> updateUser(
            @PathVariable String id,
            @RequestBody User user) {
        return userRepository.findById(id)
            .flatMap(existing -> {
                existing.setName(user.getName());
                existing.setEmail(user.getEmail());
                return userRepository.save(existing);
            })
            .map(ResponseEntity::ok)
            .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public Mono<ResponseEntity<Void>> deleteUser(@PathVariable String id) {
        return userRepository.findById(id)
            .flatMap(user -> userRepository.delete(user)
                .then(Mono.just(ResponseEntity.noContent().<Void>build())))
            .defaultIfEmpty(ResponseEntity.notFound().build());
    }
}
```

## Functional Endpoints - An Alternative Style

WebFlux also supports a functional programming style using RouterFunctions. This approach separates routing from handling and works well for smaller services.

```java
@Configuration
public class UserRouter {

    @Bean
    public RouterFunction<ServerResponse> userRoutes(UserHandler handler) {
        return RouterFunctions.route()
            .path("/api/users", builder -> builder
                .GET("", handler::getAllUsers)
                .GET("/{id}", handler::getUserById)
                .POST("", handler::createUser)
                .PUT("/{id}", handler::updateUser)
                .DELETE("/{id}", handler::deleteUser))
            .build();
    }
}

@Component
public class UserHandler {

    private final UserRepository userRepository;

    public UserHandler(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Mono<ServerResponse> getAllUsers(ServerRequest request) {
        return ServerResponse.ok()
            .contentType(MediaType.APPLICATION_JSON)
            .body(userRepository.findAll(), User.class);
    }

    public Mono<ServerResponse> getUserById(ServerRequest request) {
        String id = request.pathVariable("id");
        return userRepository.findById(id)
            .flatMap(user -> ServerResponse.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(user))
            .switchIfEmpty(ServerResponse.notFound().build());
    }

    public Mono<ServerResponse> createUser(ServerRequest request) {
        return request.bodyToMono(User.class)
            .flatMap(userRepository::save)
            .flatMap(saved -> ServerResponse
                .created(URI.create("/api/users/" + saved.getId()))
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(saved));
    }

    public Mono<ServerResponse> updateUser(ServerRequest request) {
        String id = request.pathVariable("id");
        return request.bodyToMono(User.class)
            .flatMap(updates -> userRepository.findById(id)
                .flatMap(existing -> {
                    existing.setName(updates.getName());
                    existing.setEmail(updates.getEmail());
                    return userRepository.save(existing);
                }))
            .flatMap(updated -> ServerResponse.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(updated))
            .switchIfEmpty(ServerResponse.notFound().build());
    }

    public Mono<ServerResponse> deleteUser(ServerRequest request) {
        String id = request.pathVariable("id");
        return userRepository.findById(id)
            .flatMap(user -> userRepository.delete(user)
                .then(ServerResponse.noContent().build()))
            .switchIfEmpty(ServerResponse.notFound().build());
    }
}
```

## Making Non-Blocking External API Calls

The WebClient replaces RestTemplate for making HTTP calls in a non-blocking way.

```java
@Service
public class OrderService {

    private final WebClient webClient;

    public OrderService(WebClient.Builder builder) {
        this.webClient = builder
            .baseUrl("https://api.orders.example.com")
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();
    }

    public Flux<Order> getOrdersForUser(String userId) {
        return webClient.get()
            .uri("/orders?userId={userId}", userId)
            .retrieve()
            .onStatus(HttpStatusCode::is4xxClientError, response ->
                Mono.error(new OrderNotFoundException("No orders found")))
            .onStatus(HttpStatusCode::is5xxServerError, response ->
                Mono.error(new ServiceUnavailableException("Order service down")))
            .bodyToFlux(Order.class)
            .timeout(Duration.ofSeconds(5))
            .retryWhen(Retry.backoff(3, Duration.ofMillis(500)));
    }

    // Parallel calls to multiple services
    public Mono<UserDashboard> getUserDashboard(String userId) {
        Mono<User> userMono = getUser(userId);
        Flux<Order> ordersFlux = getOrdersForUser(userId);
        Mono<List<Notification>> notificationsMono = getNotifications(userId).collectList();

        // All three calls execute in parallel
        return Mono.zip(userMono, ordersFlux.collectList(), notificationsMono)
            .map(tuple -> new UserDashboard(
                tuple.getT1(),
                tuple.getT2(),
                tuple.getT3()
            ));
    }
}
```

## Error Handling in Reactive Streams

Error handling works differently with reactive streams. You chain error operators rather than using try-catch blocks.

```java
@RestControllerAdvice
public class GlobalErrorHandler {

    @ExceptionHandler(UserNotFoundException.class)
    public Mono<ResponseEntity<ErrorResponse>> handleNotFound(UserNotFoundException ex) {
        return Mono.just(ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse(ex.getMessage())));
    }
}

@Service
public class UserService {

    public Mono<User> getUser(String id) {
        return userRepository.findById(id)
            // Transform empty to error
            .switchIfEmpty(Mono.error(new UserNotFoundException(id)))
            // Handle specific errors
            .onErrorResume(DataAccessException.class, e -> {
                log.error("Database error fetching user {}", id, e);
                return Mono.error(new ServiceException("Database unavailable"));
            })
            // Fallback for any error
            .onErrorReturn(new User("unknown", "Fallback User"));
    }

    public Mono<User> createUserWithValidation(User user) {
        return Mono.just(user)
            .flatMap(this::validateUser)
            .flatMap(userRepository::save)
            .doOnError(e -> log.error("Failed to create user", e))
            .doOnSuccess(u -> log.info("Created user {}", u.getId()));
    }

    private Mono<User> validateUser(User user) {
        if (user.getEmail() == null || !user.getEmail().contains("@")) {
            return Mono.error(new ValidationException("Invalid email"));
        }
        return Mono.just(user);
    }
}
```

## Streaming Responses with Server-Sent Events

WebFlux excels at streaming data to clients. Server-Sent Events let you push updates without polling.

```java
@RestController
@RequestMapping("/api/events")
public class EventStreamController {

    private final Sinks.Many<Event> eventSink = Sinks.many().multicast().onBackpressureBuffer();

    // Clients subscribe to this endpoint
    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<Event>> streamEvents() {
        return eventSink.asFlux()
            .map(event -> ServerSentEvent.<Event>builder()
                .id(event.getId())
                .event(event.getType())
                .data(event)
                .build());
    }

    // Other services publish events here
    public void publishEvent(Event event) {
        eventSink.tryEmitNext(event);
    }

    // Streaming database results - great for large datasets
    @GetMapping(value = "/users/stream", produces = MediaType.APPLICATION_NDJSON_VALUE)
    public Flux<User> streamUsers() {
        return userRepository.findAll()
            .delayElements(Duration.ofMillis(100)); // Backpressure simulation
    }
}
```

## Testing Reactive Endpoints

The StepVerifier from reactor-test lets you verify reactive streams step by step.

```java
@WebFluxTest(UserController.class)
class UserControllerTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private UserRepository userRepository;

    @Test
    void shouldReturnUser() {
        User user = new User("1", "John Doe", "john@example.com");
        when(userRepository.findById("1")).thenReturn(Mono.just(user));

        webTestClient.get()
            .uri("/api/users/1")
            .exchange()
            .expectStatus().isOk()
            .expectBody(User.class)
            .isEqualTo(user);
    }

    @Test
    void shouldStreamUsers() {
        Flux<User> users = Flux.just(
            new User("1", "John", "john@example.com"),
            new User("2", "Jane", "jane@example.com")
        );
        when(userRepository.findAll()).thenReturn(users);

        webTestClient.get()
            .uri("/api/users")
            .exchange()
            .expectStatus().isOk()
            .expectBodyList(User.class)
            .hasSize(2);
    }
}

// Testing reactive service logic
class UserServiceTest {

    @Test
    void shouldHandleMissingUser() {
        UserRepository repo = mock(UserRepository.class);
        when(repo.findById("999")).thenReturn(Mono.empty());

        UserService service = new UserService(repo);

        StepVerifier.create(service.getUser("999"))
            .expectError(UserNotFoundException.class)
            .verify();
    }
}
```

## When to Use WebFlux

WebFlux shines when your application has high concurrency needs or makes many external service calls. It works best with reactive databases like MongoDB Reactive, R2DBC for SQL databases, or Redis Reactive.

However, if your application is CPU-bound or uses blocking libraries that cannot be replaced, sticking with Spring MVC makes more sense. Mixing blocking and non-blocking code defeats the purpose and can cause thread pool exhaustion.

The learning curve is real, but the performance benefits for I/O-heavy applications make it worthwhile. Start with a small service, get comfortable with the reactive patterns, and expand from there.
