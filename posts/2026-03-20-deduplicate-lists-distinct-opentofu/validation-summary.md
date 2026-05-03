# Validation Summary: How to Deduplicate Lists with distinct in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (and Terraform-compatible HCL)
- HCL `distinct` built-in function
- HCL `concat`, `toset`, `flatten` built-in functions
- HCL `for_each` meta-argument
- AWS provider resources: `aws_instance`, `aws_s3_bucket`
- AWS provider data sources: `aws_subnets`

## Sources Consulted
- OpenTofu `distinct` function documentation: https://opentofu.org/docs/language/functions/distinct/
- OpenTofu `concat` function documentation: https://opentofu.org/docs/language/functions/concat/
- OpenTofu `toset` function documentation: https://opentofu.org/docs/language/functions/toset/
- OpenTofu `for_each` meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/for_each/
- Terraform AWS provider `aws_subnets` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- Terraform AWS provider `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS EC2 DescribeSubnets API filter reference: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeSubnets.html

## Issues Found
- **`aws_subnets` data source filter name**: The post used `availabilityZone` (camelCase) as the filter name, but EC2 API filters (which the `aws_subnets` data source passes through) use dash-separated names. Changed to `availability-zone` so the filter actually works against the EC2 API. Affected both `data "aws_subnets" "private_a"` and `data "aws_subnets" "private_b"` blocks.

## Review Notes
- The `distinct` function behavior described (removes duplicates while preserving the order of the first occurrence) matches the official OpenTofu documentation.
- All function results shown in the comments (e.g., `["us-east-1a", "us-east-1b", "us-east-1c"]`, `["Environment", "Project", "Owner", "CostCenter", "Tier"]`) are correct.
- The `for_each` example uses `toset(distinct(...))`. This is functionally equivalent to just `toset(...)` since `toset` already deduplicates. The author acknowledges this with the phrase "Use `toset` or `distinct` + `toset`", so the example is technically valid even though slightly redundant.
- The example AMI `ami-0c55b159cbfafe1f0` is a placeholder; in real configurations users should look up a current AMI ID, but this is acceptable for a tutorial.
- The AWS resource and data source argument names (`vpc_security_group_ids`, `bucket`, `tags`, `filter` blocks) are all valid for the current AWS provider.
