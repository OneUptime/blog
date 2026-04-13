# Validation Summary: How to Use MongoDB Encrypted Fields (CSFLE)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Client-Side Field Level Encryption (CSFLE)
- Node.js MongoDB driver (`mongodb` npm package)
- `mongodb-client-encryption` npm package
- AWS KMS integration
- Deterministic and Random encryption algorithms (AEAD_AES_256_CBC_HMAC_SHA_512)

## Sources Consulted
- MongoDB CSFLE documentation: https://www.mongodb.com/docs/manual/core/csfle/
- MongoDB Node.js driver ClientEncryption API: https://mongodb.github.io/node-mongodb-native/6.7/classes/ClientEncryption.html
- MongoDB CSFLE KMS Providers reference: https://www.mongodb.com/docs/v7.0/core/csfle/reference/kms-providers/
- MongoDB CSFLE Encryption Schemas: https://www.mongodb.com/docs/manual/core/csfle/reference/encryption-schemas/
- MongoDB CSFLE Quick Start: https://www.mongodb.com/docs/v7.0/core/csfle/quick-start/
- npm package mongodb-client-encryption: https://www.npmjs.com/package/mongodb-client-encryption

## Issues Found

1. **Inconsistent key vault collection name**: The Architecture section referred to the DEK collection as `keyvault`, but all code examples use `__keyVault`. Changed the text to `__keyVault` to match the code.

2. **Incorrect API reference in CSFLE Modes**: The Explicit CSFLE description said "you call `client.encrypt()` and `client.decrypt()`", implying the methods are on the MongoClient. They are actually on the `ClientEncryption` object. Updated to "you call `encrypt()` and `decrypt()` on a `ClientEncryption` object".

3. **Auto CSFLE schema used wrong key for creditCard**: The automatic CSFLE schema set `encryptMetadata.keyId` to `ssnKeyId` at the top level, causing both `ssn` and `creditCard` fields to use the SSN key. This contradicted the explicit example which created a separate `ccKeyId` for credit cards. Restructured the schema to specify `keyId` per field: `ssnKeyId` for SSN and `ccKeyId` for credit card.

## Review Notes
- The `Binary` import in the Automatic CSFLE example (`const { MongoClient, Binary } = require("mongodb")`) is unused. It does not cause a runtime error but is unnecessary code.
- Starting with Node.js driver v6.0+, `ClientEncryption` can also be imported directly from the `mongodb` package. The blog's approach of importing from `mongodb-client-encryption` still works but is the older pattern.
- The post correctly distinguishes between Automatic CSFLE (Enterprise/Atlas) and Explicit CSFLE (all editions), which is an important distinction readers need to understand.
- All encryption algorithm names, API signatures, KMS provider configurations, and AWS KMS master key formats are verified correct.
