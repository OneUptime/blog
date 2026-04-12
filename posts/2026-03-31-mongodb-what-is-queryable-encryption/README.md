# What Is MongoDB Queryable Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Queryable Encryption, Security, Encryption, Privacy

Description: MongoDB Queryable Encryption lets you run equality and range queries on encrypted fields without decrypting them on the server, keeping sensitive data private end-to-end.

---

## Overview

Queryable Encryption (QE) is MongoDB's next-generation client-side encryption feature, introduced in MongoDB 6.0. Unlike traditional encryption that requires decrypting data before querying, Queryable Encryption uses advanced cryptographic techniques to run queries directly on encrypted data without the server ever seeing the plaintext.

This solves a fundamental limitation of Client-Side Field Level Encryption (CSFLE): with CSFLE, you could only run equality queries on deterministically-encrypted fields. Queryable Encryption extends this to support equality and range queries while maintaining server-side blindness to the underlying values.

## How Queryable Encryption Works

Queryable Encryption uses a cryptographic construction where the client encrypts data in a way that allows the server to evaluate query predicates on ciphertexts. The server processes a "search token" provided by the client driver and returns matching documents - all without the MongoDB server learning what it matched against.

The key components:
- **Data Encryption Key (DEK)** - Encrypts the actual field values
- **Query Type** - Determines what operations are supported (equality, range)
- **Index Key** - A separate key used to build the encrypted index structure
- The Crypt Shared Library (or the `mongocryptd` daemon) handles automatic encryption analysis on the client side, while `libmongocrypt` within the driver performs the actual cryptographic operations

## Setting Up Queryable Encryption

```javascript
const { MongoClient } = require("mongodb");

const kmsProviders = {
  local: { key: Buffer.alloc(96) } // Use AWS/Azure/GCP KMS in production
};

// Define encrypted fields configuration
const encryptedFieldsMap = {
  "myapp.employees": {
    fields: [
      {
        path: "salary",
        bsonType: "int",
        queries: { queryType: "equality" }
      },
      {
        path: "ssn",
        bsonType: "string",
        queries: { queryType: "equality" }
      }
    ]
  }
};

const client = new MongoClient("mongodb://localhost:27017", {
  autoEncryption: {
    keyVaultNamespace: "encryption.__keyVault",
    kmsProviders,
    encryptedFieldsMap
  }
});

await client.connect();
const db = client.db("myapp");

// Insert - salary and ssn are automatically encrypted
await db.collection("employees").insertOne({
  name: "Bob",
  salary: 95000,
  ssn: "987-65-4321"
});

// Query on encrypted field - works without decryption on server
const emp = await db.collection("employees").findOne({ ssn: "987-65-4321" });
console.log(emp.name); // "Bob" - decrypted by the driver
```

## Queryable Encryption vs. CSFLE

| Feature | CSFLE (Deterministic) | Queryable Encryption |
|---|---|---|
| Equality queries | Yes | Yes |
| Range queries | No | Yes (MongoDB 7.0+) |
| Server sees plaintext | No | No |
| Encrypted index metadata | Exposed | Hidden |
| Security level | Good | Stronger |

## Supported Query Types

- **Equality** - Find documents where an encrypted field equals a specific value
- **Range** - Find documents where an encrypted field falls within a numeric or date range (MongoDB 7.0+)

## Key Vault and KMS

Like CSFLE, Queryable Encryption uses a Key Vault collection and a KMS to store and protect Data Encryption Keys. In production, always use a cloud KMS:

```javascript
const kmsProviders = {
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};
```

## Requirements

- MongoDB 6.0+ (equality) or MongoDB 7.0+ (range)
- MongoDB Enterprise or Atlas
- A supported driver version
- The Crypt Shared Library (recommended over mongocryptd starting with MongoDB 6.0)

## Summary

Queryable Encryption is MongoDB's strongest privacy feature, enabling queries on encrypted fields without ever exposing plaintext to the server. It builds on CSFLE with improved cryptographic guarantees and support for range queries. Use it for applications where regulatory requirements mandate that the database engine cannot access sensitive field values.
