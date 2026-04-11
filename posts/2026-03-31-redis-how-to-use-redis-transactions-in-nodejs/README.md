# How to Use Redis Transactions in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, Transaction, MULTI, EXEC, ioredis

Description: Learn how to use Redis MULTI/EXEC transactions in Node.js with ioredis for atomic command execution, including WATCH-based optimistic locking patterns.

---

## Redis Transactions Overview

Redis transactions with `MULTI/EXEC` ensure a group of commands executes atomically - no other client can interleave commands during execution. ioredis provides `multi()` for transaction support.

Key points:
- Commands queued after `multi()` run atomically on `exec()`
- `WATCH` enables optimistic locking (abort if watched key changes)
- `discard()` cancels the queued commands
- Runtime errors in individual commands do not abort the transaction

## Basic MULTI/EXEC Transaction

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function basicTransaction() {
  const results = await redis
    .multi()
    .set('account:alice', '1000')
    .set('account:bob', '500')
    .incr('transaction:count')
    .exec();

  // results is an array of [error, result] pairs
  results.forEach(([err, result], i) => {
    if (err) {
      console.error(`Command ${i} failed:`, err);
    } else {
      console.log(`Command ${i}: ${result}`);
    }
  });
}

basicTransaction();
```

## Atomic Fund Transfer

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function transferFunds(fromAccount, toAccount, amount) {
  const fromBalance = parseFloat(await redis.get(fromAccount) || '0');
  const toBalance = parseFloat(await redis.get(toAccount) || '0');

  if (fromBalance < amount) {
    throw new Error(`Insufficient funds: ${fromBalance} < ${amount}`);
  }

  const results = await redis
    .multi()
    .set(fromAccount, (fromBalance - amount).toString())
    .set(toAccount, (toBalance + amount).toString())
    .exec();

  console.log('Transfer complete:', results);
  return results;
}

// Set up initial balances
await redis.set('account:alice', '1000');
await redis.set('account:bob', '500');

await transferFunds('account:alice', 'account:bob', 200);
console.log('Alice:', await redis.get('account:alice')); // 800
console.log('Bob:', await redis.get('account:bob'));     // 700
```

## WATCH-Based Optimistic Locking

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function safeTransfer(fromAccount, toAccount, amount) {
  const MAX_RETRIES = 10;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Watch the accounts for changes
      await redis.watch(fromAccount, toAccount);

      const fromBalance = parseFloat(await redis.get(fromAccount) || '0');
      const toBalance = parseFloat(await redis.get(toAccount) || '0');

      if (fromBalance < amount) {
        await redis.unwatch();
        throw new Error('Insufficient funds');
      }

      // Build and execute transaction
      const results = await redis
        .multi()
        .set(fromAccount, (fromBalance - amount).toString())
        .set(toAccount, (toBalance + amount).toString())
        .exec();

      // If results is null, WATCH detected a change
      if (results === null) {
        console.log(`Conflict on attempt ${attempt + 1}, retrying...`);
        continue;
      }

      console.log('Transfer successful');
      return results;
    } catch (err) {
      if (err.message !== 'EXECABORT') {
        throw err;
      }
    }
  }

  throw new Error('Transaction failed after max retries');
}

await safeTransfer('account:alice', 'account:bob', 100);
```

## Atomic Inventory Decrement

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function purchaseItem(productId, userId) {
  const inventoryKey = `inventory:${productId}`;
  const purchaseKey = `purchase:${userId}:${productId}`;

  for (let attempt = 0; attempt < 5; attempt++) {
    await redis.watch(inventoryKey);

    const stock = parseInt(await redis.get(inventoryKey) || '0');

    if (stock <= 0) {
      await redis.unwatch();
      return { success: false, reason: 'Out of stock' };
    }

    const results = await redis
      .multi()
      .decr(inventoryKey)
      .set(purchaseKey, Date.now().toString())
      .exec();

    if (results !== null) {
      return { success: true, remainingStock: results[0][1] };
    }
  }

  return { success: false, reason: 'Conflict - try again' };
}

await redis.set('inventory:product:42', '10');
const result = await purchaseItem('product:42', 'user:1001');
console.log(result);
```

## Discarding a Transaction

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function transactionWithCancel(shouldProceed) {
  const multi = redis.multi();
  multi.set('key1', 'value1');
  multi.set('key2', 'value2');

  if (!shouldProceed) {
    // In pipeline mode (default), not calling exec() discards the queued commands
    console.log('Transaction cancelled');
    return null;
  }

  return multi.exec();
}

await transactionWithCancel(false); // Cancelled - commands never sent
await transactionWithCancel(true);  // Executed
```

## Atomic Counter with Limit

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function incrementWithLimit(counterKey, maxValue) {
  for (let attempt = 0; attempt < 10; attempt++) {
    await redis.watch(counterKey);

    const current = parseInt(await redis.get(counterKey) || '0');

    if (current >= maxValue) {
      await redis.unwatch();
      return { allowed: false, count: current };
    }

    const results = await redis
      .multi()
      .incr(counterKey)
      .exec();

    if (results !== null) {
      return { allowed: true, count: results[0][1] };
    }
  }

  return { allowed: false, count: -1 };
}

// Allow max 100 downloads
await redis.set('downloads:file:123', '99');
const result = await incrementWithLimit('downloads:file:123', 100);
console.log(result); // { allowed: true, count: 100 }
```

## Summary

Redis transactions in Node.js with ioredis use `redis.multi()` to queue commands for atomic execution with `exec()`. When concurrent modification is a concern, use `WATCH` on affected keys and retry on `null` results (indicating a conflict was detected). This optimistic locking pattern - watch, read, multi, exec, retry on null - is the standard approach for safe read-modify-write operations in Redis.
