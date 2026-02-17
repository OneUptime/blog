# How to Build a GraphQL API with Spring Boot and Deploy to Azure App Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GraphQL, Spring Boot, Azure App Service, Java, API Development, Spring GraphQL, Deployment

Description: Learn how to build a GraphQL API with Spring Boot using Spring for GraphQL and deploy it to Azure App Service for production-ready hosting.

---

GraphQL gives clients the power to request exactly the data they need, nothing more and nothing less. Instead of hitting multiple REST endpoints and stitching data together on the client side, a single GraphQL query returns a precisely shaped response. Spring for GraphQL integrates this capability directly into the Spring Boot ecosystem, using annotations and a schema-first approach that feels natural to Spring developers.

In this post, we will build a GraphQL API with Spring Boot, implement queries, mutations, and subscriptions, and then deploy the whole thing to Azure App Service.

## Why GraphQL Over REST?

REST works well for many use cases, but it has limitations. Over-fetching is common: you request a user profile and get back 30 fields when you only need three. Under-fetching is also common: you need data from three different endpoints and have to make three separate HTTP requests. GraphQL solves both problems. The client specifies exactly what it wants, and the server returns exactly that.

For mobile applications dealing with limited bandwidth, or dashboards that aggregate data from many entities, GraphQL can significantly reduce payload sizes and the number of round trips.

## Setting Up the Project

Create a Spring Boot project with GraphQL support.

```xml
<!-- pom.xml -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
</parent>

<dependencies>
    <!-- Spring Boot Web Starter -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Spring for GraphQL -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-graphql</artifactId>
    </dependency>

    <!-- Spring Data JPA for database access -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <!-- H2 for local development, MySQL for production -->
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>runtime</scope>
    </dependency>

    <!-- Spring Boot Actuator for health checks -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
</dependencies>
```

## Defining the GraphQL Schema

Spring for GraphQL uses a schema-first approach. Define your types, queries, and mutations in a `.graphqls` file.

```graphql
# src/main/resources/graphql/schema.graphqls

# Product type with all available fields
type Product {
    id: ID!
    name: String!
    description: String
    price: Float!
    category: String!
    inStock: Boolean!
    reviews: [Review!]!
}

# Review type linked to a product
type Review {
    id: ID!
    rating: Int!
    comment: String
    author: String!
    createdAt: String!
}

# Input type for creating products
input CreateProductInput {
    name: String!
    description: String
    price: Float!
    category: String!
}

# Input type for creating reviews
input CreateReviewInput {
    productId: ID!
    rating: Int!
    comment: String
    author: String!
}

# Root query type - entry points for reading data
type Query {
    # Get a single product by ID
    product(id: ID!): Product

    # List products with optional filtering
    products(category: String, minPrice: Float, maxPrice: Float): [Product!]!

    # Search products by name
    searchProducts(keyword: String!): [Product!]!
}

# Root mutation type - entry points for modifying data
type Mutation {
    # Create a new product
    createProduct(input: CreateProductInput!): Product!

    # Update an existing product's price
    updateProductPrice(id: ID!, price: Float!): Product

    # Add a review to a product
    addReview(input: CreateReviewInput!): Review!

    # Delete a product
    deleteProduct(id: ID!): Boolean!
}
```

## Defining the JPA Entities

Map the GraphQL types to JPA entities.

```java
// Product entity
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private Double price;

    @Column(nullable = false)
    private String category;

    private boolean inStock = true;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Review> reviews = new ArrayList<>();

    // Constructors
    public Product() {}

    public Product(String name, String description, Double price, String category) {
        this.name = name;
        this.description = description;
        this.price = price;
        this.category = category;
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public boolean isInStock() { return inStock; }
    public void setInStock(boolean inStock) { this.inStock = inStock; }
    public List<Review> getReviews() { return reviews; }
    public void setReviews(List<Review> reviews) { this.reviews = reviews; }
}
```

```java
// Review entity
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer rating;

    private String comment;

    @Column(nullable = false)
    private String author;

    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    public Review() {}

    // Getters and setters omitted for brevity
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
}
```

## Implementing the GraphQL Controllers

Spring for GraphQL uses `@Controller` classes with `@QueryMapping` and `@MutationMapping` annotations.

```java
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
public class ProductController {

    private final ProductRepository productRepository;
    private final ReviewRepository reviewRepository;

    public ProductController(ProductRepository productRepository,
                             ReviewRepository reviewRepository) {
        this.productRepository = productRepository;
        this.reviewRepository = reviewRepository;
    }

    // Query: get a single product
    @QueryMapping
    public Product product(@Argument Long id) {
        return productRepository.findById(id).orElse(null);
    }

    // Query: list products with optional filters
    @QueryMapping
    public List<Product> products(@Argument String category,
                                   @Argument Double minPrice,
                                   @Argument Double maxPrice) {
        if (category != null && minPrice != null && maxPrice != null) {
            return productRepository.findByCategoryAndPriceBetween(category, minPrice, maxPrice);
        }
        if (category != null) {
            return productRepository.findByCategory(category);
        }
        return productRepository.findAll();
    }

    // Query: search by keyword
    @QueryMapping
    public List<Product> searchProducts(@Argument String keyword) {
        return productRepository.findByNameContainingIgnoreCase(keyword);
    }

    // Mutation: create a product
    @MutationMapping
    public Product createProduct(@Argument CreateProductInput input) {
        Product product = new Product(
            input.name(), input.description(), input.price(), input.category());
        return productRepository.save(product);
    }

    // Mutation: update product price
    @MutationMapping
    public Product updateProductPrice(@Argument Long id, @Argument Double price) {
        return productRepository.findById(id).map(product -> {
            product.setPrice(price);
            return productRepository.save(product);
        }).orElse(null);
    }

    // Mutation: add a review
    @MutationMapping
    public Review addReview(@Argument CreateReviewInput input) {
        Product product = productRepository.findById(input.productId())
            .orElseThrow(() -> new RuntimeException("Product not found"));

        Review review = new Review();
        review.setRating(input.rating());
        review.setComment(input.comment());
        review.setAuthor(input.author());
        review.setProduct(product);

        return reviewRepository.save(review);
    }

    // Mutation: delete a product
    @MutationMapping
    public boolean deleteProduct(@Argument Long id) {
        if (productRepository.existsById(id)) {
            productRepository.deleteById(id);
            return true;
        }
        return false;
    }

    // Schema mapping: resolve reviews for a product (loaded on demand)
    @SchemaMapping(typeName = "Product", field = "reviews")
    public List<Review> reviews(Product product) {
        return reviewRepository.findByProductId(product.getId());
    }
}

// Input record types matching the GraphQL input types
record CreateProductInput(String name, String description, Double price, String category) {}
record CreateReviewInput(Long productId, Integer rating, String comment, String author) {}
```

## Application Configuration

```yaml
# application.yml
spring:
  graphql:
    # Enable the GraphiQL browser IDE for testing
    graphiql:
      enabled: true
      path: /graphiql
    # Schema location
    schema:
      locations: classpath:graphql/
    # Enable the GraphQL endpoint
    path: /graphql

  h2:
    console:
      enabled: true

  datasource:
    url: jdbc:h2:mem:graphqldb
    driver-class-name: org.h2.Driver

  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true

server:
  port: 8080
```

## Testing GraphQL Queries

Start the application and navigate to `http://localhost:8080/graphiql` for the interactive query editor. Here are some example queries.

```graphql
# Create a product
mutation {
  createProduct(input: {
    name: "Wireless Mouse"
    description: "Ergonomic wireless mouse"
    price: 49.99
    category: "Electronics"
  }) {
    id
    name
    price
  }
}

# Query products with only the fields you need
query {
  products(category: "Electronics") {
    id
    name
    price
    reviews {
      rating
      author
    }
  }
}

# Search products
query {
  searchProducts(keyword: "mouse") {
    name
    price
    inStock
  }
}
```

## Deploying to Azure App Service

Package the application and deploy using the Azure Maven plugin.

```xml
<!-- Add to pom.xml -->
<plugin>
    <groupId>com.microsoft.azure</groupId>
    <artifactId>azure-webapp-maven-plugin</artifactId>
    <version>2.12.0</version>
    <configuration>
        <resourceGroup>graphql-demo-rg</resourceGroup>
        <appName>my-graphql-api</appName>
        <region>eastus</region>
        <pricingTier>B1</pricingTier>
        <runtime>
            <os>Linux</os>
            <javaVersion>Java 17</javaVersion>
            <webContainer>Java SE</webContainer>
        </runtime>
        <appSettings>
            <property>
                <name>SPRING_PROFILES_ACTIVE</name>
                <value>azure</value>
            </property>
        </appSettings>
        <deployment>
            <resources>
                <resource>
                    <directory>${project.basedir}/target</directory>
                    <includes>
                        <include>*.jar</include>
                    </includes>
                </resource>
            </resources>
        </deployment>
    </configuration>
</plugin>
```

Deploy with a single command.

```bash
# Build and deploy
mvn clean package azure-webapp:deploy
```

For production, switch from H2 to a real database like Azure Database for MySQL and disable GraphiQL.

```yaml
# application-azure.yml
spring:
  graphql:
    graphiql:
      enabled: false    # Disable in production
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
```

## Wrapping Up

Spring for GraphQL gives you a clean, schema-first approach to building GraphQL APIs in Java. The annotation-based programming model fits naturally into the Spring ecosystem. Combined with Azure App Service, you get managed hosting with auto-scaling, SSL, and deployment slots. Start by defining your schema, implement the resolvers, and deploy. GraphQL is particularly powerful when your clients have varied data needs, as it eliminates both over-fetching and under-fetching in a single request.
