# Validation Summary: How to Grant Granular Encrypt/Decrypt Permissions on Specific Cloud KMS Keys

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud KMS
- Google Cloud IAM
- Google Cloud CLI (`gcloud`)
- IAM Conditions
- IAM deny policies
- Terraform Google provider
- Cloud Audit Logs / Cloud Logging

## Sources Consulted
- Google Cloud KMS permissions and roles: https://cloud.google.com/kms/docs/reference/permissions-and-roles
- Google Cloud KMS IAM access control: https://cloud.google.com/kms/docs/iam
- Google Cloud SDK `gcloud kms keys add-iam-policy-binding`: https://cloud.google.com/sdk/gcloud/reference/kms/keys/add-iam-policy-binding
- Google Cloud SDK `gcloud kms keyrings add-iam-policy-binding`: https://cloud.google.com/sdk/gcloud/reference/kms/keyrings/add-iam-policy-binding
- Terraform Google provider `google_kms_crypto_key_iam_member`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_crypto_key_iam
- Google Cloud IAM Conditions overview: https://cloud.google.com/iam/docs/conditions-overview
- Google Cloud IAM deny policies overview: https://cloud.google.com/iam/docs/deny-overview
- Google Cloud IAM permissions supported in deny policies: https://cloud.google.com/iam/docs/deny-permissions-support
- Cloud KMS audit logging: https://cloud.google.com/kms/docs/audit-logging
- Google Cloud Data Access audit log configuration: https://cloud.google.com/logging/docs/audit/configure-data-access

## Issues Found
- The post implied IAM policies can be applied at every level in the displayed hierarchy, including key versions. Updated the text to clarify that Cloud KMS IAM is managed at project, key ring, and crypto key levels, not on individual key versions.
- The role table described `roles/cloudkms.admin` as "Full management." Updated this to clarify that the role manages keys and policies but does not grant direct encrypt/decrypt use.
- The admin separation pattern used shortened role names. Updated the text to use full IAM role IDs for consistency and correctness.
- The deny policy example described denying a role and then granting it on specific keys. Updated the text because IAM deny policies deny permissions, not roles, and deny policies override allow policies.
- The audit logging section did not mention that Decrypt calls are Data Access audit logs. Added a note that Data Access logs must be enabled for Cloud KMS to see those events.

## Review Notes
The `gcloud kms` command shapes, IAM Conditions syntax, Terraform KMS IAM member resources, and Cloud Logging filter fields were consistent with official documentation. The local environment did not have `gcloud` installed, so CLI verification was performed against the official Google Cloud SDK reference.
