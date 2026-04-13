# How to Use Azure Key Vault for MongoDB Encryption Key Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Azure, Key Vault, Encryption, CSFLE

Description: Learn how to configure Azure Key Vault as the KMS provider for MongoDB CSFLE to manage Data Encryption Keys with Azure-managed secrets.

---

Azure Key Vault can serve as the Customer Master Key (CMK) provider for MongoDB CSFLE. Your master key resides in Azure and is never exposed to MongoDB or your application. The driver calls Azure Key Vault to wrap DEKs during creation and unwrap them during decryption.

## Prerequisites

- An Azure Key Vault with an RSA key created
- An Azure service principal or managed identity with `Key Vault Crypto User` role
- MongoDB driver with CSFLE support

## Create an Azure Key Vault Key

```bash
# Create a Key Vault
az keyvault create \
  --name my-mongo-kv \
  --resource-group myRG \
  --location eastus

# Create a key
az keyvault key create \
  --vault-name my-mongo-kv \
  --name mongo-csfle-key \
  --kty RSA \
  --size 2048
```

## Assign Key Vault Permissions

```bash
# Assign Key Vault Crypto User role to a service principal
az role assignment create \
  --role "Key Vault Crypto User" \
  --assignee <service-principal-id> \
  --scope /subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.KeyVault/vaults/my-mongo-kv
```

## Configure the Driver with Azure KMS

```javascript
const { MongoClient } = require("mongodb")
const { ClientEncryption } = require("mongodb-client-encryption")

const kmsProviders = {
  azure: {
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET
  }
}

const client = new MongoClient("mongodb://localhost:27017")
await client.connect()

const encryption = new ClientEncryption(client, {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders
})
```

## Create a DEK Using Azure Key Vault

```javascript
const masterKey = {
  keyVaultEndpoint: "my-mongo-kv.vault.azure.net",
  keyName: "mongo-csfle-key"
}

const dataKeyId = await encryption.createDataKey("azure", {
  masterKey,
  keyAltNames: ["patient-ssn-key"]
})

console.log("DEK created:", dataKeyId)
```

## Using Managed Identity (Recommended for Production)

When running on Azure VMs, AKS, or App Service, use managed identity instead of client credentials:

```javascript
const kmsProviders = {
  azure: {}  // SDK picks up managed identity automatically
}
```

Configure the managed identity in your Azure resource and assign the `Key Vault Crypto User` role to it.

## Configure AutoEncryption with Azure

```javascript
const autoEncryptionOptions = {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders,
  schemaMap: {
    "myapp.patients": {
      bsonType: "object",
      properties: {
        nationalId: {
          encrypt: {
            bsonType: "string",
            keyId: [dataKeyId],
            algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
          }
        },
        medicalNotes: {
          encrypt: {
            bsonType: "string",
            keyId: [dataKeyId],
            algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
          }
        }
      }
    }
  }
}
```

## Python Example

```python
import os
from pymongo import MongoClient
from pymongo.encryption import ClientEncryption

kms_providers = {
    "azure": {
        "tenantId": os.environ["AZURE_TENANT_ID"],
        "clientId": os.environ["AZURE_CLIENT_ID"],
        "clientSecret": os.environ["AZURE_CLIENT_SECRET"]
    }
}

master_key = {
    "keyVaultEndpoint": "my-mongo-kv.vault.azure.net",
    "keyName": "mongo-csfle-key"
}

client = MongoClient("mongodb://localhost:27017")
enc = ClientEncryption(kms_providers, "encryption.__keyVault",
                       client, client.codec_options)

dek_id = enc.create_data_key("azure", master_key=master_key,
                              key_alt_names=["patient-key"])
```

## Key Rotation in Azure

Enable automatic key rotation in Azure Key Vault:

```bash
az keyvault key rotation-policy update \
  --vault-name my-mongo-kv \
  --name mongo-csfle-key \
  --value @rotation-policy.json
```

Azure Key Vault keeps previous key versions, so DEKs wrapped with old versions remain decryptable.

## Summary

Azure Key Vault as a MongoDB CSFLE KMS provider stores your CMK securely in Azure. Use managed identity instead of client credentials in production AKS or App Service deployments. Assign the least-privileged `Key Vault Crypto User` role, enable key rotation in Azure Key Vault, and keep DEK identifiers backed up in the MongoDB key vault collection.
