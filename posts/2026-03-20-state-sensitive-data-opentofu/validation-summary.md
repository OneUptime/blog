# Validation Summary: How to Handle State File Sensitive Data Exposure in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform/OpenTofu state files
- OpenTofu state and plan encryption
- OpenTofu sensitive variables and ephemeral values
- AWS RDS
- AWS Secrets Manager
- Amazon S3 state backends
- AWS IAM bucket policies
- AWS CloudTrail S3 data events
- Terraform AWS provider resources

## Sources Consulted
- OpenTofu Sensitive Data in State: https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu State and Plan Encryption: https://opentofu.org/docs/v1.11/language/state/encryption/
- OpenTofu Input Variables, including `sensitive`: https://opentofu.org/docs/language/values/variables/
- OpenTofu Ephemerality: https://opentofu.org/docs/v1.11/language/ephemerality/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- Terraform AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_secretsmanager_secret_version` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- Terraform AWS provider `aws_cloudtrail` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- Terraform AWS provider `aws_s3_bucket_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_policy
- Amazon RDS password management with AWS Secrets Manager: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html
- AWS Prescriptive Guidance on protecting sensitive data in Terraform state: https://docs.aws.amazon.com/prescriptive-guidance/latest/secure-sensitive-data-secrets-manager-terraform/terraform-state-file.html
- GitHub author profile: https://github.com/nawazdhandala

## Issues Found
- The introduction said state contains the full configuration. OpenTofu documents state as containing resource IDs and resource attributes, so that wording was corrected.
- The JSON state example described an RDS instance but used `aws_rds_cluster` and `master_password`/`master_username`. It was changed to `aws_db_instance` with `password` and `username` to match the surrounding example and AWS provider attribute names.
- The PBKDF2 state encryption example omitted the documented 16-character minimum for the passphrase and did not mention the required `unencrypted` fallback migration path for an existing unencrypted state file. A variable validation block and migration note were added.
- The sensitive variable comment claimed `sensitive = true` prevents values from appearing in logs. OpenTofu only guarantees redaction in normal plan/apply output, while providers can still receive and potentially disclose values. The comment and note were updated.
- The `aws_db_instance` examples omitted required fields such as `allocated_storage` and `username`. The examples were updated with the minimum required arguments relevant to the snippet.
- The external secret management example created `random_password` and `aws_secretsmanager_secret_version.secret_string`, which still store the secret value in state. It was replaced with an RDS `manage_master_user_password = true` example so RDS generates and stores the password in Secrets Manager without OpenTofu receiving the secret value.
- The S3 bucket policy statement named `DenyPublicAccess` only denied non-TLS access. The SID was renamed to `DenyInsecureTransport`.
- The S3 backend policy allowed only object `GetObject` and `PutObject` actions. OpenTofu's S3 backend documentation includes bucket-level `s3:ListBucket` and object-level permissions, so the example now grants `ListBucket` on the bucket and `GetObject`, `PutObject`, and `DeleteObject` on state objects to the listed roles.

## Review Notes
- The native OpenTofu encryption block syntax using `terraform { encryption { ... } }`, `key_provider "pbkdf2"`, and `method "aes_gcm"` is valid for current OpenTofu.
- The CloudTrail `event_selector` example for S3 object data events, including the trailing slash on the bucket ARN, matches the Terraform AWS provider documentation. A real deployment also needs the CloudTrail log bucket and its bucket policy configured so CloudTrail can write logs.
- The post is validated after the corrections above.
