# How to Perform Read-Write Transactions on Cloud Spanner from a Spring Boot Application Using Spring Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Spanner, Spring Boot, Spring Data, Transactions, Java

Description: A practical guide to implementing read-write transactions on Google Cloud Spanner from a Spring Boot application using Spring Data Spanner for consistent, scalable data operations.

---

Cloud Spanner is Google's globally distributed, strongly consistent database. When you pair it with Spring Boot through the Spring Cloud GCP Spanner module, you get a familiar programming model for a database that operates at a scale most relational databases cannot touch. But transactions on Spanner work differently from what you might be used to with MySQL or PostgreSQL, and understanding those differences matters.

In this post, I will walk through building a Spring Boot application that performs read-write transactions against Cloud Spanner using Spring Data.

## Setting Up the Project

You need a few dependencies in your `pom.xml` to get started. The Spring Cloud GCP Spanner starter handles most of the configuration for you.

```xml
<!-- Spring Cloud GCP Spanner starter - handles auto-configuration -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>spring-cloud-gcp-starter-data-spanner</artifactId>
</dependency>

<!-- Spring Boot Web starter for REST endpoints -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

Configure the Spanner connection in `application.properties`:

```properties
# Spanner instance and database configuration
spring.cloud.gcp.spanner.instance-id=my-instance
spring.cloud.gcp.spanner.database=my-database
spring.cloud.gcp.project-id=my-project
```

## Defining the Entities

Spanner entities look a lot like JPA entities, but they use Spanner-specific annotations from the Spring Data Spanner module.

```java
// Entity mapped to the accounts table in Spanner
@Table(name = "accounts")
public class Account {

    @PrimaryKey
    private String accountId;

    @Column(name = "owner_name")
    private String ownerName;

    @Column(name = "balance")
    private BigDecimal balance;

    @Column(name = "last_updated")
    private Timestamp lastUpdated;

    // Default constructor required by Spring Data
    public Account() {}

    public Account(String accountId, String ownerName, BigDecimal balance) {
        this.accountId = accountId;
        this.ownerName = ownerName;
        this.balance = balance;
        this.lastUpdated = Timestamp.now();
    }

    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }
    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }
    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
    public Timestamp getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(Timestamp lastUpdated) { this.lastUpdated = lastUpdated; }
}
```

And here is a transaction log entity to track transfers:

```java
// Entity for recording transaction history
@Table(name = "transaction_log")
public class TransactionLog {

    @PrimaryKey(keyOrder = 1)
    private String transactionId;

    @Column(name = "from_account")
    private String fromAccount;

    @Column(name = "to_account")
    private String toAccount;

    @Column(name = "amount")
    private BigDecimal amount;

    @Column(name = "timestamp")
    private Timestamp timestamp;

    public TransactionLog() {}

    public TransactionLog(String transactionId, String fromAccount,
                          String toAccount, BigDecimal amount) {
        this.transactionId = transactionId;
        this.fromAccount = fromAccount;
        this.toAccount = toAccount;
        this.amount = amount;
        this.timestamp = Timestamp.now();
    }

    // Getters and setters
    public String getTransactionId() { return transactionId; }
    public BigDecimal getAmount() { return amount; }
}
```

## Creating the Repository

The repository interface extends `SpannerRepository`, which gives you standard CRUD operations plus Spanner-specific query support.

```java
// Repository for account operations with custom Spanner SQL queries
public interface AccountRepository extends SpannerRepository<Account, String> {

    // Find accounts with balance above a threshold
    @Query("SELECT * FROM accounts WHERE balance > @minBalance")
    List<Account> findAccountsAboveBalance(@Param("minBalance") BigDecimal minBalance);

    // Find account by owner name
    List<Account> findByOwnerName(String ownerName);
}
```

```java
// Repository for transaction log entries
public interface TransactionLogRepository extends SpannerRepository<TransactionLog, String> {

    @Query("SELECT * FROM transaction_log WHERE from_account = @accountId OR to_account = @accountId ORDER BY timestamp DESC")
    List<TransactionLog> findByAccountId(@Param("accountId") String accountId);
}
```

## Implementing Read-Write Transactions

This is where things get interesting. Spanner read-write transactions use a two-phase commit protocol and are strongly consistent across regions. Spring Data Spanner supports the `@Transactional` annotation, but you can also use the `SpannerTemplate` for more control.

Here is a service that performs a money transfer using `@Transactional`:

```java
@Service
public class TransferService {

    private final AccountRepository accountRepository;
    private final TransactionLogRepository transactionLogRepository;

    public TransferService(AccountRepository accountRepository,
                           TransactionLogRepository transactionLogRepository) {
        this.accountRepository = accountRepository;
        this.transactionLogRepository = transactionLogRepository;
    }

    // The @Transactional annotation wraps this method in a Spanner read-write transaction
    @Transactional
    public TransactionLog transfer(String fromAccountId, String toAccountId, BigDecimal amount) {

        // Read both accounts within the transaction
        Account fromAccount = accountRepository.findById(fromAccountId)
                .orElseThrow(() -> new RuntimeException("Source account not found: " + fromAccountId));

        Account toAccount = accountRepository.findById(toAccountId)
                .orElseThrow(() -> new RuntimeException("Destination account not found: " + toAccountId));

        // Validate sufficient funds
        if (fromAccount.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient funds in account: " + fromAccountId);
        }

        // Update balances
        fromAccount.setBalance(fromAccount.getBalance().subtract(amount));
        fromAccount.setLastUpdated(Timestamp.now());

        toAccount.setBalance(toAccount.getBalance().add(amount));
        toAccount.setLastUpdated(Timestamp.now());

        // Save both accounts
        accountRepository.save(fromAccount);
        accountRepository.save(toAccount);

        // Create a transaction log entry
        String txnId = UUID.randomUUID().toString();
        TransactionLog log = new TransactionLog(txnId, fromAccountId, toAccountId, amount);
        transactionLogRepository.save(log);

        return log;
    }
}
```

## Using SpannerTemplate for Lower-Level Control

Sometimes you need more control than the repository abstraction provides. The `SpannerTemplate` gives you direct access to Spanner operations within a transaction context.

```java
@Service
public class BatchTransferService {

    private final SpannerTemplate spannerTemplate;

    public BatchTransferService(SpannerTemplate spannerTemplate) {
        this.spannerTemplate = spannerTemplate;
    }

    // Performs multiple transfers in a single Spanner transaction
    public void batchTransfer(List<TransferRequest> transfers) {
        spannerTemplate.performReadWriteTransaction(transactionOperations -> {

            for (TransferRequest transfer : transfers) {
                // Read the source account within the transaction context
                Account from = transactionOperations.readRow(
                        Account.class, Key.of(transfer.getFromAccountId()));

                Account to = transactionOperations.readRow(
                        Account.class, Key.of(transfer.getToAccountId()));

                if (from == null || to == null) {
                    throw new RuntimeException("Account not found in batch transfer");
                }

                // Update balances
                from.setBalance(from.getBalance().subtract(transfer.getAmount()));
                to.setBalance(to.getBalance().add(transfer.getAmount()));

                // Write updates through the transaction operations
                transactionOperations.update(from);
                transactionOperations.update(to);
            }

            // Return value is passed back from performReadWriteTransaction
            return null;
        });
    }
}
```

## How Spanner Transactions Differ

There are a few things to keep in mind with Spanner transactions:

Spanner uses pessimistic concurrency control with wound-wait deadlock prevention. If two transactions conflict, one will be aborted and retried. The Spring Data Spanner module handles retries automatically when you use `@Transactional`.

Read-write transactions acquire locks on the rows they read. This means you should keep your transactions short and avoid reading large ranges of data within a transaction.

Spanner transactions have a 10-second idle timeout and a maximum duration of one hour. For most OLTP workloads, your transactions should complete in milliseconds.

## Handling Transaction Retries

Spanner may abort transactions due to conflicts. The Spring Data Spanner module retries aborted transactions automatically, but you should make sure your transaction logic is idempotent.

```java
// Configuration to customize retry behavior
@Configuration
public class SpannerConfig {

    @Bean
    public SpannerTransactionManager spannerTransactionManager(
            SpannerDatabaseClient spannerDatabaseClient) {
        return new SpannerTransactionManager(spannerDatabaseClient);
    }
}
```

When a transaction is retried, the entire method annotated with `@Transactional` runs again from the beginning. This is why it is important that your reads happen inside the transaction - stale reads from before the retry could lead to incorrect results.

## The REST Controller

Wire it all together with a controller:

```java
@RestController
@RequestMapping("/api/transfers")
public class TransferController {

    private final TransferService transferService;

    public TransferController(TransferService transferService) {
        this.transferService = transferService;
    }

    // POST endpoint to initiate a transfer between accounts
    @PostMapping
    public ResponseEntity<TransactionLog> transfer(@RequestBody TransferRequest request) {
        TransactionLog log = transferService.transfer(
                request.getFromAccountId(),
                request.getToAccountId(),
                request.getAmount());
        return ResponseEntity.ok(log);
    }
}
```

## Wrapping Up

Spring Data Spanner gives you a familiar programming model for working with Cloud Spanner. The `@Transactional` annotation works as you would expect, and the framework handles the Spanner-specific details like transaction retries and read-write semantics. When you need lower-level control, `SpannerTemplate.performReadWriteTransaction` lets you work directly with the transaction context. The biggest thing to remember is that Spanner transactions may be retried, so your logic needs to be idempotent and self-contained within the transaction boundary.
