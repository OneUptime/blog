# Validation Summary: How to Use Azure Key Vault for MongoDB Encryption Key Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Client-Side Field Level Encryption (CSFLE)
- Azure Key Vault (KMS provider)
- Azure CLI (`az` commands)
- Node.js MongoDB driver (`mongodb`, `mongodb-client-encryption`)
- PyMongo (`pymongo`, `pymongo.encryption`)
- Azure RBAC (Key Vault Crypto User role)
- Azure Managed Identity

## Sources Consulted
- MongoDB CSFLE documentation: https://www.mongodb.com/docs/manual/core/csfle/
- MongoDB CSFLE with Azure Key Vault: https://www.mongodb.com/docs/manual/core/csfle/tutorials/azure/azure-automatic/
- MongoDB Node.js driver ClientEncryption API: https://mongodb.github.io/node-mongodb-native/
- MongoDB Queryable Encryption vs CSFLE schema formats: https://www.mongodb.com/docs/manual/core/queryable-encryption/
- Azure CLI `az keyvault` reference: https://learn.microsoft.com/en-us/cli/azure/keyvault
- Azure CLI `az keyvault key` reference: https://learn.microsoft.com/en-us/cli/azure/keyvault/key
- Azure CLI `az role assignment` reference: https://learn.microsoft.com/en-us/cli/azure/role/assignment
- PyMongo encryption documentation: https://pymongo.readthedocs.io/en/stable/examples/encryption.html

## Issues Found

1. **Prerequisites listed "RSA or EC key" but MongoDB CSFLE with Azure requires RSA keys only.**
   - **What was wrong:** The prerequisites stated "An Azure Key Vault with a key created (RSA or EC key)". MongoDB CSFLE does not support EC keys as Customer Master Keys when using Azure Key Vault; only RSA keys are supported.
   - **What was changed:** Updated to "An Azure Key Vault with an RSA key created".
   - **Why:** MongoDB documentation specifies RSA keys are required for the CMK in Azure KMS. Using an EC key would cause key wrap/unwrap operations to fail.

2. **AutoEncryption configuration used `encryptedFieldsMap` (Queryable Encryption format) instead of `schemaMap` (CSFLE format).**
   - **What was wrong:** The "Configure AutoEncryption with Azure" section used `encryptedFieldsMap` with a `fields` array containing `path`, `bsonType`, `keyId`, and `algorithm` properties. This is the Queryable Encryption (QE) format introduced in MongoDB 6.0, not the CSFLE format. Since the entire post is about CSFLE, this was incorrect.
   - **What was changed:** Replaced `encryptedFieldsMap` with `schemaMap` using proper JSON Schema format with `bsonType: "object"`, nested `properties`, and the `encrypt` keyword containing `bsonType`, `keyId` (as an array), and `algorithm` for each field.
   - **Why:** CSFLE and Queryable Encryption are distinct features with different configuration formats. Using `encryptedFieldsMap` for CSFLE would not enable automatic encryption of the specified fields.

## Review Notes
- The Python example uses `client.codec_options` which is valid but the MongoDB documentation recommends using `CodecOptions(uuid_representation=STANDARD)` from `bson.codec_options` for proper UUID handling in the key vault. This is not an error but could be noted as a best practice improvement.
- The managed identity section correctly shows an empty `azure: {}` object, which causes the driver to use the Azure Identity SDK's default credential chain.
- The `az keyvault key rotation-policy update` command and the explanation about key version compatibility are accurate.
- All algorithm names (`AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic` and `AEAD_AES_256_CBC_HMAC_SHA_512-Random`) are correct CSFLE algorithm identifiers.
