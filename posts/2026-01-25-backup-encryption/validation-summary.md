# Validation Summary: How to Configure Backup Encryption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GnuPG
- OpenSSL
- age
- Restic
- BorgBackup
- Duplicity
- AWS S3 server-side encryption
- Azure Storage encryption with customer-managed keys
- Google Cloud Storage and Cloud KMS
- HashiCorp Vault KV and Transit secrets engines
- AWS KMS and boto3
- TLS, SSH, SFTP, and rsync transport encryption
- GDPR, HIPAA, PCI-DSS, and SOC 2 compliance considerations

## Sources Consulted
- GnuPG local documentation and installed `gpg 2.4.4` help/version output.
- OpenSSL local documentation and installed `openssl enc` help output for `-pbkdf2`, `-iter`, `-salt`, `-pass`, and AES cipher options.
- Duplicity manual page: https://duplicity.nongnu.org/vers7/duplicity.1.html
- Restic repository format and encryption documentation: https://restic.readthedocs.io/en/stable/100_references.html
- Restic key remove manual page: https://man.archlinux.org/man/restic-key-remove.1.en
- BorgBackup encryption mode documentation: https://borgbackup.readthedocs.io/en/stable/usage/init.html
- AWS CLI `put-bucket-encryption` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-encryption.html
- AWS KMS `GenerateDataKey` API reference: https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html
- boto3 KMS `generate_data_key` reference: https://docs.aws.amazon.com/goto/boto3/kms-2014-11-01/GenerateDataKey
- Azure CLI `az storage account update` reference: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Google Cloud KMS key ring creation reference: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keyrings/create
- Google Cloud KMS key creation reference: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Google Cloud Storage customer-managed encryption key documentation: https://docs.cloud.google.com/storage/docs/encryption/using-customer-managed-keys
- GDPR Article 32 text: https://gdpr-info.eu/art-32-gdpr/
- HIPAA Security Rule technical safeguards, 45 CFR 164.312: https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.312
- PCI DSS v4.0.1 reference copy for strong cryptography and stored PAN treatment: https://www.middlebury.edu/sites/default/files/2025-01/PCI-DSS-v4_0_1.pdf
- AICPA SOC 2 Trust Services Criteria overview: https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022

## Issues Found
- The compliance risk list said GDPR, HIPAA, and PCI-DSS "mandate encryption." This was too broad. GDPR requires appropriate measures and lists encryption as an example; HIPAA encryption is addressable; PCI-DSS requires stored PAN to be rendered unreadable, with strong cryptography as one accepted method. Updated the wording and compliance table accordingly.
- The Restic section said only that Restic uses AES-256. Restic specifically uses AES-256 in CTR mode with Poly1305-AES authentication. Updated the claim for precision.
- The Restic key removal example omitted the required key ID argument. Updated `restic key remove` to `restic key remove <key-id>`.
- The AWS S3 SSE-S3 bucket encryption example enabled `BucketKeyEnabled`, but AWS documents S3 Bucket Keys for SSE-KMS. Removed `BucketKeyEnabled` from the SSE-S3 example and left it in the SSE-KMS example.
- The Google Cloud Storage example created a KMS key without first creating the key ring. Added `gcloud kms keyrings create`.
- The Google Cloud Storage example used the older `gsutil kms encryption` command. Updated it to the current documented `gcloud storage buckets update --default-encryption-key=...` command.
- The AWS KMS Python example claimed the first 256 bytes contained the encrypted data key, but the code writes a 4-byte length prefix followed by the encrypted key. Updated the comment to match the actual format.
- The key rotation script used OpenSSL PBKDF2 without the same explicit iteration count used elsewhere in the post. Added `-iter 100000` to both decrypt and encrypt commands for consistency.
- The age description said it was designed to replace GPG. Reworded this to describe age as a simpler alternative for file encryption, which is more accurate.

## Review Notes
- Several command examples are illustrative and still require real credentials, IAM permissions, bucket names, key IDs, and installed CLIs before they can run.
- The OpenSSL AES-256-CBC examples provide confidentiality but not modern authenticated encryption. The post mitigates this by also covering tools that authenticate encrypted backup data, but a future update could prefer authenticated formats for custom encryption workflows.
