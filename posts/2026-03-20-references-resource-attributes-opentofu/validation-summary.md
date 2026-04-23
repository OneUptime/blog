# Validation Summary: How to Use References to Resource Attributes in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider resources and data sources used as examples

## Sources Consulted
- OpenTofu documentation, References to Named Values: https://opentofu.org/docs/language/expressions/references/
- OpenTofu documentation, The `count` Meta-Argument: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu documentation, The `for_each` Meta-Argument: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu documentation, Dynamic Blocks: https://opentofu.org/docs/v1.9/language/expressions/dynamic-blocks/
- OpenTofu documentation, Custom Conditions: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu documentation, Conditional Expressions: https://opentofu.org/docs/language/expressions/conditionals/
- HashiCorp AWS provider docs, `aws_eip`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eip.html.markdown
- HashiCorp AWS provider docs, `aws_security_group` data source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/security_group.html.markdown
- HashiCorp AWS provider docs, `aws_security_group_rule`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group_rule.html.markdown
- HashiCorp AWS provider docs, `aws_eks_cluster`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_cluster.html.markdown

## Issues Found
- The introduction implied that all references listed in the post create implicit dependencies. I changed that wording to match the OpenTofu docs more closely: dependencies are inferred when expressions refer to other objects in the configuration, rather than every `var` or `local` reference creating an inter-resource dependency by itself.
- The post said `self` was available in lifecycle blocks generally. I corrected the section heading, inline comment, and conclusion to reflect the documented OpenTofu behavior: `self` is available in `postcondition` blocks for this use case.
- The nested attribute explanation described the access pattern as dot notation only. I corrected that wording because the example uses both index and attribute access: `certificate_authority[0].data`.

## Review Notes
The AWS provider examples are syntactically valid and align with the provider documentation I checked. The AWS provider documentation now recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` as the current best practice over inline security group rules and `aws_security_group_rule`, but the post’s examples still work as illustrative reference examples, so I limited edits to confirmed accuracy issues.
