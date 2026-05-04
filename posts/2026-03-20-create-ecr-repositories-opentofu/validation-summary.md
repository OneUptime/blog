# Validation Summary: How to Create AWS ECR Repositories with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible HCL)
- AWS Elastic Container Registry (ECR)
- AWS IAM (repository policies)
- AWS KMS (repository encryption)
- AWS ECS / EKS (image consumers)

## Sources Consulted
- AWS provider `aws_ecr_repository` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository
- AWS provider `aws_ecr_repository_policy` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository_policy
- AWS ECR API reference (action names): https://docs.aws.amazon.com/AmazonECR/latest/APIReference/Welcome.html
- AWS ECR repository policy examples: https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policy-examples.html
- OpenTofu HCL configuration language docs (for_each, jsonencode): https://opentofu.org/docs/language/

## Issues Found
No technical issues found.

- `aws_ecr_repository` arguments (`name`, `image_tag_mutability`, `image_scanning_configuration`, `encryption_configuration`, `tags`) match the current AWS provider schema. Valid values for `image_tag_mutability` are `MUTABLE` and `IMMUTABLE`; `IMMUTABLE` is used correctly.
- `encryption_configuration` correctly uses `encryption_type = "KMS"` together with `kms_key` (ARN).
- `aws_ecr_repository_policy` correctly references the repository by `name` (not ARN) and uses `jsonencode` for the policy document.
- All ECR IAM action names used in the policy (`ecr:BatchCheckLayerAvailability`, `ecr:CompleteLayerUpload`, `ecr:InitiateLayerUpload`, `ecr:PutImage`, `ecr:UploadLayerPart`, `ecr:BatchGetImage`, `ecr:GetDownloadUrlForLayer`) are valid ECR API actions.
- The cross-account principal pattern `arn:aws:iam::<account>:root` is the documented way to delegate to another account (with permissions then enforced by IAM in that account).
- `for_each = toset(local.services)` and `each.key` usage is correct OpenTofu syntax.
- Output attributes `repository_url` and `registry_id` are valid attributes exported by `aws_ecr_repository`.
- HCL `#` line comments inside the `jsonencode({...})` HCL object are stripped before serialization and do not produce invalid JSON.

## Review Notes
- Consumers pulling images via the AWS CLI/Docker also typically need `ecr:GetAuthorizationToken`, but that is an account-level (registry) permission granted via IAM identity policy, not via the repository policy — so its absence here is correct.
- For tighter least-privilege on cross-account access, the staging principal could be narrowed from `:root` to a specific role ARN; the post's example is functionally correct but broader than strictly necessary.
- The post does not discuss ECR lifecycle policies (`aws_ecr_lifecycle_policy`), which are commonly paired with immutable repositories to control image retention. Out of scope for this post but worth noting for readers.
- `image_scanning_configuration { scan_on_push = true }` uses ECR's basic scanning. For enhanced scanning (Inspector-based), users would configure `aws_ecr_registry_scanning_configuration` at the registry level — also out of scope here.
