# Validation Summary: How to Use Client-Side Field Level Encryption (CSFLE) in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Client-Side Field Level Encryption (CSFLE)
- Node.js MongoDB driver (`mongodb` npm package)
- `mongodb-client-encryption` npm package
- AWS KMS integration for production key management
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB CSFLE documentation: https://www.mongodb.com/docs/manual/core/csfle/
- MongoDB Node.js driver CSFLE tutorial: https://www.mongodb.com/docs/drivers/node/current/fundamentals/encrypt-fields/
- MongoDB `autoEncryption` options reference: https://www.mongodb.com/docs/drivers/node/current/fundamentals/encrypt-fields/#autoencryption-options
- MongoDB Queryable Encryption vs CSFLE comparison: https://www.mongodb.com/docs/manual/core/queryable-encryption/
- MongoDB Key Vault documentation: https://www.mongodb.com/docs/manual/core/csfle/fundamentals/keys-key-vaults/

## Issues Found

### Issue 1 (Major): Used Queryable Encryption API instead of CSFLE API
- **What was wrong:** The "Configuring Automatic Encryption" section used `encryptedFieldsMap` with `fields`, `path`, `bsonType`, and `queries: { queryType: "equality" }`. This is the **Queryable Encryption** API (introduced in MongoDB 7.0), not the CSFLE API. The post title and content claim to be about CSFLE.
- **What was changed:** Replaced `encryptedFieldsMap` with `schemaMap` using proper JSON Schema format with `encrypt` keywords and explicit CSFLE algorithm names (`AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic` and `AEAD_AES_256_CBC_HMAC_SHA_512-Random`). Added `encryptMetadata` with `keyId` to bind the data encryption key to the schema. The `dataKeyId` parameter is now properly used in the schema.
- **Why:** CSFLE and Queryable Encryption are distinct features with different APIs. Using the wrong API would cause the code to not work as described and confuses two different MongoDB encryption features.

### Issue 2 (Moderate): Incorrect terminology for encryption/query behavior
- **What was wrong:** Text referenced `queryType: "equality"` (a Queryable Encryption concept) when explaining how to query encrypted fields.
- **What was changed:** Updated to reference "deterministic encryption algorithm" which is the correct CSFLE mechanism for enabling equality queries. Updated comment in the query code example accordingly. Added explanation that random encryption produces different ciphertext for the same plaintext.
- **Why:** In CSFLE, deterministic vs random encryption algorithms control queryability, not a `queryType` configuration field.

### Issue 3 (Minor): Invalid mongosh syntax for key vault index
- **What was wrong:** `db.encryption.__keyVault.createIndex(...)` — in mongosh, `db.encryption` refers to a collection named "encryption" in the current database, not the "encryption" database. This would not create the index on the correct collection.
- **What was changed:** Replaced with `db.getSiblingDB("encryption").getCollection("__keyVault").createIndex(...)` which correctly targets the `__keyVault` collection in the `encryption` database.
- **Why:** The original syntax would fail or create the index on the wrong collection.

### Issue 4 (Minor): Unused `Binary` import removed
- **What was wrong:** `const { MongoClient, Binary } = require("mongodb")` imported `Binary` but it was never used in the code block.
- **What was changed:** Removed the unused `Binary` import as part of the code block rewrite.
- **Why:** Unused imports are misleading and suggest `Binary` is needed for the configuration.

### Issue 5 (Moderate): Summary section referenced wrong API
- **What was wrong:** Summary mentioned `encryptedFieldsMap` and `queryType: "equality"`.
- **What was changed:** Updated to reference `schemaMap` and the correct algorithm names for deterministic and random encryption.
- **Why:** Summary should accurately reflect the corrected code examples.

## Review Notes
- The post does not mention the need for `mongocryptd` or the Automatic Encryption Shared Library (`crypt_shared`), which is required for automatic CSFLE to work. This is an omission but not an error in the existing content.
- The local master key approach (96-byte `randomBytes`) is correctly noted as development-only. The AWS KMS section provides the production alternative.
- MongoDB 4.2+ is required for CSFLE. The post does not mention version requirements, which would be helpful context but is not technically incorrect.
- The `ClientEncryption` constructor API and `createDataKey` usage are correct for the `mongodb-client-encryption` package.
