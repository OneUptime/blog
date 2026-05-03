# Validation Summary: How to Define Local Values in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible Infrastructure as Code tool)
- HCL (HashiCorp Configuration Language)
- AWS resources (VPC, Subnet, RDS, ECS, ALB, S3) used as examples
- OpenTofu built-in functions (`cidrsubnet`, `merge`, `length`, `range`)
- `random_id` resource (from the random provider)

## Sources Consulted
- OpenTofu Local Values documentation: https://opentofu.org/docs/language/values/locals/
- OpenTofu Built-in Functions documentation: https://opentofu.org/docs/language/functions/
- OpenTofu `cidrsubnet` function: https://opentofu.org/docs/language/functions/cidrsubnet/
- OpenTofu `merge` function: https://opentofu.org/docs/language/functions/merge/
- OpenTofu `range` function: https://opentofu.org/docs/language/functions/range/
- OpenTofu Expressions / for expressions: https://opentofu.org/docs/language/expressions/for/
- OpenTofu Conditional Expressions: https://opentofu.org/docs/language/expressions/conditionals/
- HashiCorp Random provider `random_id` resource: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/id

## Issues Found
No technical issues found.

All code examples use correct HCL syntax and OpenTofu features:
- `locals { ... }` block declaration is correct.
- References use the singular form `local.<name>` (not `locals.<name>`), which is the correct syntax.
- String interpolation `"${var.x}-${var.y}"` is valid.
- Ternary conditionals (including nested) are valid HCL.
- `for` expressions over `range(N)` are syntactically correct.
- `cidrsubnet("10.0.0.0/16", 8, i)` for i in 0..2 correctly yields `10.0.0.0/24`, `10.0.1.0/24`, `10.0.2.0/24`; with offset `i + 10` it yields `10.0.10.0/24`, `10.0.11.0/24`, `10.0.12.0/24`. The comments in the post match the actual function output.
- `merge()`, `length()`, and `range()` are real OpenTofu built-in functions used correctly.
- AWS instance types (`t3.micro`, `t3.small`, `t3.large`) and RDS instance classes (`db.r5.large`, `db.t3.micro`) are valid identifiers.
- The claim that local values are computed once and referenced by name is accurate per OpenTofu semantics.

## Review Notes
- In the "Referencing Local Values" section, the `aws_subnet.public` resource uses `length(var.public_subnet_cidrs)` while the earlier "Computed CIDR Blocks" section defines `public_subnet_cidrs` as a `local`. Since the two code blocks are presented as independent examples (and no variable declaration block is shown for it), this is not technically wrong, but a future revision could make naming consistent (e.g., use `local.public_subnet_cidrs`) for clarity.
- The "Resource Naming" subsection heading is rendered as plain text (no `###` prefix) while the other subsections under "Common Patterns" use `###`. This is a formatting/style inconsistency, not a technical error, and was left unchanged per the review scope.
- `random_id.suffix.hex` assumes a `random_id` resource named `suffix` is declared elsewhere; this is a common, idiomatic pattern and is implied rather than spelled out.
