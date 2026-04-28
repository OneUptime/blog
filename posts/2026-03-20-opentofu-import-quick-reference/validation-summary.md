# Validation Summary: How to Use the OpenTofu Import Quick Reference

## Status
validated

## Post Type
Quick Reference / Cheat Sheet

## Technologies Covered
- OpenTofu (1.6+ and 1.7+ features)
- HCL (HashiCorp Configuration Language) `import` block
- `tofu` CLI (import, plan, apply commands)
- AWS, Azure, and GCP provider import ID formats

## Sources Consulted
- OpenTofu Import documentation: https://opentofu.org/docs/language/import/
- OpenTofu `tofu import` CLI documentation: https://opentofu.org/docs/cli/commands/import/
- OpenTofu 1.7.0 release announcement (Loopable import blocks): https://opentofu.org/blog/opentofu-1-7-0/
- AWS provider Route53 record resource docs (import ID format)
- General Terraform/OpenTofu provider import ID conventions for AWS, Azure (azurerm), and Google (google) providers

## Issues Found
No technical issues found.

Verified items:
- The `import { id = ..., to = ... }` block syntax is correct.
- `for_each` support on `import` blocks was added in OpenTofu 1.7.0 (announced as "Loopable import blocks") — version claim is accurate.
- `tofu import <ADDRESS> <ID>` CLI syntax is correct, and the `-state=` option is documented as a legacy option for the local backend (so the post's "Legacy" framing is reasonable).
- `tofu plan -generate-config-out=generated.tf` is the correct flag for auto-generating HCL from import blocks.
- Quoting `'aws_s3_bucket.existing["logs"]'` for shell escaping of for_each instances on the CLI is correct.
- AWS resource ID prefixes (`vpc-`, `subnet-`, `sg-`, `igw-`, `rtb-`, `i-`) are correct.
- `aws_ecs_service` import ID format `cluster-name/service-name` is correct.
- `aws_route53_record` import ID format with underscore separators (zone id, record name, type) matches the AWS provider docs.
- Azure (`azurerm_*`) import IDs use the full ARM resource ID, matching the documented formats.
- GCP (`google_*`) import ID formats listed are valid (provider supports both the short `project/name` and the long `projects/.../...` forms).

## Review Notes
- The AWS table is fenced as `javascript`, which is a stylistic mismatch (the Azure and GCP tables use `text`). This is purely cosmetic and not a technical error, so no change was made per the "only fix technical errors" guideline.
- The placeholder convention `zone-id_record-name_record-type` in the Route53 row uses hyphens inside the placeholder words and underscores as field separators. The actual literal separator is `_`; readers should infer that hyphens are part of the placeholder names. Not incorrect, but a future revision could clarify with a concrete example like `Z4KAPRWWNC7JR_dev.example.com_NS`.
- The post correctly notes import blocks are the modern declarative approach. Worth noting (not a fix) that generating configuration via `-generate-config-out` is currently incompatible with `for_each` on import blocks per OpenTofu docs — readers using both features together will need to author HCL manually.
- OpenTofu's import-block + `-generate-config-out` workflow is still marked as potentially subject to change in future releases per the official docs; readers should re-check docs for their specific version.
