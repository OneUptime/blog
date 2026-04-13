# Validation Summary: How to Configure Automatic Encryption in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Client-Side Field Level Encryption (CSFLE)
- MongoDB Node.js driver (`mongodb` and `mongodb-client-encryption` packages)
- PyMongo (Python MongoDB driver) with `pymongo.encryption`
- Key Management Services (AWS KMS, Azure Key Vault, GCP KMS, local key)

## Sources Consulted
- MongoDB CSFLE documentation: https://www.mongodb.com/docs/manual/core/csfle/
- MongoDB Node.js driver CSFLE guide: https://www.mongodb.com/docs/drivers/node/current/fundamentals/encrypt-fields/
- PyMongo encryption documentation: https://pymongo.readthedocs.io/en/stable/examples/encryption.html
- MongoDB Queryable Encryption documentation (to distinguish from CSFLE): https://www.mongodb.com/docs/manual/core/queryable-encryption/

## Issues Found

### 1. Wrong schema format: `encryptedFieldsMap` used instead of `schemaMap` (Critical)
**What was wrong:** The "Define the Encrypted Fields Schema" section used `encryptedFieldsMap` with a `fields` array containing `path`, `bsonType`, `keyId`, and `algorithm` properties. This is the schema format for MongoDB Queryable Encryption (MongoDB 7.0+), NOT for CSFLE. CSFLE uses `schemaMap` with standard JSON Schema format containing `encrypt` subdocuments.

**What was changed:** Replaced `encryptedFieldsMap` with `schemaMap` using the correct JSON Schema format: a top-level `bsonType: "object"` with `encryptMetadata` for the default key ID, and `properties` where each encrypted field has an `encrypt` block specifying `bsonType` and `algorithm`.

**Why:** Using `encryptedFieldsMap` with CSFLE algorithms (`AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic/Random`) would cause a runtime error. Queryable Encryption uses different algorithms (`Indexed`, `Unindexed`, `Range`). The two features have incompatible schema formats.

### 2. Wrong schema format in MongoClient configuration (Critical)
**What was wrong:** The `autoEncryptionOptions` object referenced `encryptedFieldsMap`.

**What was changed:** Changed to `schemaMap` to match the corrected schema variable name and the correct CSFLE API.

**Why:** Follows from fix #1 - the MongoClient auto-encryption options for CSFLE expect `schemaMap`, not `encryptedFieldsMap`.

### 3. Python example used JSON pointer for `keyId` (Moderate)
**What was wrong:** The `encryptMetadata` in the Python `schema_map` used `"keyId": ["/keyId"]`, which is a JSON pointer syntax. JSON pointers are used in server-side JSON Schema validation, not in the client-side `schema_map` for CSFLE. The `keyId` must be an array of actual Binary UUID data key IDs.

**What was changed:** Changed `["/keyId"]` to `[data_key_id]` (a variable reference), and added data key creation code to the Python example using `ClientEncryption.create_data_key()` so the variable is properly defined.

**Why:** Using a JSON pointer string instead of a Binary UUID would cause the driver to fail to locate the encryption key, resulting in an error at runtime.

### 4. Summary referenced `encryptedFieldsMap` (Minor)
**What was wrong:** The summary paragraph mentioned "Define an `encryptedFieldsMap` schema".

**What was changed:** Updated to "Define a `schemaMap` with JSON Schema encryption rules".

**Why:** Consistency with the corrected code examples above.

## Review Notes
- The post correctly distinguishes between Deterministic and Random encryption algorithms and their use cases.
- The requirement for MongoDB Enterprise 4.2+ or Atlas for automatic CSFLE is accurate. MongoDB Community Edition only supports explicit (manual) encryption.
- The local key provider is appropriate for tutorials but the post could benefit from a note that local keys are not recommended for production - a remote KMS (AWS, Azure, GCP, KMIP) should be used instead. Not changed since it's a style/scope consideration, not a technical error.
- MongoDB 6.0+ introduced Queryable Encryption as a separate feature from CSFLE. If the post were to cover Queryable Encryption, it would need the `encryptedFieldsMap` format with `Indexed`/`Unindexed` algorithms. The original post incorrectly mixed the two features.
