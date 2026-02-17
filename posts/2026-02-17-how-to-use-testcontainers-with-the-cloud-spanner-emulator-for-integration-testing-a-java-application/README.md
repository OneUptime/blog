# How to Use Testcontainers with the Cloud Spanner Emulator for Integration Testing a Java Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Spanner, Testcontainers, Integration Testing, Java, Testing

Description: Set up Testcontainers with the Cloud Spanner emulator to run fast, reliable integration tests for Java applications without connecting to a real Spanner instance.

---

Integration testing against Cloud Spanner can be expensive and slow if you use a real instance. The Spanner emulator solves this by providing a local, in-memory Spanner that you can spin up and tear down in seconds. Combine it with Testcontainers, and you get isolated, reproducible test environments that start as Docker containers and clean up after themselves.

In this post, I will show you how to set up Testcontainers with the Cloud Spanner emulator for integration testing a Java application.

## Why Testcontainers?

You could run the Spanner emulator manually with `gcloud emulators spanner start`, but that means every developer needs to remember to start it before running tests, and CI pipelines need special setup. Testcontainers manages the Docker container lifecycle from within your test code. The emulator starts before your tests and stops after, with no manual intervention.

## Dependencies

```xml
<!-- Testcontainers core -->
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers</artifactId>
    <version>1.19.3</version>
    <scope>test</scope>
</dependency>

<!-- Testcontainers GCloud module for Spanner emulator -->
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>gcloud</artifactId>
    <version>1.19.3</version>
    <scope>test</scope>
</dependency>

<!-- JUnit 5 integration -->
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>1.19.3</version>
    <scope>test</scope>
</dependency>

<!-- Spanner client library -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>google-cloud-spanner</artifactId>
</dependency>

<!-- JUnit 5 -->
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
```

## Setting Up the Spanner Emulator Container

Testcontainers provides a `SpannerEmulatorContainer` that wraps the official emulator Docker image:

```java
// Base test class that manages the Spanner emulator lifecycle
@Testcontainers
public abstract class SpannerIntegrationTest {

    // The emulator container - shared across all tests in the class
    @Container
    private static final SpannerEmulatorContainer emulator =
            new SpannerEmulatorContainer(
                    DockerImageName.parse("gcr.io/cloud-spanner-emulator/emulator:latest"));

    protected static Spanner spanner;
    protected static DatabaseClient databaseClient;

    private static final String PROJECT_ID = "test-project";
    private static final String INSTANCE_ID = "test-instance";
    private static final String DATABASE_ID = "test-database";

    @BeforeAll
    static void setupSpanner() throws Exception {
        // Create a Spanner client connected to the emulator
        SpannerOptions options = SpannerOptions.newBuilder()
                .setEmulatorHost(emulator.getEmulatorGrpcEndpoint())
                .setProjectId(PROJECT_ID)
                .build();

        spanner = options.getService();

        // Create the instance
        InstanceAdminClient instanceAdmin = spanner.getInstanceAdminClient();
        InstanceConfig config = instanceAdmin.listInstanceConfigs().iterateAll()
                .iterator().next();

        instanceAdmin.createInstance(
                InstanceInfo.newBuilder(InstanceId.of(PROJECT_ID, INSTANCE_ID))
                        .setInstanceConfigId(config.getId())
                        .setDisplayName("Test Instance")
                        .setNodeCount(1)
                        .build())
                .get();

        // Create the database with schema
        DatabaseAdminClient dbAdmin = spanner.getDatabaseAdminClient();
        dbAdmin.createDatabase(
                INSTANCE_ID,
                DATABASE_ID,
                List.of(
                        "CREATE TABLE users ("
                                + "  user_id STRING(36) NOT NULL,"
                                + "  email STRING(255) NOT NULL,"
                                + "  display_name STRING(100),"
                                + "  created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true)"
                                + ") PRIMARY KEY (user_id)",

                        "CREATE TABLE orders ("
                                + "  order_id STRING(36) NOT NULL,"
                                + "  user_id STRING(36) NOT NULL,"
                                + "  total FLOAT64 NOT NULL,"
                                + "  status STRING(20) NOT NULL,"
                                + "  created_at TIMESTAMP NOT NULL"
                                + ") PRIMARY KEY (order_id)",

                        "CREATE INDEX idx_orders_user ON orders(user_id)"
                ))
                .get();

        // Get a database client for test operations
        databaseClient = spanner.getDatabaseClient(
                DatabaseId.of(PROJECT_ID, INSTANCE_ID, DATABASE_ID));
    }

    @AfterAll
    static void tearDown() {
        if (spanner != null) {
            spanner.close();
        }
    }
}
```

## Writing Integration Tests

Now write tests that use the emulator:

```java
class UserRepositoryTest extends SpannerIntegrationTest {

    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        // Initialize the repository with the emulator database client
        userRepository = new UserRepository(databaseClient);

        // Clean up data from previous tests
        cleanTable("users");
    }

    @Test
    void shouldCreateAndRetrieveUser() {
        // Create a user
        User user = new User("user-1", "alice@example.com", "Alice");
        userRepository.create(user);

        // Retrieve and verify
        Optional<User> retrieved = userRepository.findById("user-1");
        assertTrue(retrieved.isPresent());
        assertEquals("alice@example.com", retrieved.get().getEmail());
        assertEquals("Alice", retrieved.get().getDisplayName());
    }

    @Test
    void shouldReturnEmptyForNonexistentUser() {
        Optional<User> result = userRepository.findById("nonexistent");
        assertTrue(result.isEmpty());
    }

    @Test
    void shouldListAllUsers() {
        // Insert multiple users
        userRepository.create(new User("user-1", "alice@example.com", "Alice"));
        userRepository.create(new User("user-2", "bob@example.com", "Bob"));
        userRepository.create(new User("user-3", "carol@example.com", "Carol"));

        List<User> users = userRepository.findAll();
        assertEquals(3, users.size());
    }

    @Test
    void shouldUpdateUser() {
        userRepository.create(new User("user-1", "alice@example.com", "Alice"));

        userRepository.updateDisplayName("user-1", "Alice Smith");

        Optional<User> updated = userRepository.findById("user-1");
        assertTrue(updated.isPresent());
        assertEquals("Alice Smith", updated.get().getDisplayName());
    }

    // Helper to clean a table between tests
    private void cleanTable(String tableName) {
        databaseClient.write(List.of(
                Mutation.delete(tableName, KeySet.all())));
    }
}
```

## Testing Transactions

Test that transactions work correctly with the emulator:

```java
class TransactionTest extends SpannerIntegrationTest {

    @BeforeEach
    void setUp() {
        // Insert test data
        databaseClient.write(List.of(
                Mutation.newInsertBuilder("users")
                        .set("user_id").to("user-1")
                        .set("email").to("alice@example.com")
                        .set("display_name").to("Alice")
                        .set("created_at").to(Value.COMMIT_TIMESTAMP)
                        .build()));
    }

    @AfterEach
    void cleanUp() {
        databaseClient.write(List.of(
                Mutation.delete("users", KeySet.all()),
                Mutation.delete("orders", KeySet.all())));
    }

    @Test
    void shouldExecuteReadWriteTransaction() {
        // Run a transaction that reads and writes
        databaseClient.readWriteTransaction().run(transaction -> {
            // Read within the transaction
            Struct row = transaction.readRow(
                    "users",
                    Key.of("user-1"),
                    List.of("user_id", "email"));

            assertNotNull(row);
            assertEquals("alice@example.com", row.getString("email"));

            // Write within the same transaction
            transaction.buffer(Mutation.newInsertBuilder("orders")
                    .set("order_id").to("order-1")
                    .set("user_id").to("user-1")
                    .set("total").to(99.99)
                    .set("status").to("PENDING")
                    .set("created_at").to(Timestamp.now())
                    .build());

            return null;
        });

        // Verify the order was created
        Struct order = databaseClient.singleUse().readRow(
                "orders",
                Key.of("order-1"),
                List.of("order_id", "total", "status"));

        assertNotNull(order);
        assertEquals(99.99, order.getDouble("total"), 0.01);
    }

    @Test
    void shouldRollbackOnException() {
        assertThrows(SpannerException.class, () -> {
            databaseClient.readWriteTransaction().run(transaction -> {
                transaction.buffer(Mutation.newInsertBuilder("orders")
                        .set("order_id").to("order-2")
                        .set("user_id").to("user-1")
                        .set("total").to(50.00)
                        .set("status").to("PENDING")
                        .set("created_at").to(Timestamp.now())
                        .build());

                // Force an error - this should roll back the entire transaction
                throw new RuntimeException("Simulated failure");
            });
        });

        // Verify the order was not created
        Struct order = databaseClient.singleUse().readRow(
                "orders",
                Key.of("order-2"),
                List.of("order_id"));

        assertNull(order);
    }
}
```

## Spring Boot Integration Test

If you are using Spring Boot with Spring Cloud GCP Spanner, configure the test to use the emulator:

```java
@SpringBootTest
@Testcontainers
public class SpringSpannerIntegrationTest {

    @Container
    static SpannerEmulatorContainer emulator = new SpannerEmulatorContainer(
            DockerImageName.parse("gcr.io/cloud-spanner-emulator/emulator:latest"));

    // Override Spring configuration to point to the emulator
    @DynamicPropertySource
    static void setProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.cloud.gcp.spanner.emulator-host",
                emulator::getEmulatorGrpcEndpoint);
        registry.add("spring.cloud.gcp.spanner.project-id", () -> "test-project");
        registry.add("spring.cloud.gcp.spanner.instance-id", () -> "test-instance");
        registry.add("spring.cloud.gcp.spanner.database", () -> "test-db");
    }

    @Autowired
    private UserRepository userRepository;

    @Test
    void contextLoads() {
        assertNotNull(userRepository);
    }
}
```

## CI Pipeline Integration

The Testcontainers approach works in CI/CD pipelines as long as Docker is available. Here is a GitHub Actions example:

```yaml
# .github/workflows/test.yml
name: Integration Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - name: Run integration tests
        run: ./mvnw verify -Pit
```

No special Docker setup is needed. GitHub Actions runners have Docker pre-installed, and Testcontainers handles the rest.

## Wrapping Up

Testcontainers with the Cloud Spanner emulator gives you fast, isolated integration tests that do not touch real GCP infrastructure. The emulator supports the full Spanner API including transactions, secondary indexes, and schema DDL. Tests are reproducible because each run starts with a clean emulator instance. The main limitation is that the emulator does not replicate Spanner's distributed behavior - you will not see the same latency characteristics or multi-region consistency. But for testing your application logic, data access patterns, and transaction correctness, it is exactly what you need.
