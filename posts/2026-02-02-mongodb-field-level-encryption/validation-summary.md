# Validation Summary: How to Configure MongoDB Field-Level Encryption

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- MongoDB Client-Side Field Level Encryption (CSFLE)
- MongoDB Queryable Encryption (MongoDB 7.0+ equality, 8.0+ range)
- Node.js MongoDB driver (`mongodb`)
- `mongodb-client-encryption` library
- `libmongocrypt` and `crypt_shared` shared library
- AEAD AES-256-CBC HMAC-SHA-512 encryption algorithms (Deterministic and Random)
- AWS KMS, Azure Key Vault, GCP KMS as Customer Master Key providers
- BSON (Binary subtype 4 / UUID)

## Sources Consulted
- MongoDB Manual — CSFLE: https://www.mongodb.com/docs/manual/core/csfle/
- MongoDB Manual — Queryable Encryption: https://www.mongodb.com/docs/manual/core/queryable-encryption/
- CSFLE Encryption Schemas reference: https://www.mongodb.com/docs/manual/core/csfle/reference/encryption-schemas/
- CSFLE Cryptographic Primitives: https://www.mongodb.com/docs/manual/core/csfle/reference/cryptographic-primitives/
- Queryable Encryption — Encrypt and Query fundamentals: https://www.mongodb.com/docs/manual/core/queryable-encryption/fundamentals/encrypt-and-query/
- Queryable Encryption Compatibility (v7.0): https://www.mongodb.com/docs/v7.0/core/queryable-encryption/reference/compatibility/
- CSFLE KMS Providers reference: https://www.mongodb.com/docs/manual/core/csfle/reference/kms-providers/
- MongoDB Client-Side Encryption Specification: https://github.com/mongodb/specifications/blob/master/source/client-side-encryption/client-side-encryption.md
- BSON Binary UUID spec: https://github.com/mongodb/specifications/blob/master/source/bson-binary-uuid/uuid.md

## Issues Found

1. **Incorrect MongoDB version for Queryable Encryption range queries.** The post stated "MongoDB 7.0 introduced Queryable Encryption, an evolution of CSFLE that supports encrypted range queries, not just equality." In reality, Queryable Encryption was GA in MongoDB 7.0 with **equality queries only**; range queries on encrypted fields (`queryType: 'range'`) only became generally available in MongoDB 8.0. The example code uses `queryType: 'range'`, which requires 8.0+. Fixed by rewording the introduction to clarify that 7.0 GA'd equality queries and 8.0 GA'd range queries, and updating the inline file comment to note "Requires MongoDB 8.0+ for range queries."

2. **Invalid `keyAltName` property in the CSFLE JSON schema.** The production schema example placed `keyAltName: 'productionKey'` inside the `encrypt` block for individual fields. CSFLE's JSON schema does not support `keyAltName` as a property inside `encrypt` — only `keyId` is valid, taking either an array of BinData(4) UUIDs or a JSON pointer string. The combination of `keyId: '/keyAltName'` in `encryptMetadata` plus `keyAltName: '...'` per field was nonsensical: the JSON pointer form expects each inserted document to carry a `keyAltName` field, which contradicts the goal of a static mapping. Fixed by changing `getProductionSchema` to accept the resolved key `_id` (BinData UUID) as a parameter and setting `encryptMetadata.keyId: [productionKeyId]`, removing the invalid per-field `keyAltName` entries. The caller in `createProductionClient` was updated to look up the key vault document after creation and pass `keyDoc._id` into the schema builder.

## Review Notes

- The `AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic` and `-Random` algorithm names are correct for CSFLE.
- The 96-byte local master key requirement is correct.
- Binary subtype 4 for UUID is correct (`new Binary(buffer, 4)`).
- The `encryptedFieldsMap` shape for Queryable Encryption (`{ "db.coll": { fields: [{ path, bsonType, queries }] } }`) is correct.
- The `range` queryType is the MongoDB 8.0 GA name (previously `rangePreview` in 6.2–7.x). The example correctly uses the GA name.
- The `keyId: '/keyAltName'` JSON pointer form referenced in `encryptMetadata` is technically valid CSFLE syntax but uncommon — it requires every inserted document to contain a `keyAltName` field whose value is a key alternate name. Readers using the production example as written (after the fix) get a clearer static-key reference via BinData UUID, which matches the more typical pattern.
- The post's claim that the MongoDB driver "automatically encrypts" query values for equality matches on deterministic fields is correct, but only for top-level fields (and for nested fields when the schema declares the parent path) — not flagged as an issue but worth noting for future revisions.
- The CSFLE benchmark code's `dropDatabase()` on `'benchmark'` is fine as a teardown step but readers should be aware that running it on a real database would delete all data.
- All external links (OneUptime blog posts, MongoDB Download Center references) are plausible and point to expected resources.
