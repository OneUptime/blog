# Validation Summary: How to Create Terraform Naming Conventions for Organizations

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- Terraform / HCL
- AWS (EC2, VPC, S3, RDS, IAM, CloudWatch)
- TFLint (terraform_naming_convention rule)
- GitHub Actions

## Sources Consulted
- Terraform Language documentation: https://developer.hashicorp.com/terraform/language
- TFLint terraform_naming_convention rule: https://github.com/terraform-linters/tflint-ruleset-terraform/blob/main/docs/rules/terraform_naming_convention.md
- AWS S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- AWS IAM identifiers and quotas: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html
- AWS RDS DB instance identifier constraints: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html
- AWS CloudWatch Logs naming: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Working-with-log-groups-and-streams.html
- Terraform AWS provider resource docs (aws_instance, aws_vpc, aws_subnet, aws_db_instance, aws_s3_bucket, aws_iam_role, aws_cloudwatch_log_group)
- GitHub Actions: actions/checkout (v4), terraform-linters/setup-tflint (v4)

## Issues Found
No technical issues found.

The post's technical content is accurate:
- HCL syntax in all resource, variable, output, locals, and module blocks is valid.
- AWS resource naming constraints stated are correct: S3 buckets (globally unique, lowercase, no underscores, 3–63 chars), IAM role names (max 64 chars), RDS identifiers (lowercase, hyphens only, max 63 chars), CloudWatch log groups (forward slashes allowed).
- The TFLint `terraform_naming_convention` rule does support the sub-blocks shown (module, resource, data, output, variable, locals) with a `format` attribute that accepts `snake_case`.
- GitHub Action versions referenced (`actions/checkout@v4`, `terraform-linters/setup-tflint@v4`) are current and exist.
- Terraform AWS provider attributes used (`aws_db_instance.identifier`, `aws_s3_bucket.bucket`, `aws_iam_role.name`, `aws_cloudwatch_log_group.name`, `tags = { Name = ... }`) are all correct.

## Review Notes
- The shell snippet's regex check (`grep -qP 'Name\s*=.*\$\{(local\.name_prefix|var\.environment)'`) is a heuristic guardrail and will flag any `Name` tag that doesn't reference those specific variables — teams adopting it should refine the pattern to their convention.
- RDS identifier constraints additionally require the identifier to begin with a letter and disallow trailing hyphens or two consecutive hyphens; the post correctly states the most common pitfalls (lowercase, hyphens only, length) without going into every edge case.
- The TFLint rule also supports a top-level `format` attribute as a default; the post chooses to specify per-block formats which is equally valid.
