# Validation Summary: How to Configure Terraform Backend with S3 and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Tofu Controller / TF-controller
- Terraform and OpenTofu S3 backend configuration
- AWS S3 versioning and object retrieval
- AWS DynamoDB state locking
- Kubernetes Secrets and runner pod environment variables
- AWS CLI

## Sources Consulted
- Tofu Controller custom backend documentation: https://flux-iac.github.io/tofu-controller/use-tf-controller/with-a-custom-backend/
- Tofu Controller Terraform API reference: https://flux-iac.github.io/tofu-controller/References/terraform/
- Tofu Controller manual approval documentation: https://flux-iac.github.io/tofu-controller/use-tf-controller/plan-and-manually-apply-terraform-resources/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- AWS Prescriptive Guidance for Terraform S3 backends: https://docs.aws.amazon.com/prescriptive-guidance/latest/terraform-aws-provider-best-practices/backend.html
- AWS CLI list-object-versions documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html
- AWS CLI get-object documentation: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/s3api/get-object.html
- Amazon S3 restoring previous versions documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/RestoringPreviousVersions.html
- Terraform AWS provider aws_dynamodb_table documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table

## Issues Found
- `approvePlan: "manual"` was not the documented way to use Tofu Controller's manual approval mode. The official manual approval documentation says to omit the field or keep it blank, so the examples now use `approvePlan: ""`.
- The first backend example combined a non-default Tofu Controller workspace with `workspace_key_prefix`, which would store the state under a workspace-prefixed S3 path rather than the `production/vpc/terraform.tfstate` key shown in the rest of the guide. The workspace-specific fields were removed so the configured backend key matches the documented S3 key layout.
- The rollback step described the AWS CLI download commands as rolling back state. These commands list and retrieve a previous version for inspection; restoring a previous version requires making that version current, such as by copying it over the current object. The section heading and wording were corrected to describe recovery inspection.
- The best-practice note about DynamoDB TTL automatically cleaning up stale Terraform/OpenTofu locks was inaccurate. Terraform/OpenTofu lock records should be force-unlocked only after confirming no active run owns the lock, so the recommendation was corrected.

## Review Notes
- DynamoDB locking is still supported by OpenTofu, but HashiCorp Terraform documentation now marks DynamoDB-based S3 backend locking as deprecated and recommends S3 native locking with `use_lockfile = true`. Future updates could mention that distinction explicitly if the post is intended to cover HashiCorp Terraform as well as OpenTofu.
