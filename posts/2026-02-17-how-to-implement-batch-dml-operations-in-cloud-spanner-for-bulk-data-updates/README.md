# How to Implement Batch DML Operations in Cloud Spanner for Bulk Data Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Spanner, Database, DML, Batch Operations

Description: Learn how to use batch DML operations in Cloud Spanner to efficiently perform bulk data updates, inserts, and deletes while minimizing round trips and transaction overhead.

---

When you need to update thousands or millions of rows in Cloud Spanner, running individual DML statements one at a time is painfully slow. Each statement requires a round trip to Spanner, and inside a read-write transaction, that latency adds up fast. Batch DML solves this by letting you send multiple DML statements to Spanner in a single request.

This is not about Spanner's Mutation API (which also supports batching). Batch DML is specifically about sending multiple SQL-based INSERT, UPDATE, and DELETE statements together. It gives you the flexibility of SQL with the efficiency of batched network calls.

## How Batch DML Works

Batch DML lets you group multiple DML statements into a single RPC call. Spanner executes them sequentially within the same transaction. If any statement fails, Spanner stops executing and returns results for all the statements that completed before the failure.

Key characteristics:
- All statements run in the same transaction
- Statements execute in the order you provide them
- Each statement can affect different tables
- You get back the row count for each executed statement
- If a statement fails, subsequent statements are not executed

## Basic Batch DML Example

Let's start with a straightforward example. Suppose you need to update order statuses, insert audit log entries, and clean up temporary records - all in one transaction.

```python
# Python: Execute multiple DML statements in a single batch
from google.cloud import spanner

client = spanner.Client(project='my-project')
instance = client.instance('my-instance')
database = instance.database('my-database')

def process_completed_orders():
    def batch_update(transaction):
        # Define multiple DML statements to execute together
        statements = [
            # Mark old pending orders as expired
            (
                "UPDATE Orders SET Status = 'EXPIRED' "
                "WHERE Status = 'PENDING' "
                "AND CreatedAt < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)",
                {},  # No parameters for this statement
                {},  # No parameter types
            ),
            # Insert a record into the audit log
            (
                "INSERT INTO AuditLog (LogId, Action, Timestamp) "
                "VALUES (@logId, @action, CURRENT_TIMESTAMP())",
                {'logId': 12345, 'action': 'BULK_EXPIRE_ORDERS'},
                {
                    'logId': spanner.param_types.INT64,
                    'action': spanner.param_types.STRING,
                },
            ),
            # Delete processed temporary records older than 7 days
            (
                "DELETE FROM TempProcessing "
                "WHERE ProcessedAt < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)",
                {},
                {},
            ),
        ]

        # Execute all statements in one batch call
        status, row_counts = transaction.batch_update(statements)

        # Check results for each statement
        for i, count in enumerate(row_counts):
            print(f"Statement {i}: {count} rows affected")

    # Run the batch within a transaction
    database.run_in_transaction(batch_update)
```

## Batch DML in Java

Here is the same concept in Java, which is a common choice for Cloud Spanner applications:

```java
// Java: Batch DML with the Spanner client library
import com.google.cloud.spanner.*;

public class BatchDmlExample {
    public static void runBatchUpdate(DatabaseClient dbClient) {
        // Run batch DML inside a read-write transaction
        dbClient.readWriteTransaction().run(transaction -> {
            // Build a list of DML statements
            List<Statement> statements = new ArrayList<>();

            // Statement 1: Update product prices by category
            statements.add(Statement.newBuilder(
                "UPDATE Products SET Price = Price * 1.10 WHERE Category = @category")
                .bind("category").to("electronics")
                .build());

            // Statement 2: Set a flag on recently modified products
            statements.add(Statement.newBuilder(
                "UPDATE Products SET NeedsReview = true WHERE UpdatedAt > @since")
                .bind("since").to(Timestamp.now())
                .build());

            // Statement 3: Clean up expired promotions
            statements.add(Statement.of(
                "DELETE FROM Promotions WHERE EndDate < CURRENT_DATE()"));

            // Execute all statements in one round trip
            long[] rowCounts = transaction.batchUpdate(statements);

            for (int i = 0; i < rowCounts.length; i++) {
                System.out.printf("Statement %d affected %d rows%n", i, rowCounts[i]);
            }
            return null;
        });
    }
}
```

## Handling Partial Failures

One thing that catches people off guard is how Spanner handles errors in batch DML. If the third statement out of five fails, Spanner returns the row counts for the first two statements and an error for the third. Statements four and five are never executed.

```python
# Python: Handling partial failures in batch DML
from google.api_core import exceptions

def handle_partial_failure(transaction):
    statements = [
        ("UPDATE Users SET Active = true WHERE Region = 'us-east1'", {}, {}),
        ("UPDATE Users SET Active = true WHERE Region = 'eu-west1'", {}, {}),
        # This might fail if the table does not exist
        ("UPDATE NonExistentTable SET Foo = 'bar'", {}, {}),
        # This will never execute if statement 3 fails
        ("UPDATE Users SET Active = true WHERE Region = 'ap-south1'", {}, {}),
    ]

    try:
        status, row_counts = transaction.batch_update(statements)
        print(f"All {len(row_counts)} statements succeeded")
    except exceptions.InvalidArgument as e:
        # The exception contains partial results
        print(f"Batch partially failed: {e}")
        # You might want to abort the transaction here
        raise
```

## Chunking Large Updates

Cloud Spanner has a mutation limit per transaction (around 80,000 mutations by default). If your batch DML operations affect more rows than that, you need to break them into chunks.

```python
# Python: Chunking large updates across multiple transactions
def bulk_update_in_chunks(database, chunk_size=5000):
    """Update a large number of rows by processing in chunks."""
    total_updated = 0

    while True:
        def update_chunk(transaction):
            # Update a limited number of rows per transaction
            result = transaction.execute_update(
                "UPDATE Events SET Processed = true "
                "WHERE Processed = false "
                "AND EventId IN ("
                "  SELECT EventId FROM Events "
                "  WHERE Processed = false "
                "  LIMIT @limit"
                ")",
                params={'limit': chunk_size},
                param_types={'limit': spanner.param_types.INT64},
            )
            return result

        rows_updated = database.run_in_transaction(update_chunk)
        total_updated += rows_updated
        print(f"Updated {rows_updated} rows (total: {total_updated})")

        # Stop when there are no more rows to update
        if rows_updated == 0:
            break

    return total_updated
```

## Batch DML vs Mutations API

Cloud Spanner offers two ways to write data: DML and the Mutations API. Here is when to use each:

**Use Batch DML when:**
- You need the expressiveness of SQL (WHERE clauses, subqueries, joins)
- You are updating rows based on conditions rather than specific keys
- You want to mix INSERT, UPDATE, and DELETE in one batch
- You need to read and write in the same transaction

**Use the Mutations API when:**
- You know the exact primary keys of rows to insert or update
- You want the best possible write throughput
- You are doing simple insert/update/delete by key
- You do not need to read data in the same transaction

The Mutations API is generally faster because it skips the SQL parsing step, but Batch DML gives you more flexibility.

## Monitoring Batch DML Performance

When running batch DML operations, you should track execution time and row counts. Here is a pattern that logs useful metrics:

```python
# Python: Batch DML with timing and metrics
import time

def monitored_batch_update(database):
    def execute_batch(transaction):
        start_time = time.time()

        statements = [
            (
                "UPDATE Orders SET Status = 'ARCHIVED' "
                "WHERE Status = 'COMPLETED' "
                "AND CompletedAt < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)",
                {}, {},
            ),
            (
                "DELETE FROM OrderItems "
                "WHERE OrderId IN ("
                "  SELECT OrderId FROM Orders WHERE Status = 'ARCHIVED'"
                ")",
                {}, {},
            ),
        ]

        status, row_counts = transaction.batch_update(statements)

        elapsed = time.time() - start_time
        total_rows = sum(row_counts)

        # Log metrics for monitoring
        print(f"Batch DML completed in {elapsed:.2f}s")
        print(f"Total rows affected: {total_rows}")
        for i, count in enumerate(row_counts):
            print(f"  Statement {i}: {count} rows")

        return total_rows

    return database.run_in_transaction(execute_batch)
```

## Best Practices

After working with batch DML in production, here are the patterns that work well:

1. **Keep transactions short.** Long-running transactions increase the chance of conflicts and aborts. If you need to update millions of rows, break it into smaller chunks.

2. **Order statements carefully.** Since statements execute in order, put the most critical ones first so they complete even if a later statement fails.

3. **Use parameterized queries.** Always use parameters instead of string interpolation. This prevents SQL injection and lets Spanner cache query plans.

4. **Monitor for transaction aborts.** Spanner may abort transactions due to conflicts. The client library retries automatically, but you should monitor retry rates.

5. **Set appropriate deadlines.** Large batch operations can take time. Set your gRPC deadline high enough to accommodate the expected execution time.

Batch DML is one of those features that makes Cloud Spanner practical for real-world workloads. It bridges the gap between the convenience of SQL and the performance needs of bulk operations. Combined with proper chunking and monitoring through tools like OneUptime, you can handle large-scale data updates reliably.
