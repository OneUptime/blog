# Validation Summary: How to Build Key Management Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cryptographic key management
- OpenSSL
- AWS KMS
- AWS CLI
- AWS CloudTrail
- Amazon EventBridge
- HashiCorp Vault transit secrets engine
- Vault ACL policies
- Python boto3
- Python cryptography Fernet
- Mermaid diagrams

## Sources Consulted
- AWS KMS key rotation documentation: https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- AWS CLI `kms create-key` documentation: https://docs.aws.amazon.com/cli/latest/reference/kms/create-key.html
- AWS KMS `ScheduleKeyDeletion` API reference: https://docs.aws.amazon.com/kms/latest/APIReference/API_ScheduleKeyDeletion.html
- AWS KMS `DisableKey` API reference: https://docs.aws.amazon.com/kms/latest/APIReference/API_DisableKey.html
- AWS KMS `CancelKeyDeletion` API reference: https://docs.aws.amazon.com/kms/latest/APIReference/API_CancelKeyDeletion.html
- AWS KMS CloudWatch metrics documentation: https://docs.aws.amazon.com/kms/latest/developerguide/monitoring-cloudwatch.html
- AWS KMS CloudTrail logging documentation: https://docs.aws.amazon.com/kms/latest/developerguide/logging-using-cloudtrail.html
- Amazon EventBridge AWS KMS events reference: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-kms.html
- AWS CloudTrail `lookup-events` CLI documentation: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- HashiCorp Vault transit secrets engine API documentation: https://developer.hashicorp.com/vault/api-docs/secret/transit
- Python cryptography Fernet documentation: https://cryptography.io/en/latest/fernet/
- Local OpenSSL CLI: `openssl version`, `openssl rand -base64 32`

## Issues Found
- Updated AWS KMS terminology from legacy "customer master keys (CMKs)" to "AWS KMS keys" and changed "symmetric CMK" to "symmetric KMS key"; AWS documentation now uses KMS key terminology.
- Corrected the envelope encryption benefit that said DEKs are generated locally while the AWS example uses KMS `GenerateDataKey`; the text now says data is encrypted locally with DEKs and KMS is called to generate or unwrap encrypted data keys.
- Added `EncryptionContext={'service': 'payments'}` to the boto3 `generate_data_key` and `decrypt` calls so the Python example matches the later KMS key policy condition on `kms:EncryptionContext:service`.
- Changed the Vault envelope encryption example from `transit/datakey/wrapped/payments-key` to `transit/datakey/plaintext/payments-key`, because the `wrapped` endpoint does not return the plaintext data key described by the article. Updated the Vault ACL policy path to match.
- Updated the AWS KMS rotation description to reflect automatic rotation for symmetric KMS keys with AWS KMS key material, rather than calling it only annual rotation for CMKs.
- Replaced aliases in `disable-key` and `schedule-key-deletion` examples with `<key-id>`, because those APIs require a key ID or key ARN rather than an alias.
- Fixed the Vault destruction snippet: it previously claimed to delete specific key versions while deleting the entire key. The text now identifies full key deletion and uses the documented `trim` endpoint for permanently trimming older key versions.
- Replaced the CloudWatch metric alarm for `ScheduleKeyDeletion`, which is not an AWS KMS CloudWatch metric, with an EventBridge rule that matches AWS KMS `ScheduleKeyDeletion` API calls delivered through CloudTrail.

## Review Notes
- The Python snippet was syntax-checked with `ast.parse`. Runtime AWS and Vault calls were not executed because the local environment does not have configured `aws` or `vault` CLIs or service credentials.
- OpenSSL command forms were checked against local OpenSSL 3.0.13 behavior.
