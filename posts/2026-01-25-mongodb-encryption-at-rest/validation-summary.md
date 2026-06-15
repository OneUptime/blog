# Validation Summary: How to Enable Encryption at Rest in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Enterprise encrypted storage engine
- MongoDB Atlas encryption at rest
- WiredTiger
- Local keyfile encryption
- KMIP key management
- AWS KMS with MongoDB Atlas customer-managed keys
- mongosh
- mongod configuration
- mongodump and mongorestore

## Sources Consulted
- MongoDB Manual: Configure Encryption: https://www.mongodb.com/docs/manual/tutorial/configure-encryption/
- MongoDB Manual: Encryption at Rest: https://www.mongodb.com/docs/manual/core/security-encryption-at-rest/
- MongoDB Manual: Self-Managed Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Manual: Rotate Encryption Keys: https://www.mongodb.com/docs/manual/tutorial/rotate-encryption-key/
- MongoDB Manual: db.serverCmdLineOpts(): https://www.mongodb.com/docs/manual/reference/method/db.servercmdlineopts/
- MongoDB Atlas: Encryption at Rest using Customer Key Management: https://www.mongodb.com/docs/atlas/security-kms-encryption/
- MongoDB Atlas: Manage Customer Keys with AWS KMS: https://www.mongodb.com/docs/atlas/security-aws-kms/
- MongoDB Database Tools: mongodump and mongorestore command behavior: https://www.mongodb.com/docs/database-tools/

## Issues Found
- The post implied MongoDB Enterprise and Atlas use the same native WiredTiger encryption path. Updated the wording to distinguish self-managed MongoDB Enterprise encrypted storage from Atlas default volume and snapshot encryption, with optional customer-managed database-level encryption.
- The key management list incorrectly presented cloud KMS as a self-managed MongoDB server configuration option. Clarified that self-managed encrypted storage uses local keyfile or KMIP, while AWS KMS, Azure Key Vault, and Google Cloud KMS apply to Atlas customer-managed keys.
- The local keyfile configuration included a non-existent `security.encryptionKeyRotationIntervalSec` option. Removed it.
- The verification examples used `db.serverStatus().wiredTiger.encryptionAtRest`, which is not the documented verification path in MongoDB's encryption setup guide. Replaced it with `db.serverCmdLineOpts().parsed.security` and a note to verify key manager initialization in MongoDB logs.
- The AWS KMS `mongod.conf` example used an unsupported `security.kms.aws` configuration block for self-managed MongoDB. Replaced it with Atlas-specific guidance and documented AWS KMS permissions for Atlas customer-managed keys.
- The key rotation section used an invalid `db.adminCommand({ rotateMasterKey: 1 })` shell command and implied local keyfile rotation support. Replaced it with the documented KMIP `security.kmip.rotateMasterKey` flow and noted that local key management does not support key rotation.
- The migration example generated a local keyfile without setting ownership for the `mongod` process user. Added `chown mongodb:mongodb`.
- The troubleshooting section said the keyfile content should be exactly 32 bytes base64 encoded. Updated it to match MongoDB's requirement that the keyfile is base64 encoded and accessible only by the `mongod` owner.

## Review Notes
The backup and restore examples are technically reasonable, but production backup design should also account for backup tooling, cluster topology, credentials, restore testing, and separate encryption for exported dumps because `mongodump` outputs decrypted logical data.
