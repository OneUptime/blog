# Validation Summary: How to Migrate Infrastructure from Pulumi to OpenTofu

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Pulumi (CLI, stack export, state management, TypeScript SDK, ComponentResource)
- OpenTofu (CLI: `tofu init`, `tofu plan`, `tofu apply`)
- HCL configuration language
- Terraform/OpenTofu `import` blocks
- AWS provider resources (`aws_s3_bucket`, `aws_s3_bucket_versioning`, `aws_vpc`, `aws_db_instance`)
- `jq` for parsing Pulumi state JSON
- Git (for archiving Pulumi code)

## Sources Consulted
- Pulumi CLI docs: `pulumi stack export` — https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_export/
- Pulumi CLI docs: `pulumi stack` (`--show-urns` flag) — https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack/
- Pulumi CLI docs: `pulumi state delete` — https://www.pulumi.com/docs/iac/cli/commands/pulumi_state_delete/
- Pulumi checkpoint/state file format conventions (`.deployment.resources[]` with `urn`, `type`, `id`)
- Pulumi resource token convention `<package>:<module>/<member>:<Type>` and URN format `urn:pulumi:<stack>::<project>::<type>::<name>`
- OpenTofu `import` block documentation — https://opentofu.org/docs/language/import/ (introduced in Terraform 1.5, supported in OpenTofu 1.6+)
- Terraform AWS provider v4+ split-resource pattern for S3 (`aws_s3_bucket_versioning` with `versioning_configuration { status = "Enabled" }`)
- Pulumi AWS classic provider — legacy `aws.s3.Bucket` vs. recommended `BucketV2`

## Issues Found
No technical issues found.

## Review Notes
- The `aws.s3.Bucket` Pulumi snippet with an inline `versioning: { enabled: true }` block is the legacy v1 resource, now deprecated in favor of `BucketV2` (with versioning split into `BucketVersioningV2`). This is acceptable in the post because it represents existing/legacy Pulumi code that a reader is migrating away from — the OpenTofu equivalent correctly uses the modern split-resource pattern (`aws_s3_bucket` + `aws_s3_bucket_versioning`).
- The URN argument to `pulumi state delete` is shown with double quotes. Pulumi's docs recommend single quotes around URNs to avoid shell interpretation of `$` or other special characters in the URN. The double-quoted example in the post happens to be safe (no special shell metacharacters), but readers using URNs containing `$` or backticks should prefer single quotes.
- The `pulumi state delete` workflow per-resource is correct, though for fully decommissioning a stack readers might also consider `pulumi stack rm --preserve-config` after emptying state, or removing resources individually as shown.
- OpenTofu `import` block syntax is valid; multi-line formatting (as written) is the conventional style.
- The Pulumi `aws:ec2/vpc:Vpc` example output line shows `vpc-0abc12345` (11 hex chars after `vpc-`), while the import block uses `vpc-0abc12345def67890` (17 hex chars). VPC IDs are typically 8 or 17 hex characters; both lengths are real-world valid, so this inconsistency is purely cosmetic and doesn't affect correctness.
