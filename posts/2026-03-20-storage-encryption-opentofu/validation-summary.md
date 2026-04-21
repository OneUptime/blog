# Validation Summary: How to Configure Storage Encryption with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS KMS, S3 SSE-KMS, EBS encryption, RDS PostgreSQL encryption, Performance Insights
- Azure Key Vault and Disk Encryption Sets for managed disk server-side encryption
- Google Cloud KMS, Cloud Storage CMEK, Compute Engine Persistent Disk CMEK

## Sources Consulted
- OpenTofu `jsonencode` function documentation: https://opentofu.org/docs/language/functions/jsonencode/
- OpenTofu provider configuration documentation: https://opentofu.org/docs/language/providers/configuration/
- AWS S3 SSE-KMS and bucket policy documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
- AWS S3 Bucket Keys documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html
- AWS EBS encryption by default documentation: https://docs.aws.amazon.com/ebs/latest/userguide/encryption-by-default.html
- AWS RDS for PostgreSQL release notes: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- AWS RDS for PostgreSQL release calendar: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-release-calendar.html
- HashiCorp AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp AzureRM provider `azurerm_key_vault_key` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_key
- HashiCorp AzureRM provider `azurerm_disk_encryption_set` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/disk_encryption_set
- Microsoft Azure managed disks server-side encryption documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/disk-encryption
- Google Cloud Storage CMEK documentation: https://docs.cloud.google.com/storage/docs/encryption/using-customer-managed-keys
- Google Compute Engine CMEK for disks documentation: https://cloud.google.com/compute/docs/disks/customer-managed-encryption
- HashiCorp Google provider Compute disk encryption key documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_disk

## Issues Found
- The S3 Bucket Key comment claimed a fixed `~99%` KMS cost reduction. Changed it to "up to 99%" to match AWS documentation.
- The S3 bucket policy only checked the SSE algorithm header. Changed it to enforce the expected KMS key ID so uploads cannot use another KMS key while still claiming `aws:kms`.
- The RDS example pinned PostgreSQL `15.4`, which Amazon RDS lists as past standard support. Updated it to PostgreSQL `15.17`, which is listed as available, and added a master username plus AWS-managed master password settings so the `aws_db_instance` example has a valid credential path.
- The Azure section was labeled "Azure Disk Encryption" while the snippet configures managed disk server-side encryption with a Disk Encryption Set. Renamed the section to "Azure Managed Disk Encryption".
- The Azure Key Vault key example created a key with a rotation policy before granting the deploying identity key permissions. Added an access policy and explicit dependency for key creation and rotation policy management.
- The Azure Disk Encryption Set used the versioned Key Vault key ID while also defining rotation. Updated it to use the versionless key ID and enabled automatic key rotation for the Disk Encryption Set.
- The Azure Disk Encryption Set identity had Key Vault key permissions but was missing the Reader role assignment commonly required for using the set with managed disks. Added the role assignment.
- The GCS bucket and Compute disk examples could be created before their service agents had Cloud KMS permissions. Added explicit `depends_on` relationships.
- The GCP disk example referenced a custom KMS service account without granting it KMS access. Updated it to use the default Compute Engine service agent path and granted that service agent `roles/cloudkms.cryptoKeyEncrypterDecrypter`.
- The EBS conclusion said no EC2 volume would ever be created unencrypted. Tightened this to new EBS volumes in the configured Region, matching AWS's region-specific behavior.

## Review Notes
The examples remain focused snippets and still assume surrounding provider configuration, variables, referenced buckets, resource groups, AMIs, and data sources exist elsewhere in the reader's OpenTofu configuration. In a production module, the AWS KMS key policy should also be scoped with service-specific conditions and explicit key users rather than relying on a broad account-root delegation example.
