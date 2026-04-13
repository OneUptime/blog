# How to Implement the Document Versioning Pattern in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Modeling, Document Versioning, Audit Trail, Schema Design

Description: Learn how to implement document versioning in MongoDB to maintain a full history of document changes, enabling audit trails and point-in-time recovery.

---

## What Is the Document Versioning Pattern?

The document versioning pattern maintains a history of all changes to a document. Each change creates a new version, and the previous versions are preserved. This enables:
- Audit trails (who changed what and when)
- Point-in-time recovery (revert to a previous state)
- Change diffing and comparison
- Compliance requirements

## Approach 1: Current + History Collections

Maintain two collections: one for the current document and one for historical versions:

```javascript
// Current document (latest version)
// Collection: contracts
{
  _id: ObjectId("60a1b2c3d4e5f6a7b8c9d001"),
  contractId: "CONTRACT-2026-001",
  version: 3,
  status: "active",
  terms: "Updated terms as of March 2026",
  parties: ["Alice Corp", "Bob LLC"],
  updatedBy: "alice",
  updatedAt: ISODate("2026-03-31T10:00:00Z")
}

// Historical versions
// Collection: contractsHistory
{
  _id: ObjectId("60a1b2c3d4e5f6a7b8c9d002"),
  contractId: "CONTRACT-2026-001",
  version: 1,
  status: "draft",
  terms: "Initial terms",
  parties: ["Alice Corp"],
  updatedBy: "alice",
  updatedAt: ISODate("2026-01-15T09:00:00Z")
}

{
  _id: ObjectId("60a1b2c3d4e5f6a7b8c9d003"),
  contractId: "CONTRACT-2026-001",
  version: 2,
  status: "pending",
  terms: "Revised terms",
  parties: ["Alice Corp", "Bob LLC"],
  updatedBy: "bob",
  updatedAt: ISODate("2026-02-20T14:00:00Z")
}
```

## Implementing Version-on-Write

Before updating a document, copy the current version to the history collection:

```javascript
async function updateContract(contractId, updates, updatedBy) {
  const session = db.getMongo().startSession();
  session.startTransaction();

  try {
    // Get current document
    const current = await db.contracts.findOne(
      { contractId },
      { session }
    );

    // Archive current version to history
    await db.contractsHistory.insertOne(
      {
        ...current,
        _id: new ObjectId(),  // New ID for the history document
        archivedAt: new Date()
      },
      { session }
    );

    // Update the current document with new version
    await db.contracts.updateOne(
      { contractId },
      {
        $set: {
          ...updates,
          updatedBy,
          updatedAt: new Date()
        },
        $inc: { version: 1 }
      },
      { session }
    );

    await session.commitTransaction();
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}
```

## Querying Version History

Get full version history for a document:

```javascript
// All historical versions (oldest first)
db.contractsHistory.find({ contractId: "CONTRACT-2026-001" })
  .sort({ version: 1 })

// Get a specific version
db.contractsHistory.findOne({ contractId: "CONTRACT-2026-001", version: 2 })

// Get current version
db.contracts.findOne({ contractId: "CONTRACT-2026-001" })
```

## Approach 2: Embedded Version Array

For documents with small, infrequent changes, embed all versions in one document:

```javascript
{
  _id: ObjectId("60a1b2c3d4e5f6a7b8c9d001"),
  contractId: "CONTRACT-2026-001",
  currentVersion: 3,
  versions: [
    {
      version: 1,
      terms: "Initial terms",
      status: "draft",
      changedBy: "alice",
      changedAt: ISODate("2026-01-15T00:00:00Z")
    },
    {
      version: 2,
      terms: "Revised terms",
      status: "pending",
      changedBy: "bob",
      changedAt: ISODate("2026-02-20T00:00:00Z")
    },
    {
      version: 3,
      terms: "Final terms",
      status: "active",
      changedBy: "alice",
      changedAt: ISODate("2026-03-31T00:00:00Z")
    }
  ]
}
```

**Warning**: This approach can hit the 16MB limit for frequently edited documents. Use separate history collection for long-lived documents.

## Reverting to a Previous Version

```javascript
async function revertToVersion(contractId, targetVersion, revertedBy) {
  const session = db.getMongo().startSession();
  session.startTransaction();

  try {
    const historical = await db.contractsHistory.findOne(
      { contractId, version: targetVersion },
      { session }
    );

    if (!historical) throw new Error(`Version ${targetVersion} not found`);

    const current = await db.contracts.findOne(
      { contractId },
      { session }
    );

    // Archive current version before reverting
    await db.contractsHistory.insertOne(
      {
        ...current,
        _id: new ObjectId(),
        archivedAt: new Date()
      },
      { session }
    );

    // Restore from historical version
    const restoredDoc = {
      ...historical,
      _id: current._id,  // Keep current document ID
      version: current.version + 1,
      updatedBy: revertedBy,
      updatedAt: new Date(),
      revertedFrom: targetVersion
    };

    await db.contracts.replaceOne(
      { contractId },
      restoredDoc,
      { session }
    );

    await session.commitTransaction();
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}
```

## Indexing for Version Queries

```javascript
// History collection indexes
db.contractsHistory.createIndex({ contractId: 1, version: 1 })
db.contractsHistory.createIndex({ contractId: 1, archivedAt: -1 })
db.contractsHistory.createIndex({ updatedBy: 1, updatedAt: -1 })

// Current collection index
db.contracts.createIndex({ contractId: 1 }, { unique: true })
```

## TTL for Old Versions

Use a TTL index to auto-expire old versions (e.g., keep 2 years of history):

```javascript
db.contractsHistory.createIndex(
  { archivedAt: 1 },
  { expireAfterSeconds: 63072000 }  // 2 years
)
```

## Summary

The document versioning pattern maintains a history of document states by copying the current document to a history collection before each update. Use a current + history collection pair for production systems with potentially many versions, or embedded version arrays for small documents with few changes. Always use transactions when copying to history and updating the current document, and index on both `documentId` + `version` and `updatedBy` + `updatedAt` to support audit and compliance queries efficiently.
