# How to Configure Automatic vs Explicit MongoDB Queryable Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Queryable Encryption, Encryption, Security, CSFLE

Description: Understand the difference between automatic and explicit Queryable Encryption in MongoDB and configure each mode to encrypt sensitive fields at the client level.

---

## What Is Queryable Encryption?

Queryable Encryption (QE) is MongoDB's client-side encryption technology that encrypts sensitive fields before they leave the application. Unlike encryption-at-rest, encrypted fields remain encrypted on the server - MongoDB never sees plaintext values. Unlike traditional CSFLE, QE allows equality and range queries on encrypted fields.

Two operation modes:
- **Automatic Encryption**: Driver automatically encrypts/decrypts based on a schema
- **Explicit Encryption**: Application code manually calls encrypt/decrypt

## Automatic Encryption

The driver encrypts fields automatically based on a JSON schema you define. Your application code writes plaintext; the driver handles encryption transparently.

### Requirements

- MongoDB Enterprise 7.0+ or MongoDB Atlas 7.0+ (6.0 had a preview that is now deprecated and incompatible)
- MongoDB 8.0+ for range queries on encrypted fields
- MongoDB driver version supporting QE
- `mongocryptd` or `crypt_shared` library (`crypt_shared` is recommended for new projects)

### Step 1: Set Up Key Management

```javascript
const { MongoClient, ClientEncryption } = require('mongodb');

// Local key provider (development only - use AWS KMS, Azure, or GCP in production)
const localMasterKey = require('crypto').randomBytes(96);

const kmsProviders = {
  local: { key: localMasterKey }
};

// Create the key vault collection and data encryption key
const keyVaultNamespace = "encryption.__keyVault";
const keyVaultClient = new MongoClient(process.env.MONGODB_URI);
await keyVaultClient.connect();

const clientEncryption = new ClientEncryption(keyVaultClient, {
  keyVaultNamespace,
  kmsProviders
});

const dataKeyId = await clientEncryption.createDataKey("local", {
  keyAltNames: ["patient-data-key"]
});
console.log("Data key ID:", dataKeyId.toString("base64"));
```

### Step 2: Define the Encrypted Fields Schema

```javascript
const encryptedFieldsMap = {
  "appdb.patients": {
    fields: [
      {
        path: "ssn",
        bsonType: "string",
        keyId: dataKeyId,
        queries: [{ queryType: "equality" }]  // Allow equality queries on ssn
      },
      {
        path: "dateOfBirth",
        bsonType: "date",
        keyId: dataKeyId,
        queries: [{ queryType: "range", min: new Date("1900-01-01"), max: new Date("2024-12-31") }]
      },
      {
        path: "medicalRecord",
        bsonType: "string",
        keyId: dataKeyId
        // No queries - encrypted but not queryable (most secure)
      }
    ]
  }
};
```

### Step 3: Create the Encrypted Collection

```javascript
const regularClient = new MongoClient(process.env.MONGODB_URI);
await regularClient.connect();

await regularClient.db("appdb").createCollection("patients", {
  encryptedFields: encryptedFieldsMap["appdb.patients"]
});
```

### Step 4: Connect with Auto-Encryption

```javascript
const autoEncryptionOptions = {
  keyVaultNamespace,
  kmsProviders,
  encryptedFieldsMap
};

const encryptedClient = new MongoClient(process.env.MONGODB_URI, {
  autoEncryption: autoEncryptionOptions
});
await encryptedClient.connect();

const patients = encryptedClient.db("appdb").collection("patients");

// Write - driver auto-encrypts ssn, dateOfBirth, medicalRecord
await patients.insertOne({
  name: "Jane Doe",
  ssn: "123-45-6789",           // Auto-encrypted
  dateOfBirth: new Date("1980-05-15"),  // Auto-encrypted
  medicalRecord: "Patient has..."       // Auto-encrypted
});

// Query on encrypted field - works transparently!
const patient = await patients.findOne({ ssn: "123-45-6789" });
console.log(patient.ssn);   // "123-45-6789" (auto-decrypted)
```

## Explicit Encryption

With explicit encryption, your application code manually calls `encrypt()` and `decrypt()`. This gives fine-grained control but requires more code.

### When to Use Explicit Encryption

- You need to encrypt values before storing them in non-standard locations (nested arrays, dynamic fields)
- You want to encrypt the same value with different keys for different contexts
- You want encryption without requiring `mongocryptd` or `crypt_shared`

### Step 1: Encrypt Explicitly

```javascript
const { MongoClient, ClientEncryption } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();

const clientEncryption = new ClientEncryption(client, {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders
});

// Encrypt a value explicitly
const encryptedSSN = await clientEncryption.encrypt("123-45-6789", {
  algorithm: "Indexed",      // For queryable fields
  keyId: dataKeyId,
  queryType: "equality",
  contentionFactor: 4
});

// For non-queryable fields use "Unindexed"
const encryptedRecord = await clientEncryption.encrypt("Patient notes...", {
  algorithm: "Unindexed",
  keyId: dataKeyId
});

// Insert with manually encrypted fields
await client.db("appdb").collection("patients").insertOne({
  name: "John Smith",
  ssn: encryptedSSN,
  medicalRecord: encryptedRecord
});
```

### Step 2: Decrypt Explicitly

```javascript
// Read the document
const patient = await client.db("appdb").collection("patients").findOne(
  { name: "John Smith" }
);

// Manually decrypt
const ssnPlaintext = await clientEncryption.decrypt(patient.ssn);
const recordPlaintext = await clientEncryption.decrypt(patient.medicalRecord);

console.log("SSN:", ssnPlaintext);
console.log("Record:", recordPlaintext);
```

## Comparison

| Feature | Automatic | Explicit |
|---|---|---|
| Code changes required | Minimal | Significant |
| Schema definition | Required | Not required |
| Flexibility | Lower | Higher |
| Queries on encrypted fields | Yes (configured) | Manual query construction |
| `mongocryptd`/`crypt_shared` required | Yes | No |
| MongoDB version | 7.0+ Enterprise/Atlas | 7.0+ Enterprise/Atlas |

## KMS Provider: AWS KMS (Production)

Replace local key with AWS KMS:

```javascript
const kmsProviders = {
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};

const dataKeyId = await clientEncryption.createDataKey("aws", {
  masterKey: {
    region: "us-east-1",
    key: "arn:aws:kms:us-east-1:123456789:key/abc-def-..."
  }
});
```

## Summary

Queryable Encryption automatic mode uses an encrypted fields schema to transparently encrypt and decrypt fields in application code without explicit calls, while explicit mode requires manual encrypt/decrypt calls for granular control. Automatic encryption is easier to implement and maintains standard MongoDB query syntax on encrypted fields. Explicit encryption suits cases requiring dynamic or non-standard field encryption. In both modes, sensitive data is never sent to MongoDB in plaintext.
