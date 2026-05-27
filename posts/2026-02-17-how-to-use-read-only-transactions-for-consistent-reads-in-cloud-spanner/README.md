# How to Use Read-Only Transactions for Consistent Reads in Cloud Spanner

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Spanner, Transaction, Read-Only, Consistency

Description: Learn when and how to use read-only transactions in Cloud Spanner for consistent snapshot reads without locking overhead.

---

Not every database operation needs the full weight of a read-write transaction. When you only need to read data - no writes involved - Cloud Spanner offers read-only transactions that give you a consistent snapshot of your data without acquiring any locks. This makes them efficient and non-blocking for writes. In this post, I will explain how read-only transactions work, when to use them, and how they differ from read-write transactions.

## Why Read-Only Transactions Exist

In Spanner's default serializable isolation level, read-write transactions acquire shared locks on the data they read. This is necessary because the transaction might later write based on those reads, and Spanner needs to ensure no one else changes them in the meantime.

But if you know upfront that you will only be reading, those locks are unnecessary overhead. Read-only transactions skip the locking entirely. They read from a consistent snapshot of the database at a specific timestamp, and they do not hold locks that block write transactions. A strong read might still wait briefly for an ongoing write to finish so Spanner can choose a consistent timestamp.

This has several practical benefits:

- Lower latency because no locks are acquired or waited on
- No possibility of transaction aborts due to lock contention
- Can execute on any read-write or read-only replica, although strong reads from non-leader replicas may still contact the leader to confirm freshness
- Multiple read-only transactions can run concurrently without interfering with each other

## Strong Reads vs Stale Reads

Read-only transactions in Spanner come in two flavors: strong reads and stale reads.

**Strong reads** see all data that has been committed up to the moment the read starts. This is the default and gives you the most up-to-date view of the data.

**Stale reads** read data at a timestamp in the past. They can be faster because Spanner can serve them from any nearby replica without waiting for the latest data to propagate. I will focus on strong reads here and cover stale reads in more detail in a separate post.

## Using Read-Only Transactions in Python

Here is how to perform a read-only transaction with the Python client library:

```python
from google.cloud import spanner

# Set up the client and database reference

client = spanner.Client()
instance = client.instance("my-instance")
database = instance.database("my-database")

# Create a snapshot for a read-only transaction
with database.snapshot(multi_use=True) as snapshot:
    # Read all orders for a customer
    results = snapshot.execute_sql(
        "SELECT OrderId, TotalAmount, Status, CreatedAt "
        "FROM Orders "
        "WHERE CustomerId = @customer_id "
        "ORDER BY CreatedAt DESC",
        params={"customer_id": "customer-123"},
        param_types={"customer_id": spanner.param_types.STRING}
    )

    # Process the results
    orders = []
    for row in results:
        orders.append({
            "order_id": row[0],
            "total_amount": row[1],
            "status": row[2],
            "created_at": row[3]
        })

    # All reads within this snapshot see the same consistent data
    summary = snapshot.execute_sql(
        "SELECT COUNT(*) AS total_orders, SUM(TotalAmount) AS total_spent "
        "FROM Orders "
        "WHERE CustomerId = @customer_id",
        params={"customer_id": "customer-123"},
        param_types={"customer_id": spanner.param_types.STRING}
    )

    for row in summary:
        total_orders = row[0]
        total_spent = row[1]
```

The important thing here is that both queries within the snapshot see exactly the same data. Even if another transaction commits between the two queries, the snapshot does not see those changes. This is what makes read-only transactions so useful for generating reports or displaying consistent data to users.

## Multi-Read Consistency

Consider a scenario where you need to display a user's profile along with their recent orders and account balance. Without a read-only transaction, each query might see a different state of the database:

```python
# Without read-only transaction - INCONSISTENT
# These three queries might see different database states
user = query("SELECT * FROM Users WHERE UserId = @id")
orders = query("SELECT * FROM Orders WHERE UserId = @id")
balance = query("SELECT Balance FROM Accounts WHERE UserId = @id")
# A transfer might commit between these queries, making the data inconsistent
```

With a read-only transaction:

```python
# With read-only transaction - CONSISTENT
# All three queries see the exact same snapshot of the database
with database.snapshot(multi_use=True) as snapshot:
    user = snapshot.execute_sql(
        "SELECT * FROM Users WHERE UserId = @id",
        params={"id": "user-123"},
        param_types={"id": spanner.param_types.STRING}
    )

    orders = snapshot.execute_sql(
        "SELECT * FROM Orders WHERE UserId = @id",
        params={"id": "user-123"},
        param_types={"id": spanner.param_types.STRING}
    )

    balance = snapshot.execute_sql(
        "SELECT Balance FROM Accounts WHERE UserId = @id",
        params={"id": "user-123"},
        param_types={"id": spanner.param_types.STRING}
    )
```

## Read-Only vs Read-Write: When to Use Which

Here is a straightforward decision guide:

```mermaid
flowchart TD
    A[Does your operation need to write data?] -->|Yes| B[Use read-write transaction]
    A -->|No| C[Does it involve multiple reads that must be consistent?]
    C -->|Yes| D[Use read-only transaction with snapshot]
    C -->|No| E[Is it a single read?]
    E -->|Yes| F[Single read - no transaction needed]
    E -->|No| D
```

In practice:

- **Dashboard displaying user data across multiple tables** - Read-only transaction
- **Generating a report that involves multiple queries** - Read-only transaction
- **Transferring money between accounts** - Read-write transaction
- **Looking up a single user by ID** - Single read (no transaction needed)
- **Inserting a new record** - Read-write transaction

## Using Read-Only Transactions in Go

Here is the same pattern in Go:

```go
package main

import (
    "context"
    "fmt"
    "cloud.google.com/go/spanner"
    "google.golang.org/api/iterator"
)

func getCustomerDashboard(ctx context.Context, client *spanner.Client, customerID string) error {
    // Create a read-only transaction
    txn := client.ReadOnlyTransaction()
    defer txn.Close()

    // First query: get customer details
    stmt := spanner.Statement{
        SQL:    "SELECT DisplayName, Email FROM Users WHERE UserId = @id",
        Params: map[string]interface{}{"id": customerID},
    }

    iter := txn.Query(ctx, stmt)
    defer iter.Stop()

    row, err := iter.Next()
    if err == iterator.Done {
        return fmt.Errorf("customer not found: %s", customerID)
    }
    if err != nil {
        return fmt.Errorf("reading user: %w", err)
    }

    var name, email string
    if err := row.Columns(&name, &email); err != nil {
        return fmt.Errorf("parsing user: %w", err)
    }

    // Second query: get order count - sees same snapshot as first query
    countStmt := spanner.Statement{
        SQL:    "SELECT COUNT(*) FROM Orders WHERE CustomerId = @id",
        Params: map[string]interface{}{"id": customerID},
    }

    countIter := txn.Query(ctx, countStmt)
    defer countIter.Stop()

    countRow, err := countIter.Next()
    if err != nil {
        return fmt.Errorf("reading count: %w", err)
    }

    var orderCount int64
    if err := countRow.Columns(&orderCount); err != nil {
        return fmt.Errorf("parsing count: %w", err)
    }

    fmt.Printf("User: %s (%s) - %d orders\n", name, email, orderCount)
    return nil
}
```

## Performance Characteristics

Read-only transactions in Spanner have some notable performance properties:

**No leader lock path.** In a multi-region setup, read-write transactions are served from the leader replica because the leader maintains the locks required for serializable transactions. Read-only transactions can execute on any read-write or read-only replica. Strong reads from a non-leader replica may still contact the leader to confirm the replica is up to date, while stale reads can often be served by a nearby replica without that round trip.

**Fewer contention retries.** Since read-only transactions do not acquire locks, they cannot be aborted due to lock contention. Your code still needs normal error handling for timeouts, unavailable service errors, and reads at timestamps that are outside the version retention period.

**No read-write lock lifetime concern.** Read-write transactions should be kept short because long-held locks increase contention and Spanner can abort transactions that remain idle for too long. Read-only transactions do not hold those locks, which makes them a better fit for consistent multi-query reads. For long-running reads, still use appropriate request deadlines and make sure any historical timestamp is within the database's version retention period.

**Parallel execution.** Multiple read-only transactions can run concurrently on the same data without any interference, making them perfect for serving high-traffic read workloads.

## Timestamps and Reproducibility

Every read-only transaction is associated with a specific timestamp. Some client libraries expose this timestamp so you can use it later for debugging or to create another read at the exact same point in time. In Go, you can retrieve it after a read or query has returned data or completed:

```go
func printReadTimestamp(ctx context.Context, client *spanner.Client) error {
    txn := client.ReadOnlyTransaction()
    defer txn.Close()

    iter := txn.Query(ctx, spanner.NewStatement("SELECT UserId FROM Users LIMIT 1"))
    defer iter.Stop()

    _, err := iter.Next()
    if err != nil && err != iterator.Done {
        return err
    }

    readTimestamp, err := txn.Timestamp()
    if err != nil {
        return err
    }

    fmt.Printf("Data as of: %s\n", readTimestamp)
    return nil
}
```

This is extremely useful for debugging data inconsistency reports from users - if the timestamp is still within the database's version retention period, you can read the database as it was at the exact time the user saw the issue.

## Wrapping Up

Read-only transactions are one of Spanner's best features for read-heavy workloads. They give you consistent snapshots without locking overhead, they cannot be aborted by lock contention, and they can execute on any read-write or read-only replica. If your operation does not need to write data, prefer a single read or a read-only transaction over a read-write transaction. Your queries avoid unnecessary locks, your system can handle more concurrent read load, and you will avoid unnecessary contention with write transactions. It is a straightforward optimization that pays off immediately.
