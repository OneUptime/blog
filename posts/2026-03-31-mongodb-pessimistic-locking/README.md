# How to Implement Pessimistic Locking in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Concurrency, Locking, Transaction, Consistency

Description: Learn how to implement pessimistic locking in MongoDB using document-level lock fields, TTL-based expiry, and multi-document transactions to prevent concurrent modifications.

---

Pessimistic locking assumes conflicts will happen and prevents them by locking a document before modifying it. MongoDB does not have built-in advisory locks, but you can implement them using atomic `findOneAndUpdate` operations and a lock field on documents.

## Document Schema with Lock Field

Add lock metadata directly to the document being protected:

```javascript
const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  balance: { type: Number, required: true },
  // Pessimistic lock fields
  lockedBy: { type: String, default: null },
  lockedAt: { type: Date, default: null },
  lockExpiresAt: { type: Date, default: null },
});

module.exports = mongoose.model('Account', accountSchema);
```

## Acquiring a Lock

Use an atomic findOneAndUpdate to set the lock only if it is not currently held:

```javascript
const LOCK_DURATION_MS = 10000; // 10 seconds

async function acquireLock(accountId, lockHolder) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);

  const account = await Account.findOneAndUpdate(
    {
      _id: accountId,
      $or: [
        { lockedBy: null },
        { lockExpiresAt: { $lt: now } }, // Expired locks can be overridden
      ],
    },
    {
      $set: {
        lockedBy: lockHolder,
        lockedAt: now,
        lockExpiresAt: expiresAt,
      },
    },
    { new: true }
  );

  if (!account) {
    throw new Error(`Account ${accountId} is currently locked`);
  }
}
```

## Releasing a Lock

Only allow the lock holder to release the lock:

```javascript
async function releaseLock(accountId, lockHolder) {
  const result = await Account.findOneAndUpdate(
    { _id: accountId, lockedBy: lockHolder },
    { $set: { lockedBy: null, lockedAt: null, lockExpiresAt: null } }
  );

  if (!result) {
    throw new Error('Lock not held or already expired');
  }
}
```

## Using the Lock in a Transfer Operation

```javascript
async function transferFunds(fromId, toId, amount, requesterId) {
  const lockHolder = `${requesterId}-${Date.now()}`;

  // Acquire locks on both accounts (always lock in consistent order to prevent deadlocks)
  const [id1, id2] = [fromId, toId].sort();
  await acquireLock(id1, lockHolder);
  try {
    await acquireLock(id2, lockHolder);
    try {
      const fromAccount = await Account.findById(fromId);
      if (fromAccount.balance < amount) {
        throw new Error('Insufficient funds');
      }

      await Account.findByIdAndUpdate(fromId, { $inc: { balance: -amount } });
      await Account.findByIdAndUpdate(toId, { $inc: { balance: amount } });

      console.log(`Transferred ${amount} from ${fromId} to ${toId}`);
    } finally {
      await releaseLock(id2, lockHolder);
    }
  } finally {
    await releaseLock(id1, lockHolder);
  }
}
```

## Using Transactions as an Alternative

For simpler scenarios, MongoDB multi-document transactions provide built-in write isolation:

```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  const from = await Account.findById(fromId).session(session);
  if (from.balance < amount) throw new Error('Insufficient funds');

  await Account.findByIdAndUpdate(fromId, { $inc: { balance: -amount } }, { session });
  await Account.findByIdAndUpdate(toId, { $inc: { balance: amount } }, { session });

  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

## Querying for Stale Locks

```javascript
// Find documents with expired locks that were not released
db.accounts.find({
  lockedBy: { $ne: null },
  lockExpiresAt: { $lt: new Date() }
})
```

## Summary

Pessimistic locking in MongoDB uses atomic `findOneAndUpdate` with a conditional filter on the lock field. Always set a lock expiry to prevent deadlocks from crashed processes, always acquire locks in a consistent order across the codebase to prevent circular deadlocks, and prefer MongoDB transactions over manual locking when the operation spans fewer than three documents.
