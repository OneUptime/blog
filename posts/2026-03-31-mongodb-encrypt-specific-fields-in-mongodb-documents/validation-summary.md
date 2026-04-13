# Validation Summary: How to Encrypt Specific Fields in MongoDB Documents

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Client-Side Field Level Encryption (CSFLE)
- Node.js `crypto` module (AES-256-GCM)
- `mongodb-client-encryption` npm package
- MongoDB Node.js Driver (`mongodb`)

## Sources Consulted
- Node.js `crypto` module documentation: https://nodejs.org/api/crypto.html
- MongoDB CSFLE documentation: https://www.mongodb.com/docs/manual/core/csfle/
- MongoDB Node.js Driver `ClientEncryption` API: https://mongodb.github.io/node-mongodb-native/6.0/classes/ClientEncryption.html
- NIST SP 800-38D (AES-GCM specification) for IV and auth tag sizes

## Issues Found
- **Key rotation section mixed incompatible encryption approaches**: The `decryptField` function (application-level AES-256-GCM from Approach 1) was used to decrypt data that would have been encrypted by CSFLE (Approach 2), then re-encrypted with `encryption.encrypt` (CSFLE). These are completely different encryption systems and are not interoperable. Fixed by replacing `decryptField(doc.ssn)` with `await encryption.decrypt(doc.ssn)` (the CSFLE decryption method) and using the plain client (without autoEncryption) to read raw encrypted data, which is necessary to access the Binary-encrypted values for manual re-encryption.

## Review Notes
- The `dataKeyId.toString('base64')` on the console.log line may not produce a proper base64 string since `createDataKey` returns a UUID object whose `toString()` defaults to hex format. This is cosmetic (only affects a log statement) so was not changed.
- The `new Binary(dataKeyId, 4)` in the schema map works in practice but is slightly redundant since `createDataKey` already returns a UUID (Binary subtype 4). Using `[dataKeyId]` directly would be cleaner.
- For production CSFLE key rotation, MongoDB provides the `rewrapManyDataKey` method which is more efficient than the manual decrypt/re-encrypt loop shown. The manual approach shown is still valid but less optimal.
- The local KMS provider example is appropriate for a tutorial but the post correctly notes in the summary that AWS KMS, Azure Key Vault, or GCP KMS should be used in production.
