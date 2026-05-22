# Validation Summary: How to Use the concat Function to Merge Lists in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform collection functions
- Terraform type constraints
- AWS resource configuration examples

## Sources Consulted
- Terraform `concat` function documentation: https://developer.hashicorp.com/terraform/language/functions/concat
- Terraform `flatten` function documentation: https://developer.hashicorp.com/terraform/language/functions/flatten
- Terraform function call syntax and argument expansion documentation: https://developer.hashicorp.com/terraform/language/expressions/function-calls
- Terraform type constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform types and values documentation: https://developer.hashicorp.com/terraform/language/expressions/types

## Issues Found
- The console example claimed `concat(["only-list"])` works and returns the same list. The official `concat` documentation says `concat` takes two or more lists, so the example was changed to `concat(["only-list"], [])`.
- The mixed-types section claimed all lists passed to `concat` must contain the same type and that `concat(["hello"], [42])` would fail. Terraform's official `concat` example shows mixed element types are accepted, so the section was corrected to explain that mixed types can be concatenated, while conversion may still be useful when the final value must satisfy a specific type constraint.
- The ECS example described concatenated ID references as a "`depends_on` equivalent." Terraform resource references create implicit dependencies, but this is not the same as an explicit `depends_on` meta-argument. The wording was corrected to describe implicit dependencies through normal resource references.
- The summary repeated the inaccurate same-type requirement. It was updated to emphasize the actual `concat` constraints: top-level concatenation, at least two list arguments, and valid empty-list arguments.

## Review Notes
Terraform CLI was not installed in the workspace, so examples were reviewed statically against the official Terraform documentation rather than executed locally.
