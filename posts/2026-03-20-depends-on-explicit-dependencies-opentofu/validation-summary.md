# Validation Summary: How to Use depends_on for Explicit Dependencies in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (depends_on meta-argument)
- HCL (HashiCorp Configuration Language)
- AWS provider resources (aws_instance, aws_subnet, aws_security_group_rule, aws_iam_role_policy_attachment, aws_ecs_service, aws_ecs_cluster, aws_lb_listener, aws_cloudwatch_log_group, aws_iam_instance_profile)
- null provider (null_resource with local-exec provisioner)
- OpenTofu modules

## Sources Consulted
- OpenTofu official documentation: depends_on meta-argument (https://opentofu.org/docs/language/meta-arguments/depends_on/)
- OpenTofu official documentation: module syntax (https://opentofu.org/docs/language/modules/syntax/)
- OpenTofu Registry: null provider / null_resource

## Issues Found
No technical issues found.

All claims and code examples were verified against the official OpenTofu documentation:
- `depends_on` is correctly described as a meta-argument usable on all resource and module blocks.
- The syntax (list of static resource/module references, not strings) shown in the post matches the documented requirement.
- The dependency-inference description (OpenTofu derives ordering from expression references) is accurate.
- Module-level `depends_on` (`depends_on = [module.database]`) is valid and matches official examples.
- The "when NOT to use" guidance (avoid redundancy with attribute references) aligns with official recommendations.
- `null_resource` with the `local-exec` provisioner remains valid.
- The common-use-case scenarios (IAM propagation, certificate/DNS, S3+Lambda, security-group rules, Helm+namespace) are all genuine real-world cases where `depends_on` is appropriate.

## Review Notes
- The official OpenTofu docs explicitly recommend `depends_on` as a "last resort" because it forces conservative plans (more `(known after apply)` values, especially for modules). The post's framing is consistent with this — it tells readers to prefer attribute references — but does not call out the planning impact directly. Worth considering for a future revision.
- `null_resource` still works, but OpenTofu now ships a built-in `terraform_data` managed resource type that serves as a no-provider-dependency replacement for many `null_resource` use cases. This isn't an error in the post (the example is still correct), but a future update could mention `terraform_data` as the modern alternative.
