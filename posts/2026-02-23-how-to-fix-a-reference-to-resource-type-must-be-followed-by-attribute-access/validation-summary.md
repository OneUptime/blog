# Validation Summary: How to Fix A Reference to Resource Type Must Be Followed by Attribute Access

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HCL)
- AWS Provider (aws_vpc, aws_subnet, aws_instance)
- Terraform modules
- Terraform data sources
- Terraform meta-arguments (count, for_each, depends_on)

## Sources Consulted
- Terraform References to Resource Attributes: https://developer.hashicorp.com/terraform/language/expressions/references
- Terraform depends_on Meta-Argument: https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on
- Terraform count Meta-Argument: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform for_each Meta-Argument: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform Module Outputs: https://developer.hashicorp.com/terraform/language/values/outputs
- Terraform Data Sources: https://developer.hashicorp.com/terraform/language/data-sources
- Terraform cidrsubnet function: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- AWS VPC resource (Terraform AWS Provider): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc

## Issues Found
No technical issues found. All HCL syntax, resource references, and fixes are correct:
- The reference pattern `<resource_type>.<resource_name>.<attribute>` is accurate
- The `depends_on` example correctly uses `aws_vpc.main` without an attribute (since depends_on takes references, not attribute values)
- Count indexing (`aws_subnet.private[0].id`) and splat (`aws_subnet.private[*].id`) syntax are correct
- For_each key indexing (`aws_subnet.private["a"].id`) is correct
- Data source reference syntax (`data.aws_vpc.existing.id`) is correct
- Module output syntax (`module.vpc.vpc_id`) is correct
- The `cidrsubnet("10.0.0.0/16", 8, count.index)` function call is valid
- AMI ID format `ami-0123456789abcdef0` (17 hex chars) matches the modern AWS AMI ID format
- The "Reference to undeclared resource" error wording for the typo scenario matches Terraform's actual output

## Review Notes
- The author appropriately acknowledges the nuance that `aws_vpc.main` (resource type + name without an attribute) is valid in contexts like `depends_on`, which prevents confusion.
- Scenario 1's framing slightly conflates two distinct errors: writing just `aws_vpc` (no name) triggers the exact error in the title, whereas writing `aws_vpc.main` without a final attribute typically triggers a type-mismatch error in modern Terraform (since `aws_vpc.main` returns the whole resource object). However, the fixes shown are correct in both cases, and this is a minor pedagogical point that does not affect the practical value of the post.
- The for_each example uses `index(["a", "b", "c"], each.key)` to compute the CIDR offset, which works but is somewhat convoluted; a more idiomatic approach would use a map. This is a stylistic note, not a correctness issue.
- All recommended fixes are valid HCL and align with current Terraform documentation (as of Terraform 1.x).
