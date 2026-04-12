# What Is MongoDB Client-Side Field Level Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Encryption, Security, CSFLE, Field Level Encryption

Description: MongoDB Client-Side Field Level Encryption (CSFLE) encrypts sensitive fields in the application before they are sent to the database, keeping data private even from DBAs.

---

## Overview

Client-Side Field Level Encryption (CSFLE) is a MongoDB feature that encrypts specific document fields on the client (in the application driver) before the data is transmitted to and stored in MongoDB. Because encryption happens before the data leaves the application, the MongoDB server, database administrators, and even cloud providers never see the plaintext values. Only applications with the encryption keys can decrypt and read the sensitive fields.

## How CSFLE Works

1. The application configures a "schema map" that specifies which fields to encrypt and which encryption algorithm to use.
2. When a write occurs, the driver automatically encrypts the specified fields using a Data Encryption Key (DEK) before sending the document to MongoDB.
3. The DEK is itself encrypted by a Customer Master Key (CMK) stored in a Key Management Service (KMS) like AWS KMS, Azure Key Vault, GCP KMS, or a local key provider.
4. On reads, the driver automatically decrypts the fields using the DEK, returning plaintext to the application.

## Automatic vs. Explicit Encryption

**Automatic CSFLE** - The driver encrypts and decrypts fields transparently based on the schema. No code changes are needed for each insert or query.

**Explicit CSFLE** - The application manually calls encrypt/decrypt on specific values. More flexible but requires more code.

## Setting Up CSFLE (Node.js Example)

```javascript
const { MongoClient, ClientEncryption } = require("mongodb");
const crypto = require("crypto");

// Configure local key provider (use AWS/Azure/GCP KMS in production)
const localMasterKey = crypto.randomBytes(96); // 96-byte local master key
const kmsProviders = { local: { key: localMasterKey } };

// Create the encryption client
const encryptionClient = new MongoClient("mongodb://localhost:27017");
await encryptionClient.connect();

const clientEncryption = new ClientEncryption(encryptionClient, {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders
});

// Create a Data Encryption Key
const dataKeyId = await clientEncryption.createDataKey("local", {
  keyAltNames: ["ssn-key"]
});

// Configure auto encryption for the main client
const autoEncryptionOpts = {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders,
  schemaMap: {
    "myapp.patients": {
      bsonType: "object",
      encryptMetadata: { keyId: [dataKeyId] },
      properties: {
        ssn: {
          encrypt: {
            bsonType: "string",
            algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
          }
        },
        medicalRecord: {
          encrypt: {
            bsonType: "string",
            algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
          }
        }
      }
    }
  }
};

const client = new MongoClient("mongodb://localhost:27017", {
  autoEncryption: autoEncryptionOpts
});
await client.connect();

// Insert - ssn and medicalRecord are automatically encrypted
await client.db("myapp").collection("patients").insertOne({
  name: "Alice",
  ssn: "123-45-6789",
  medicalRecord: "Diagnosis: ..."
});
```

## Encryption Algorithms

- **Deterministic (AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic)** - Same plaintext always produces the same ciphertext. Allows equality queries on encrypted fields.
- **Random (AEAD_AES_256_CBC_HMAC_SHA_512-Random)** - Same plaintext produces different ciphertext each time. More secure, but encrypted fields cannot be queried for equality (only returned and decrypted).

## CSFLE vs. Encryption at Rest

Encryption at rest (disk-level encryption) protects data if physical storage is stolen, but database administrators who have access to the running database can still read plaintext values. CSFLE provides protection even against privileged database access because plaintext never reaches the server.

## Requirements

- MongoDB Enterprise (for automatic CSFLE with the mongocryptd process) or MongoDB Atlas
- A compatible driver version
- The `mongodb-client-encryption` library

## Summary

CSFLE encrypts sensitive document fields before they leave the application, ensuring that even database administrators cannot read plaintext values. Use deterministic encryption for queryable fields and random encryption for fields that only need to be retrieved. CSFLE is ideal for healthcare, financial, and compliance-regulated data where field-level confidentiality is mandatory.
