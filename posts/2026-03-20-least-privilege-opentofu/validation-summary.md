# Validation Summary: How to Implement Least Privilege with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS IAM and Amazon S3
- Azure RBAC, Key Vault, and Blob Storage
- Google Cloud IAM, Secret Manager, and Pub/Sub
- HCL

## Sources Consulted
- OpenTofu input variable validation docs: https://opentofu.org/docs/language/values/variables/
- OpenTofu `can` function docs: https://opentofu.org/docs/language/functions/can/
- OpenTofu `regex` function docs: https://opentofu.org/docs/language/functions/regex/
- AWS S3 IAM action/resource mapping: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html
- AWS S3 policy condition key examples for `s3:prefix`: https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html
- Azure role assignment scope for blob containers: https://learn.microsoft.com/en-us/azure/storage/blobs/assign-azure-role-data-access
- Azure built-in storage roles: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/storage
- Azure Key Vault RBAC guidance: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Google Cloud Secret Manager IAM access control: https://cloud.google.com/secret-manager/docs/access-control
- Google Cloud Pub/Sub IAM access control: https://cloud.google.com/pubsub/docs/access-control
- Google provider docs for Secret Manager IAM members: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_iam
- Google provider docs for Pub/Sub topic IAM members: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_topic_iam
- AzureRM provider docs for storage containers: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container

## Issues Found
- The AWS S3 policy comment claimed the statement was read-only, but the actions included `s3:PutObject` and `s3:DeleteObject`. I corrected the comment to describe scoped object access to the bucket prefix.
- The Azure storage role assignment comment said `Storage Blob Data Reader`, but the code assigned `Storage Blob Data Contributor`. I corrected the comment to match the actual role being granted.
- The OpenTofu variable validation example used `can(regex(...))` with a pattern that would miss standard IAM action strings such as `s3:PutObject`, because those actions are service-prefixed. It also only detected `Resource: "*"` as a scalar string, not wildcard resources inside arrays. I replaced it with a `regexall(...)`-based condition that correctly detects wildcard resources in either string or array form and matches common service-prefixed write actions.

## Review Notes
- The Azure Key Vault `Key Vault Secrets User` role is correct for read access, but it only applies when the vault uses the Azure RBAC permission model rather than legacy access policies.
- The OpenTofu validation example remains a heuristic string check over JSON, not a full semantic IAM policy analysis. For production guardrails, provider-native analyzers such as AWS IAM Access Analyzer, Azure access reviews, and Google Cloud policy analysis remain stronger controls.
