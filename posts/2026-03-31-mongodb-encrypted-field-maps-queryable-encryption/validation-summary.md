# Validation Summary: How to Define Encrypted Field Maps for Queryable Encryption in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB Queryable Encryption (QE)
- MongoDB Node.js Driver (`autoEncryption` configuration)
- MongoDB `ClientEncryption` API (`createDataKey`)
- KMS Providers (local key, AWS referenced)
- BSON types

## Sources Consulted
- [Queryable Encryption Overview - MongoDB Manual](https://www.mongodb.com/docs/manual/core/queryable-encryption/)
- [Encrypted Fields and Enabled Queries - MongoDB Manual](https://www.mongodb.com/docs/manual/core/queryable-encryption/fundamentals/encrypt-and-query/)
- [Manage Encrypted Collections - MongoDB Manual](https://www.mongodb.com/docs/manual/core/queryable-encryption/fundamentals/manage-collections/)
- [Queryable Encryption Limitations - MongoDB Manual](https://www.mongodb.com/docs/manual/core/queryable-encryption/reference/limitations/)
- [Create an Encrypted Collection and Insert Documents - MongoDB Manual](https://www.mongodb.com/docs/manual/core/queryable-encryption/qe-create-encrypted-collection/)
- [Encryption Keys and Key Vaults - MongoDB Manual](https://www.mongodb.com/docs/manual/core/queryable-encryption/fundamentals/keys-key-vaults/)
- [In-Use Encryption - Node.js Driver - MongoDB Docs](https://www.mongodb.com/docs/drivers/node/current/fundamentals/encrypt-fields/)
- [Encryption Key Management - MongoDB Manual](https://www.mongodb.com/docs/manual/core/csfle/fundamentals/manage-keys/)

## Issues Found
No technical issues found.

## Review Notes
- The `bsonType` field is marked as "Required: Yes" in the field options table. While it is always included in official MongoDB examples and is standard practice, some documentation suggests it is strictly required only for range queries on `decimal` or `double` types. In practice, always including it (as the post does) is the correct recommendation.
- The restriction about not encrypting both a top-level field and a nested sub-field of the same field is a well-known QE constraint, though it is not always prominently documented in the official limitations page. The post correctly states this.
- The post uses `encryption.createDataKey()` which assumes a `ClientEncryption` instance stored in a variable called `encryption`. This is a common pattern in MongoDB tutorials and is correct usage.
- Range query parameters (`sparsity`, `min`, `max`, `trimFactor`) are all valid and correctly described. The `trimFactor` default of 6 aligns with MongoDB documentation.
- The `keyVaultNamespace` value `"encryption.__keyVault"` follows the standard convention used throughout MongoDB's official documentation.
