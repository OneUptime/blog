# Validation Summary: How to Define Local Values in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS provider resources (aws_vpc, aws_subnet, aws_security_group, aws_s3_bucket, aws_instance) used as illustrative examples

## Sources Consulted
- Terraform Local Values documentation: https://developer.hashicorp.com/terraform/language/values/locals
- Terraform Input Variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform Output Values documentation: https://developer.hashicorp.com/terraform/language/values/outputs
- Terraform Type Constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform `merge` function documentation: https://developer.hashicorp.com/terraform/language/functions/merge
- Terraform Conditional Expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/conditionals

## Issues Found
No technical issues found.

## Review Notes
- The post correctly distinguishes between the `locals` block (plural) for definition and the `local.<name>` reference (singular) — this is a common point of confusion that the post handles well.
- The claim that multiple `locals` blocks are merged across files is accurate per HashiCorp's docs.
- The Locals vs. Variables vs. Outputs comparison table is accurate. Note: input variables do support a `validation` block (covered correctly), and as of Terraform 1.9+ variables also support cross-variable references in validation; locals still do not have their own validation mechanism.
- Minor nuance not worth changing: the "Tuple" example uses `["10.0.1.0/24", "10.0.2.0/24"]`, which is structurally identical to the "List" example above it. In HCL, bracket literals technically produce tuple values that Terraform coerces to a list when the homogeneous element types allow it. The labeling is not incorrect but a heterogeneous example (e.g., `["name", 5, true]`) would more clearly demonstrate the tuple type's distinguishing feature.
- The "Complete Working Example" references `data.aws_ami.amazon_linux.id` without defining the corresponding `data "aws_ami"` block. Since the post's focus is on locals (not a runnable AWS configuration end-to-end), this is acceptable as illustrative code, though pedantically it would not `terraform apply` as-is.
- All HCL syntax (string interpolation, `merge()`, conditional expression `a ? b : c`, type representations) is current and correct.
