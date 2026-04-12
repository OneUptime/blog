# Validation Summary: How to Use Queryable Encryption with Mongoose in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0+ Queryable Encryption (QE)
- Mongoose ODM for Node.js
- MongoDB Node.js Driver (`mongodb` package)
- `mongodb-client-encryption` package
- Local KMS provider with a 96-byte master key

## Sources Consulted
- Mongoose Field Level Encryption documentation — https://mongoosejs.com/docs/field-level-encryption.html
- Mongoose Validation documentation — https://mongoosejs.com/docs/validation.html
- Mongoose Middleware documentation — https://mongoosejs.com/docs/middleware.html
- MongoDB Queryable Encryption overview — https://www.mongodb.com/docs/manual/core/queryable-encryption/
- MongoDB QE Quick Start — https://www.mongodb.com/docs/manual/core/queryable-encryption/quick-start/
- MongoDB QE Encrypt and Query — https://www.mongodb.com/docs/manual/core/queryable-encryption/fundamentals/encrypt-and-query/
- MongoDB QE Compatibility reference — https://www.mongodb.com/docs/v7.0/core/queryable-encryption/reference/compatibility/
- MongoDB Crypt Shared Library reference — https://www.mongodb.com/docs/v7.0/core/queryable-encryption/reference/shared-library/
- MongoDB QE Create Encrypted Collection — https://www.mongodb.com/docs/manual/core/queryable-encryption/qe-create-encrypted-collection/
- npm: mongodb-client-encryption — https://www.npmjs.com/package/mongodb-client-encryption
- Official Node.js QE examples — https://github.com/mongodb-university/docs-in-use-encryption-examples

## Issues Found
1. **Unused `Binary` import**: The code imported `const { Binary } = require("mongodb")` but never used it. Removed the unused import to avoid confusion.
2. **Incorrect validators explanation**: The post claimed "Mongoose validators run after the driver decrypts, so they work normally on read." This is incorrect — Mongoose validators run on write operations (registered as `pre('save')` hooks), not on reads. On writes, validators see plaintext values before the driver encrypts them. Corrected to: "Mongoose validators run on writes before the driver encrypts, so they see plaintext values and work normally."

## Review Notes
- The `autoEncryption` option passed through `mongoose.connect()` is correctly forwarded to the underlying MongoClient, as confirmed by Mongoose documentation.
- The `encryptedFieldsMap` structure uses the array form for `queries` (`[{ queryType: "equality" }]`). MongoDB accepts both the array form and the plain object form (`{ queryType: "equality" }`); both are shown in official MongoDB documentation.
- The 96-byte local master key requirement is correct for the `local` KMS provider.
- The post correctly notes that MongoDB Enterprise or Atlas is required. A minor nuance: MongoDB Community Edition supports automatic *decryption* but not automatic *encryption*.
- The `cryptSharedLibPath` example uses a Linux path (`/usr/local/lib/mongo_crypt_v1.so`). On macOS this would be a `.dylib` file and on Windows a `.dll`. This is fine for a tutorial but readers on other platforms should adjust accordingly.
- The lean query behavior is correctly described — the driver decrypts data before it reaches Mongoose, so `.lean()` has no effect on decryption.
