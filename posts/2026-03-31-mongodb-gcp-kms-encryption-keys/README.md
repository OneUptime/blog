# How to Use GCP KMS for MongoDB Encryption Key Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GCP, KMS, Encryption, CSFLE

Description: Learn how to configure Google Cloud KMS as the KMS provider for MongoDB CSFLE to manage Data Encryption Keys with GCP-managed keys and service account credentials.

---

Google Cloud KMS (Cloud Key Management Service) can serve as the Customer Master Key (CMK) provider for MongoDB Client-Side Field Level Encryption. The CMK lives in GCP and is used to wrap and unwrap Data Encryption Keys, so MongoDB and your application never handle plaintext key material.

## Prerequisites

- A GCP project with Cloud KMS API enabled
- A key ring and symmetric encryption key in Cloud KMS
- A service account with `Cloud KMS CryptoKey Encrypter/Decrypter` role
- MongoDB driver with CSFLE support

## Create a GCP KMS Key

```bash
# Enable the KMS API
gcloud services enable cloudkms.googleapis.com

# Create a key ring
gcloud kms keyrings create mongo-csfle-ring \
  --location global

# Create a symmetric encryption key
gcloud kms keys create mongo-csfle-key \
  --location global \
  --keyring mongo-csfle-ring \
  --purpose encryption
```

Note the key resource name:
```text
projects/my-project/locations/global/keyRings/mongo-csfle-ring/cryptoKeys/mongo-csfle-key
```

## Assign IAM Permissions

```bash
gcloud kms keys add-iam-policy-binding mongo-csfle-key \
  --location global \
  --keyring mongo-csfle-ring \
  --member "serviceAccount:my-app@my-project.iam.gserviceaccount.com" \
  --role "roles/cloudkms.cryptoKeyEncrypterDecrypter"
```

## Create a Service Account Key

```bash
gcloud iam service-accounts keys create ./sa-key.json \
  --iam-account my-app@my-project.iam.gserviceaccount.com
```

## Configure the Driver with GCP KMS

```javascript
const { MongoClient } = require("mongodb")
const { ClientEncryption } = require("mongodb-client-encryption")
const fs = require("fs")

const serviceAccountKey = JSON.parse(fs.readFileSync("./sa-key.json"))

const kmsProviders = {
  gcp: {
    email: serviceAccountKey.client_email,
    privateKey: serviceAccountKey.private_key
  }
}

const client = new MongoClient("mongodb://localhost:27017")
await client.connect()

const encryption = new ClientEncryption(client, {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders
})
```

## Create a DEK Using GCP KMS

```javascript
const masterKey = {
  projectId: "my-project",
  location: "global",
  keyRing: "mongo-csfle-ring",
  keyName: "mongo-csfle-key"
}

const dataKeyId = await encryption.createDataKey("gcp", {
  masterKey,
  keyAltNames: ["user-pii-key"]
})

console.log("DEK ID:", dataKeyId)
```

## Configure AutoEncryption with GCP

```javascript
const autoEncryptionOptions = {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders,
  schemaMap: {
    "myapp.users": {
      bsonType: "object",
      encryptMetadata: {
        keyId: [dataKeyId]
      },
      properties: {
        email: {
          encrypt: {
            bsonType: "string",
            algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
          }
        },
        phoneNumber: {
          encrypt: {
            bsonType: "string",
            algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
          }
        }
      }
    }
  }
}

const encryptedClient = new MongoClient("mongodb://localhost:27017", {
  autoEncryption: autoEncryptionOptions
})
```

## Using Workload Identity on GKE

On Google Kubernetes Engine with Workload Identity enabled, the driver picks up credentials automatically:

```javascript
const kmsProviders = {
  gcp: {}  // Workload identity provides credentials automatically
}
```

Annotate the Kubernetes service account with the GCP service account:

```bash
kubectl annotate serviceaccount my-app \
  iam.gke.io/gcp-service-account=my-app@my-project.iam.gserviceaccount.com
```

## Python Example

```python
import json, os
from pymongo import MongoClient
from pymongo.encryption import ClientEncryption

with open("sa-key.json") as f:
    sa_key = json.load(f)

kms_providers = {
    "gcp": {
        "email": sa_key["client_email"],
        "privateKey": sa_key["private_key"]
    }
}

master_key = {
    "projectId": "my-project",
    "location": "global",
    "keyRing": "mongo-csfle-ring",
    "keyName": "mongo-csfle-key"
}

client = MongoClient("mongodb://localhost:27017")
enc = ClientEncryption(kms_providers, "encryption.__keyVault",
                       client, client.codec_options)

dek_id = enc.create_data_key("gcp", master_key=master_key,
                              key_alt_names=["user-key"])
```

## Summary

GCP KMS as a MongoDB CSFLE provider keeps your CMK in Google Cloud with full audit logging via Cloud Audit Logs. Use Workload Identity on GKE to avoid storing service account key files, assign only the `cloudkms.cryptoKeyEncrypterDecrypter` role for least privilege, and back up DEK IDs from the MongoDB key vault collection.
