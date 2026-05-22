# Validation Summary: How to Handle Terraform Timeout Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Terraform CLI
- Terraform AWS provider
- Terraform S3 backend
- AWS RDS, EKS, ElastiCache, CloudFront, Redshift, EMR, and Neptune
- AWS CLI
- Kubernetes provider authentication
- Helm provider and Helm releases
- GitHub Actions
- GitLab CI

## Sources Consulted
- HashiCorp Terraform resource timeout documentation: https://developer.hashicorp.com/terraform/language/resources/configure
- Terraform CLI apply command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform CLI refresh command documentation: https://developer.hashicorp.com/terraform/cli/commands/refresh
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AWS provider configuration documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AWS provider aws_db_instance documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider aws_eks_cluster documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Terraform AWS provider aws_elasticache_replication_group documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform Helm provider documentation: https://registry.terraform.io/providers/hashicorp/helm/latest/docs
- Terraform Helm provider helm_release documentation: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Kubernetes exec authentication documentation: https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The RDS example omitted required authentication configuration. Added `username`, `manage_master_user_password`, and `skip_final_snapshot` so the example is closer to a valid `aws_db_instance` configuration.
- The AWS provider retry example had a "Custom HTTP timeout" comment above `default_tags`, which is not an HTTP timeout setting. Removed the incorrect comment.
- The S3 backend example used `dynamodb_table` and described `skip_metadata_api_check` as a timeout increase. Replaced it with native S3 locking via `use_lockfile = true` and described DynamoDB locking as deprecated.
- The provider timeout section implied the Kubernetes provider snippet increased API timeout. Removed that implication, updated the exec credential API version to `client.authentication.k8s.io/v1`, updated the Helm provider configuration to current object syntax, and added a `helm_release` `timeout` example where timeout is actually configurable.
- The partial-state recovery commands used deprecated `terraform refresh`. Replaced them with `terraform apply -refresh-only`.
- The GitHub Actions example said `timeout-minutes: 120` increased from a default of 360 minutes. Updated the example to use 360 minutes and note that 360 is both the default and maximum.
- The `create_before_destroy` example did not mention unique-name constraints. Added a short caveat to ensure identifiers and names can be unique before enabling it.

## Review Notes
The post uses `-target` as a way to split large applies. This is technically valid, but Terraform's documentation treats resource targeting as an exceptional workflow rather than a routine decomposition strategy. A future editorial pass could add that caveat without changing the structure of this guide.
