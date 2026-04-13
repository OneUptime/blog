# Validation Summary: How to Use AWS KMS for MongoDB Encryption Key Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Client-Side Field Level Encryption (CSFLE)
- AWS Key Management Service (KMS)
- Node.js MongoDB driver (`mongodb`, `mongodb-client-encryption`)
- PyMongo (Python MongoDB driver)
- AWS CLI
- AWS IAM

## Sources Consulted
- MongoDB CSFLE with AWS KMS tutorial: https://www.mongodb.com/docs/manual/core/csfle/tutorials/aws/aws-automatic/
- MongoDB Node.js driver ClientEncryption API: https://mongodb.github.io/node-mongodb-native/
- MongoDB CSFLE automatic encryption schema map: https://www.mongodb.com/docs/manual/core/csfle/fundamentals/automatic-encryption/
- AWS KMS CLI reference (`create-key`, `enable-key-rotation`): https://docs.aws.amazon.com/cli/latest/reference/kms/
- AWS KMS CreateKey API response structure: https://docs.aws.amazon.com/kms/latest/APIReference/API_CreateKey.html
- PyMongo ClientEncryption API: https://pymongo.readthedocs.io/en/stable/api/pymongo/encryption.html

## Issues Found

1. **Incorrect IAM permission `kms:GenerateDataKey` (prerequisites and IAM policy)**: MongoDB CSFLE does not use the `GenerateDataKey` KMS API. The driver generates DEKs locally and calls `kms:Encrypt` to wrap them with the CMK. Changed `kms:GenerateDataKey` to `kms:Encrypt` in both the prerequisites list and the IAM policy JSON.

2. **Wrong JMESPath query for `create-key` output**: The command used `--query "KeyMetadata.KeyId"` which returns a UUID (e.g., `1234abcd-12ab-34cd-56ef-1234567890ab`), but the accompanying text showed an ARN as the example output. Changed the query to `--query "KeyMetadata.Arn"` to match the ARN example shown in the text.

3. **`encryptedFieldsMap` used instead of `schemaMap` for CSFLE**: The AutoEncryption configuration section used `encryptedFieldsMap` with a `fields` array, which is the Queryable Encryption (QE) API format. For CSFLE, the correct option is `schemaMap` with JSON Schema format (`bsonType`, `encryptMetadata`, `properties` with `encrypt` sub-documents). Replaced with the correct CSFLE `schemaMap` structure.

4. **Unused import in Python example**: `AutoEncryptionOpts` was imported from `pymongo.encryption_options` but never used in the code. Removed the unused import.

## Review Notes
- The post correctly recommends using IAM roles (empty `aws: {}` config) instead of static credentials in production. This is an important security best practice.
- The Python example imports could benefit from showing an `AutoEncryptionOpts` usage example since it was presumably intended to demonstrate auto-encryption in Python as well, but this is a content addition rather than a technical correction.
- The `codec_options` usage in the Python `ClientEncryption` constructor (`client.codec_options`) is correct but could be more explicit about using `CodecOptions` with a `UUID_REPRESENTATION` for production use.
