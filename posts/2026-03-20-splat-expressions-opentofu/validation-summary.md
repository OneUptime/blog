# Validation Summary: How to Use Splat Expressions in OpenTofu

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTofu
- HCL expressions
- Splat expressions
- `count` and `for_each` meta-arguments
- OpenTofu collection functions
- AWS Terraform/OpenTofu provider resources and data sources

## Sources Consulted
- OpenTofu Splat Expressions: https://opentofu.org/docs/language/expressions/splat/
- OpenTofu For Expressions: https://opentofu.org/docs/language/expressions/for/
- OpenTofu `count` Meta-Argument: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu `for_each` Meta-Argument: https://opentofu.org/docs/language/meta-arguments/for_each/
- OpenTofu `values` Function: https://opentofu.org/docs/language/functions/values/
- OpenTofu `join` Function: https://opentofu.org/docs/language/functions/join/
- OpenTofu `sort` Function: https://opentofu.org/docs/language/functions/sort/
- OpenTofu `length` Function: https://opentofu.org/docs/language/functions/length/
- OpenTofu `toset` Function: https://opentofu.org/docs/language/functions/toset/
- OpenTofu `cidrhost` Function: https://opentofu.org/docs/language/functions/cidrhost/
- HashiCorp AWS Provider `aws_instance` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- HashiCorp AWS Provider `aws_iam_user` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_user.html.markdown
- HashiCorp AWS Provider `aws_eks_cluster` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_cluster.html.markdown
- HashiCorp AWS Provider `aws_subnet` data source documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/subnet.html.markdown
- HashiCorp AWS Provider `aws_lb_target_group_attachment` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb_target_group_attachment.html.markdown
- HashiCorp AWS Provider `aws_security_group_rule` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group_rule.html.markdown

## Issues Found
- The introduction described splat expressions too narrowly as extracting a named attribute from all instances of a resource or list. Updated it to specify count-based resources and list, set, or tuple values, and to mention nested/index access.
- The "Splat vs For Expression" example said splats are for "attribute access only." Updated the comment to "attribute and index access" because modern OpenTofu splats can include index operations to the right of `[*]`.
- The conclusion said modern `[*]` replaces legacy `.*`. Updated this to say `[*]` is preferred over legacy `.*`, because OpenTofu still supports the legacy form for backward compatibility while recommending against it for new configurations.

## Review Notes
The examples are illustrative snippets and depend on surrounding declarations such as provider configuration, variables, subnets, IAM roles, and target groups. The OpenTofu expression syntax and referenced AWS provider attributes were otherwise consistent with the official documentation checked.
