# Validation Summary: How to Use KMS for Envelope Encryption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Key Management Service (AWS KMS)
- AWS CLI
- boto3 for Python
- Python cryptography library AES-GCM
- AWS Encryption SDK for Python
- AWS CloudTrail encryption context logging

## Sources Consulted
- AWS KMS Encrypt API reference: https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html
- AWS KMS GenerateDataKey API reference: https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html
- AWS KMS GenerateDataKeyWithoutPlaintext API reference: https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKeyWithoutPlaintext.html
- AWS KMS Decrypt API reference: https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html
- AWS KMS encryption context developer guide: https://docs.aws.amazon.com/kms/latest/developerguide/encrypt_context.html
- AWS CLI kms generate-data-key command reference: https://docs.aws.amazon.com/cli/latest/reference/kms/generate-data-key.html
- AWS CLI kms generate-data-key-without-plaintext command reference: https://docs.aws.amazon.com/cli/latest/reference/kms/generate-data-key-without-plaintext.html
- AWS KMS pricing: https://aws.amazon.com/kms/pricing/
- boto3 KMS client documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/kms.html
- cryptography AESGCM documentation: https://cryptography.io/en/latest/hazmat/primitives/aead/
- AWS Encryption SDK for Python documentation: https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/python.html
- AWS Encryption SDK data key caching documentation: https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/data-key-caching.html

## Issues Found
- The KMS direct-encryption cost example for a 1 GB file was incorrect. At 4,096 bytes per Encrypt request, 1 GiB requires about 262,144 requests; at $0.03 per 10,000 requests, that is about $0.79, not $7.50. Updated the example cost.
- The Python examples claimed to zero out plaintext keys by assigning a new zero-filled `bytes` object. That does not overwrite the original immutable `bytes` object in Python. Updated the comments and code to drop references promptly instead of claiming memory zeroization.
- The data key caching section said the AWS Encryption SDK handles caching automatically. Data key caching is supported by the SDK, but it must be configured. Updated the wording to reflect that.
- The AWS Encryption SDK example used the older module-level `encrypt` and `decrypt` pattern. Updated it to use `EncryptionSDKClient` with an explicit commitment policy.

## Review Notes
- The AWS KMS 4,096-byte Encrypt API limit, GenerateDataKey behavior, encryption context behavior, AWS CLI options, boto3 parameter names, and AES-GCM nonce guidance are technically correct.
- The internal OneUptime links referenced at the end of the post returned HTTP 200 during validation.
- The Python snippets were syntax-checked after edits. Runtime execution was not attempted because it requires AWS credentials, a real KMS key, and the listed Python dependencies.
