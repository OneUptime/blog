# How to Use Cloud Spanner with the Go Client Library

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Spanner, Go, Client Library, Database

Description: A hands-on guide to using the Cloud Spanner Go client library for CRUD operations, transactions, and production-ready database access.

---

Go is a popular choice for building backend services on Google Cloud, and the Cloud Spanner Go client library is well-designed and performant. In this post, I will walk through the essential operations you need to know - from connecting to Spanner to running queries, performing transactions, and handling errors. This is the practical guide I wish I had when I started working with Spanner in Go.

## Setting Up

First, add the Spanner client library to your project:

```bash
# Add the Spanner Go client library to your module
go get cloud.google.com/go/spanner
```

## Creating a Client

The Spanner client manages connection pools and session management. Create one client per database and reuse it throughout your application:

```go
package main

import (
    "context"
    "log"

    "cloud.google.com/go/spanner"
)

func main() {
    ctx := context.Background()

    // Create a Spanner client - reuse this across your application
    // Format: projects/{project}/instances/{instance}/databases/{database}
    dbPath := "projects/my-project/instances/my-instance/databases/my-database"
    client, err := spanner.NewClient(ctx, dbPath)
    if err != nil {
        log.Fatalf("Failed to create Spanner client: %v", err)
    }
    defer client.Close()

    // Use client for all database operations
    log.Println("Connected to Spanner successfully")
}
```

The client is safe for concurrent use from multiple goroutines. Do not create a new client for each request.

## Reading Data with Single Reads

For simple lookups by primary key, use the `ReadRow` method:

```go
func getUser(ctx context.Context, client *spanner.Client, userID string) (*User, error) {
    // Read a single row by primary key
    row, err := client.Single().ReadRow(ctx, "Users",
        spanner.Key{userID},
        []string{"UserId", "Email", "DisplayName", "CreatedAt"})
    if err != nil {
        return nil, fmt.Errorf("reading user %s: %w", userID, err)
    }

    // Parse the row into a struct
    var user User
    if err := row.ToStruct(&user); err != nil {
        return nil, fmt.Errorf("parsing user row: %w", err)
    }

    return &user, nil
}

// User struct with Spanner column tags
type User struct {
    UserId      string              `spanner:"UserId"`
    Email       string              `spanner:"Email"`
    DisplayName spanner.NullString  `spanner:"DisplayName"`
    CreatedAt   time.Time           `spanner:"CreatedAt"`
}
```

The `Single()` method creates a single-use read-only transaction. It is the most efficient way to read when you only need one query.

## Running SQL Queries

For more complex reads, use SQL:

```go
func getOrdersByUser(ctx context.Context, client *spanner.Client, userID string) ([]Order, error) {
    // Run a SQL query with a parameter
    stmt := spanner.Statement{
        SQL: `SELECT OrderId, Status, TotalAmount, CreatedAt
              FROM Orders
              WHERE UserId = @userId
              ORDER BY CreatedAt DESC
              LIMIT 100`,
        Params: map[string]interface{}{
            "userId": userID,
        },
    }

    // Execute the query using a single-use read-only transaction
    iter := client.Single().Query(ctx, stmt)
    defer iter.Stop()

    // Collect all results
    var orders []Order
    for {
        row, err := iter.Next()
        if err == iterator.Done {
            break
        }
        if err != nil {
            return nil, fmt.Errorf("iterating orders: %w", err)
        }

        var order Order
        if err := row.ToStruct(&order); err != nil {
            return nil, fmt.Errorf("parsing order row: %w", err)
        }
        orders = append(orders, order)
    }

    return orders, nil
}

type Order struct {
    OrderId     string    `spanner:"OrderId"`
    Status      string    `spanner:"Status"`
    TotalAmount float64   `spanner:"TotalAmount"`
    CreatedAt   time.Time `spanner:"CreatedAt"`
}
```

Always use parameterized queries (the `Params` field) instead of string concatenation. This prevents SQL injection and enables query plan caching.

## Inserting Data with Mutations

For simple writes that do not depend on reading data first, use mutations:

```go
func createUser(ctx context.Context, client *spanner.Client, user User) error {
    // Create an insert mutation
    m := spanner.InsertOrUpdate("Users",
        []string{"UserId", "Email", "DisplayName", "CreatedAt"},
        []interface{}{user.UserId, user.Email, user.DisplayName, spanner.CommitTimestamp})

    // Apply the mutation - this is a single write transaction
    _, err := client.Apply(ctx, []*spanner.Mutation{m})
    if err != nil {
        return fmt.Errorf("inserting user: %w", err)
    }

    return nil
}
```

You can also use struct-based mutations:

```go
func createUserFromStruct(ctx context.Context, client *spanner.Client, user User) error {
    // Insert using a struct - field names must match column names via tags
    m, err := spanner.InsertOrUpdateStruct("Users", user)
    if err != nil {
        return fmt.Errorf("creating mutation: %w", err)
    }

    _, err = client.Apply(ctx, []*spanner.Mutation{m})
    return err
}
```

## Batch Writes

For inserting multiple rows efficiently:

```go
func createUsers(ctx context.Context, client *spanner.Client, users []User) error {
    // Build mutations for all users
    mutations := make([]*spanner.Mutation, 0, len(users))
    for _, u := range users {
        m := spanner.InsertOrUpdate("Users",
            []string{"UserId", "Email", "DisplayName", "CreatedAt"},
            []interface{}{u.UserId, u.Email, u.DisplayName, spanner.CommitTimestamp})
        mutations = append(mutations, m)
    }

    // Apply all mutations in a single transaction
    _, err := client.Apply(ctx, mutations)
    if err != nil {
        return fmt.Errorf("batch inserting users: %w", err)
    }

    return nil
}
```

## Read-Write Transactions

When you need to read data, make decisions based on it, and then write:

```go
func transferFunds(ctx context.Context, client *spanner.Client, fromID, toID string, amount float64) error {
    // ReadWriteTransaction handles retries automatically
    _, err := client.ReadWriteTransaction(ctx, func(ctx context.Context, txn *spanner.ReadWriteTransaction) error {
        // Read both account balances within the transaction
        row, err := txn.ReadRow(ctx, "Accounts",
            spanner.Key{fromID},
            []string{"Balance"})
        if err != nil {
            return fmt.Errorf("reading source account: %w", err)
        }

        var fromBalance float64
        if err := row.Column(0, &fromBalance); err != nil {
            return err
        }

        // Check for sufficient funds
        if fromBalance < amount {
            return fmt.Errorf("insufficient funds: have %.2f, need %.2f", fromBalance, amount)
        }

        row, err = txn.ReadRow(ctx, "Accounts",
            spanner.Key{toID},
            []string{"Balance"})
        if err != nil {
            return fmt.Errorf("reading destination account: %w", err)
        }

        var toBalance float64
        if err := row.Column(0, &toBalance); err != nil {
            return err
        }

        // Write the updated balances
        txn.BufferWrite([]*spanner.Mutation{
            spanner.Update("Accounts",
                []string{"AccountId", "Balance"},
                []interface{}{fromID, fromBalance - amount}),
            spanner.Update("Accounts",
                []string{"AccountId", "Balance"},
                []interface{}{toID, toBalance + amount}),
        })

        return nil
    })

    return err
}
```

The `ReadWriteTransaction` function automatically retries the transaction if it is aborted due to contention. Your function may be called multiple times, so do not include side effects like sending emails or making API calls inside it.

## Read-Only Transactions

For consistent reads across multiple queries:

```go
func getCustomerDashboard(ctx context.Context, client *spanner.Client, customerID string) (*Dashboard, error) {
    // Create a read-only transaction for consistent reads
    txn := client.ReadOnlyTransaction()
    defer txn.Close()

    // Both queries see the same consistent snapshot
    userIter := txn.Query(ctx, spanner.Statement{
        SQL:    "SELECT DisplayName, Email FROM Users WHERE UserId = @id",
        Params: map[string]interface{}{"id": customerID},
    })
    defer userIter.Stop()

    userRow, err := userIter.Next()
    if err != nil {
        return nil, fmt.Errorf("reading user: %w", err)
    }

    var name, email string
    if err := userRow.Columns(&name, &email); err != nil {
        return nil, err
    }

    // Second query sees the same snapshot
    countIter := txn.Query(ctx, spanner.Statement{
        SQL:    "SELECT COUNT(*) FROM Orders WHERE UserId = @id",
        Params: map[string]interface{}{"id": customerID},
    })
    defer countIter.Stop()

    countRow, err := countIter.Next()
    if err != nil {
        return nil, fmt.Errorf("counting orders: %w", err)
    }

    var orderCount int64
    if err := countRow.Column(0, &orderCount); err != nil {
        return nil, err
    }

    return &Dashboard{Name: name, Email: email, OrderCount: orderCount}, nil
}
```

## Error Handling

Handle Spanner-specific errors properly:

```go
import "google.golang.org/grpc/codes"
import "google.golang.org/grpc/status"

func getUser(ctx context.Context, client *spanner.Client, userID string) (*User, error) {
    row, err := client.Single().ReadRow(ctx, "Users",
        spanner.Key{userID},
        []string{"UserId", "Email", "DisplayName"})
    if err != nil {
        // Check for specific error types
        if spanner.ErrCode(err) == codes.NotFound {
            return nil, fmt.Errorf("user %s not found", userID)
        }
        return nil, fmt.Errorf("reading user: %w", err)
    }

    var user User
    if err := row.ToStruct(&user); err != nil {
        return nil, err
    }
    return &user, nil
}
```

## Client Configuration

For production deployments, configure the client with appropriate settings:

```go
// Configure the client with custom session pool settings
config := spanner.ClientConfig{
    SessionPoolConfig: spanner.SessionPoolConfig{
        MinOpened: 10,           // Minimum number of sessions to keep open
        MaxOpened: 100,          // Maximum number of concurrent sessions
        MaxBurst:  10,           // Maximum number of sessions created at once
        WriteSessions: 0.2,     // 20% of sessions are prepared for writes
    },
}

client, err := spanner.NewClientWithConfig(ctx, dbPath, config)
```

## Wrapping Up

The Cloud Spanner Go client library is straightforward once you understand the patterns: use `Single()` for one-off reads, `ReadOnlyTransaction()` for consistent multi-query reads, `Apply()` for simple writes, and `ReadWriteTransaction()` when you need to read-then-write atomically. Create one client per database and reuse it, always use parameterized queries, and handle errors by checking for Spanner-specific error codes. These patterns will cover the vast majority of what you need to build a production Go application on Spanner.
