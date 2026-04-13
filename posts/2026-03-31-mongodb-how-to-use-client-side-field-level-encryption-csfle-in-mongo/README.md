# How to Use Client-Side Field Level Encryption in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Encryption, CSFLE, Security, Privacy

Description: Implement MongoDB Client-Side Field Level Encryption to encrypt sensitive fields before they leave the application, keeping them opaque to the database server.

---

## What Is CSFLE

Client-Side Field Level Encryption (CSFLE) encrypts specific document fields in the application before data is sent to MongoDB. The database server stores and returns only ciphertext - it never sees the plaintext value. Only clients with the encryption key can decrypt the data, providing strong protection even if the database server is compromised.

CSFLE is available in MongoDB 4.2+ drivers. Automatic encryption (where the driver handles encryption transparently) requires MongoDB Enterprise or Atlas.

## Setting Up CSFLE with the Node.js Driver

Install the required package:

```bash
npm install mongodb mongodb-client-encryption
```

## Configure Encryption Keys

Generate a Customer Master Key (CMK) and store it in your key management system. For local testing:

```javascript
const { ClientEncryption } = require("mongodb-client-encryption");
const { MongoClient, Binary } = require("mongodb");
const crypto = require("crypto");

// Generate a 96-byte local master key (for testing only - use KMS in production)
const localMasterKey = crypto.randomBytes(96);

const keyVaultClient = new MongoClient("mongodb://localhost:27017");
await keyVaultClient.connect();

const encryption = new ClientEncryption(keyVaultClient, {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders: { local: { key: localMasterKey } }
});

// Create a data encryption key
const dataKeyId = await encryption.createDataKey("local", {
  keyAltNames: ["myDataKey"]
});
console.log("Data key ID:", dataKeyId);
```

## Define the Encryption Schema

```javascript
const schemaMap = {
  "myapp.patients": {
    bsonType: "object",
    encryptMetadata: {
      keyId: [dataKeyId]
    },
    properties: {
      ssn: {
        encrypt: {
          bsonType: "string",
          algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
        }
      },
      medicalHistory: {
        encrypt: {
          bsonType: "string",
          algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
        }
      }
    }
  }
};
```

## Create the Auto-Encrypting Client

```javascript
const encryptedClient = new MongoClient("mongodb://localhost:27017", {
  autoEncryption: {
    keyVaultNamespace: "encryption.__keyVault",
    kmsProviders: { local: { key: localMasterKey } },
    schemaMap: schemaMap,
    extraOptions: {
      cryptSharedLibPath: "/path/to/mongo_crypt_v1.so"
    }
  }
});

await encryptedClient.connect();
```

## Insert and Query Encrypted Data

```javascript
const patients = encryptedClient.db("myapp").collection("patients");

// SSN is encrypted automatically before insertion
await patients.insertOne({
  name: "Alice Smith",
  ssn: "123-45-6789",       // Encrypted by driver
  medicalHistory: "..."     // Encrypted by driver
});

// Equality query works because SSN uses deterministic encryption
const patient = await patients.findOne({ ssn: "123-45-6789" });
console.log(patient.ssn); // "123-45-6789" (decrypted by driver)
```

## Explicit Encryption for Manual Control

```javascript
const encrypted = await encryption.encrypt("sensitive-value", {
  algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic",
  keyAltName: "myDataKey"
});

// Store encrypted Binary value directly
await db.collection("data").insertOne({ sensitiveField: encrypted });
```

## Summary

CSFLE encrypts sensitive document fields in the application before they reach the database. The MongoDB server only stores ciphertext and can never access plaintext. Configure auto-encryption with a `schemaMap` and a KMS provider for transparent field encryption, or use explicit encryption for fine-grained control. CSFLE is the strongest data protection option when you cannot trust the database server operator.
