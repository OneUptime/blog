# How to Configure Automatic Encryption in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Encryption, CSFLE, Security, Client-Side

Description: Learn how to configure automatic client-side field level encryption in MongoDB so the driver transparently encrypts and decrypts designated fields without manual code changes.

---

Automatic Client-Side Field Level Encryption (CSFLE) in MongoDB encrypts designated fields on the client before data is sent to the server. The server stores and queries encrypted data without ever seeing plaintext values. Automatic mode handles encryption transparently - your application code reads and writes plain values while the driver handles the crypto.

## Requirements

- MongoDB Enterprise 4.2+ or MongoDB Atlas
- MongoDB driver that supports CSFLE (Node.js, Python, Java, Go, .NET, etc.)
- A Key Management Service (AWS KMS, Azure Key Vault, GCP KMS, or local key)

## Create a Data Encryption Key (DEK)

First, create a DEK stored in a key vault collection:

```javascript
// Node.js example
const { ClientEncryption } = require("mongodb-client-encryption")
const { MongoClient } = require("mongodb")

const keyVaultNamespace = "encryption.__keyVault"
const kmsProviders = {
  local: {
    key: Buffer.from(process.env.LOCAL_MASTER_KEY, "base64")
  }
}

const client = new MongoClient("mongodb://localhost:27017")
await client.connect()

const encryption = new ClientEncryption(client, { keyVaultNamespace, kmsProviders })

const dataKeyId = await encryption.createDataKey("local", {
  keyAltNames: ["myapp-ssn-key"]
})
console.log("DEK ID:", dataKeyId.toString("base64"))
```

## Define the JSON Schema for Encrypted Fields

Map field paths to encryption settings in a JSON schema:

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
      medicalRecordNumber: {
        encrypt: {
          bsonType: "string",
          algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
        }
      }
    }
  }
}
```

Use **Deterministic** encryption for fields you need to query (equality only). Use **Random** for fields that need maximum privacy or do not need to be queried.

## Configure the MongoClient with Automatic Encryption

```javascript
const autoEncryptionOptions = {
  keyVaultNamespace,
  kmsProviders,
  schemaMap
}

const encryptedClient = new MongoClient("mongodb://localhost:27017", {
  autoEncryption: autoEncryptionOptions
})

await encryptedClient.connect()
```

## Write and Read Data Transparently

With the encrypted client, all reads and writes to `patients` are handled automatically:

```javascript
const db = encryptedClient.db("myapp")
const patients = db.collection("patients")

// Write plain text - driver encrypts automatically
await patients.insertOne({
  name: "John Doe",
  ssn: "123-45-6789",
  medicalRecordNumber: "MR-98765"
})

// Read plain text - driver decrypts automatically
const patient = await patients.findOne({ ssn: "123-45-6789" })
console.log(patient.ssn) // "123-45-6789" (decrypted)
```

## Python Example with PyMongo

```python
from pymongo import MongoClient
from pymongo.encryption import ClientEncryption
from pymongo.encryption_options import AutoEncryptionOpts
import os, base64

kms_providers = {
    "local": {
        "key": base64.b64decode(os.environ["LOCAL_MASTER_KEY"])
    }
}

key_vault_client = MongoClient("mongodb://localhost:27017")
client_encryption = ClientEncryption(
    kms_providers=kms_providers,
    key_vault_namespace="encryption.__keyVault",
    key_vault_client=key_vault_client,
    codec_options=key_vault_client.codec_options
)
data_key_id = client_encryption.create_data_key("local",
    key_alt_names=["myapp-ssn-key"])

auto_encryption_opts = AutoEncryptionOpts(
    kms_providers=kms_providers,
    key_vault_namespace="encryption.__keyVault",
    schema_map={
        "myapp.patients": {
            "bsonType": "object",
            "encryptMetadata": { "keyId": [data_key_id] },
            "properties": {
                "ssn": {
                    "encrypt": {
                        "bsonType": "string",
                        "algorithm": "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
                    }
                }
            }
        }
    }
)

client = MongoClient("mongodb://localhost:27017",
                     auto_encryption_opts=auto_encryption_opts)
```

## Verify Encryption on the Server

Connect to MongoDB without the encryption client to confirm data is stored encrypted:

```javascript
// Plain client - sees ciphertext
const plainClient = new MongoClient("mongodb://localhost:27017")
const raw = await plainClient.db("myapp").collection("patients")
              .findOne({ name: "John Doe" })
console.log(raw.ssn) // Binary/encrypted blob
```

## Summary

Automatic CSFLE in MongoDB encrypts designated fields transparently in the driver. Define a `schemaMap` with JSON Schema encryption rules, configure the client with KMS provider details, and application code reads and writes plain values normally. Use deterministic encryption for queryable fields and random encryption for maximum privacy.
