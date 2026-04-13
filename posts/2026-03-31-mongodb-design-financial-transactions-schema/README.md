# How to Design a Financial Transactions Schema in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Design, Financial, Transaction, Document Model

Description: Learn how to design a robust financial transactions schema in MongoDB with proper indexing, immutable records, and balance tracking patterns.

---

## Why MongoDB for Financial Transactions

MongoDB's document model is a natural fit for financial data. A single transaction can embed account details, line items, metadata, and audit information in one document, eliminating the need for complex joins. With multi-document ACID transactions available since version 4.0, MongoDB can safely handle the consistency requirements of financial workloads.

The core challenge is choosing the right schema pattern to balance write throughput, query flexibility, and auditability.

## Core Transaction Document Structure

A financial transaction document should be immutable after creation. Never update the amount or status in place - instead, record compensating transactions.

```javascript
{
  _id: ObjectId("..."),
  txnId: "TXN-20240315-00001",
  type: "debit",           // "debit" | "credit" | "transfer" | "fee"
  status: "completed",     // "pending" | "completed" | "failed" | "reversed"
  amount: NumberDecimal("150.00"),
  currency: "USD",
  fromAccountId: ObjectId("..."),
  toAccountId: ObjectId("..."),
  balanceBefore: NumberDecimal("500.00"),
  balanceAfter: NumberDecimal("350.00"),
  description: "Monthly subscription payment",
  metadata: {
    merchantId: "MERCH-001",
    category: "subscription",
    referenceNumber: "REF-99231"
  },
  createdAt: ISODate("2024-03-15T10:00:00Z"),
  processedAt: ISODate("2024-03-15T10:00:01Z"),
  auditLog: [
    { event: "created", ts: ISODate("2024-03-15T10:00:00Z"), userId: "system" },
    { event: "processed", ts: ISODate("2024-03-15T10:00:01Z"), userId: "system" }
  ]
}
```

Always use `NumberDecimal` for monetary values to avoid floating-point rounding errors.

## Account Balance Schema

Maintain a separate accounts collection with the current balance. Use optimistic concurrency control via a version field to prevent double-spend.

```javascript
{
  _id: ObjectId("..."),
  accountId: "ACC-1001",
  ownerId: ObjectId("..."),
  balance: NumberDecimal("350.00"),
  currency: "USD",
  accountType: "checking",
  status: "active",
  version: 47,           // increment on each balance update
  createdAt: ISODate("2023-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-03-15T10:00:01Z")
}
```

## Multi-Document Transaction Pattern

To safely debit one account and credit another, use a MongoDB session and transaction:

```javascript
const session = client.startSession();
try {
  session.startTransaction();

  const debitResult = await accounts.findOneAndUpdate(
    { accountId: "ACC-1001", balance: { $gte: NumberDecimal("150.00") }, version: 47 },
    {
      $inc: { balance: NumberDecimal("-150.00"), version: 1 },
      $set: { updatedAt: new Date() }
    },
    { session, returnDocument: "after" }
  );

  if (!debitResult) throw new Error("Insufficient funds or concurrent update");

  await accounts.findOneAndUpdate(
    { accountId: "ACC-2002" },
    {
      $inc: { balance: NumberDecimal("150.00"), version: 1 },
      $set: { updatedAt: new Date() }
    },
    { session }
  );

  await transactions.insertOne({
    type: "transfer",
    amount: NumberDecimal("150.00"),
    fromAccountId: "ACC-1001",
    toAccountId: "ACC-2002",
    status: "completed",
    createdAt: new Date()
  }, { session });

  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

## Indexing Strategy

Efficient queries on a transactions collection require careful compound indexes:

```javascript
// Look up transactions by account (most common query)
db.transactions.createIndex({ fromAccountId: 1, createdAt: -1 });
db.transactions.createIndex({ toAccountId: 1, createdAt: -1 });

// Support for status-based reconciliation jobs
db.transactions.createIndex({ status: 1, createdAt: 1 });

// Unique constraint on transaction ID for idempotency
db.transactions.createIndex({ txnId: 1 }, { unique: true });

// TTL index to automatically delete old records after 7 years
// Warning: TTL indexes permanently delete documents, not archive them.
// For financial data, consider a scheduled job to move records to an archive collection instead.
db.transactions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 220752000 });
```

## Monthly Statement Aggregation

Generate a monthly statement using the aggregation pipeline:

```javascript
db.transactions.aggregate([
  {
    $match: {
      fromAccountId: ObjectId("..."),
      createdAt: {
        $gte: ISODate("2024-03-01T00:00:00Z"),
        $lt: ISODate("2024-04-01T00:00:00Z")
      }
    }
  },
  {
    $group: {
      _id: "$type",
      totalAmount: { $sum: "$amount" },
      count: { $sum: 1 },
      transactions: { $push: { txnId: "$txnId", amount: "$amount", description: "$description", date: "$createdAt" } }
    }
  },
  { $sort: { _id: 1 } }
]);
```

## Anti-Patterns to Avoid

- **Mutable amounts**: Never update `amount` or `fromAccountId` on an existing transaction. Create a reversal transaction instead.
- **Embedded balance history**: Do not embed all transaction history inside the account document - this leads to unbounded array growth.
- **Float for currency**: Always use `NumberDecimal`, not JavaScript `number` or `float`, to avoid precision loss.
- **Missing idempotency key**: Always store a client-generated `txnId` with a unique index so retried requests do not create duplicate transactions.

## Summary

Designing a financial transactions schema in MongoDB requires immutable transaction records using `NumberDecimal`, a versioned account balance document for optimistic concurrency, and multi-document ACID transactions for transfer operations. Compound indexes on account ID and creation date drive efficient statement queries, while a unique `txnId` field ensures safe retries. Following these patterns gives you a consistent, auditable, and high-throughput financial data layer on MongoDB.
