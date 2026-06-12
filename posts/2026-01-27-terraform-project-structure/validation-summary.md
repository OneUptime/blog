# Validation Summary: How to Structure Terraform Projects for Large Teams

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- HashiCorp Configuration Language (HCL)
- AWS Provider (~> 5.0): VPC, Subnets, Internet Gateway, NAT Gateway, EIP, S3, KMS, DynamoDB, EC2, RDS, EKS
- Terraform Remote State (S3 backend with DynamoDB locking)
- GitHub Actions (workflows, matrix strategy, OIDC authentication)
- Security scanning tools: tfsec (Aqua Security), Checkov (Bridgecrew/Prisma Cloud)
- OneUptime Terraform Provider
- Mermaid diagrams (graph, flowchart, gitGraph)
- GitHub CODEOWNERS

## Sources Consulted
- Terraform AWS Provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS Provider `aws_eip` resource (domain argument replaced `vpc` in 5.x): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- AWS Provider `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS Provider `aws_s3_bucket_server_side_encryption_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- AWS Provider `aws_dynamodb_table` (point_in_time_recovery block): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Terraform variable validation: https://developer.hashicorp.com/terraform/language/values/variables#custom-validation-rules
- Terraform `cidrsubnet` function: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform S3 backend: https://developer.hashicorp.com/terraform/language/settings/backends/s3
- Terraform `terraform_remote_state` data source: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform workspaces: https://developer.hashicorp.com/terraform/cli/workspaces
- HashiCorp setup-terraform action (v3): https://github.com/hashicorp/setup-terraform
- aws-actions/configure-aws-credentials@v4: https://github.com/aws-actions/configure-aws-credentials
- actions/checkout@v4, actions/github-script@v7: https://github.com/actions/checkout, https://github.com/actions/github-script
- aquasecurity/tfsec-action: https://github.com/aquasecurity/tfsec-action
- bridgecrewio/checkov-action: https://github.com/bridgecrewio/checkov-action
- GitHub CODEOWNERS syntax: https://docs.github.com/en/repositories/managing-your-repositories-settings-and-features/customizing-your-repository/about-code-owners
- Mermaid gitGraph diagrams: https://mermaid.js.org/syntax/gitgraph.html

## Issues Found

1. **Incorrect AWS resource name** (`aws_rds_instance`):
   - The anti-pattern code example referenced `resource "aws_rds_instance" "db"`, which is not a valid AWS provider resource type. The Terraform AWS provider exposes `aws_db_instance` for standalone RDS instances (and `aws_rds_cluster` for Aurora clusters). Even in an illustrative anti-pattern, using a non-existent resource is misleading.
   - **Fix:** Replaced `aws_rds_instance` with `aws_db_instance`.

2. **Malformed JavaScript template literal in GitHub Actions workflow:**
   - In the `Post Plan to PR` step, the `body` field used unescaped triple backticks inside a JavaScript template literal: `` `### Terraform Plan - ... \n\n```hcl\n${truncatedPlan}\n```` ``. JavaScript would treat the first inner backtick as the end of the template literal, producing a syntax error.
   - **Fix:** Escaped the inner backticks with `\`\`\`` so the template literal is well-formed and renders the markdown code fence in the PR comment as intended.

## Review Notes

- The `aws_eip` resource uses `domain = "vpc"`, which is correct for AWS provider 5.x (the legacy `vpc = true` argument has been deprecated/removed).
- The `point_in_time_recovery` nested block on `aws_dynamodb_table` is still valid in current AWS provider versions; newer releases also accept a top-level `point_in_time_recovery_enabled` attribute, but the block form used here continues to work.
- The dev environment sets `enable_nat_gateway = false` with a comment mentioning "NAT instance" — the module shown does not actually create a NAT instance, so private subnets would lack outbound internet unless one is added separately. This is a minor documentation imprecision in a comment, not a Terraform correctness issue, and was left as-is to preserve the author's voice.
- The tfsec project has been integrated into Trivy (Aqua Security), but `aquasecurity/tfsec-action@v1.0.0` still exists and runs; readers building new pipelines may prefer migrating to `aquasecurity/trivy-action` going forward.
- The `bridgecrewio/checkov-action@v12` pinning is valid at the time of review.
- The post's overall architecture guidance (module organization, per-environment state files, S3+DynamoDB backend, OIDC-based GitHub Actions auth, CODEOWNERS, workspaces vs directories trade-off) aligns with HashiCorp's recommended practices.
