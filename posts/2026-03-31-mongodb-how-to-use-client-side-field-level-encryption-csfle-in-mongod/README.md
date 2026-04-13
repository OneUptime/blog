# How to Use Client-Side Field Level Encryption (CSFLE) in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Security, CSFLE, Encryption, Field Level Encryption

Description: Learn how to implement MongoDB Client-Side Field Level Encryption to encrypt sensitive fields before they reach the server, ensuring only authorized clients can decrypt data.

---

## What Is Client-Side Field Level Encryption?

Client-Side Field Level Encryption (CSFLE) encrypts specific document fields in the application before the data is sent to MongoDB. The server stores only ciphertext - it never sees plaintext values. Only clients with the correct encryption keys can read the data.

This is different from encryption at rest, where MongoDB encrypts entire data files. CSFLE encrypts specific fields end-to-end.

## Architecture Overview

```text
Application (with CSFLE driver)
     |
     |-- Encrypts: ssn, creditCard, dateOfBirth
     |
     v
MongoDB Server (stores ciphertext only)
     |
     |-- ssn: <Binary BinData> (opaque to the server)
```

## Setting Up CSFLE with the Node.js Driver

Install required packages:

```bash
npm install mongodb mongodb-client-encryption
```

Generate a local master key for development:

```javascript
const { randomBytes } = require("crypto");

// In production, use a KMS (AWS, Azure, GCP)
const localMasterKey = randomBytes(96);
```

Create a data encryption key (DEK):

```javascript
const { MongoClient } = require("mongodb");
const { ClientEncryption } = require("mongodb-client-encryption");

async function createDataKey() {
  // Key vault client (no auto-encryption)
  const keyVaultClient = new MongoClient("mongodb://localhost:27017");
  await keyVaultClient.connect();

  const encryption = new ClientEncryption(keyVaultClient, {
    keyVaultNamespace: "encryption.__keyVault",
    kmsProviders: {
      local: { key: localMasterKey }
    }
  });

  const dataKeyId = await encryption.createDataKey("local", {
    keyAltNames: ["my-data-key"]
  });

  console.log("Data Key ID:", dataKeyId);
  await keyVaultClient.close();
  return dataKeyId;
}
```

## Configuring Automatic Encryption

Configure the MongoDB client to automatically encrypt and decrypt fields:

```javascript
const { MongoClient } = require("mongodb");

async function getEncryptedClient(dataKeyId) {
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
            // Deterministic encryption enables equality queries
          }
        },
        creditCardNumber: {
          encrypt: {
            bsonType: "string",
            algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
            // Random encryption: more secure, not searchable
          }
        },
        dateOfBirth: {
          encrypt: {
            bsonType: "date",
            algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
          }
        }
      }
    }
  };

  return new MongoClient("mongodb://localhost:27017", {
    autoEncryption: {
      keyVaultNamespace: "encryption.__keyVault",
      kmsProviders: {
        local: { key: localMasterKey }
      },
      schemaMap
    }
  });
}
```

## Inserting Encrypted Documents

With autoEncryption configured, insert as normal - encryption is transparent:

```javascript
async function insertPatient(client) {
  const db = client.db("myapp");
  const patients = db.collection("patients");

  await patients.insertOne({
    name: "Alice Smith",
    ssn: "123-45-6789",           // Will be encrypted automatically
    creditCardNumber: "4111111111111111",  // Encrypted
    dateOfBirth: new Date("1990-05-15"),   // Encrypted
    diagnosis: "Hypertension",     // Not encrypted (stored plaintext)
    createdAt: new Date()
  });

  console.log("Patient inserted with encrypted fields");
}
```

## Querying Encrypted Fields

Equality queries work on fields encrypted with the deterministic algorithm:

```javascript
// This works because ssn uses deterministic encryption
const patient = await patients.findOne({ ssn: "123-45-6789" });
console.log(patient.ssn);  // "123-45-6789" - decrypted automatically
```

Fields encrypted with the random algorithm (like `creditCardNumber`) are not queryable because the same plaintext produces different ciphertext each time.

## Using AWS KMS Instead of Local Key

For production, use a cloud KMS:

```javascript
const awsKmsProvider = {
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};

const encryption = new ClientEncryption(keyVaultClient, {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders: awsKmsProvider
});

const dataKeyId = await encryption.createDataKey("aws", {
  masterKey: {
    region: "us-east-1",
    key: "arn:aws:kms:us-east-1:123456789:key/abcd-1234-..."
  },
  keyAltNames: ["my-aws-data-key"]
});
```

## Index on Key Vault Collection

```javascript
// Create unique index on key alt names in the key vault
db.getSiblingDB("encryption").getCollection("__keyVault").createIndex(
  { keyAltNames: 1 },
  {
    unique: true,
    partialFilterExpression: { keyAltNames: { $exists: true } }
  }
)
```

## Verifying Encryption on the Server

Connect without the encryption client to confirm fields are stored as ciphertext:

```javascript
// Plain client (no autoEncryption)
const plainClient = new MongoClient("mongodb://localhost:27017");
const plainPatients = plainClient.db("myapp").collection("patients");
const rawDoc = await plainPatients.findOne({ name: "Alice Smith" });

console.log(rawDoc.ssn);  // Binary BinData - not readable
console.log(rawDoc.creditCardNumber);  // Binary BinData
```

## Summary

Client-Side Field Level Encryption in MongoDB encrypts sensitive fields before they reach the server, so the database only stores ciphertext. Configure CSFLE using the `autoEncryption` option in the MongoDB driver with a `schemaMap` that specifies which fields to encrypt and which algorithm to use. Use the `AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic` algorithm for fields that need equality queries, and the `AEAD_AES_256_CBC_HMAC_SHA_512-Random` algorithm for maximum security on non-searchable fields. In production, always use a cloud KMS (AWS, Azure, GCP) rather than a local master key for secure key management.
