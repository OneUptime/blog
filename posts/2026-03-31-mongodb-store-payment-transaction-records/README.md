# How to Store Payment Transaction Records in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Payment, Transaction, Schema Design, Financial

Description: Design a MongoDB schema for storing payment transaction records that supports auditing, reconciliation, and financial reporting while maintaining data integrity.

---

## Key Requirements for Payment Records

Payment transaction storage has stricter requirements than typical application data:
- **Immutability**: Payment records must never be modified after creation
- **Auditability**: Every state change needs a full audit trail
- **Idempotency**: Duplicate submissions must not create duplicate charges
- **Completeness**: All fields needed for reconciliation must be captured at write time

## Core Transaction Document Schema

```javascript
{
  _id: "txn_01HW5X2N3M4P5Q6R7S8T9U",   // Prefixed, human-readable ID
  type: "charge",                          // charge | refund | capture | void
  status: "succeeded",                     // pending | processing | succeeded | failed | refunded | void

  // Financial data - store in smallest currency unit (cents)
  amount: 9999,                            // $99.99 in cents
  currency: "USD",
  netAmount: 9706,                         // After processor fees
  processorFee: 293,

  // External references
  processorTransactionId: "ch_3OqABC123",
  processorName: "stripe",
  paymentMethodId: "pm_xyz789",
  paymentMethodType: "card",
  cardLast4: "4242",
  cardBrand: "visa",

  // Business context
  orderId: "ord_001",
  customerId: "cust_123",
  merchantId: "merch_456",
  idempotencyKey: "order-001-attempt-1",   // For deduplication

  // Timestamps (immutable once set)
  initiatedAt: ISODate("2026-03-31T10:00:00Z"),
  processedAt: ISODate("2026-03-31T10:00:01Z"),
  settledAt: null,

  // Raw processor response archived for reconciliation
  processorResponse: {
    id: "ch_3OqABC123",
    outcome: { network_status: "approved_by_network" },
    risk_score: 15
  },

  // Metadata
  metadata: {
    ipAddress: "203.0.113.42",
    userAgent: "Mozilla/5.0...",
    sessionId: "sess_abc"
  }
}
```

## Creating Indexes for Common Queries

```javascript
// Lookup by idempotency key (deduplication)
db.transactions.createIndex(
  { idempotencyKey: 1, merchantId: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $exists: true } } }
)

// Customer transaction history
db.transactions.createIndex({ customerId: 1, initiatedAt: -1 })

// Order payment lookup
db.transactions.createIndex({ orderId: 1, type: 1 })

// Daily reconciliation
db.transactions.createIndex({ merchantId: 1, processedAt: 1, status: 1 })

// Processor ID lookup for webhook processing
db.transactions.createIndex({ processorTransactionId: 1 }, { unique: true, sparse: true })
```

## Inserting a Transaction Record

```javascript
async function recordTransaction(txnData) {
  const txn = {
    _id: generateTxnId(),
    ...txnData,
    initiatedAt: new Date(),
    // Validate no mutable fields from untrusted input
    status: "pending"
  };

  try {
    await db.collection("transactions").insertOne(txn);
    return txn;
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.idempotencyKey) {
      // Duplicate - return existing transaction
      return db.collection("transactions").findOne({
        idempotencyKey: txn.idempotencyKey,
        merchantId: txn.merchantId
      });
    }
    throw err;
  }
}
```

## Updating Transaction Status (Append-Only Pattern)

Never modify financial amounts. For status updates, use targeted `$set` and record the change:

```javascript
async function updateTransactionStatus(txnId, newStatus, processorData) {
  const result = await db.collection("transactions").updateOne(
    {
      _id: txnId,
      status: { $nin: ["succeeded", "refunded", "void"] }  // Guard against double-updates
    },
    {
      $set: {
        status: newStatus,
        processedAt: new Date(),
        processorTransactionId: processorData.id,
        processorResponse: processorData
      },
      $push: {
        statusHistory: {
          status: newStatus,
          changedAt: new Date(),
          reason: processorData.outcome?.reason
        }
      }
    }
  );

  return result.modifiedCount === 1;
}
```

## Summary

Storing payment transactions in MongoDB requires a schema that prioritizes immutability, auditability, and reconciliation support. Store amounts in the smallest currency unit to avoid floating-point issues, capture the raw processor response for dispute resolution, and use idempotency keys with a unique index to prevent duplicate charges. Use `$set` with status guards for state transitions and append a `statusHistory` array to maintain a full audit trail without overwriting original data.
