# How to Build GraphQL APIs with Spring for GraphQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring, GraphQL, API, Spring for GraphQL

Description: A practical guide to building GraphQL APIs with Spring for GraphQL, covering schema design, query and mutation handlers, data fetchers, and production best practices.

---

REST has been the default choice for APIs for over a decade, but GraphQL is carving out its own space - particularly for applications with complex data requirements or multiple client types. If you're a Java developer working with Spring, the good news is that Spring for GraphQL makes the transition straightforward. This guide walks through building a functional GraphQL API from scratch, with real code you can adapt for your own projects.

## Why GraphQL in a Spring Application?

Before diving into code, let's address the "why." GraphQL solves a few pain points that REST struggles with:

- **Over-fetching and under-fetching:** Clients request exactly what they need. No more hitting five endpoints to build a single view.
- **Strong typing:** The schema acts as a contract between frontend and backend.
- **Introspection:** Clients can query the schema itself, making API discovery trivial.

Spring for GraphQL, introduced as a first-party Spring project, replaced the older graphql-java-kickstart libraries. It integrates tightly with Spring MVC, WebFlux, and Spring Data, so you get the familiar annotation-driven development experience.

## Setting Up Your Project

Start with a Spring Boot project. Add these dependencies to your `pom.xml`:

```xml
<dependencies>
    <!-- Spring Boot Starter -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Spring for GraphQL -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-graphql</artifactId>
    </dependency>

    <!-- For the GraphiQL interface during development -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

Enable GraphiQL in `application.properties` for easy testing:

```properties
spring.graphql.graphiql.enabled=true
spring.graphql.graphiql.path=/graphiql
```

## Defining Your GraphQL Schema

Create your schema file at `src/main/resources/graphql/schema.graphqls`. Spring for GraphQL automatically picks up any `.graphqls` files in this directory.

```graphql
type Query {
    # Fetch a single book by its ID
    bookById(id: ID!): Book

    # List all books, optionally filtered by author
    allBooks(authorId: ID): [Book!]!
}

type Mutation {
    # Create a new book entry
    createBook(input: CreateBookInput!): Book!

    # Update an existing book's details
    updateBook(id: ID!, input: UpdateBookInput!): Book
}

type Book {
    id: ID!
    title: String!
    isbn: String
    publishedYear: Int
    author: Author!
}

type Author {
    id: ID!
    name: String!
    books: [Book!]!
}

input CreateBookInput {
    title: String!
    isbn: String
    publishedYear: Int
    authorId: ID!
}

input UpdateBookInput {
    title: String
    isbn: String
    publishedYear: Int
}
```

A few things to note here. The `!` suffix means a field is non-nullable. Input types are used for mutations to keep the schema clean. The relationship between `Book` and `Author` is bidirectional - we'll need to handle that carefully to avoid N+1 queries.

## Building the Domain Model

Create simple Java records (or classes if you're on an older Java version) that mirror your GraphQL types:

```java
// Book.java
public record Book(
    String id,
    String title,
    String isbn,
    Integer publishedYear,
    String authorId
) {}

// Author.java
public record Author(
    String id,
    String name
) {}
```

For this example, we'll use an in-memory repository:

```java
@Repository
public class BookRepository {

    private final Map<String, Book> books = new ConcurrentHashMap<>();
    private final AtomicLong idGenerator = new AtomicLong(1);

    public BookRepository() {
        // Seed with sample data
        save(new Book(null, "Clean Code", "978-0132350884", 2008, "1"));
        save(new Book(null, "The Pragmatic Programmer", "978-0135957059", 2019, "2"));
    }

    public Optional<Book> findById(String id) {
        return Optional.ofNullable(books.get(id));
    }

    public List<Book> findAll() {
        return new ArrayList<>(books.values());
    }

    public List<Book> findByAuthorId(String authorId) {
        return books.values().stream()
            .filter(book -> book.authorId().equals(authorId))
            .toList();
    }

    public Book save(Book book) {
        String id = book.id() != null ? book.id() : String.valueOf(idGenerator.getAndIncrement());
        Book savedBook = new Book(id, book.title(), book.isbn(), book.publishedYear(), book.authorId());
        books.put(id, savedBook);
        return savedBook;
    }
}
```

## Creating Query Handlers

Spring for GraphQL uses annotated controller methods to resolve queries. The `@QueryMapping` annotation wires your method to the corresponding field in your schema:

```java
@Controller
public class BookController {

    private final BookRepository bookRepository;
    private final AuthorRepository authorRepository;

    public BookController(BookRepository bookRepository, AuthorRepository authorRepository) {
        this.bookRepository = bookRepository;
        this.authorRepository = authorRepository;
    }

    // Maps to Query.bookById in the schema
    @QueryMapping
    public Book bookById(@Argument String id) {
        return bookRepository.findById(id).orElse(null);
    }

    // Maps to Query.allBooks in the schema
    @QueryMapping
    public List<Book> allBooks(@Argument String authorId) {
        if (authorId != null) {
            return bookRepository.findByAuthorId(authorId);
        }
        return bookRepository.findAll();
    }
}
```

The `@Argument` annotation binds GraphQL arguments to method parameters. Spring handles the type coercion automatically.

## Resolving Nested Fields

When a client requests `book { author { name } }`, Spring needs to know how to fetch the author. Use `@SchemaMapping` to define field resolvers:

```java
@Controller
public class BookController {

    // ... previous code ...

    // Resolves the 'author' field on the Book type
    @SchemaMapping(typeName = "Book", field = "author")
    public Author author(Book book) {
        return authorRepository.findById(book.authorId()).orElse(null);
    }

    // Resolves the 'books' field on the Author type
    @SchemaMapping(typeName = "Author", field = "books")
    public List<Book> books(Author author) {
        return bookRepository.findByAuthorId(author.id());
    }
}
```

The parent object (e.g., `Book`) is automatically passed to the resolver method. This is where the magic happens - you're in complete control of how nested data gets fetched.

## Handling Mutations

Mutations follow the same pattern. Use `@MutationMapping`:

```java
@Controller
public class BookController {

    // ... previous code ...

    @MutationMapping
    public Book createBook(@Argument CreateBookInput input) {
        Book book = new Book(
            null,
            input.title(),
            input.isbn(),
            input.publishedYear(),
            input.authorId()
        );
        return bookRepository.save(book);
    }

    @MutationMapping
    public Book updateBook(@Argument String id, @Argument UpdateBookInput input) {
        return bookRepository.findById(id)
            .map(existing -> {
                Book updated = new Book(
                    existing.id(),
                    input.title() != null ? input.title() : existing.title(),
                    input.isbn() != null ? input.isbn() : existing.isbn(),
                    input.publishedYear() != null ? input.publishedYear() : existing.publishedYear(),
                    existing.authorId()
                );
                return bookRepository.save(updated);
            })
            .orElse(null);
    }
}

// Input record for the mutation
public record CreateBookInput(String title, String isbn, Integer publishedYear, String authorId) {}
public record UpdateBookInput(String title, String isbn, Integer publishedYear) {}
```

## Solving the N+1 Problem with DataLoaders

The resolver approach above works, but it has a flaw. If you query 100 books with their authors, you'll make 100 separate author lookups. DataLoaders batch these requests:

```java
@Configuration
public class DataLoaderConfig {

    @Bean
    public BatchLoaderRegistry batchLoaderRegistry(AuthorRepository authorRepository) {
        return (registry) -> {
            registry.forTypePair(String.class, Author.class)
                .registerMappedBatchLoader((authorIds, env) -> {
                    // Fetch all authors in a single query
                    Map<String, Author> authorsById = authorRepository.findAllById(authorIds)
                        .stream()
                        .collect(Collectors.toMap(Author::id, Function.identity()));
                    return Mono.just(authorsById);
                });
        };
    }
}
```

Then update your resolver to use the DataLoader:

```java
@SchemaMapping(typeName = "Book", field = "author")
public CompletableFuture<Author> author(Book book, DataLoader<String, Author> authorLoader) {
    return authorLoader.load(book.authorId());
}
```

The DataLoader collects all the `load()` calls in a single request cycle and batches them together. Instead of 100 queries, you get one.

## Error Handling

GraphQL has its own error format. Spring for GraphQL lets you customize it:

```java
@ControllerAdvice
public class GraphQLExceptionHandler {

    @ExceptionHandler(BookNotFoundException.class)
    public GraphQLError handleNotFound(BookNotFoundException ex) {
        return GraphQLError.newError()
            .errorType(ErrorType.NOT_FOUND)
            .message(ex.getMessage())
            .build();
    }
}
```

Errors are returned in the `errors` array of the GraphQL response rather than through HTTP status codes. This is an important distinction from REST.

## Testing Your GraphQL API

Spring for GraphQL includes testing utilities:

```java
@SpringBootTest
@AutoConfigureGraphQlTester
class BookControllerTest {

    @Autowired
    private GraphQlTester graphQlTester;

    @Test
    void shouldFetchBookById() {
        graphQlTester.document("""
            query {
                bookById(id: "1") {
                    title
                    author {
                        name
                    }
                }
            }
            """)
            .execute()
            .path("bookById.title")
            .entity(String.class)
            .isEqualTo("Clean Code");
    }
}
```

## Production Considerations

Before shipping to production, address these items:

- **Query complexity limits:** Malicious clients can craft deeply nested queries that hammer your database. Use libraries like graphql-java's `MaxQueryComplexityInstrumentation`.
- **Authentication:** Integrate with Spring Security. The `SecurityContext` is available in your resolvers.
- **Caching:** Consider response caching at the CDN level for public queries, or use the DataLoader pattern for request-level caching.
- **Monitoring:** Instrument your resolvers with metrics. Track query duration, error rates, and which fields are actually used.

---

Spring for GraphQL brings the productivity of Spring's annotation-driven model to GraphQL development. The learning curve is gentle if you already know Spring MVC, and the integration with existing Spring infrastructure means you don't have to reinvent authentication, validation, or data access. Start with a simple schema, add resolvers, and iterate from there.
