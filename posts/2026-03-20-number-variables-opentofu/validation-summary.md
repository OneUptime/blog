# Validation Summary: How to Use Number Variables in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- HCL (HashiCorp Configuration Language)
- AWS provider resources: `aws_instance`, `aws_autoscaling_group`, `aws_db_instance`
- HCL built-in numeric functions: `ceil`, `floor`, `abs`, `min`, `max`, `tostring`, `tonumber`

## Sources Consulted
- OpenTofu types documentation: https://opentofu.org/docs/language/expressions/types/
- OpenTofu input variables documentation: https://opentofu.org/docs/language/values/variables/
- Terraform types documentation: https://developer.hashicorp.com/terraform/language/expressions/types
- go-cty source (used by Terraform/OpenTofu for value internals): https://github.com/zclconf/go-cty/blob/main/cty/value_init.go
- AWS provider docs for `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider docs for `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS RDS storage and backup retention limits: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html

## Issues Found
- **Inaccurate claim about number internals**: The "Integer vs Float" section's comment said `# OpenTofu numbers are always float64 internally`. This is incorrect. OpenTofu (and Terraform) numbers are stored as arbitrary-precision `*big.Float` values via the go-cty library with a 512-bit mantissa — significantly higher precision than float64's 53-bit mantissa. Updated the comment to `# OpenTofu numbers are arbitrary-precision floating-point internally`.

## Review Notes
- The first code block re-declares `variable "instance_count"` twice within the same fenced block. In a real `.tf` file this would be a duplicate-variable error, but the comment headings make it clear these are separate examples illustrating different declaration styles. Not a technical inaccuracy in the prose, but a future stylistic improvement could be to split them into two separate code blocks.
- The "Using Numbers in Configurations" snippet references `var.min_capacity`, `var.max_capacity`, `var.desired_capacity`, and `var.db_password` without declaring them. Acceptable as illustrative excerpts.
- AWS RDS storage validation upper bound of 65536 GB is correct for most engines (MySQL, MariaDB, PostgreSQL); some engines have lower limits, which is fine to omit at the tutorial level.
- Backup retention range of 0–35 days is correct per AWS RDS docs.
- Port validation range 1024–65535 for non-privileged ports is correct.
- All cited HCL functions (`ceil`, `floor`, `abs`, `min`, `max`, `tostring`, `tonumber`) exist and behave as described.
- PostgreSQL engine version `15.4` is a valid RDS-supported version.
