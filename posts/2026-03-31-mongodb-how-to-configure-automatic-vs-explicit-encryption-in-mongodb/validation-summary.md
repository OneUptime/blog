# Validation Summary: How to Configure Automatic vs Explicit MongoDB Queryable Encryption

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Queryable Encryption (QE)
- MongoDB Node.js Driver (`mongodb` package)
- ClientEncryption API
- AWS KMS (Key Management Service)
- `mongocryptd` / `crypt_shared` library

## Sources Consulted
- MongoDB Queryable Encryption documentation: https://www.mongodb.com/docs/manual/core/queryable-encryption/
- MongoDB 7.0 QE compatibility reference: https://www.mongodb.com/docs/v7.0/core/queryable-encryption/reference/compatibility/
- MongoDB 8.0 release notes (range queries GA): https://www.mongodb.com/docs/manual/release-notes/8.0/
- MongoDB Encrypted Fields and Enabled Queries: https://www.mongodb.com/docs/manual/core/queryable-encryption/fundamentals/encrypt-and-query/
- MongoDB ClientEncryption.encrypt() reference: https://www.mongodb.com/docs/manual/reference/method/clientencryption.encrypt/
- MongoDB Automatic Encryption Shared Library (crypt_shared): https://www.mongodb.com/docs/manual/core/queryable-encryption/reference/shared-library/
- MongoDB Queryable Encryption with Explicit Encryption: https://www.mongodb.com/docs/manual/core/queryable-encryption/fundamentals/manual-encryption/
- MongoDB Create an Encryption Schema: https://www.mongodb.com/docs/manual/core/queryable-encryption/qe-create-encryption-schema/

## Issues Found
1. **Wrong MongoDB version requirement**: The post stated "MongoDB Enterprise 6.0+ or MongoDB Atlas 6.0+" but QE was only a Public Preview in 6.0 (now deprecated and incompatible with GA). QE became GA in MongoDB 7.0. Fixed to "MongoDB Enterprise 7.0+ or MongoDB Atlas 7.0+" with a note that 6.0 had a deprecated preview.

2. **Missing range query version requirement**: The post used `queryType: "range"` in the encrypted fields map but did not mention that range queries require MongoDB 8.0+ (GA). Added "MongoDB 8.0+ for range queries on encrypted fields" to the requirements.

3. **Unused `Binary` import**: `const { Binary } = require('bson');` was imported but never used in the code. Removed the unused import.

4. **Comparison table: wrong explicit encryption MongoDB version**: The table listed "Any" for explicit encryption MongoDB version, but QE explicit encryption using "Indexed" and "Unindexed" algorithms requires MongoDB 7.0+ (these are QE-specific algorithms, not CSFLE). Fixed to "7.0+ Enterprise/Atlas".

5. **Misleading "When to Use Explicit Encryption" bullet**: The post stated "You need encryption in older MongoDB versions or without mongocryptd" as a reason for explicit encryption. QE explicit encryption still requires 7.0+, so the "older versions" claim was incorrect. Revised to "You want encryption without requiring `mongocryptd` or `crypt_shared`".

6. **Comparison table: `mongocryptd` column incomplete**: The table header said "`mongocryptd` required" but `crypt_shared` is the recommended alternative for new projects. Updated header to "`mongocryptd`/`crypt_shared` required".

7. **Explicit encrypt call missing required parameters**: The `clientEncryption.encrypt()` call with `algorithm: "Indexed"` was missing `queryType: "equality"` and `contentionFactor` parameters. Added both for correctness.

## Review Notes
- The `crypt_shared` library is now MongoDB's recommended approach over `mongocryptd` for automatic encryption. The requirements section was updated to note this preference.
- The `contentionFactor` parameter added to the explicit encrypt call uses a value of 4, which is a reasonable default for most use cases. In production, this value should be tuned based on expected query patterns and security requirements.
- The post's range query example in the encrypted fields map omits optional parameters `sparsity` and `trimFactor` (MongoDB 8.0+). These have reasonable defaults and are not strictly required, so their omission is acceptable for a tutorial.
- The post correctly shows creating the collection with `encryptedFields` before using auto-encryption, which is the required workflow for QE.
