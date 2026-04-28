# Validation Summary: How to Follow Naming Conventions for Resources in OpenTofu

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- HCL (HashiCorp Configuration Language)
- AWS (VPC, Subnets, Security Groups, EC2, IAM, S3)
- AWS provider data sources (`aws_availability_zones`, `aws_caller_identity`)

## Sources Consulted
- OpenTofu language documentation: https://opentofu.org/docs/language/
- OpenTofu `substr` function docs: https://opentofu.org/docs/language/functions/substr/
- OpenTofu input variables / validation blocks: https://opentofu.org/docs/language/values/variables/
- OpenTofu locals: https://opentofu.org/docs/language/values/locals/
- AWS S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- AWS IAM identifier limits: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-limits.html
- Terraform AWS provider — `aws_availability_zones` data source
- Terraform AWS provider — `aws_caller_identity` data source

## Issues Found
No technical issues found.

The technical content is accurate:
- `substr(string, offset, length)` with a negative offset is valid OpenTofu/Terraform syntax and counts from the end of the string, so `substr(..., -1, 1)` correctly extracts the last character (e.g., the AZ letter) and `substr(..., -4, 4)` extracts the last 4 characters of an account ID.
- S3 bucket naming guidance ("globally unique, lowercase, no underscores") matches AWS's published S3 bucket naming rules.
- The recommendation to use snake_case for resource block identifiers aligns with the de facto Terraform/OpenTofu style convention; HCL identifiers do allow letters, digits, underscores, and hyphens, so the style note (avoid CamelCase like `EC2Instance`) is presented correctly as a convention.
- The `validation` block syntax for variables (`condition` + `error_message`) is correct.
- The `locals`, `tags`, and `count`-based subnet patterns are syntactically valid and follow common OpenTofu idioms.
- Data sources `aws_availability_zones` and `aws_caller_identity` and the attributes used (`names`, `account_id`) are correct.

## Review Notes
- In the IAM section, the `aws_iam_instance_profile.ec2_app` example references `aws_iam_role.ec2_app.name`, but only `aws_iam_role.eks_node` is declared in the snippet. This is fine in the context of standalone illustrative snippets, but a future revision could either declare the corresponding `aws_iam_role.ec2_app` resource or rename the reference for consistency.
- IAM role names have a maximum length of 64 characters; long combinations of `{company}-{project}-{environment}-{service}-{purpose}-role` could exceed this in practice. A future revision could add a brief note about IAM length limits.
- The `s3_read` policy resource sets a `name` but does not show a `policy` argument; readers should remember the `policy` (JSON) attribute is required when actually applying. This is acceptable for a naming-focused snippet.
