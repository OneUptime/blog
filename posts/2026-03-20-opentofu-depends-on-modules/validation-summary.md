# Validation Summary: How to Use depends_on with Modules in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- HCL (HashiCorp Configuration Language)
- AWS provider resources (IAM, ECS, RDS, VPC)
- Kubernetes / cert-manager

## Sources Consulted
- OpenTofu documentation on module meta-arguments: https://opentofu.org/docs/language/meta-arguments/depends_on/
- OpenTofu module configuration reference: https://opentofu.org/docs/language/modules/syntax/
- Terraform/OpenTofu module `depends_on` (introduced in Terraform 0.13, supported in OpenTofu)
- AWS provider documentation for `aws_iam_role`, `aws_iam_role_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
No technical issues found.

The post accurately describes:
- The syntax for using `depends_on` on module blocks (valid since module-level `depends_on` was introduced in Terraform 0.13 / supported by OpenTofu).
- The list of valid use cases (IAM propagation, prerequisite ordering, indirect dependencies).
- AWS resources `aws_iam_role` and `aws_iam_role_policy_attachment` with correct attributes (`name`, `assume_role_policy`, `role`, `policy_arn`).
- The `jsonencode` block for the assume role policy with correct IAM policy structure (`Version`, `Statement`, `Effect`, `Principal`, `Action`).
- The trade-offs: that module-level `depends_on` creates a dependency on the entire module and can reduce plan parallelism — which matches official guidance.
- The recommendation to prefer implicit dependencies via attribute references when possible.

## Review Notes
- The two example `module "app"` blocks at the end of the post share the same label, but they are clearly presented as alternative illustrations (preferred vs. explicit), not to be used together. This is a common documentation pattern and not a technical error.
- The "preferred" example omits the `source` argument; this is acceptable since the snippet is illustrative and focuses on highlighting the dependency mechanism rather than being a complete runnable configuration.
- No version-specific caveats: module-level `depends_on` has been stable for many years and is fully supported in current OpenTofu.
