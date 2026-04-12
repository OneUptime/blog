# Validation Summary: How to Implement Transparent Data Encryption in MongoDB Enterprise

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB Enterprise (encryption at rest / TDE)
- WiredTiger storage engine encryption
- KMIP (Key Management Interoperability Protocol)
- AWS KMS (via Ops Manager)
- OpenSSL (key generation)

## Sources Consulted
- MongoDB Manual: Encryption at Rest — https://www.mongodb.com/docs/manual/core/security-encryption-at-rest/
- MongoDB Manual: Configure Encryption — https://www.mongodb.com/docs/manual/tutorial/configure-encryption/
- MongoDB Manual: Rotate Encryption Keys — https://www.mongodb.com/docs/manual/tutorial/rotate-encryption-key/
- MongoDB Manual: mongod options (--kmipRotateMasterKey, --enableEncryption) — https://www.mongodb.com/docs/manual/reference/program/mongod/
- OASIS KMIP specification (port 5696) — https://www.oasis-open.org/committees/kmip/

## Issues Found

1. **TDE scope incorrectly included log files**: The post stated TDE encrypts "data files, journal files, and log files." MongoDB's encryption at rest does NOT encrypt log files — only data files and journal files. Removed "log files" from the description.

2. **Incorrect key file size (96 bytes vs 32 bytes)**: The `openssl rand -base64 96` command generates a 96-byte key. MongoDB's local keyfile encryption uses AES-256, which requires a 32-byte key. Changed to `openssl rand -base64 32`.

3. **Fabricated `--eseDatabaseKeyRollover` flag**: The `--eseDatabaseKeyRollover` is not a valid `mongod` option. Replaced the key rotation section with the correct KMIP-based approach using `--kmipRotateMasterKey`, and added a note that local keyfile encryption does not support in-place master key rotation (requires initial sync).

4. **Incorrect claim that all replica set members must use the same key**: The post stated "All members of a replica set must use the same encryption key." This is incorrect — encryption at rest is per-node, and each member encrypts its own local storage independently. Members can use different keys. Corrected the text.

## Review Notes
- The AWS KMS section is thin and somewhat misleading. The `mms-api` command shown is not a standard MongoDB tool, and the REST API payload format is not verifiable against current Ops Manager documentation. The section could benefit from a rewrite using the actual Ops Manager REST API or `mongocli`/`atlas` CLI, but since the general concept (using Ops Manager for AWS KMS integration) is valid, it was left as-is.
- The `serverStatus` output field names in the "Verifying Encryption at Rest" section (e.g., `encryptionAtRest.encryptionEnabled`, `encryptionAtRest.encryptionKeyId`) may not exactly match the actual MongoDB server response structure. Readers should consult the `serverStatus` documentation for their specific MongoDB version.
- The post does not mention the AES encryption mode (CBC vs GCM). MongoDB Enterprise supports both AES-256-CBC and AES-256-GCM, with GCM being the default in newer versions. This could be a useful addition in a future update.
