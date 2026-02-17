# How to Build a Micronaut Application with Cloud SQL Connection Using Micronaut Data JDBC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, Micronaut, Micronaut Data, JDBC, Java

Description: Build a Micronaut application connected to Cloud SQL using Micronaut Data JDBC for compile-time data access with fast startup times and low memory overhead.

---

Micronaut Data JDBC is an alternative to JPA that generates data access code at compile time. There is no reflection, no runtime proxy generation, and no lazy loading surprises. The SQL queries are built during compilation, which means faster startup and lower memory usage. When you connect this to Cloud SQL, you get a lightweight, fast-starting application that works well on Cloud Run or GKE.

In this post, I will build a Micronaut application with Micronaut Data JDBC connected to a Cloud SQL instance.

## Project Setup

Create a Micronaut project with the required dependencies. Here is the Gradle build file:

```groovy
// build.gradle
plugins {
    id("io.micronaut.application") version "4.2.1"
}

dependencies {
    // Micronaut Data JDBC for compile-time data access
    annotationProcessor("io.micronaut.data:micronaut-data-processor")

    implementation("io.micronaut.data:micronaut-data-jdbc")
    implementation("io.micronaut.sql:micronaut-jdbc-hikari")

    // MySQL driver
    runtimeOnly("com.mysql:mysql-connector-j")

    // Cloud SQL Socket Factory for secure connection
    runtimeOnly("com.google.cloud.sql:mysql-socket-factory-connector-j-8:1.15.2")

    // Serialization
    annotationProcessor("io.micronaut.serde:micronaut-serde-processor")
    implementation("io.micronaut.serde:micronaut-serde-jackson")

    // HTTP server
    implementation("io.micronaut:micronaut-http-server-netty")
}

micronaut {
    runtime("netty")
    processing {
        incremental(true)
        annotations("com.example.*")
    }
}
```

## Database Configuration

Configure the datasource in `application.yml`:

```yaml
# application.yml
datasources:
  default:
    # Cloud SQL connection via socket factory
    url: jdbc:mysql:///mydb?cloudSqlInstance=my-project:us-central1:my-instance&socketFactory=com.google.cloud.sql.mysql.SocketFactory
    username: app_user
    password: ${DB_PASSWORD}
    dialect: MYSQL
    driver-class-name: com.mysql.cj.jdbc.Driver
    # HikariCP pool settings
    maximum-pool-size: 5
    minimum-idle: 2
```

For local development, you can use a different profile:

```yaml
# application-local.yml
datasources:
  default:
    url: jdbc:mysql://localhost:3306/mydb
    username: root
    password: localpassword
    dialect: MYSQL
```

## Defining the Entity

Micronaut Data JDBC entities use annotations similar to JPA but from the Micronaut Data package:

```java
// Entity representing a customer record in the database
@MappedEntity("customers")
public class Customer {

    @Id
    @GeneratedValue(GeneratedValue.Type.AUTO)
    private Long id;

    @Column("full_name")
    private String fullName;

    @Column("email")
    private String email;

    @Column("phone")
    private String phone;

    @Column("tier")
    private String tier;

    @DateCreated
    @Column("created_at")
    private Instant createdAt;

    @DateUpdated
    @Column("updated_at")
    private Instant updatedAt;

    // Default constructor
    public Customer() {}

    public Customer(String fullName, String email, String phone, String tier) {
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.tier = tier;
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
```

## The Repository

Micronaut Data repositories look like Spring Data repositories, but the implementation is generated at compile time:

```java
// Repository interface - Micronaut Data generates the implementation at compile time
@JdbcRepository(dialect = Dialect.MYSQL)
public interface CustomerRepository extends CrudRepository<Customer, Long> {

    // Find customers by tier - query derived from method name
    List<Customer> findByTier(String tier);

    // Find a customer by email
    Optional<Customer> findByEmail(String email);

    // Custom query using raw SQL
    @Query("SELECT * FROM customers WHERE full_name LIKE :name")
    List<Customer> searchByName(String name);

    // Count customers by tier
    long countByTier(String tier);

    // Find customers with pagination
    Page<Customer> findAll(Pageable pageable);

    // Update a customer's tier
    void updateTier(@Id Long id, String tier);
}
```

The key difference from Spring Data is that Micronaut Data does not use reflection at runtime. When you compile this project, Micronaut generates actual Java source code for the repository implementation, including the SQL statements.

## The Controller

Build a REST API with the standard Micronaut HTTP annotations:

```java
@Controller("/api/customers")
public class CustomerController {

    private final CustomerRepository customerRepository;

    // Constructor injection
    public CustomerController(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @Get
    public List<Customer> listAll() {
        return StreamSupport.stream(
                customerRepository.findAll().spliterator(), false)
                .collect(Collectors.toList());
    }

    @Get("/{id}")
    public HttpResponse<Customer> getById(Long id) {
        return customerRepository.findById(id)
                .map(HttpResponse::ok)
                .orElse(HttpResponse.notFound());
    }

    @Post
    @Status(HttpStatus.CREATED)
    public Customer create(@Body Customer customer) {
        return customerRepository.save(customer);
    }

    @Put("/{id}")
    public HttpResponse<Customer> update(Long id, @Body Customer customer) {
        if (customerRepository.findById(id).isEmpty()) {
            return HttpResponse.notFound();
        }
        customer.setId(id);
        return HttpResponse.ok(customerRepository.update(customer));
    }

    @Delete("/{id}")
    @Status(HttpStatus.NO_CONTENT)
    public void delete(Long id) {
        customerRepository.deleteById(id);
    }

    // Paginated endpoint
    @Get("/page{?page,size}")
    public Page<Customer> listPaginated(@QueryValue(defaultValue = "0") int page,
                                         @QueryValue(defaultValue = "20") int size) {
        return customerRepository.findAll(Pageable.from(page, size));
    }

    // Search endpoint
    @Get("/search{?name}")
    public List<Customer> search(@QueryValue String name) {
        return customerRepository.searchByName("%" + name + "%");
    }

    // Filter by tier
    @Get("/tier/{tier}")
    public List<Customer> getByTier(String tier) {
        return customerRepository.findByTier(tier);
    }
}
```

## Schema Management with Flyway

Add Flyway for schema migrations:

```groovy
// Add to build.gradle
implementation("io.micronaut.flyway:micronaut-flyway")
```

```yaml
# Flyway configuration in application.yml
flyway:
  datasources:
    default:
      enabled: true
      locations: classpath:db/migration
```

```sql
-- src/main/resources/db/migration/V1__create_customers.sql
CREATE TABLE customers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    tier VARCHAR(20) DEFAULT 'BASIC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customers_email (email),
    INDEX idx_customers_tier (tier)
) ENGINE=InnoDB;
```

## Transaction Support

Micronaut Data supports transactions through the `@Transactional` annotation:

```java
@Singleton
public class CustomerService {

    private final CustomerRepository customerRepository;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    // Transactional operation that upgrades a customer and logs the change
    @Transactional
    public Customer upgradeTier(Long customerId, String newTier) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        String oldTier = customer.getTier();
        customer.setTier(newTier);
        Customer updated = customerRepository.update(customer);

        // Additional operations within the same transaction
        System.out.println("Upgraded customer " + customerId
                + " from " + oldTier + " to " + newTier);

        return updated;
    }
}
```

## Testing

Micronaut has built-in test support with an embedded server:

```java
@MicronautTest
public class CustomerControllerTest {

    @Inject
    @Client("/")
    HttpClient client;

    @Test
    void testCreateAndRetrieveCustomer() {
        // Create a customer
        Customer newCustomer = new Customer("Jane Doe", "jane@example.com", "555-1234", "PREMIUM");
        HttpResponse<Customer> createResponse = client.toBlocking()
                .exchange(HttpRequest.POST("/api/customers", newCustomer), Customer.class);

        assertEquals(HttpStatus.CREATED, createResponse.getStatus());
        Customer created = createResponse.body();
        assertNotNull(created.getId());

        // Retrieve the customer
        Customer retrieved = client.toBlocking()
                .retrieve(HttpRequest.GET("/api/customers/" + created.getId()), Customer.class);

        assertEquals("Jane Doe", retrieved.getFullName());
        assertEquals("PREMIUM", retrieved.getTier());
    }
}
```

## Deployment to Cloud Run

Package and deploy:

```bash
# Build the application
./gradlew build

# Build the Docker image
docker build -t gcr.io/my-project/customer-service .

# Push and deploy
docker push gcr.io/my-project/customer-service

gcloud run deploy customer-service \
    --image gcr.io/my-project/customer-service:latest \
    --add-cloudsql-instances my-project:us-central1:my-instance \
    --set-env-vars DB_PASSWORD=secret \
    --memory 256Mi \
    --region us-central1
```

Notice the memory setting. Micronaut with JDBC typically needs only 256MB, compared to 512MB or more for a Spring Boot JPA application.

## Wrapping Up

Micronaut Data JDBC with Cloud SQL gives you a fast, lightweight data access layer. The compile-time query generation means no reflection overhead at runtime, which translates to faster startup and lower memory usage. The repository interface is familiar if you have used Spring Data, and the connection to Cloud SQL through the socket factory works the same as with any other Java framework. For applications where startup time and memory efficiency matter - like Cloud Run or Cloud Functions - this combination is hard to beat.
