# Validation Summary: How to Merge Multiple Maps with Priority in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- OpenTofu built-in functions: `merge`, `lookup`
- Terraform AWS provider (`aws_instance`, `aws_eks_node_group`, `aws_subnet`)
- Module `for_each` patterns
- Conditional/ternary expressions in HCL

## Sources Consulted
- OpenTofu `merge` function documentation: https://opentofu.org/docs/language/functions/merge/
- OpenTofu `lookup` function documentation: https://opentofu.org/docs/language/functions/lookup/
- Terraform `module` block / `for_each` reference: https://developer.hashicorp.com/terraform/language/block/module
- Terraform AWS provider — `aws_eks_node_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group

## Issues Found
No technical issues found.

The core claims about the `merge` function — that it accepts multiple maps and that later arguments override keys from earlier arguments — match the official OpenTofu documentation. The `lookup(map, key, default)` usage, ternary-with-empty-map conditional pattern, and module-level `for_each` are all valid HCL/OpenTofu constructs. The `aws_eks_node_group` attributes actually consumed in the example (`cluster_name`, `node_group_name`, `node_role_arn`, `subnet_ids`, `instance_types`, `capacity_type`, `scaling_config { desired_size / min_size / max_size }`) are all real attributes.

## Review Notes
- The `spot_override` local includes a key `spot_instance_interruption_behavior` and `base_config` includes `root_volume_size`. Neither of these is a direct argument of `aws_eks_node_group` (the resource uses `disk_size` for volume sizing, and spot interruption behavior for managed node groups is not directly configurable on this resource). However, the example only consumes `final_config.instance_type` and `final_config.capacity_type` from the merged map — the other keys are illustrative configuration data demonstrating the merge behavior, not arguments passed to the resource. Since this is a tutorial about `merge`, not about EKS configuration, this is not a technical error, but a future revision could use generic key names (e.g., `note`, `extra`) to avoid implying these keys are EKS-recognized attributes.
- The post does not specify a minimum OpenTofu version. All features used (module `for_each`, `merge`, `lookup`, ternary with maps) are supported in OpenTofu 1.x and Terraform 0.13+.
