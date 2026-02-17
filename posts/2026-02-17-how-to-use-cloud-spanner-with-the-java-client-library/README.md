# How to Use Cloud Spanner with the Java Client Library

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Spanner, Java, Client Library, Database

Description: A comprehensive guide to using the Cloud Spanner Java client library for CRUD operations, transactions, and production-grade database access.

---

Java is one of the most commonly used languages for enterprise applications on Google Cloud, and the Cloud Spanner Java client library is mature and full-featured. In this post, I will walk through everything you need to know to build a Java application that reads and writes to Cloud Spanner - from basic CRUD operations to transactions and error handling.

## Adding the Dependency

Add the Spanner client library to your project. For Maven:

```xml
<!-- Add to your pom.xml dependencies section -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>google-cloud-spanner</artifactId>
    <version>6.58.0</version>
</dependency>
```

For Gradle:

```groovy
// Add to your build.gradle dependencies
implementation 'com.google.cloud:google-cloud-spanner:6.58.0'
```

## Creating a Client

Like the Go client, the Java Spanner client should be created once and reused:

```java
import com.google.cloud.spanner.*;

public class SpannerService {
    private final DatabaseClient dbClient;

    public SpannerService(String projectId, String instanceId, String databaseId) {
        // Create the Spanner service and get a database client
        SpannerOptions options = SpannerOptions.newBuilder()
            .setProjectId(projectId)
            .build();

        Spanner spanner = options.getService();

        // Get a client for the specific database
        DatabaseId db = DatabaseId.of(projectId, instanceId, databaseId);
        this.dbClient = spanner.getDatabaseClient(db);
    }
}
```

In a Spring application, you would typically make this a bean:

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SpannerConfig {

    @Bean
    public DatabaseClient spannerClient() {
        // Create and configure the Spanner client as a Spring bean
        SpannerOptions options = SpannerOptions.newBuilder()
            .setProjectId("my-project")
            .build();

        Spanner spanner = options.getService();
        DatabaseId db = DatabaseId.of("my-project", "my-instance", "my-database");
        return spanner.getDatabaseClient(db);
    }
}
```

## Reading Data

### Single Row by Primary Key

```java
public User getUser(String userId) {
    // Read a single row by primary key
    Struct row = dbClient.singleUse()
        .readRow("Users",
            Key.of(userId),
            Arrays.asList("UserId", "Email", "DisplayName", "CreatedAt"));

    if (row == null) {
        return null;  // Row not found
    }

    // Map the Spanner row to a Java object
    return new User(
        row.getString("UserId"),
        row.getString("Email"),
        row.isNull("DisplayName") ? null : row.getString("DisplayName"),
        row.getTimestamp("CreatedAt")
    );
}
```

### SQL Queries

```java
public List<Order> getOrdersByUser(String userId) {
    // Execute a parameterized SQL query
    Statement statement = Statement.newBuilder(
            "SELECT OrderId, Status, TotalAmount, CreatedAt "
            + "FROM Orders "
            + "WHERE UserId = @userId "
            + "ORDER BY CreatedAt DESC "
            + "LIMIT 100")
        .bind("userId").to(userId)
        .build();

    List<Order> orders = new ArrayList<>();

    // Execute with a single-use read-only transaction
    try (ResultSet resultSet = dbClient.singleUse().executeQuery(statement)) {
        while (resultSet.next()) {
            orders.add(new Order(
                resultSet.getString("OrderId"),
                resultSet.getString("Status"),
                resultSet.getDouble("TotalAmount"),
                resultSet.getTimestamp("CreatedAt")
            ));
        }
    }

    return orders;
}
```

Always use `Statement.newBuilder` with `.bind()` for parameters. This prevents SQL injection and allows plan caching.

## Writing Data with Mutations

For simple inserts and updates:

```java
public void createUser(User user) {
    // Build an insert mutation
    Mutation mutation = Mutation.newInsertBuilder("Users")
        .set("UserId").to(user.getUserId())
        .set("Email").to(user.getEmail())
        .set("DisplayName").to(user.getDisplayName())
        .set("CreatedAt").to(Value.COMMIT_TIMESTAMP)
        .build();

    // Apply the mutation - commits immediately
    dbClient.write(Arrays.asList(mutation));
}
```

For updates:

```java
public void updateUserEmail(String userId, String newEmail) {
    // Build an update mutation - only specified columns are changed
    Mutation mutation = Mutation.newUpdateBuilder("Users")
        .set("UserId").to(userId)
        .set("Email").to(newEmail)
        .build();

    dbClient.write(Arrays.asList(mutation));
}
```

## Batch Writes

Insert multiple rows efficiently in a single transaction:

```java
public void createUsers(List<User> users) {
    // Build mutations for all users
    List<Mutation> mutations = new ArrayList<>();

    for (User user : users) {
        mutations.add(Mutation.newInsertBuilder("Users")
            .set("UserId").to(user.getUserId())
            .set("Email").to(user.getEmail())
            .set("DisplayName").to(user.getDisplayName())
            .set("CreatedAt").to(Value.COMMIT_TIMESTAMP)
            .build());
    }

    // All mutations are committed in a single transaction
    dbClient.write(mutations);
}
```

## Read-Write Transactions

When you need to read, compute, and write atomically:

```java
public void transferFunds(String fromAccountId, String toAccountId, double amount) {
    // Run a read-write transaction with automatic retries
    dbClient.readWriteTransaction().run(new TransactionCallable<Void>() {
        @Override
        public Void run(TransactionContext txn) throws Exception {
            // Read the source account balance
            Struct fromRow = txn.readRow("Accounts",
                Key.of(fromAccountId),
                Arrays.asList("Balance"));

            double fromBalance = fromRow.getDouble("Balance");

            // Check for sufficient funds
            if (fromBalance < amount) {
                throw new IllegalStateException(
                    String.format("Insufficient funds: have %.2f, need %.2f",
                        fromBalance, amount));
            }

            // Read the destination account balance
            Struct toRow = txn.readRow("Accounts",
                Key.of(toAccountId),
                Arrays.asList("Balance"));

            double toBalance = toRow.getDouble("Balance");

            // Write updated balances
            txn.buffer(Arrays.asList(
                Mutation.newUpdateBuilder("Accounts")
                    .set("AccountId").to(fromAccountId)
                    .set("Balance").to(fromBalance - amount)
                    .build(),
                Mutation.newUpdateBuilder("Accounts")
                    .set("AccountId").to(toAccountId)
                    .set("Balance").to(toBalance + amount)
                    .build()
            ));

            return null;
        }
    });
}
```

The `run` method handles retries automatically. If the transaction is aborted due to contention, the callable is invoked again. Make sure your callable is idempotent and does not have side effects.

## Using DML in Transactions

You can also use DML statements inside transactions:

```java
public long shipPendingOrders(String customerId) {
    // Use DML in a read-write transaction
    return dbClient.readWriteTransaction().run(new TransactionCallable<Long>() {
        @Override
        public Long run(TransactionContext txn) throws Exception {
            // Execute a DML update and get the affected row count
            long rowCount = txn.executeUpdate(Statement.newBuilder(
                "UPDATE Orders SET Status = 'SHIPPED' "
                + "WHERE CustomerId = @customerId AND Status = 'PENDING'")
                .bind("customerId").to(customerId)
                .build());

            // Log the result if any rows were updated
            if (rowCount > 0) {
                txn.executeUpdate(Statement.newBuilder(
                    "INSERT INTO AuditLog (LogId, Message, CreatedAt) "
                    + "VALUES (@logId, @message, PENDING_COMMIT_TIMESTAMP())")
                    .bind("logId").to(UUID.randomUUID().toString())
                    .bind("message").to(
                        String.format("Shipped %d orders for %s", rowCount, customerId))
                    .build());
            }

            return rowCount;
        }
    });
}
```

## Read-Only Transactions

For consistent reads across multiple queries:

```java
public Dashboard getCustomerDashboard(String customerId) {
    // Create a read-only transaction for consistent snapshot reads
    try (ReadOnlyTransaction txn = dbClient.readOnlyTransaction()) {

        // First query: get user info
        Struct userRow = txn.readRow("Users",
            Key.of(customerId),
            Arrays.asList("DisplayName", "Email"));

        String name = userRow.getString("DisplayName");
        String email = userRow.getString("Email");

        // Second query: count orders - sees same snapshot as first query
        Statement countStmt = Statement.newBuilder(
            "SELECT COUNT(*) AS cnt FROM Orders WHERE UserId = @userId")
            .bind("userId").to(customerId)
            .build();

        long orderCount;
        try (ResultSet rs = txn.executeQuery(countStmt)) {
            rs.next();
            orderCount = rs.getLong("cnt");
        }

        return new Dashboard(name, email, orderCount);
    }
}
```

## Error Handling

Handle Spanner exceptions properly in Java:

```java
import com.google.cloud.spanner.SpannerException;
import com.google.cloud.spanner.ErrorCode;

public User getUserSafe(String userId) {
    try {
        Struct row = dbClient.singleUse()
            .readRow("Users", Key.of(userId),
                Arrays.asList("UserId", "Email", "DisplayName"));

        if (row == null) {
            throw new UserNotFoundException("User not found: " + userId);
        }

        return mapRowToUser(row);

    } catch (SpannerException e) {
        // Handle specific Spanner error codes
        if (e.getErrorCode() == ErrorCode.NOT_FOUND) {
            throw new UserNotFoundException("User not found: " + userId);
        } else if (e.getErrorCode() == ErrorCode.DEADLINE_EXCEEDED) {
            throw new ServiceTimeoutException("Spanner query timed out", e);
        } else {
            throw new DatabaseException("Spanner error: " + e.getMessage(), e);
        }
    }
}
```

## Connection Pooling Configuration

For production, configure the session pool:

```java
SpannerOptions options = SpannerOptions.newBuilder()
    .setProjectId("my-project")
    .setSessionPoolOption(SessionPoolOptions.newBuilder()
        .setMinSessions(10)       // Minimum sessions to keep open
        .setMaxSessions(100)      // Maximum concurrent sessions
        .setWriteSessionsFraction(0.2f)  // 20% prepared for writes
        .build())
    .build();
```

## Wrapping Up

The Cloud Spanner Java client library follows familiar patterns that Java developers will recognize. The key patterns to remember are: use `singleUse()` for simple one-off reads, `readOnlyTransaction()` for consistent multi-query reads, `write()` for simple mutations, and `readWriteTransaction().run()` for atomic read-then-write operations. Always use parameterized queries, create one client per database, and handle `SpannerException` with appropriate error code checks. With these building blocks, you can build reliable, performant Java applications on Cloud Spanner.
