# How to Implement Payment Retry Logic with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Payment, Retry, Billing, Reliability

Description: Build robust payment retry logic using MongoDB to handle failed payments with exponential backoff, retry scheduling, and dead letter handling for permanently failed charges.

---

## Why Payment Retries Need Careful Design

Failed payments from insufficient funds, card expiry, or network errors are common. A naive retry strategy can cause:
- Repeated failed charges that annoy customers
- Race conditions with concurrent retry jobs
- Permanent failures never being escalated
- Customer accounts stuck in bad states indefinitely

## Payment Retry Document Schema

Track retry state directly on the transaction or as a separate retry schedule:

```javascript
{
  _id: "retry_schedule_01",
  paymentId: "pay_abc",
  customerId: "cust_123",
  subscriptionId: "sub_456",
  amount: 2900,
  currency: "USD",
  paymentMethodId: "pm_card_xyz",

  status: "scheduled",       // scheduled | processing | succeeded | failed | abandoned
  attemptCount: 2,
  maxAttempts: 4,

  nextRetryAt: ISODate("2026-04-03T10:00:00Z"),

  attempts: [
    {
      attemptNumber: 1,
      attemptedAt: ISODate("2026-04-01T10:00:00Z"),
      outcome: "failed",
      failureCode: "insufficient_funds",
      failureMessage: "Your card has insufficient funds."
    },
    {
      attemptNumber: 2,
      attemptedAt: ISODate("2026-04-02T10:00:00Z"),
      outcome: "failed",
      failureCode: "insufficient_funds",
      failureMessage: "Your card has insufficient funds."
    }
  ],

  createdAt: ISODate("2026-04-01T10:00:00Z"),
  updatedAt: ISODate("2026-04-02T10:00:01Z")
}
```

## Exponential Backoff Schedule

```javascript
function calculateNextRetryDate(attemptCount) {
  // Retry after 1 day, 3 days, 7 days, then abandon
  const retryDelays = [1, 3, 7];
  const delayDays = retryDelays[attemptCount - 1];
  if (!delayDays) return null;  // No more retries

  const nextRetry = new Date();
  nextRetry.setDate(nextRetry.getDate() + delayDays);
  nextRetry.setHours(10, 0, 0, 0);  // Retry at 10am
  return nextRetry;
}
```

## Claiming a Retry for Processing (Atomic)

Use an atomic findOneAndUpdate to claim a retry job, preventing concurrent workers from processing the same retry:

```javascript
async function claimNextRetry() {
  const now = new Date();

  return db.collection("payment_retries").findOneAndUpdate(
    {
      status: "scheduled",
      nextRetryAt: { $lte: now },
      $expr: { $lt: ["$attemptCount", "$maxAttempts"] }
    },
    {
      $set: {
        status: "processing",
        claimedAt: now,
        claimedBy: process.env.WORKER_ID
      }
    },
    {
      sort: { nextRetryAt: 1 },
      returnDocument: "after"
    }
  );
}
```

## Processing the Retry

```javascript
async function processRetry(retryRecord) {
  let processorResult;
  let outcome;
  let failureCode = null;

  try {
    processorResult = await stripe.charges.create({
      amount: retryRecord.amount,
      currency: retryRecord.currency,
      customer: retryRecord.customerId,
    }, {
      idempotencyKey: `${retryRecord.paymentId}-attempt-${retryRecord.attemptCount + 1}`
    });
    outcome = "succeeded";
  } catch (err) {
    outcome = "failed";
    failureCode = err.code;
  }

  const newAttemptCount = retryRecord.attemptCount + 1;
  const nextRetryAt = outcome === "failed"
    ? calculateNextRetryDate(newAttemptCount)
    : null;

  const newStatus = outcome === "succeeded"
    ? "succeeded"
    : nextRetryAt ? "scheduled" : "abandoned";

  await db.collection("payment_retries").updateOne(
    { _id: retryRecord._id },
    {
      $set: {
        status: newStatus,
        attemptCount: newAttemptCount,
        nextRetryAt,
        updatedAt: new Date()
      },
      $push: {
        attempts: {
          attemptNumber: newAttemptCount,
          attemptedAt: new Date(),
          outcome,
          failureCode
        }
      }
    }
  );

  if (newStatus === "abandoned") {
    await notifyCustomerOfPermanentFailure(retryRecord);
  }

  return { outcome, newStatus };
}
```

## Retry Worker

```javascript
async function retryWorker() {
  while (true) {
    const retry = await claimNextRetry();
    if (retry) {
      await processRetry(retry);
    } else {
      await new Promise(r => setTimeout(r, 30000));  // Sleep 30s if nothing to process
    }
  }
}
```

## Summary

Payment retry logic in MongoDB uses a retry schedule document with `nextRetryAt` and `status` fields, and an atomic `findOneAndUpdate` to claim retries for processing, preventing duplicate processing by concurrent workers. Implement exponential backoff by spacing retries across 1, 3, and 7 days after the initial failure. After exhausting all retry attempts, set status to `abandoned` and notify the customer. Pass attempt-specific idempotency keys to the payment processor to prevent duplicate charges during retry processing.
