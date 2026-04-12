# How to Handle Payment State Machines with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Payment, State Machine, Transaction, Schema Design

Description: Implement payment state machine transitions in MongoDB with atomic guards to prevent invalid state changes and maintain a complete audit trail of payment lifecycle events.

---

## Payment State Machine Overview

A payment flows through a defined set of states. Each transition must be valid - for example, a `refunded` payment cannot be `voided`. Enforcing this at the database level prevents bugs from corrupting financial data.

```text
                        +---------+
                        | pending |
                        +---------+
                             |
                +------------+------------+
                |                         |
           (authorize)               (decline)
                |                         |
         +------------+             +--------+
         | authorized |             | failed |
         +------------+             +--------+
           /    |    \
     (capture)(void)(fail)
         /      |      \
  +-----------+  +--------+  +--------+
  | succeeded |  | voided |  | failed |
  +-----------+  +--------+  +--------+
        |
        +--------------------+
        |                    |
    (refund)       (partial refund)
        |                    |
  +-----------+  +---------------------+
  | refunded  |  | partially_refunded  |
  +-----------+  +---------------------+
                         |
                     (refund)
                         |
                   +-----------+
                   | refunded  |
                   +-----------+
```

## Define Valid Transitions

```javascript
const VALID_TRANSITIONS = {
  pending: ["authorized", "failed"],
  authorized: ["succeeded", "voided", "failed"],
  succeeded: ["refunded", "partially_refunded"],
  partially_refunded: ["refunded"],
  failed: [],
  voided: [],
  refunded: []
};

function isValidTransition(fromState, toState) {
  return VALID_TRANSITIONS[fromState]?.includes(toState) ?? false;
}
```

## Atomic State Transitions with Guards

Use `updateOne` with a state guard in the filter to prevent invalid transitions:

```javascript
async function transitionPayment(paymentId, toState, updateFields = {}) {
  // Get current state to validate transition
  const payment = await db.collection("payments").findOne({ _id: paymentId });

  if (!payment) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  if (!isValidTransition(payment.status, toState)) {
    throw new Error(
      `Invalid transition: ${payment.status} -> ${toState}`
    );
  }

  const result = await db.collection("payments").updateOne(
    {
      _id: paymentId,
      status: payment.status  // Guard: only update if state hasn't changed
    },
    {
      $set: {
        status: toState,
        ...updateFields,
        updatedAt: new Date()
      },
      $push: {
        stateHistory: {
          from: payment.status,
          to: toState,
          at: new Date(),
          ...updateFields
        }
      }
    }
  );

  if (result.modifiedCount === 0) {
    throw new Error(`Concurrent state change detected for payment ${paymentId}`);
  }

  return { ...payment, status: toState };
}
```

## Using State Transitions

```javascript
// Authorize a payment
await transitionPayment("pay_001", "authorized", {
  processorAuthCode: "AUTH_XYZ",
  authorizedAt: new Date()
});

// Capture the payment
await transitionPayment("pay_001", "succeeded", {
  processorTransactionId: "txn_abc",
  capturedAmount: 9999,
  capturedAt: new Date()
});

// Process a refund
await transitionPayment("pay_001", "refunded", {
  refundAmount: 9999,
  refundReason: "customer_request",
  refundedAt: new Date()
});
```

## Query Payments by State

```javascript
// Find all payments stuck in processing
const pendingTooLong = await db.collection("payments").find({
  status: "authorized",
  updatedAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) }  // 15 min ago
}).toArray();

// Aggregate payment volume by state
db.payments.aggregate([
  {
    $group: {
      _id: "$status",
      count: { $count: {} },
      totalAmount: { $sum: "$amount" }
    }
  }
])
```

## Creating Indexes for State Machine Queries

```javascript
// Find payments in a given state (for processing queues)
db.payments.createIndex({ status: 1, updatedAt: 1 })

// Customer payment history with state filter
db.payments.createIndex({ customerId: 1, status: 1, createdAt: -1 })
```

## Summary

Payment state machines in MongoDB use atomic `updateOne` operations with state guards in the filter clause to prevent concurrent or invalid transitions. Define allowed state transitions explicitly in code and validate them before issuing the update. The filter's current-state condition ensures that if two processes attempt a transition simultaneously, only one succeeds - the other receives `modifiedCount: 0` and can handle the conflict. Append each transition to a `stateHistory` array to maintain a complete, immutable audit trail.
