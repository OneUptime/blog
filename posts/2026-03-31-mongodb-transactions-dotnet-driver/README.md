# How to Use Transactions with the MongoDB .NET Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, CSharp, Transaction, DotNet, ACID

Description: Learn how to use multi-document ACID transactions in MongoDB with the .NET Driver using client sessions and async C# patterns.

---

## Overview

MongoDB supports multi-document ACID transactions on replica sets (MongoDB 4.0+) and sharded clusters (MongoDB 4.2+). The .NET Driver exposes transactions through `IClientSession`. All operations within the session participate in the same transaction.

## Prerequisites

- MongoDB 4.0+ replica set or 4.2+ sharded cluster.
- MongoDB .NET Driver 2.7+.

```bash
dotnet add package MongoDB.Driver
```

## Starting a Session and Transaction

```csharp
using MongoDB.Driver;
using System;
using System.Threading.Tasks;

var client = new MongoClient("mongodb://localhost:27017");
var db = client.GetDatabase("shopdb");
var accounts = db.GetCollection<Account>("accounts");

using var session = await client.StartSessionAsync();
session.StartTransaction();

try
{
    // Debit account A
    await accounts.UpdateOneAsync(session,
        Builders<Account>.Filter.Eq(a => a.AccountId, "A"),
        Builders<Account>.Update.Inc(a => a.Balance, -200));

    // Credit account B
    await accounts.UpdateOneAsync(session,
        Builders<Account>.Filter.Eq(a => a.AccountId, "B"),
        Builders<Account>.Update.Inc(a => a.Balance, 200));

    await session.CommitTransactionAsync();
    Console.WriteLine("Transfer committed.");
}
catch (Exception ex)
{
    await session.AbortTransactionAsync();
    Console.WriteLine($"Transaction aborted: {ex.Message}");
    throw;
}
```

The `session` parameter is passed to every operation that should participate in the transaction.

## Using WithTransactionAsync (Recommended)

`WithTransactionAsync` automatically retries transient errors (like `TransientTransactionError` and `UnknownTransactionCommitResult`) according to MongoDB's retryable writes specification:

```csharp
using var session = await client.StartSessionAsync();

var transferResult = await session.WithTransactionAsync(
    async (s, ct) =>
    {
        await accounts.UpdateOneAsync(s,
            Builders<Account>.Filter.Eq(a => a.AccountId, "A"),
            Builders<Account>.Update.Inc(a => a.Balance, -200),
            cancellationToken: ct);

        await accounts.UpdateOneAsync(s,
            Builders<Account>.Filter.Eq(a => a.AccountId, "B"),
            Builders<Account>.Update.Inc(a => a.Balance, 200),
            cancellationToken: ct);

        return "Transfer completed";
    }
);

Console.WriteLine(transferResult);
```

This is the preferred pattern for production use.

## Cross-Collection Transactions

```csharp
var orders = db.GetCollection<Order>("orders");
var inventory = db.GetCollection<InventoryItem>("inventory");

await session.WithTransactionAsync(async (s, ct) =>
{
    // Insert order
    var order = new Order
    {
        CustomerId = "cust-001",
        ProductId = "prod-001",
        Quantity = 2,
        Status = "CONFIRMED"
    };
    await orders.InsertOneAsync(s, order, cancellationToken: ct);

    // Decrement inventory
    var inventoryResult = await inventory.UpdateOneAsync(s,
        Builders<InventoryItem>.Filter.And(
            Builders<InventoryItem>.Filter.Eq(i => i.ProductId, "prod-001"),
            Builders<InventoryItem>.Filter.Gte(i => i.Quantity, 2)
        ),
        Builders<InventoryItem>.Update.Inc(i => i.Quantity, -2),
        cancellationToken: ct);

    if (inventoryResult.ModifiedCount == 0)
        throw new InvalidOperationException("Insufficient inventory");

    return order.Id;
});
```

## Transaction Options

```csharp
var txOptions = new TransactionOptions(
    readPreference: ReadPreference.Primary,
    readConcern: ReadConcern.Snapshot,
    writeConcern: WriteConcern.WMajority,
    maxCommitTime: TimeSpan.FromSeconds(5)
);

session.StartTransaction(txOptions);
```

`ReadConcern.Snapshot` ensures all reads within the transaction see a consistent snapshot. `WriteConcern.WMajority` ensures the commit is acknowledged by a majority of replica set members.

## Error Handling Best Practices

```csharp
// Errors to abort and NOT retry:
// MongoCommandException with non-transient error codes

// Errors to retry the entire transaction (handled by WithTransactionAsync):
// TransientTransactionError label
// UnknownTransactionCommitResult label on commit

// Always pass session to every operation inside the transaction
// Operations without the session run outside the transaction
```

## Summary

MongoDB .NET Driver transactions work through `IClientSession`. Use `WithTransactionAsync` for production code as it automatically retries transient errors. Pass the session object to every operation inside the transaction body. Use `TransactionOptions` to set read concern, write concern, and max commit time. Transactions work across multiple collections and databases within the same cluster.
