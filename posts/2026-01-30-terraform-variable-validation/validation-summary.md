# Validation Summary: How to Create Terraform Variable Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Terraform variable validation blocks
- Terraform `check` blocks (1.5+)
- Built-in functions: `can()`, `regex()`, `cidrhost()`, `alltrue()`, `anytrue()`, `contains()`, `length()`, `startswith()`, `endswith()`, `tonumber()`, `jsondecode()`, `tobool()`, `lower()`, `keys()`
- AWS resource identifiers (VPC, subnet, AMI, S3, RDS, ECS, CloudWatch Logs)
- Kubernetes DNS-1123 label rules
- Semantic versioning

## Sources Consulted
- Terraform docs: Custom Conditions / Variable Validation — https://developer.hashicorp.com/terraform/language/values/variables#custom-validation-rules
- HashiCorp blog: "Terraform 1.9 enhances input variable validations" — https://www.hashicorp.com/en/blog/terraform-1-9-enhances-input-variable-validations
- HashiCorp blog: "Terraform 1.5 brings config-driven import and checks" — https://www.hashicorp.com/en/blog/terraform-1-5-brings-config-driven-import-and-checks
- Terraform function docs: `can()` — https://developer.hashicorp.com/terraform/language/functions/can
- Terraform function docs: `cidrhost()` — https://developer.hashicorp.com/terraform/language/functions/cidrhost
- Terraform function docs: `startswith()` — https://developer.hashicorp.com/terraform/language/functions/startswith
- Terraform function docs: `endswith()` — https://developer.hashicorp.com/terraform/language/functions/endswith
- Terraform function docs: `tobool()` — https://developer.hashicorp.com/terraform/language/functions/tobool
- AWS CloudWatch Logs `PutRetentionPolicy` API — https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutRetentionPolicy.html

## Issues Found

1. **Outdated claim about cross-variable validation.** The original "Conditional Validation Based on Other Variables" section stated "validation blocks cannot directly reference other variables," which has been false since Terraform 1.9 (released June 26, 2024). That release lifted the restriction — validation conditions may now reference other input variables, locals, data sources, and resources as long as values are known at plan time. I rewrote the section to lead with the modern approach (a `validation` block on `kms_key_arn` that references `var.enable_encryption`), keep the `tobool()` locals trick as a labeled legacy workaround for pre-1.9 versions, and clarify that `check` blocks (1.5+) emit warnings rather than block invalid input, which is a meaningful semantic distinction.

2. **Incomplete CloudWatch Logs retention list.** The `log_retention_days` validation in the ECS module example listed 17 retention values but omitted five that AWS's `PutRetentionPolicy` API accepts: 1096, 2192, 2557, 2922, and 3288 days. With the original list, valid 3-, 6-, 7-, 8-, and 9-year retentions would be rejected by the module. I added the missing values so the validation matches the full set documented in the AWS API reference.

## Review Notes
- `startswith()` / `endswith()` were added in Terraform 1.3, well before any version a reader is likely to be running; no version caveat needed in the post.
- The AWS resource ID regexes (`vpc-[a-f0-9]{8,17}`, `subnet-[a-f0-9]{8,17}`, `ami-[a-f0-9]{8,17}`) are slightly permissive — real IDs are exactly 8 or 17 hex characters, not any length in between — but they will correctly accept all valid IDs, so this is fine for a tutorial.
- The S3 bucket name validation covers the main documented rules but does not enforce the newer reserved prefixes (`sthree-`, `amzn-s3-demo-`) or reserved suffixes (`-s3alias`, `--ol-s3`, `.mrap`, `--x-s3`). Not a correctness bug; just incomplete coverage.
- The email and semver regexes are deliberately simplified (full semver allows dot-separated pre-release identifiers and `+build` metadata). Fine for a tutorial context.
- The ECS Fargate memory range (`512`–`30720` MB) is correct for older CPU tiers but newer Fargate configurations support up to 122880 MB. Acceptable for an illustrative module example.
