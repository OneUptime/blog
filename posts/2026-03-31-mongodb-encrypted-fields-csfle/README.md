# How to Use MongoDB Encrypted Fields (CSFLE)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, CSFLE, Encryption, Security, Compliance

Description: Learn how to implement MongoDB Client-Side Field Level Encryption (CSFLE) to encrypt sensitive fields before they reach the database, protecting data from privileged database users.

---

## What is Client-Side Field Level Encryption

Client-Side Field Level Encryption (CSFLE) encrypts specific fields in a document on the client side before the data is sent to MongoDB. The database server stores only ciphertext and never sees the plaintext values. This protects sensitive data even from MongoDB administrators, DBAs, and anyone with direct database access.

```mermaid
flowchart LR
    App[Application] -->|Encrypt SSN, CC fields| Enc[CSFLE Library]
    Enc -->|Fetch key| KMS[Key Management Service]
    KMS -->|Data Encryption Key| Enc
    Enc -->|Ciphertext document| MongoDB
    MongoDB -->|Ciphertext document| Enc2[CSFLE Library]
    Enc2 -->|Decrypt| App2[Application receives plaintext]
```

## CSFLE Architecture

CSFLE uses two levels of keys:

1. **Customer Master Key (CMK)** - stored in a KMS (AWS KMS, Azure Key Vault, GCP KMS, or local key for testing). The CMK encrypts Data Encryption Keys.
2. **Data Encryption Key (DEK)** - stored in a MongoDB collection (`__keyVault`). The DEK encrypts individual field values.

## CSFLE Modes

- **Automatic CSFLE** (requires MongoDB Enterprise or Atlas) - the driver automatically encrypts/decrypts fields based on a JSON schema without any code changes in CRUD operations.
- **Explicit CSFLE** (available in all editions) - you call `encrypt()` and `decrypt()` on a `ClientEncryption` object explicitly in your code.

## Explicit CSFLE Example in Node.js

Explicit CSFLE works with any MongoDB edition (Community or Enterprise). Install required packages:

```bash
npm install mongodb mongodb-client-encryption
```

### Step 1: Create the Key Vault Collection

```javascript
const { MongoClient } = require("mongodb");

const keyVaultClient = new MongoClient("mongodb://admin:password@127.0.0.1:27017/?authSource=admin");
await keyVaultClient.connect();

const keyVaultDb = keyVaultClient.db("encryption");
await keyVaultDb.createCollection("__keyVault");
await keyVaultDb.collection("__keyVault").createIndex(
  { keyAltNames: 1 },
  { unique: true, partialFilterExpression: { keyAltNames: { $exists: true } } }
);
```

### Step 2: Create a Data Encryption Key

For testing, use the `local` KMS provider with a 96-byte master key:

```javascript
const { ClientEncryption } = require("mongodb-client-encryption");
const crypto = require("crypto");

// In production, load this from a KMS, not from code
const localMasterKey = crypto.randomBytes(96);

const encryption = new ClientEncryption(keyVaultClient, {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders: {
    local: { key: localMasterKey }
  }
});

// Create a Data Encryption Key with a friendly name
const ssnKeyId = await encryption.createDataKey("local", {
  keyAltNames: ["ssn_key"]
});

const ccKeyId = await encryption.createDataKey("local", {
  keyAltNames: ["credit_card_key"]
});

console.log("SSN Key ID:", ssnKeyId);
console.log("Credit Card Key ID:", ccKeyId);
```

### Step 3: Encrypt and Insert a Document

```javascript
async function insertPatient(name, ssn, creditCard) {
  // Encrypt the SSN field
  const encryptedSSN = await encryption.encrypt(ssn, {
    algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic",  // allows equality queries
    keyAltName: "ssn_key"
  });

  // Encrypt the credit card (random encryption - cannot query, but more secure)
  const encryptedCC = await encryption.encrypt(creditCard, {
    algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
    keyAltName: "credit_card_key"
  });

  const appClient = new MongoClient("mongodb://admin:password@127.0.0.1:27017/?authSource=admin");
  await appClient.connect();

  await appClient.db("myapp").collection("patients").insertOne({
    name: name,                 // plaintext
    ssn: encryptedSSN,          // encrypted
    creditCard: encryptedCC,    // encrypted
    createdAt: new Date()
  });

  console.log("Patient inserted with encrypted fields");
  await appClient.close();
}

await insertPatient("Alice Smith", "123-45-6789", "4111-1111-1111-1111");
```

### Step 4: Query and Decrypt

With deterministic encryption, you can query on the encrypted field:

```javascript
async function findBySSN(ssn) {
  const encryptedSSN = await encryption.encrypt(ssn, {
    algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic",
    keyAltName: "ssn_key"
  });

  const appClient = new MongoClient("mongodb://admin:password@127.0.0.1:27017/?authSource=admin");
  await appClient.connect();

  const doc = await appClient.db("myapp").collection("patients").findOne({
    ssn: encryptedSSN
  });

  if (doc) {
    // Decrypt the fields
    const plainSSN = await encryption.decrypt(doc.ssn);
    const plainCC = await encryption.decrypt(doc.creditCard);

    console.log("Name:", doc.name);
    console.log("SSN:", plainSSN);
    console.log("Credit Card:", plainCC);
  }

  await appClient.close();
}

await findBySSN("123-45-6789");
```

## Automatic CSFLE (MongoDB Enterprise / Atlas)

Automatic CSFLE requires the Automatic Encryption Shared Library. Install it and use a `schemaMap` to define which fields to auto-encrypt.

```javascript
const { MongoClient, Binary } = require("mongodb");

const schemaMap = {
  "myapp.patients": {
    bsonType: "object",
    properties: {
      ssn: {
        encrypt: {
          bsonType: "string",
          algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic",
          keyId: [ssnKeyId]
        }
      },
      creditCard: {
        encrypt: {
          bsonType: "string",
          algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
          keyId: [ccKeyId]
        }
      }
    }
  }
};

const autoEncryptionOpts = {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders: {
    local: { key: localMasterKey }
  },
  schemaMap,
  extraOptions: {
    cryptSharedLibPath: "/path/to/mongo_crypt_shared_v1.so"
  }
};

const autoClient = new MongoClient(
  "mongodb://admin:password@127.0.0.1:27017/?authSource=admin",
  { autoEncryption: autoEncryptionOpts }
);

// With automatic encryption, insert works without calling encrypt() manually
await autoClient.db("myapp").collection("patients").insertOne({
  name: "Bob Jones",
  ssn: "987-65-4321",      // automatically encrypted
  creditCard: "5500-0000-0000-0004"  // automatically encrypted
});
```

## Encryption Algorithms

**Deterministic (`AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic`)**
- Same plaintext + same key = same ciphertext.
- Allows equality queries (`$eq`) on encrypted fields.
- Less secure than random (attackers can infer equality from ciphertext patterns).
- Use for fields you need to search by (SSN, national ID).

**Random (`AEAD_AES_256_CBC_HMAC_SHA_512-Random`)**
- Same plaintext + same key = different ciphertext every time.
- Cannot query for specific values, but much harder to attack.
- Use for fields you only read, never query (credit card numbers, bank account numbers).

## Using AWS KMS Instead of Local Key

```javascript
const kmsProviders = {
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};

const dataKey = await encryption.createDataKey("aws", {
  masterKey: {
    region: "us-east-1",
    key: "arn:aws:kms:us-east-1:123456789012:key/my-key-id"
  },
  keyAltNames: ["ssn_key"]
});
```

## Best Practices

- Never use `local` KMS in production; use AWS KMS, Azure Key Vault, or GCP Cloud KMS.
- Rotate Data Encryption Keys periodically and re-encrypt data.
- Store the master key securely; losing it makes all encrypted data unrecoverable.
- Use deterministic encryption only for fields you must query; use random for all others.
- Audit access to the key vault collection - anyone who can read DEKs and has the CMK can decrypt data.
- Keep the CSFLE client library updated as security patches are released.

## Summary

MongoDB CSFLE encrypts sensitive fields on the client before they reach the database server, protecting against privileged insiders and database breaches. Explicit CSFLE works with any MongoDB edition and requires calling `encrypt()`/`decrypt()` manually. Automatic CSFLE (Enterprise/Atlas) uses a schema map to handle encryption transparently. Use deterministic encryption for queryable fields (SSN, national ID) and random encryption for read-only sensitive fields (payment cards, health records). Always use a production KMS rather than the local key provider.
