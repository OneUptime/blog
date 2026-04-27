# Validation Summary: How to Pass Providers to Child Modules in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu
- Terraform (HCL)
- AWS provider (`hashicorp/aws`)
- Cloudflare provider (`cloudflare/cloudflare`)
- Module composition / multi-region deployment patterns

## Sources Consulted
- OpenTofu Providers Within Modules: https://opentofu.org/docs/language/modules/develop/providers/
- Terraform Providers Within Modules: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- Terraform `required_providers` reference: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform Registry — `hashicorp/aws`: https://registry.terraform.io/providers/hashicorp/aws/latest
- Terraform Registry — `cloudflare/cloudflare`: https://registry.terraform.io/providers/cloudflare/cloudflare/latest

## Issues Found
No technical issues found.

All core claims verified against the official docs:
- The `providers = { aws = aws.us_east }` map syntax is correct.
- Default (unaliased) providers are implicitly inherited by child modules.
- `required_providers` inside a `terraform {}` block is the correct way for child modules to declare expected providers.
- The "do not configure providers inside child modules" guidance matches the upstream rule that reusable modules must not contain `provider` blocks.
- Source addresses (`hashicorp/aws`, `cloudflare/cloudflare`) are correct.

## Review Notes
- Version constraints `>= 5.0` (AWS) and `>= 4.0` (Cloudflare) are technically valid — they accept newer majors. As of April 2026, AWS provider is at v6.x and Cloudflare at v5.x, so authors writing fresh posts could use `>= 6.0` and `>= 5.0` to better reflect current floors. Not corrected because the existing constraints are not wrong.
- The note "If a module uses provider aliases internally, it must re-export them in its own `providers` argument when calling sub-modules" is accurate in intent but uses non-standard terminology ("re-export"). A more precise framing references `configuration_aliases` in `required_providers`. Left as-is because the statement is not technically incorrect and the post is positioned as a practical introduction rather than a complete alias reference.
- The post does not cover `configuration_aliases` for child modules that themselves need multiple aliased instances of the same provider — out of scope for this introductory guide, but a natural follow-up topic.
