# How to Use mongocryptd for Automatic Encryption in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Encryption, Security, CSFLE, Configuration

Description: Learn how mongocryptd enables automatic client-side field level encryption in MongoDB, including setup, encrypted field maps, and key management.

---

## What Is mongocryptd

`mongocryptd` is a helper process that powers automatic Client-Side Field Level Encryption (CSFLE) in MongoDB. When your application sends a query, the MongoDB driver spawns `mongocryptd` as a subprocess, which analyzes the query against your encrypted field map and determines which fields need to be encrypted before transmission. Decryption is handled automatically by the driver, which detects encrypted Binary subtype 6 fields in query results without involving `mongocryptd`.

`mongocryptd` does not store or handle encryption keys directly - it only processes the schema logic. All key operations go through your configured Key Management Service (KMS).

## How mongocryptd Fits in the Architecture

```text
Application Code
      |
   MongoDB Driver (with AutoEncryptionOpts)
      |
   mongocryptd  <-- analyzes field maps, marks fields for encryption
      |
   KMS (AWS/Azure/GCP/local)  <-- retrieves data encryption keys
      |
   MongoDB Server  <-- receives already-encrypted BSON
```

The driver automatically spawns `mongocryptd` on first use. You do not start it manually in most setups, but you can pre-start it for production control.

## Installation

`mongocryptd` ships with MongoDB Enterprise. Verify it is installed:

```bash
which mongocryptd
mongocryptd --version
```

If not in your PATH, it lives alongside `mongod`:

```bash
ls /usr/bin/mongocryptd
```

## Configuring Automatic Encryption in Node.js

Install the required packages:

```bash
npm install mongodb mongodb-client-encryption
```

Configure the client with an encrypted field map:

```javascript
const { MongoClient, ClientEncryption } = require('mongodb');

const keyVaultNamespace = 'encryption.__keyVault';

// Local master key for development (use KMS in production)
const localMasterKey = require('crypto').randomBytes(96);

const autoEncryptionOpts = {
  keyVaultNamespace,
  kmsProviders: {
    local: { key: localMasterKey }
  },
  schemaMap: {
    'mydb.patients': {
      bsonType: 'object',
      encryptMetadata: {
        keyId: [/* your data key UUID here */]
      },
      properties: {
        ssn: {
          encrypt: {
            bsonType: 'string',
            algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
          }
        },
        medicalRecord: {
          encrypt: {
            bsonType: 'string',
            algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
          }
        }
      }
    }
  },
  extraOptions: {
    mongocryptdSpawnPath: '/usr/bin/mongocryptd'
  }
};

const client = new MongoClient('mongodb://localhost:27017', {
  autoEncryption: autoEncryptionOpts
});
```

## Creating a Data Encryption Key

Before inserting encrypted documents, create a data encryption key in the key vault:

```javascript
async function createDataKey() {
  await client.connect();
  const encryption = new ClientEncryption(client, {
    keyVaultNamespace,
    kmsProviders: { local: { key: localMasterKey } }
  });

  const dataKeyId = await encryption.createDataKey('local', {
    keyAltNames: ['patients-key']
  });

  console.log('Created data key:', dataKeyId.toString('base64'));
  return dataKeyId;
}
```

## Controlling mongocryptd Spawning

For production deployments, pre-start `mongocryptd` as a service rather than letting the driver spawn it on demand:

```bash
mongocryptd --port 27020 --idleShutdownTimeoutSecs 0 &
```

Then disable automatic spawning in the driver:

```javascript
extraOptions: {
  mongocryptdBypassSpawn: true,
  mongocryptdURI: 'mongodb://localhost:27020'
}
```

This gives you control over `mongocryptd` lifecycle, logging, and resource limits.

## Verifying Encryption Is Active

Insert a document and inspect the raw storage to confirm encryption:

```javascript
// Insert through encrypted client
await client.db('mydb').collection('patients').insertOne({
  name: 'John Doe',
  ssn: '123-45-6789',
  medicalRecord: 'Diagnosis: hypertension'
});

// Read through unencrypted client to see ciphertext
const rawClient = new MongoClient('mongodb://localhost:27017');
const raw = await rawClient.db('mydb').collection('patients').findOne();
console.log(raw.ssn); // Prints encrypted Binary, not plaintext
```

## Summary

`mongocryptd` is the schema-analysis engine behind MongoDB automatic CSFLE. It processes your encrypted field map, determines what to encrypt and decrypt per operation, and coordinates with the MongoDB driver and KMS - all transparently to your application code. Use the `mongocryptdBypassSpawn` option with a pre-started daemon in production for reliable lifecycle management, and always use AWS, Azure, or GCP KMS instead of local keys for production workloads.
