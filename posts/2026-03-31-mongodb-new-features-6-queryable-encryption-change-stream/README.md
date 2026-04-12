# New Features in MongoDB 6.0: Queryable Encryption, Change Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Encryption, Change Stream, Feature, Version

Description: Explore MongoDB 6.0's key new features including Queryable Encryption for encrypted field queries and change stream pre-images.

---

## Introduction

MongoDB 6.0 introduced Queryable Encryption as a preview feature (it became generally available in MongoDB 7.0), along with change stream pre-images, cluster-to-cluster sync, time series collection secondary indexes, and improvements to the aggregation pipeline. This post focuses on the two features most impactful for application security and data change processing.

## Queryable Encryption

Queryable Encryption allows you to store sensitive fields encrypted at the driver level and still run equality queries against them - without the server ever seeing plaintext data. Range query support was added later, becoming generally available in MongoDB 8.0.

### Setting Up Queryable Encryption

First, generate a Customer Master Key (CMK):

```javascript
const { ClientEncryption } = require("mongodb-client-encryption");
const { MongoClient, Binary } = require("mongodb");
const crypto = require("crypto");

const localMasterKey = crypto.randomBytes(96);
const kmsProviders = { local: { key: localMasterKey } };
```

Create a Data Encryption Key (DEK):

```javascript
const keyVaultClient = new MongoClient(uri);
await keyVaultClient.connect();

const encryption = new ClientEncryption(keyVaultClient, {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders
});

const dataKeyId = await encryption.createDataKey("local", {
  keyAltNames: ["myDataKey"]
});
```

### Define the Encrypted Fields Map

```javascript
const encryptedFieldsMap = {
  "mydb.patients": {
    fields: [
      {
        path: "ssn",
        bsonType: "string",
        queries: [{ queryType: "equality" }]
      },
      {
        path: "salary",
        bsonType: "double"
        // Range queries on encrypted fields became available in MongoDB 8.0
      }
    ]
  }
};
```

### Create the Encrypted Client and Query

```javascript
const encryptedClient = new MongoClient(uri, {
  autoEncryption: {
    keyVaultNamespace: "encryption.__keyVault",
    kmsProviders,
    encryptedFieldsMap
  }
});

// Insert and query encrypted fields transparently
const patients = encryptedClient.db("mydb").collection("patients");
await patients.insertOne({ name: "Alice", ssn: "123-45-6789", salary: 95000 });

const result = await patients.findOne({ ssn: "123-45-6789" });
// result.ssn is decrypted automatically in the application
```

The MongoDB server stores and queries ciphertext only. Decryption happens client-side.

## Change Stream Pre-Images

MongoDB 6.0 adds the ability to capture the state of a document before it was modified in change stream events.

### Enable Pre and Post Images

```javascript
db.createCollection("orders", {
  changeStreamPreAndPostImages: { enabled: true }
})
```

Or on an existing collection:

```javascript
db.runCommand({
  collMod: "orders",
  changeStreamPreAndPostImages: { enabled: true }
})
```

### Access Pre-Images in a Change Stream

```javascript
const changeStream = db.collection("orders").watch([], {
  fullDocumentBeforeChange: "whenAvailable"
});

changeStream.on("change", event => {
  if (event.operationType === "update") {
    console.log("Before:", event.fullDocumentBeforeChange);
    console.log("After:", event.fullDocument);
  }
});
```

Pre-images are stored in a system collection and by default are retained until the corresponding change stream events are removed from the oplog. You can optionally configure a fixed retention period via the `expireAfterSeconds` setting on the `changeStreamOptions` cluster parameter.

## Summary

MongoDB 6.0's Queryable Encryption preview enables equality queries on fields that are encrypted client-side, keeping sensitive data protected from the database server and administrators (range query support became GA in MongoDB 8.0). Change stream pre-images provide the document state before a modification, enabling audit logs, undo operations, and CDC pipelines that need before/after comparisons. Both features require MongoDB drivers version 6.0+ to use the new APIs.
