# Validation Summary: How to Encrypt Fields with MongoDB Client-Side Encryption

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Client-Side Field Level Encryption (CSFLE)
- MongoDB Node.js Driver
- PyMongo
- AWS KMS
- Local KMS provider
- libmongocrypt / automatic encryption

## Sources Consulted
- MongoDB Manual: Automatic Encryption - https://www.mongodb.com/docs/manual/core/csfle/fundamentals/automatic-encryption/
- MongoDB Manual: CSFLE Encryption Schemas - https://www.mongodb.com/docs/manual/core/csfle/reference/encryption-schemas/
- MongoDB Manual: Fields and Encryption Types - https://www.mongodb.com/docs/manual/core/csfle/fundamentals/encryption-algorithms/
- MongoDB Manual: Encryption Keys and Key Vaults - https://www.mongodb.com/docs/manual/core/queryable-encryption/fundamentals/keys-key-vaults/
- MongoDB Manual: Encryption Key Management - https://www.mongodb.com/docs/manual/core/csfle/fundamentals/manage-keys/
- MongoDB Node.js Driver: In-Use Encryption - https://www.mongodb.com/docs/drivers/node/current/security/encrypt-fields/
- PyMongo: Client-Side Field Level Encryption API - https://pymongo.readthedocs.io/en/stable/api/pymongo/encryption.html
- PyMongo: Automatic Client-Side Field Level Encryption Options - https://pymongo.readthedocs.io/en/stable/api/pymongo/encryption_options.html
- PyMongo: In-Use Encryption Examples - https://pymongo.readthedocs.io/en/4.5.0/examples/encryption.html

## Issues Found
- The automatic encryption section did not mention that automatic CSFLE requires MongoDB Enterprise or Atlas. Added a short note clarifying that MongoDB Community supports explicit encryption and automatic decryption, but not automatic encryption.
- The JavaScript schema example imported `Binary` from `mongodb` but never used it. Removed the unused import to keep the snippet accurate.
- The AWS KMS auto-encryption options snippet referenced an undefined `userSchema`. Replaced it with a helper function that builds the schema from the `dataKeyId`.
- The Python example created a data key without first creating the required unique partial index on `keyAltNames` in the key vault collection. Added the index creation using bracket collection access for the `__keyVault` collection.
- The key rotation example used the private `encryption._client` property and assumed automatic decryption without showing an encrypted client. Updated the function to accept a collection explicitly and decrypt each encrypted field with `ClientEncryption.decrypt()` before re-encrypting it with the new key.

## Review Notes
The post focuses on classic CSFLE. MongoDB also offers Queryable Encryption as the newer in-use encryption feature for MongoDB 7.0 and later, but the CSFLE content remains technically relevant and correct after the fixes.
