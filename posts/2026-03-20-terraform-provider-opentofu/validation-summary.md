# Validation Summary: How to Use Terraform Provider with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform-compatible providers
- OpenTofu public provider registry
- OpenTofu S3 backend
- AWS provider configuration
- GitHub Actions

## Sources Consulted
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Provider Registry Protocol: https://opentofu.org/docs/internals/provider-registry-protocol/
- OpenTofu Provider Network Mirror Protocol: https://opentofu.org/docs/internals/provider-network-mirror-protocol/
- OpenTofu CLI Configuration File / Provider Installation: https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu Environment Variables: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu `init` command: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `show` command: https://opentofu.org/docs/cli/commands/show/
- OpenTofu `state show` command: https://opentofu.org/docs/cli/commands/state/show/
- OpenTofu `refresh` command: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu setup action: https://github.com/opentofu/setup-opentofu
- GitHub Actions artifact v3 deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- AWS configure credentials action: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The description and introduction claimed the guide used the provider mirror protocol. The examples actually use normal provider installation from the public OpenTofu Registry, where `hashicorp/aws` resolves to `registry.opentofu.org/hashicorp/aws`. Updated the wording to describe Terraform-compatible providers from the public OpenTofu Registry.
- The GitHub Actions workflow used `opentofu/setup-opentofu@v1`, while the current official setup action documentation uses `@v2`. Updated both setup steps to `opentofu/setup-opentofu@v2`.
- The workflow used `actions/upload-artifact@v3` and `actions/download-artifact@v3`. GitHub deprecated artifact actions v3, and workflows using them fail on GitHub.com after January 30, 2025. Updated both actions to `@v4`.
- The workflow applied a saved plan with `tofu apply -auto-approve tfplan`. OpenTofu treats passing a saved plan file as approval and ignores `-auto-approve` in that mode. Updated the command to `tofu apply tfplan`.
- The state inspection example used `aws_instance.main`, but the post does not define that resource. Replaced it with the generic `<resource_address>` placeholder matching the `tofu state show ADDRESS` syntax.
- The troubleshooting section recommended `tofu refresh`, which OpenTofu documents as deprecated because its default behavior can be unsafe. Replaced it with `tofu plan -refresh-only`.

## Review Notes
- The S3 backend example uses DynamoDB locking. Current OpenTofu documentation says both DynamoDB locking and S3-native lockfiles are supported, with S3-native locking preferred for some cases but DynamoDB not deprecated.
- The example assumes supporting files such as `backend.tfvars`, `production.tfvars`, variable declarations, and real resources exist in the project.
- Local CLI validation was not run because neither `tofu` nor `terraform` is installed in this workspace; command and configuration checks were performed against official documentation.
