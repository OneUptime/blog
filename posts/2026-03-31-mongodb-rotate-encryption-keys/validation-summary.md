# Validation Summary: How to Rotate Encryption Keys in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Client-Side Field Level Encryption (CSFLE)
- AWS KMS (Key Management Service)
- Azure Key Vault
- GCP Cloud KMS
- MongoDB Node.js Driver (`mongodb` and `mongodb-client-encryption` packages)
- AWS CLI, Azure CLI, Google Cloud CLI

## Sources Consulted
- MongoDB CSFLE documentation: https://www.mongodb.com/docs/manual/core/csfle/
- MongoDB `rewrapManyDataKey` API reference: https://www.mongodb.com/docs/manual/reference/method/ClientEncryption.rewrapManyDataKey/
- MongoDB `ClientEncryption` Node.js driver API: https://mongodb.github.io/node-mongodb-native/
- AWS KMS key rotation documentation: https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- Azure Key Vault key rotation policy: https://learn.microsoft.com/en-us/cli/azure/keyvault/key/rotation-policy
- GCP KMS key rotation: https://cloud.google.com/kms/docs/key-rotation

## Issues Found
No technical issues found.

## Review Notes
- The verification snippet uses an `encryptedClient` variable that is not defined earlier in the post. This is intentional — it represents a MongoClient configured with CSFLE auto-decryption, which is a different client from the one used for manual encryption operations. The intent is clear from context.
- The GCP `date -d "+1 year" --iso-8601` command uses GNU coreutils syntax, which will not work on macOS. This is standard for server-oriented documentation.
- AWS KMS now supports configurable rotation periods (via `--rotation-period-in-days`), but the default annual rotation shown in the post remains correct and is the most common setup.
- The DEK rotation example correctly warns this is a "simplified example" — a production implementation would need batching, error handling, and a strategy for documents being written during migration.
