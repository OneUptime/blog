# How to Set Up GraphQL in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, GraphQL, API, Query, Mutation, Schema-First

Description: Learn how to set up GraphQL in Spring Boot applications using Spring for GraphQL. This guide covers schema definition, queries, mutations, subscriptions, error handling, and security with practical examples.

---

> GraphQL provides a flexible query language for APIs that allows clients to request exactly the data they need. Spring Boot's official GraphQL support makes it easy to build GraphQL APIs. This guide walks you through complete setup and implementation.

GraphQL solves over-fetching and under-fetching problems common with REST APIs. Let's build a GraphQL API with Spring Boot.

---

## Architecture Overview

```mermaid
flowchart TD
    A[Client] -->|GraphQL Query| B[/graphql Endpoint]
    B --> C[Query Resolver]
    B --> D[Mutation Resolver]
    B --> E[Subscription Resolver]

    C --> F[Data Fetchers]
    D --> F
    E --> F

    F --> G[Service Layer]
    G --> H[Database]
```

---

## Dependencies Setup

Add Spring for GraphQL to your `pom.xml`:

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-graphql</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <!-- For WebSocket subscriptions -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-websocket</artifactId>
    </dependency>
    <!-- For testing -->
    <dependency>
        <groupId>org.springframework.graphql</groupId>
        <artifactId>spring-graphql-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

---

## Configuration

```yaml
spring:
  graphql:
    graphiql:
      enabled: true
      path: /graphiql
    schema:
      printer:
        enabled: true
    cors:
      allowed-origins: "*"
      allowed-methods: GET, POST
    websocket:
      path: /graphql
```

---

## GraphQL Schema

Create `src/main/resources/graphql/schema.graphqls`:

```graphql
type Query {
    # Get user by ID
    user(id: ID!): User

    # Get all users with optional filtering
    users(filter: UserFilter, page: Int = 0, size: Int = 10): UserConnection!

    # Get book by ID
    book(id: ID!): Book

    # Search books
    books(title: String, authorId: ID): [Book!]!
}

type Mutation {
    # Create a new user
    createUser(input: CreateUserInput!): User!

    # Update an existing user
    updateUser(id: ID!, input: UpdateUserInput!): User!

    # Delete a user
    deleteUser(id: ID!): Boolean!

    # Create a book
    createBook(input: CreateBookInput!): Book!
}

type Subscription {
    # Subscribe to new books
    bookAdded: Book!

    # Subscribe to user events
    userEvents(userId: ID!): UserEvent!
}

# User type
type User {
    id: ID!
    username: String!
    email: String!
    firstName: String
    lastName: String
    fullName: String
    createdAt: DateTime!
    books: [Book!]!
}

# Book type
type Book {
    id: ID!
    title: String!
    isbn: String
    publishedYear: Int
    author: User!
    createdAt: DateTime!
}

# User connection for pagination
type UserConnection {
    content: [User!]!
    totalElements: Int!
    totalPages: Int!
    pageNumber: Int!
    pageSize: Int!
    hasNext: Boolean!
    hasPrevious: Boolean!
}

# User event for subscriptions
type UserEvent {
    type: UserEventType!
    user: User!
    timestamp: DateTime!
}

enum UserEventType {
    CREATED
    UPDATED
    DELETED
}

# Input types
input CreateUserInput {
    username: String!
    email: String!
    password: String!
    firstName: String
    lastName: String
}

input UpdateUserInput {
    email: String
    firstName: String
    lastName: String
}

input CreateBookInput {
    title: String!
    isbn: String
    publishedYear: Int
    authorId: ID!
}

input UserFilter {
    username: String
    email: String
    createdAfter: DateTime
}

# Custom scalar for DateTime
scalar DateTime
```

---

## Query Controllers

### User Query Controller

```java
package com.example.graphql.controller;

import com.example.dto.UserConnection;
import com.example.dto.UserFilter;
import com.example.entity.User;
import com.example.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@RequiredArgsConstructor
@Slf4j
public class UserQueryController {

    private final UserService userService;

    @QueryMapping
    public User user(@Argument Long id) {
        log.info("Fetching user with id: {}", id);
        return userService.findById(id);
    }

    @QueryMapping
    public UserConnection users(
            @Argument UserFilter filter,
            @Argument int page,
            @Argument int size) {
        log.info("Fetching users with filter: {}, page: {}, size: {}", filter, page, size);
        return userService.findAll(filter, page, size);
    }

    // Computed field resolver
    @SchemaMapping(typeName = "User", field = "fullName")
    public String fullName(User user) {
        String firstName = user.getFirstName() != null ? user.getFirstName() : "";
        String lastName = user.getLastName() != null ? user.getLastName() : "";
        return (firstName + " " + lastName).trim();
    }
}
```

### Book Query Controller

```java
package com.example.graphql.controller;

import com.example.entity.Book;
import com.example.entity.User;
import com.example.service.BookService;
import com.example.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class BookQueryController {

    private final BookService bookService;
    private final UserService userService;

    @QueryMapping
    public Book book(@Argument Long id) {
        return bookService.findById(id);
    }

    @QueryMapping
    public List<Book> books(@Argument String title, @Argument Long authorId) {
        return bookService.search(title, authorId);
    }

    // Resolve the author field for Book
    @SchemaMapping(typeName = "Book", field = "author")
    public User author(Book book) {
        return userService.findById(book.getAuthorId());
    }

    // Resolve books for User
    @SchemaMapping(typeName = "User", field = "books")
    public List<Book> userBooks(User user) {
        return bookService.findByAuthorId(user.getId());
    }
}
```

---

## Mutation Controllers

```java
package com.example.graphql.controller;

import com.example.dto.CreateUserInput;
import com.example.dto.UpdateUserInput;
import com.example.dto.CreateBookInput;
import com.example.entity.Book;
import com.example.entity.User;
import com.example.service.BookService;
import com.example.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
@Slf4j
public class MutationController {

    private final UserService userService;
    private final BookService bookService;

    @MutationMapping
    public User createUser(@Argument @Valid CreateUserInput input) {
        log.info("Creating user: {}", input.getUsername());
        return userService.create(input);
    }

    @MutationMapping
    public User updateUser(@Argument Long id, @Argument @Valid UpdateUserInput input) {
        log.info("Updating user: {}", id);
        return userService.update(id, input);
    }

    @MutationMapping
    public boolean deleteUser(@Argument Long id) {
        log.info("Deleting user: {}", id);
        return userService.delete(id);
    }

    @MutationMapping
    public Book createBook(@Argument @Valid CreateBookInput input) {
        log.info("Creating book: {}", input.getTitle());
        return bookService.create(input);
    }
}
```

---

## Subscription Controller

```java
package com.example.graphql.controller;

import com.example.dto.UserEvent;
import com.example.entity.Book;
import com.example.service.BookEventPublisher;
import com.example.service.UserEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.SubscriptionMapping;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Flux;

@Controller
@RequiredArgsConstructor
@Slf4j
public class SubscriptionController {

    private final BookEventPublisher bookEventPublisher;
    private final UserEventPublisher userEventPublisher;

    @SubscriptionMapping
    public Flux<Book> bookAdded() {
        log.info("New subscription to bookAdded");
        return bookEventPublisher.getBookAddedPublisher();
    }

    @SubscriptionMapping
    public Flux<UserEvent> userEvents(@Argument Long userId) {
        log.info("New subscription to userEvents for user: {}", userId);
        return userEventPublisher.getUserEvents(userId);
    }
}
```

### Event Publisher

```java
package com.example.service;

import com.example.entity.Book;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

@Component
public class BookEventPublisher {

    private final Sinks.Many<Book> sink = Sinks.many().multicast().onBackpressureBuffer();

    public void publishBookAdded(Book book) {
        sink.tryEmitNext(book);
    }

    public Flux<Book> getBookAddedPublisher() {
        return sink.asFlux();
    }
}
```

---

## Custom Scalar Configuration

```java
package com.example.graphql.config;

import graphql.language.StringValue;
import graphql.schema.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.graphql.execution.RuntimeWiringConfigurer;

import java.time.Instant;
import java.time.format.DateTimeFormatter;

@Configuration
public class GraphQLConfig {

    @Bean
    public RuntimeWiringConfigurer runtimeWiringConfigurer() {
        return wiringBuilder -> wiringBuilder
            .scalar(dateTimeScalar());
    }

    private GraphQLScalarType dateTimeScalar() {
        return GraphQLScalarType.newScalar()
            .name("DateTime")
            .description("ISO-8601 formatted date-time")
            .coercing(new Coercing<Instant, String>() {

                @Override
                public String serialize(Object dataFetcherResult) {
                    if (dataFetcherResult instanceof Instant) {
                        return DateTimeFormatter.ISO_INSTANT
                            .format((Instant) dataFetcherResult);
                    }
                    throw new CoercingSerializeException(
                        "Expected Instant but got " + dataFetcherResult.getClass());
                }

                @Override
                public Instant parseValue(Object input) {
                    if (input instanceof String) {
                        return Instant.parse((String) input);
                    }
                    throw new CoercingParseValueException(
                        "Expected String but got " + input.getClass());
                }

                @Override
                public Instant parseLiteral(Object input) {
                    if (input instanceof StringValue) {
                        return Instant.parse(((StringValue) input).getValue());
                    }
                    throw new CoercingParseLiteralException(
                        "Expected StringValue but got " + input.getClass());
                }
            })
            .build();
    }
}
```

---

## Error Handling

```java
package com.example.graphql.exception;

import graphql.GraphQLError;
import graphql.GraphqlErrorBuilder;
import graphql.schema.DataFetchingEnvironment;
import lombok.extern.slf4j.Slf4j;
import org.springframework.graphql.execution.DataFetcherExceptionResolverAdapter;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class GraphQLExceptionHandler extends DataFetcherExceptionResolverAdapter {

    @Override
    protected GraphQLError resolveToSingleError(Throwable ex, DataFetchingEnvironment env) {
        log.error("GraphQL error", ex);

        if (ex instanceof ResourceNotFoundException) {
            return GraphqlErrorBuilder.newError()
                .errorType(ErrorType.NOT_FOUND)
                .message(ex.getMessage())
                .path(env.getExecutionStepInfo().getPath())
                .location(env.getField().getSourceLocation())
                .build();
        }

        if (ex instanceof ValidationException) {
            return GraphqlErrorBuilder.newError()
                .errorType(ErrorType.BAD_REQUEST)
                .message(ex.getMessage())
                .path(env.getExecutionStepInfo().getPath())
                .location(env.getField().getSourceLocation())
                .build();
        }

        if (ex instanceof UnauthorizedException) {
            return GraphqlErrorBuilder.newError()
                .errorType(ErrorType.UNAUTHORIZED)
                .message(ex.getMessage())
                .path(env.getExecutionStepInfo().getPath())
                .location(env.getField().getSourceLocation())
                .build();
        }

        // Default error
        return GraphqlErrorBuilder.newError()
            .errorType(ErrorType.INTERNAL_ERROR)
            .message("An unexpected error occurred")
            .path(env.getExecutionStepInfo().getPath())
            .location(env.getField().getSourceLocation())
            .build();
    }
}
```

---

## DataLoader for N+1 Problem

```java
package com.example.graphql.dataloader;

import com.example.entity.User;
import com.example.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.dataloader.DataLoader;
import org.dataloader.DataLoaderFactory;
import org.dataloader.DataLoaderRegistry;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class DataLoaderRegistryFactory {

    private final UserRepository userRepository;

    public DataLoaderRegistry create() {
        DataLoaderRegistry registry = new DataLoaderRegistry();

        // Batch load users by ID
        DataLoader<Long, User> userLoader = DataLoaderFactory.newDataLoader(
            (List<Long> userIds) -> CompletableFuture.supplyAsync(() -> {
                Map<Long, User> usersById = userRepository.findAllById(userIds)
                    .stream()
                    .collect(Collectors.toMap(User::getId, Function.identity()));

                return userIds.stream()
                    .map(usersById::get)
                    .collect(Collectors.toList());
            })
        );

        registry.register("userLoader", userLoader);

        return registry;
    }
}
```

### Using DataLoader in Controller

```java
@Controller
@RequiredArgsConstructor
public class BookController {

    @SchemaMapping(typeName = "Book", field = "author")
    public CompletableFuture<User> author(Book book, DataFetchingEnvironment env) {
        DataLoader<Long, User> userLoader = env.getDataLoader("userLoader");
        return userLoader.load(book.getAuthorId());
    }
}
```

---

## Security

### Method-Level Security

```java
@Controller
@RequiredArgsConstructor
public class SecuredQueryController {

    private final UserService userService;

    @QueryMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<User> allUsers() {
        return userService.findAll();
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public User currentUser(@AuthenticationPrincipal UserDetails userDetails) {
        return userService.findByUsername(userDetails.getUsername());
    }

    @MutationMapping
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    public User updateUser(@Argument Long id, @Argument UpdateUserInput input) {
        return userService.update(id, input);
    }
}
```

---

## Testing

```java
@SpringBootTest
@AutoConfigureGraphQlTester
class UserGraphQLTest {

    @Autowired
    private GraphQlTester graphQlTester;

    @Test
    void shouldGetUser() {
        this.graphQlTester.document("""
            query {
                user(id: 1) {
                    id
                    username
                    email
                    fullName
                }
            }
            """)
            .execute()
            .path("user.username").entity(String.class).isEqualTo("john_doe")
            .path("user.fullName").entity(String.class).isEqualTo("John Doe");
    }

    @Test
    void shouldCreateUser() {
        this.graphQlTester.document("""
            mutation {
                createUser(input: {
                    username: "new_user"
                    email: "new@example.com"
                    password: "password123"
                }) {
                    id
                    username
                    email
                }
            }
            """)
            .execute()
            .path("createUser.username").entity(String.class).isEqualTo("new_user")
            .path("createUser.email").entity(String.class).isEqualTo("new@example.com");
    }

    @Test
    void shouldReturnNotFoundError() {
        this.graphQlTester.document("""
            query {
                user(id: 9999) {
                    id
                    username
                }
            }
            """)
            .execute()
            .errors()
            .satisfy(errors -> {
                assertThat(errors).hasSize(1);
                assertThat(errors.get(0).getMessage()).contains("not found");
            });
    }
}
```

---

## Sample Queries

### Query

```graphql
query GetUserWithBooks {
    user(id: 1) {
        id
        username
        email
        fullName
        books {
            id
            title
            publishedYear
        }
    }
}
```

### Mutation

```graphql
mutation CreateBook {
    createBook(input: {
        title: "Spring Boot in Action"
        isbn: "978-1234567890"
        publishedYear: 2025
        authorId: 1
    }) {
        id
        title
        author {
            username
        }
    }
}
```

---

## Best Practices

1. **Use DataLoaders** - Prevent N+1 query problems
2. **Implement Pagination** - Use connection pattern for lists
3. **Validate Inputs** - Use Bean Validation on input types
4. **Handle Errors Gracefully** - Provide meaningful error messages
5. **Secure Endpoints** - Use method-level security
6. **Monitor Performance** - Track query complexity and execution time

---

## Conclusion

Spring for GraphQL provides a powerful foundation for building GraphQL APIs:

- Define schema using SDL (Schema Definition Language)
- Implement resolvers with annotated controllers
- Use DataLoaders to prevent N+1 problems
- Handle errors with custom exception resolvers
- Secure with Spring Security integration

With these patterns, you can build flexible, efficient GraphQL APIs in Spring Boot.

---

*Need to monitor your GraphQL API performance? [OneUptime](https://oneuptime.com) provides comprehensive API monitoring with query tracking and alerting.*
