# Validation Summary: How to Handle Provider Deprecation in Terraform

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Terraform (core language, CLI)
- Terraform `moved`, `import`, and `removed` blocks
- HashiCorp AWS provider (S3 resources: `aws_s3_bucket`, `aws_s3_bucket_object`, `aws_s3_object`, `aws_s3_bucket_versioning`, `aws_s3_bucket_server_side_encryption_configuration`, `aws_s3_bucket_acl`, `aws_iam_policy_document`)
- AWS provider major version upgrade path (v3 → v5)
- GitHub Actions (`actions/checkout@v4`, `hashicorp/setup-terraform@v3`)
- Bash scripting for CI/CD checks

## Sources Consulted
- Terraform `moved` block reference: https://developer.hashicorp.com/terraform/language/moved
- Terraform refactoring guide (cross-type move rules): https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform `import` block (1.5+) docs: https://developer.hashicorp.com/terraform/language/import
- AWS provider `aws_s3_object` reference: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object
- AWS provider v4 upgrade guide (S3 refactor): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-4-upgrade
- AWS provider `aws_s3_bucket_versioning` and `aws_s3_bucket_server_side_encryption_configuration` reference pages
- HashiCorp `setup-terraform` action repo: https://github.com/hashicorp/setup-terraform
- `actions/checkout` repo: https://github.com/actions/checkout

## Issues Found
1. **Incorrect `moved` block example for cross-resource-type migration.** The post showed a `moved` block migrating from `aws_s3_bucket_object` to `aws_s3_object`. Terraform's `moved` block only supports renames within the same resource type unless the provider explicitly registers a cross-type move (via the plugin framework's `MoveResourceState`). The AWS provider does **not** register such a move for these two resources, so the example would fail with a cross-resource-type error. Replaced the example with the officially recommended migration paths: `terraform state mv` (works because the schemas are compatible), or an `import` block (Terraform 1.5+) after removing the old resource from state. Added a same-type rename example so the `moved` block usage shown is still accurate.
2. **Best Practices line claimed `moved` blocks handle "resource type changes."** This contradicted the corrected guidance above. Rewrote the bullet to clarify that `moved` blocks apply to same-type renames, while cross-type changes need `terraform state mv` or `import` blocks.

## Review Notes
- The remaining technical content is accurate: the inline `versioning` / `server_side_encryption_configuration` / `acl` attributes on `aws_s3_bucket` were indeed deprecated in AWS provider v4 in favor of dedicated resources; the deprecation warning text matches the actual provider output; the `list()` function was deprecated in Terraform 0.12; `terraform plan`, `terraform validate`, and `terraform init -upgrade` flags are correct.
- AWS provider version pins shown (`~> 3.0` → `~> 5.0`) are reasonable as of mid-2026; the post does not pin a specific minor version, which is appropriate for a deprecation guide.
- The GitHub Actions workflow uses current major-version tags (`actions/checkout@v4`, `hashicorp/setup-terraform@v3`).
- Minor stylistic note (not changed): `terraform plan 2>&1 | grep` relies on warnings going to stdout, which is the current Terraform behavior — fine as written.
- The `import` block approach is preferred over `terraform state mv` long-term because it is declarative and replayable in CI; the post now mentions both.
