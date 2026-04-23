# Validation Summary: How to Reference each.key and each.value in for_each in OpenTofu

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- OpenTofu
- HCL
- Terraform-style `for_each` and `dynamic` block syntax as implemented by OpenTofu
- AWS provider resource examples

## Sources Consulted
- OpenTofu documentation, The `for_each` Meta-Argument: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu documentation, Dynamic Blocks: https://opentofu.org/docs/v1.9/language/expressions/dynamic-blocks/
- OpenTofu documentation, References to Named Values: https://opentofu.org/docs/language/expressions/references/
- OpenTofu documentation, `flatten` function: https://opentofu.org/docs/language/functions/flatten/
- HashiCorp AWS provider docs, `aws_security_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group.html.markdown
- HashiCorp AWS provider docs, `aws_lb_target_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb_target_group.html.markdown
- HashiCorp AWS provider docs, `aws_lb_listener_rule`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb_listener_rule.html.markdown
- HashiCorp AWS provider docs, `aws_s3_bucket`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket.html.markdown
- HashiCorp AWS provider docs, `aws_s3_bucket_lifecycle_configuration`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_lifecycle_configuration.html.markdown
- HashiCorp AWS provider docs, `aws_caller_identity`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/caller_identity.html.markdown
- HashiCorp AWS provider docs, `aws_eks_node_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_node_group.html.markdown

## Issues Found
No technical issues found.

## Review Notes
- The core OpenTofu claims are accurate: resource/module `for_each` accepts a map or set of strings; `each.key` is the instance key; `each.value` is the instance value; and `resource_name[key]` is the correct way to reference a specific `for_each` instance.
- The nested `dynamic "ingress"` example is consistent with the OpenTofu `dynamic` block model: the inner iterator is `ingress`, while the outer resource-level `each` object remains available for expressions in the same resource body.
- The `flatten` plus `for` expression pattern used to derive `local.node_groups` is a standard documented approach for transforming nested structures into a map suitable for `for_each`.
- The AWS examples are syntactically valid against the current provider docs I checked. The AWS provider now recommends dedicated `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources as the current best practice over inline `ingress`/`egress` blocks on `aws_security_group`, but the inline example in the post is still valid for demonstrating `each.key` and `each.value`.
- `tofu` and `terraform` CLIs were not installed in the local review environment, so validation was performed against official documentation rather than local command output.
