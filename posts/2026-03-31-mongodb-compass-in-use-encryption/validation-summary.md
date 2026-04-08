# Validation Summary: How to Use MongoDB Compass In-Use Encryption Feature

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Compass
- Client-Side Field Level Encryption (CSFLE)
- AWS KMS
- Azure Key Vault
- Google Cloud KMS
- KMIP
- OpenSSL (for key generation)

## Sources Consulted
- MongoDB Compass In-Use Encryption documentation: https://www.mongodb.com/docs/compass/current/in-use-encryption-tutorial/
- MongoDB CSFLE documentation: https://www.mongodb.com/docs/manual/core/csfle/
- MongoDB CSFLE KMS Providers: https://www.mongodb.com/docs/manual/core/csfle/reference/kms-providers/
- MongoDB Queryable Encryption documentation: https://www.mongodb.com/docs/manual/core/queryable-encryption/

## Issues Found
1. **Missing KMIP KMS provider**: The list of supported KMS providers omitted KMIP (Key Management Interoperability Protocol), which Compass does support. Added KMIP to the list.

## Review Notes
- The `openssl rand -base64 96` command is correct for generating a 96-byte local master key.
- The CSFLE schema map JSON format and algorithm name (`AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic`) are correct.
- The AWS IAM permissions listed (`kms:Encrypt`, `kms:Decrypt`, `kms:GenerateDataKey`) are accurate.
- The claim about range queries requiring Queryable Encryption in MongoDB 7.0+ is correct (preview in 7.0, GA in 8.0).
- The M0 free tier limitation is accurate.
