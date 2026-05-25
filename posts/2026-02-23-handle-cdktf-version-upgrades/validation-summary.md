# Validation Summary: How to Handle CDKTF Version Upgrades

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- CDK for Terraform (CDKTF)
- Terraform CLI
- npm and npm-check-updates
- Python pip packages
- TypeScript and Jest testing
- GitHub Actions
- AWS provider bindings for CDKTF

## Sources Consulted
- HashiCorp CDK for Terraform documentation: https://developer.hashicorp.com/terraform/cdktf
- HashiCorp CDKTF CLI commands reference: https://developer.hashicorp.com/terraform/cdktf/cli-reference/commands
- HashiCorp CDKTF project setup documentation: https://developer.hashicorp.com/terraform/cdktf/create-and-deploy/project-setup
- HashiCorp CDKTF unit testing documentation: https://developer.hashicorp.com/terraform/cdktf/test/unit-tests
- Terraform CLI commands documentation: https://developer.hashicorp.com/terraform/cli/commands
- npm package metadata for `cdktf`, `cdktf-cli`, and `@cdktf/provider-aws`: https://www.npmjs.com/package/cdktf, https://www.npmjs.com/package/cdktf-cli, https://www.npmjs.com/package/@cdktf/provider-aws
- PyPI package metadata for `cdktf` and `cdktf-cdktf-provider-aws`: https://pypi.org/project/cdktf/, https://pypi.org/project/cdktf-cdktf-provider-aws/
- npm-check-updates CLI help and package documentation: https://github.com/raineorshine/npm-check-updates

## Issues Found
- The post described CDKTF as rapidly evolving toward a future 1.0 release. HashiCorp's current documentation marks CDKTF as deprecated as of December 10, 2025, with v0.21.x as the latest documented line. Updated the introduction and versioning section to reflect that.
- The Python upgrade command used `cdktf-cli-python`, which is not a published PyPI package. Replaced it with `cdktf` and `cdktf-cdktf-provider-aws`, and clarified that the CDKTF CLI is still installed from the npm `cdktf-cli` package.
- The dependency upgrade guidance implied a strict install order. Current package metadata shows provider packages declare peer dependencies on compatible `cdktf` and `constructs` versions, so the text now emphasizes keeping those packages aligned.
- The renamed-class example showed the same import path before and after. Updated it to show a realistic generated-binding to pre-built-binding import change while still advising readers to check the provider changelog.
- The S3 ACL and security group examples referenced variables before assignment in the "after" snippets. Updated the examples to assign `bucket` and `sg` before using their IDs.
- The direct Terraform plan example omitted `terraform init`, which is normally required before planning in a freshly synthesized output directory. Added `terraform init` before `terraform plan`.
- The Jest matcher example used resource type strings with `expect(...).toHaveResource(...)`, but CDKTF's Jest matcher expects a resource constructor. Updated the example to import and pass `S3Bucket` and `Instance` constructors.
- The GitHub Actions dependency check tested whether command output was non-empty, which can create false positives. Updated the workflow to use `npm-check-updates --errorLevel 2`, capture the output, and create an issue only when the check step reports available updates.
- The rollback section implied restoring local Terraform state was always appropriate. Clarified that local state backups and remote backend snapshots/object versions are separate rollback paths.

## Review Notes
The corrected post is technically valid for the current CDKTF documentation, but CDKTF is now deprecated and no longer maintained by HashiCorp. Future updates should avoid presenting CDKTF as a forward-looking choice for new projects without also discussing migration or maintenance risk.
