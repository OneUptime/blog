# Validation Summary: How to Debug Module Reference Errors in OpenTofu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- OpenTofu (Terraform fork)
- HCL (HashiCorp Configuration Language)
- Terraform/OpenTofu modules and outputs
- AWS provider resources (used as illustrative examples: `aws_instance`, `aws_subnet`, `aws_vpc`, `aws_ecs_service`)

## Sources Consulted
- OpenTofu Output Values documentation: https://opentofu.org/docs/language/values/outputs/
- OpenTofu Module Blocks documentation: https://opentofu.org/docs/language/modules/syntax/
- OpenTofu Input Variables documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu issue #3754 (Unsupported attribute wording): https://github.com/opentofu/opentofu/issues/3754
- HashiCorp Discuss: "Unsupported argument... not expected here" thread: https://discuss.hashicorp.com/t/trying-to-use-modules-getting-error-unsupported-argument-an-argument-named-nr-account-id-is-not-expected-here/22857
- OpenTofu source: `internal/configs/module_call.go`

## Issues Found
1. **Incorrect error label "Error: Unexpected value"** in the Common Module Reference Errors section. The actual OpenTofu/Terraform error label for an undeclared argument passed to a module is `Error: Unsupported argument`. Changed `Unexpected value` to `Unsupported argument` to match the real diagnostic output.
2. **Awkward / incorrect phrasing in the first error example**: the original text `module.vpc.subnet_id has no attribute "subnet_id"` is grammatically nonsensical and does not match the canonical HCL diagnostic. Replaced with the standard format that includes a code line snippet and the canonical detail message `This object does not have an attribute named "subnet_id".`

## Review Notes
- The module output reference syntax `module.<module_name>.<output_name>` is verified accurate per OpenTofu Output Values documentation.
- The guidance on nested modules requiring explicit re-export of child outputs through the parent's `outputs.tf` is correct — OpenTofu only exposes direct child outputs to a parent, so `module.parent.module.child.output` is not a valid traversal from outside.
- Fix 1's calling-module example uses argument name `cidr` while Fix 2 uses `vpc_cidr` for the variable in the child module. This is not a technical error since each fix illustrates a different scenario independently, but the variable naming inconsistency across fixes could be slightly confusing to readers. Left unchanged as it is not a correctness issue.
- The `tofu validate` and `tofu plan` commands shown are correct.
