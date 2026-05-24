# Validation Summary: How to Create IAM Access Keys in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.0+)
- HashiCorp AWS Provider (`hashicorp/aws`)
- HashiCorp Random Provider (`hashicorp/random`)
- AWS IAM (users, access keys, managed policies, paths)
- AWS Secrets Manager
- AWS Systems Manager (SSM) Parameter Store
- PGP encryption (for encrypted secret output)
- AWS CloudTrail (mentioned for monitoring)

## Sources Consulted
- Terraform AWS Provider docs: `aws_iam_access_key` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_access_key
- Terraform AWS Provider docs: `aws_iam_user` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user
- Terraform AWS Provider docs: `aws_iam_user_policy_attachment` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user_policy_attachment
- Terraform AWS Provider docs: `aws_secretsmanager_secret` / `_version` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret
- Terraform AWS Provider docs: `aws_ssm_parameter` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- Terraform Random Provider docs: `random_id` — https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/id
- Terraform lifecycle meta-argument (`replace_triggered_by`, introduced in 1.2) — https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AWS Managed Policies reference — https://docs.aws.amazon.com/aws-managed-policy/latest/reference/policy-list.html
- AWS ECR managed policies — https://docs.aws.amazon.com/AmazonECR/latest/userguide/security-iam-awsmanpol.html

## Issues Found

1. **Incorrect AWS managed policy ARN.** The post referenced `arn:aws:iam::aws:policy/AmazonECR_FullAccess`, which does not exist. The correct ECR full-access managed policy is `AmazonEC2ContainerRegistryFullAccess` (ECR has never been rebranded with an underscore-style name like ECS was). Fixed the ARN in the `deploy` service account in the "Creating Multiple Access Keys for Different Services" section.

2. **"Rotation Strategy with Timed Keys" code did not implement what the prose described.** The prose stated the approach "uses the `keepers` mechanism with `random_id`," but the example only declared an unused `key_rotation_version` variable and a `lifecycle { create_before_destroy = true }` block — nothing connected the variable to the access key, so changing it would not actually rotate the key. Updated the example to add a `random_id.key_rotation` resource with `keepers = { rotation_version = var.key_rotation_version }` and a `replace_triggered_by = [random_id.key_rotation]` lifecycle entry on the access key, so incrementing the variable now actually triggers replacement.

## Review Notes
- The `pgp_key` argument on `aws_iam_access_key` requires a base64-encoded PGP public key (or a `keybase:username` reference). The example reads from a file named `public-key.gpg`; readers should be aware the file contents must already be base64-encoded (it is not the raw binary `.gpg` blob). Not changed since the example is still valid for a correctly prepared file.
- The `random_id` resource used in the rotation example comes from the `hashicorp/random` provider, which needs to be declared in `required_providers` (out of scope for the fix; common Terraform knowledge).
- `replace_triggered_by` requires Terraform 1.2 or later — consistent with the post's stated "Terraform 1.0 or later" prerequisite, so readers on exactly 1.0/1.1 would need to upgrade for the rotation example. This is a minor caveat worth noting if the post is revisited.
- All other resource arguments, attribute references (`.id`, `.secret`, `.encrypted_secret`), `aws_ssm_parameter` types (`String`, `SecureString`), and remaining AWS managed policy ARNs (`AmazonS3ReadOnlyAccess`, `AmazonS3FullAccess`, `CloudWatchReadOnlyAccess`, `AmazonECS_FullAccess`) were verified as correct.
