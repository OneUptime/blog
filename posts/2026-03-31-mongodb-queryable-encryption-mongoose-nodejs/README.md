# How to Use Queryable Encryption with Mongoose in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoose, Queryable Encryption, Node.js, Security

Description: Learn how to integrate MongoDB Queryable Encryption with Mongoose in Node.js, including setup, schema definition, and encrypted field querying.

---

Mongoose is the most popular ODM for MongoDB in Node.js, but Queryable Encryption (QE) operates at the driver level. Integrating the two requires careful setup because Mongoose uses its own connection management. This guide shows how to wire them together.

## Prerequisites

```bash
npm install mongoose mongodb mongodb-client-encryption
```

Requires MongoDB 7.0+ Enterprise and a mongocryptd process or the shared library.

## Setting Up the Encrypted Client

Mongoose wraps the native MongoDB driver. You need to pass `autoEncryption` options through the Mongoose `connect` call:

```javascript
const mongoose = require("mongoose");
const fs = require("fs");

// Load or generate a 96-byte local master key
const localMasterKey = fs.readFileSync("./masterKey.bin");

const encryptedFieldsMap = {
  "myapp.users": {
    fields: [
      {
        path: "ssn",
        bsonType: "string",
        queries: [{ queryType: "equality" }]
      }
    ]
  }
};

await mongoose.connect("mongodb://localhost:27017/myapp", {
  autoEncryption: {
    keyVaultNamespace: "encryption.__keyVault",
    kmsProviders: { local: { key: localMasterKey } },
    encryptedFieldsMap,
    extraOptions: {
      cryptSharedLibPath: "/usr/local/lib/mongo_crypt_v1.so"
    }
  }
});
```

## Creating the Collection Before Defining the Schema

Queryable Encryption requires the collection to be created with the encrypted fields config before any writes. Do this once during application bootstrap:

```javascript
const db = mongoose.connection.db;
const collections = await db.listCollections({ name: "users" }).toArray();
if (collections.length === 0) {
  await db.createCollection("users", {
    encryptedFields: encryptedFieldsMap["myapp.users"]
  });
}
```

## Defining the Mongoose Schema

Define your schema as normal. Mongoose does not need to know about encryption - the driver handles it transparently:

```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ssn: { type: String, required: true },
  email: { type: String, required: true }
});

const User = mongoose.model("User", userSchema);
```

## Writing Encrypted Documents

```javascript
const user = new User({
  name: "Alice Johnson",
  ssn: "123-45-6789",
  email: "alice@example.com"
});

await user.save();
// ssn is encrypted by the driver before reaching MongoDB
```

## Querying Encrypted Fields

```javascript
// Equality query - driver encrypts the search value automatically
const found = await User.findOne({ ssn: "123-45-6789" });
console.log(found.name);  // "Alice Johnson"
console.log(found.ssn);   // "123-45-6789" (decrypted by driver)
```

## Using Lean Queries

With `.lean()`, Mongoose returns plain JS objects. The driver still decrypts the value before returning it to you:

```javascript
const doc = await User.findOne({ ssn: "123-45-6789" }).lean();
console.log(doc.ssn); // "123-45-6789"
```

## Limitations with Mongoose

- **Mongoose validators** run on writes before the driver encrypts, so they see plaintext values and work normally
- **Mongoose middleware** (pre/post hooks) see plaintext values
- **Aggregations** on encrypted fields are limited to the supported query types
- Schema versioning or migration tools that bypass the driver will not encrypt/decrypt correctly

## Summary

Integrating Queryable Encryption with Mongoose requires passing `autoEncryption` options to `mongoose.connect` and ensuring the collection is created with the encrypted fields map before the first write. Once configured, Mongoose models work as normal because the native driver handles encryption transparently. Be aware that any tool that bypasses the Mongoose connection (such as direct shell access) will see ciphertext, not plaintext.
