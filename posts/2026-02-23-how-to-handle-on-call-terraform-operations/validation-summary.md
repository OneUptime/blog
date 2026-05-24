# Validation Summary: How to Handle On-Call Terraform Operations

## Status
validated

## Post Type
Guide / Operational Best Practices

## Technologies Covered
- Terraform (HCL syntax, `-chdir`, `output -raw`, `plan`, `apply`, `force-unlock`)
- AWS IAM (roles, role policies, principal tag conditions, trust policies)
- AWS CLI (DynamoDB scan, ECS waiters, RDS, ELBv2, Route53)
- AWS DynamoDB (Terraform state locking table)
- AWS S3 (Terraform remote state backend)
- AWS ECS (service updates and scaling)
- Bash scripting (`set -euo pipefail`, ANSI color codes)

## Sources Consulted
- Terraform CLI documentation: https://developer.hashicorp.com/terraform/cli (verified `-chdir`, `output -raw`, `apply -target`, `-auto-approve`, `force-unlock`)
- Terraform AWS Provider docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs (verified `aws_iam_role`, `aws_iam_role_policy`)
- AWS IAM Condition Keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html (verified `aws:PrincipalTag/<key>` usage)
- AWS CLI Reference for DynamoDB scan: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/scan.html (verified `--filter-expression`, `--expression-attribute-values`, response `Count` field)
- AWS CLI Reference for ECS wait services-stable: https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html
- Terraform S3 backend / DynamoDB locking docs: https://developer.hashicorp.com/terraform/language/backend/s3 (verified state lock table schema with `Info` attribute)

## Issues Found
No technical issues found. All Terraform commands, AWS CLI commands, IAM policy syntax, HCL resources, and Bash constructs verify against current official documentation.

## Review Notes
- The `terraform -chdir` flag and `terraform output -raw` were introduced in Terraform 0.14; the post implicitly assumes a reasonably modern Terraform version, which is appropriate for 2026.
- The `grep -c "will be created"` approach to counting changes in plan output is functional but brittle; a `terraform show -json oncall.tfplan | jq` approach would be more robust. This is a reasonable simplification for an example script and not a technical error.
- In the bash script, unquoted `$EXTRA_ARGS` is subject to word-splitting; this is intentional here so that multiple plan flags can be passed, but readers should be aware of the implication.
- The Terraform S3 backend has supported native state locking (without a separate DynamoDB table) since Terraform 1.10 / AWS provider improvements; the DynamoDB table pattern shown remains valid and widely deployed, so no change needed.
- The internal cross-link to `/blog/post/2026-02-23-how-to-handle-emergency-terraform-changes/view` is a project-internal reference and was not externally verified.
