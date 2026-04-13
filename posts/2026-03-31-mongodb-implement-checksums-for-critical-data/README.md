# How to Implement Checksums for Critical Data in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Integrity, Checksum, Validation, Security

Description: Learn how to implement application-level checksums in MongoDB to detect unintended modifications to critical data fields like financial records and medical data.

---

## Why Application-Level Checksums?

MongoDB's WiredTiger engine uses block-level checksums to detect storage corruption. But those checksums do not catch application bugs, software errors, or unauthorized modifications that produce valid BSON. For financial records, audit logs, and medical data, you need checksums computed over field values to detect any unauthorized change.

## Checksum Strategy

Compute a deterministic hash over the fields that must not change after the document reaches a final state. Store the hash as a field in the document. On read, recompute and compare.

## Computing a Document Checksum in Node.js

```javascript
const crypto = require("crypto");

function computeChecksum(doc) {
  // Sort keys for deterministic JSON - only include immutable fields
  const payload = {
    _id: doc._id.toHexString(),
    amount: doc.amount,
    currency: doc.currency,
    fromAccount: doc.fromAccount,
    toAccount: doc.toAccount,
    createdAt: doc.createdAt.toISOString()
  };
  const json = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash("sha256").update(json).digest("hex");
}

// When inserting a finalized transaction
const transaction = {
  _id: new ObjectId(),
  amount: 1500.00,
  currency: "USD",
  fromAccount: "acct_001",
  toAccount: "acct_002",
  status: "settled",
  createdAt: new Date()
};
transaction.checksum = computeChecksum(transaction);

await db.collection("transactions").insertOne(transaction);
```

## Verifying a Checksum on Read

```javascript
async function fetchAndVerifyTransaction(transactionId) {
  const doc = await db.collection("transactions").findOne({ _id: transactionId });
  if (!doc) throw new Error("Transaction not found");

  const expectedChecksum = computeChecksum(doc);
  if (doc.checksum !== expectedChecksum) {
    // Alert: document has been modified after creation
    await db.collection("integrityViolations").insertOne({
      documentId: transactionId,
      collection: "transactions",
      detectedAt: new Date(),
      storedChecksum: doc.checksum,
      computedChecksum: expectedChecksum
    });
    throw new Error(`Integrity violation on transaction ${transactionId}`);
  }

  return doc;
}
```

## Batch Integrity Audit

Run periodic scans to detect violations:

```javascript
async function auditCollection(collectionName, computeChecksumFn) {
  let violations = 0;
  const cursor = db.collection(collectionName).find({}, { batchSize: 500 });

  for await (const doc of cursor) {
    const expected = computeChecksumFn(doc);
    if (doc.checksum !== expected) {
      violations++;
      console.error("VIOLATION:", doc._id, "stored:", doc.checksum, "expected:", expected);
    }
  }

  console.log(`Audit complete. ${violations} violations found.`);
  return violations;
}
```

## Python Implementation

```python
import hashlib
import json
from bson import ObjectId

def compute_checksum(doc: dict) -> str:
    payload = {
        "_id": str(doc["_id"]),
        "amount": doc["amount"],
        "currency": doc["currency"],
        "from_account": doc["from_account"],
        "to_account": doc["to_account"],
        "created_at": doc["created_at"].isoformat()
    }
    serialized = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(serialized.encode()).hexdigest()

def insert_with_checksum(collection, doc: dict):
    doc["checksum"] = compute_checksum(doc)
    return collection.insert_one(doc)
```

## Index on Checksum Field

Add a sparse index on the checksum field to support bulk audits:

```javascript
db.transactions.createIndex({ checksum: 1 }, { sparse: true });
```

## Summary

Application-level checksums in MongoDB protect critical documents from undetected modifications after they reach a final state. Compute a SHA-256 hash over a fixed set of immutable fields using deterministic JSON serialization, store the hash in the document, and recompute on every read for sensitive operations. Run scheduled batch audits over financial or medical collections to detect integrity violations proactively, and log each violation to a separate `integrityViolations` collection for investigation.
