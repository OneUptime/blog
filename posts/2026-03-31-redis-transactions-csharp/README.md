# How to Use Redis Transactions in C#

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CSharp, Transaction

Description: Learn how to use Redis MULTI/EXEC transactions and WATCH-based optimistic locking in C# with StackExchange.Redis for atomic operations.

---

StackExchange.Redis supports Redis transactions through `ITransaction`, which wraps commands in `MULTI`/`EXEC`. For optimistic locking, `AddCondition` lets you abort the transaction if watched keys change.

## Simple Transaction

```csharp
using StackExchange.Redis;

IDatabase db = redis.GetDatabase();

ITransaction tran = db.CreateTransaction();

// Queue commands - they are not sent until ExecuteAsync
Task<bool> setName = tran.StringSetAsync("user:1:name", "Alice");
Task<bool> setEmail = tran.StringSetAsync("user:1:email", "alice@example.com");
Task<long> incrCount = tran.StringIncrementAsync("user:count");

// Execute - sends MULTI, all queued commands, then EXEC
bool committed = await tran.ExecuteAsync();
Console.WriteLine($"Committed: {committed}");

if (committed)
{
    Console.WriteLine(await incrCount); // result of INCR
}
```

## Transfer Between Accounts

```csharp
async Task<bool> Transfer(IDatabase db, string from, string to, long amount)
{
    ITransaction tran = db.CreateTransaction();

    tran.StringDecrementAsync(from, amount);
    tran.StringIncrementAsync(to, amount);

    return await tran.ExecuteAsync();
}

await Transfer(db, "balance:alice", "balance:bob", 200);
```

## Optimistic Locking with AddCondition

`AddCondition` checks a key's value before committing. If the condition fails, `ExecuteAsync` returns `false` and no commands are applied:

```csharp
async Task<bool> IncrementIfUnchanged(IDatabase db, string key, long expected)
{
    ITransaction tran = db.CreateTransaction();

    // Abort if value changed since we read it
    tran.AddCondition(Condition.StringEqual(key, expected));
    tran.StringIncrementAsync(key, 1);

    return await tran.ExecuteAsync();
}
```

## Retry on Conflict

```csharp
async Task RetryingIncrement(IDatabase db, string key)
{
    const int maxRetries = 5;

    for (int i = 0; i < maxRetries; i++)
    {
        long current = (long)await db.StringGetAsync(key);

        ITransaction tran = db.CreateTransaction();
        tran.AddCondition(Condition.StringEqual(key, current));
        tran.StringIncrementAsync(key);

        if (await tran.ExecuteAsync())
        {
            return; // success
        }

        // Condition failed - another client changed the value, retry
        await Task.Delay(50 * (i + 1));
    }

    throw new Exception($"Failed to increment {key} after {maxRetries} retries");
}
```

## Available Conditions

```csharp
// Key exists or not
Condition.KeyExists("my:key");
Condition.KeyNotExists("my:key");

// String equals
Condition.StringEqual("my:key", "expected-value");
Condition.StringNotEqual("my:key", "not-this-value");

// Hash field equals
Condition.HashEqual("my:hash", "field", "expected-value");
Condition.HashNotExists("my:hash", "field");

// List/Set length
Condition.ListLengthEqual("my:list", 5);
Condition.SetContains("my:set", "member");
```

## What Transactions Do Not Cover

Redis transactions do not roll back on command errors:

```csharp
// StringSet succeeds, but StringIncrement errors - both still execute
ITransaction tran = db.CreateTransaction();
tran.StringSetAsync("key", "val");
tran.StringIncrementAsync("key"); // type mismatch - will error at runtime
bool committed = await tran.ExecuteAsync(); // true, but INCR fails
```

Transactions in Redis guarantee atomicity in the sense that no other client can interleave commands, but they do not provide rollback if a command within the transaction fails.

## Summary

`ITransaction` in StackExchange.Redis wraps commands in `MULTI`/`EXEC` for atomic batched execution. `AddCondition` enables optimistic locking - the transaction aborts if a condition fails. This is useful for compare-and-swap patterns where you read a value and want to update it only if nothing else has changed. Always handle `ExecuteAsync` returning `false` and implement retry logic for conditional transactions.
