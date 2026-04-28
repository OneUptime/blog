# Validation Summary: How to Set Up OpenTofu with Digger for GitOps

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- OpenTofu (v1.6+, examples use 1.7.0)
- HCL (Terraform/OpenTofu configuration language)
- AWS provider for OpenTofu
- AWS S3 + DynamoDB remote state backend
- GitHub Actions (CI/CD)
- `opentofu/setup-opentofu` action
- `aws-actions/configure-aws-credentials` action (OIDC)
- Digger (referenced in title/description, but not actually configured in the post body)

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu setup action: https://github.com/opentofu/setup-opentofu
- OpenTofu backend config (S3): https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu variable validation: https://opentofu.org/docs/language/values/variables/#custom-validation-rules
- OpenTofu `default_tags` (AWS provider): https://registry.terraform.io/providers/hashicorp/aws/latest/docs#default_tags
- GitHub Actions `actions/upload-artifact`: https://github.com/actions/upload-artifact (v3 deprecated 2024-11-30)
- GitHub Actions `actions/download-artifact`: https://github.com/actions/download-artifact
- GitHub Actions `actions/checkout`: https://github.com/actions/checkout
- `aws-actions/configure-aws-credentials`: https://github.com/aws-actions/configure-aws-credentials
- Digger documentation: https://github.com/diggerhq/digger

## Issues Found
- `actions/upload-artifact@v3` was deprecated and stopped working as of 2024-11-30. Updated to `@v4`.
- `actions/download-artifact@v3` was likewise deprecated alongside the upload action. Updated to `@v4`. Note: v4 of upload/download-artifact also has different naming/uniqueness semantics and is not fully backwards-compatible with v3, but for a single named artifact (`tfplan`) used here, the v4 syntax is identical and works correctly.

## Review Notes
- **Title/content mismatch**: The post is titled "How to Set Up OpenTofu with Digger for GitOps" and the description claims it shows how to configure Digger, but the post body does not actually configure or invoke Digger anywhere. The CI workflow uses raw `opentofu/setup-opentofu` plus manual `tofu init/plan/apply` commands rather than Digger's orchestrator (`diggerhq/digger@vLatest`) and a `digger.yml` config. Because the task explicitly forbids adding new sections or restructuring, the body was left as-is, but a future revision should either add a Digger setup section (digger.yml + the Digger Action) or rename the post to remove the Digger reference.
- **Action version**: `opentofu/setup-opentofu@v1` still works but `v2` was released on 2026-03-16 and is now the current major. v1 is not deprecated yet, so this was left unchanged.
- **OpenTofu version pin**: The workflow pins `tofu_version: "1.7.0"` (released 2024-05). As of 2026-04, newer minor releases exist (1.8.x, 1.9.x, etc.). The pinned version still functions; consider pinning to a more recent release in future updates.
- **S3 state locking**: The `dynamodb_table` field on the S3 backend still works but is no longer the recommended approach. Modern OpenTofu (and Terraform 1.10+) supports native S3 lockfile-based locking via `use_lockfile = true`, which removes the DynamoDB dependency. The post's approach is technically correct but not the most current best practice.
- **Plan artifact + remote state caveat**: Saving a plan to an artifact in one job and applying it in another job requires that the OpenTofu binary version, providers, and remote state are identical between the two jobs. The workflow correctly pins `tofu_version` and re-runs `tofu init` in the apply job, so this is handled — worth noting as an implicit requirement for readers.
- **OIDC role assumption**: The use of `id-token: write` permission with `role-to-assume` correctly implies GitHub OIDC federation to AWS (no static AWS keys), which is current best practice.
