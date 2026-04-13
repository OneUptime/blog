# Validation Summary: How to Use Client-Side Field Level Encryption in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (4.2+)
- MongoDB Client-Side Field Level Encryption (CSFLE)
- Node.js MongoDB driver (`mongodb` package)
- `mongodb-client-encryption` package
- Node.js `crypto` module

## Sources Consulted
- MongoDB CSFLE Encryption Schemas documentation: https://www.mongodb.com/docs/manual/core/csfle/reference/encryption-schemas/
- MongoDB Client-Side Field Level Encryption overview: https://www.mongodb.com/docs/manual/core/csfle/
- MongoDB Node.js driver AutoEncryptionOptions API: https://mongodb.github.io/node-mongodb-native/6.5/interfaces/AutoEncryptionOptions.html
- MongoDB Node.js driver ClientEncryption API: https://mongodb.github.io/node-mongodb-native/6.7/classes/ClientEncryption.html
- MongoDB In-Use Encryption fundamentals (Node.js): https://www.mongodb.com/docs/drivers/node/current/fundamentals/csfle/

## Issues Found

### 1. Conflation of CSFLE and Queryable Encryption APIs (Critical)
**What was wrong:** The post used `encryptedFieldsMap` with a `fields` array format (the Queryable Encryption API, available in MongoDB 7.0+) instead of the CSFLE `schemaMap` format. These are two distinct MongoDB encryption features. The title and text describe CSFLE, but the code implemented Queryable Encryption.

**What was changed:** Replaced `encryptedFieldsMap` with a proper CSFLE `schemaMap` using JSON Schema Draft 4 format with `encrypt` metadata, `algorithm` fields, and `encryptMetadata.keyId`. SSN uses deterministic encryption (supports equality queries), and medicalHistory uses random encryption (stronger security, no query support).

### 2. Invalid `AutoEncryptionOptions` import (Minor)
**What was wrong:** `const { AutoEncryptionOptions } = require("mongodb")` imports a TypeScript interface as a runtime value. TypeScript interfaces are erased at compile time and don't exist as runtime exports. This line would silently assign `undefined` and is unnecessary.

**What was changed:** Removed the bogus import line.

### 3. Incorrect comment about Queryable Encryption (Minor)
**What was wrong:** A comment stated "Query on encrypted field works with Queryable Encryption" — this is misleading since the post is about CSFLE, not Queryable Encryption. In CSFLE, equality queries work on fields encrypted with the deterministic algorithm.

**What was changed:** Updated comment to: "Equality query works because SSN uses deterministic encryption."

### 4. Summary paragraph referenced wrong option name
**What was wrong:** The summary mentioned `encryptedFieldsMap` which was changed to `schemaMap`.

**What was changed:** Updated reference to `schemaMap`.

## Review Notes
- The post correctly notes that automatic CSFLE encryption requires MongoDB Enterprise or Atlas. This is an important caveat for readers.
- The local master key approach (96-byte random key) is correctly marked as for testing only. Production deployments should use a KMS provider (AWS KMS, Azure Key Vault, GCP KMS, or KMIP).
- The explicit encryption example using `AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic` is correct and is one of only two algorithms supported by CSFLE (the other being the `-Random` variant).
- The `cryptSharedLibPath` option is correct — this is the Automatic Encryption Shared Library that replaced `mongocryptd` in newer driver versions.
- The `Binary` import from `mongodb` is unused in the code but is not technically incorrect, so it was left as-is.
