# Validation Summary: OpenTofu Checks vs. Postconditions: What's the Difference

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider (`aws_lb`)
- HashiCorp HTTP provider (`http` data source)

## Sources Consulted
- OpenTofu custom conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu checks documentation: https://opentofu.org/docs/language/checks/
- AWS provider `aws_lb` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- HashiCorp HTTP provider `http` data source documentation: https://github.com/hashicorp/terraform-provider-http/blob/main/docs/data-sources/http.md

## Issues Found
- The post said `postcondition` blocks run only during `apply` after create/update. I corrected this to match the OpenTofu docs: postconditions are evaluated after an object is evaluated, can fail during `plan` when values are already known, and are deferred to `apply` only when required values are unknown until then.
- The post said postcondition failure "aborts apply." I corrected this to "raises an error and blocks the operation" because failed postconditions can stop either planning or applying, depending on when the condition becomes known.
- The comparison table said postconditions cannot use data sources. I corrected this because postconditions can reference data sources, and data blocks themselves can also contain `postcondition` blocks.
- The post referred to "`tofu plan` in continuous validation mode." I reworded this to continuous validation in TACOS or a cloud backend because OpenTofu documents continuous validation as a backend/platform capability rather than a special `tofu plan` mode.

## Review Notes
- The snippets are illustrative and omit provider configuration and surrounding resource definitions, which is acceptable for this type of comparison post.
- A `check` that depends on values only known after provisioning, such as a new load balancer DNS name, may effectively defer full evaluation until `apply`, which is consistent with the documented behavior.
