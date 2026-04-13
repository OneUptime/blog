# How to Use AWS KMS for MongoDB Encryption Key Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, AWS KMS, Encryption, CSFLE, Security

Description: Learn how to use AWS KMS as the Customer Master Key provider for MongoDB CSFLE to securely manage Data Encryption Keys without storing secrets locally.

---

Using AWS KMS as the KMS provider for MongoDB CSFLE means your Customer Master Key (CMK) lives in AWS and never leaves the KMS service. MongoDB drivers call AWS KMS to wrap and unwrap Data Encryption Keys (DEKs), so no plaintext key material is stored in your application or database.

## Prerequisites

- An AWS KMS symmetric key (CMK) created in your AWS account
- IAM role or user with `kms:Encrypt` and `kms:Decrypt` permissions on the CMK
- MongoDB driver with CSFLE support

## Create an AWS KMS Key

In the AWS Console or CLI, create a symmetric encryption key:

```bash
aws kms create-key \
  --description "MongoDB CSFLE master key" \
  --key-usage ENCRYPT_DECRYPT \
  --query "KeyMetadata.Arn" \
  --output text
```

Note the Key ID (e.g., `arn:aws:kms:us-east-1:123456789012:key/abc-def-...`).

## IAM Policy for KMS Access

Attach this policy to the IAM role your application uses:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/YOUR-KEY-ID"
    }
  ]
}
```

## Configure the Driver with AWS KMS

```javascript
const { MongoClient } = require("mongodb")
const { ClientEncryption } = require("mongodb-client-encryption")

const kmsProviders = {
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    // Or use temporary credentials via session token:
    // sessionToken: process.env.AWS_SESSION_TOKEN
  }
}

const client = new MongoClient("mongodb://localhost:27017")
await client.connect()

const encryption = new ClientEncryption(client, {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders
})
```

## Create a DEK Using AWS KMS

```javascript
const masterKey = {
  region: "us-east-1",
  key: "arn:aws:kms:us-east-1:123456789012:key/YOUR-KEY-ID"
}

const dataKeyId = await encryption.createDataKey("aws", {
  masterKey,
  keyAltNames: ["user-ssn-key"]
})

console.log("DEK created:", dataKeyId)
```

## Using IAM Roles Instead of Static Credentials

In production, avoid static credentials. If running on EC2, ECS, or Lambda, use IAM roles:

```javascript
const kmsProviders = {
  aws: {}  // SDK auto-detects credentials from instance role or environment
}
```

AWS SDK credential chain picks up instance profile credentials automatically.

## Configure AutoEncryption with AWS KMS

```javascript
const autoEncryptionOptions = {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders,
  schemaMap: {
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
        }
      }
    }
  }
}

const encryptedClient = new MongoClient("mongodb://localhost:27017", {
  autoEncryption: autoEncryptionOptions
})
```

## Python Example

```python
import os
from pymongo import MongoClient
from pymongo.encryption import ClientEncryption

kms_providers = {
    "aws": {
        "accessKeyId": os.environ["AWS_ACCESS_KEY_ID"],
        "secretAccessKey": os.environ["AWS_SECRET_ACCESS_KEY"]
    }
}

master_key = {
    "region": "us-east-1",
    "key": "arn:aws:kms:us-east-1:123456789012:key/YOUR-KEY-ID"
}

client = MongoClient("mongodb://localhost:27017")
encryption = ClientEncryption(kms_providers, "encryption.__keyVault",
                              client, client.codec_options)

data_key_id = encryption.create_data_key("aws", master_key=master_key,
                                          key_alt_names=["ssn-key"])
```

## Rotate the CMK

To rotate the CMK in AWS without re-encrypting DEKs, enable automatic key rotation:

```bash
aws kms enable-key-rotation --key-id YOUR-KEY-ID
```

AWS KMS handles CMK rotation transparently. Existing DEKs remain decryptable because AWS tracks key versions.

## Summary

AWS KMS as a MongoDB CSFLE provider ensures your master keys never leave AWS. The driver calls KMS to wrap DEKs on creation and unwrap them on use. Use IAM roles instead of static credentials in production, enable automatic key rotation in AWS KMS, and restrict KMS key access with tight IAM policies.
