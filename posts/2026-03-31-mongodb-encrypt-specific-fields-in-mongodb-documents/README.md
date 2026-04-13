# How to Encrypt Specific Fields in MongoDB Documents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Encryption, Security

Description: Encrypt sensitive MongoDB document fields using Client-Side Field Level Encryption (CSFLE) and application-level AES encryption with key management.

---

## Why Field-Level Encryption

Full-disk encryption protects data at rest, but anyone with MongoDB credentials can still read all fields. Field-level encryption ensures that sensitive fields like SSNs, credit card numbers, and health data are encrypted before being stored - even MongoDB database administrators cannot read the plaintext values.

## Approach 1: Application-Level Encryption (AES-256)

The simplest approach encrypts fields at the application layer before inserting:

```javascript
const crypto = require('crypto')

const ENCRYPTION_KEY = Buffer.from(process.env.FIELD_ENCRYPTION_KEY, 'hex') // 32 bytes
const ALGORITHM = 'aes-256-gcm'

function encryptField(plaintext) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Combine: iv (12) + tag (16) + ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

function decryptField(ciphertext) {
  const buf = Buffer.from(ciphertext, 'base64')
  const iv  = buf.slice(0, 12)
  const tag = buf.slice(12, 28)
  const enc = buf.slice(28)
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}

// Store
await db.collection('patients').insertOne({
  name: 'John Doe',
  ssn: encryptField('123-45-6789'),
  dob: encryptField('1980-05-15'),
  diagnosis: 'hypertension',    // not encrypted (needed for querying)
})

// Retrieve
const patient = await db.collection('patients').findOne({ name: 'John Doe' })
patient.ssn = decryptField(patient.ssn)
patient.dob = decryptField(patient.dob)
```

## Approach 2: MongoDB CSFLE (Client-Side Field Level Encryption)

MongoDB's official CSFLE uses the `mongodb-client-encryption` library and supports automatic encryption/decryption:

```javascript
const { ClientEncryption } = require('mongodb-client-encryption')
const { MongoClient, Binary } = require('mongodb')

const keyVaultNamespace = 'encryption.__keyVault'
const kmsProviders = {
  local: {
    key: Buffer.from(process.env.LOCAL_MASTER_KEY, 'base64'),
  },
}

// Step 1: Create a data encryption key
const plainClient = new MongoClient(uri)
await plainClient.connect()

const encryption = new ClientEncryption(plainClient, { keyVaultNamespace, kmsProviders })
const dataKeyId = await encryption.createDataKey('local', {
  keyAltNames: ['patient-ssn-key'],
})
console.log('Data key ID:', dataKeyId.toString('base64'))
await plainClient.close()

// Step 2: Create auto-encrypting client
const encryptedClient = new MongoClient(uri, {
  autoEncryption: {
    keyVaultNamespace,
    kmsProviders,
    schemaMap: {
      'myapp.patients': {
        bsonType: 'object',
        encryptMetadata: { keyId: [new Binary(dataKeyId, 4)] },
        properties: {
          ssn: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
          dob: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random',
            },
          },
        },
      },
    },
  },
})
```

## Querying Encrypted Fields

With deterministic encryption, equality queries work on encrypted fields:

```javascript
// Deterministic: supports equality search
const patient = await db.collection('patients').findOne({ ssn: '123-45-6789' })
// MongoDB driver encrypts the query value before sending to server

// Random: does not support equality search (use for less-queried fields)
// Must retrieve and decrypt in application
```

## Key Rotation

```javascript
// Rotate a data key - re-encrypt all documents using the new key
const newKeyId = await encryption.createDataKey('local', { keyAltNames: ['patient-ssn-key-v2'] })

// Use the plain client (without autoEncryption) to read raw encrypted data
const cursor = plainClient.db('myapp').collection('patients').find({})
for await (const doc of cursor) {
  const decrypted = await encryption.decrypt(doc.ssn)
  const reEncrypted = await encryption.encrypt(decrypted, {
    keyId: newKeyId,
    algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
  })
  await db.collection('patients').updateOne({ _id: doc._id }, { $set: { ssn: reEncrypted } })
}
```

## Summary

Field-level encryption in MongoDB is implemented through application-level AES-256-GCM (simpler, no driver requirements) or MongoDB's official CSFLE (automatic encryption with schema maps). Use deterministic encryption for fields you need to query by equality, and random encryption for other sensitive fields. Store data encryption keys in a dedicated keyVault collection and protect master keys using AWS KMS, Azure Key Vault, or GCP KMS in production for proper key separation.
