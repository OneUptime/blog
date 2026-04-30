# Validation Summary: How to Handle Provider API Errors in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- HCL provider and resource configuration
- AWS provider
- AzureRM provider
- AWS CLI
- Azure CLI
- Google Cloud CLI (`gcloud`)

## Sources Consulted
- OpenTofu debugging docs: https://opentofu.org/docs/internals/debugging/
- OpenTofu environment variables: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu import docs: https://opentofu.org/docs/cli/import/
- OpenTofu import usage docs: https://opentofu.org/docs/cli/import/usage/
- OpenTofu lifecycle meta-argument docs: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- OpenTofu state docs: https://opentofu.org/docs/cli/state/
- OpenTofu `untaint` command docs: https://opentofu.org/docs/cli/commands/untaint/
- AWS provider docs source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/index.html.markdown
- AzureRM provider docs source: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/index.html.markdown
- AWS CLI `sts get-caller-identity`: https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html
- Azure CLI `az account show`: https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-show
- Google Cloud CLI `gcloud auth application-default print-access-token`: https://cloud.google.com/sdk/gcloud/reference/auth/application-default/print-access-token

## Issues Found
- The logging section described `TF_LOG_PROVIDER` as if it logged only the AWS provider. OpenTofu's official debugging docs say `TF_LOG_PROVIDER` enables provider plugin logs generally, not a single named provider. I corrected the wording.
- The Azure rate-limit section used outdated or unsupported guidance. Current AzureRM provider docs document `resource_provider_registrations` for automatic resource-provider registration behavior, and I found no current official documentation for `ARM_CLIENT_RETRY_MAX`. I replaced that example with the current `resource_provider_registrations = "none"` setting and clarified that it reduces extra initialization API calls rather than acting as a general retry knob.
- The authentication command comments for Azure and GCP were too broad. `az account show` verifies Azure CLI authentication, while `gcloud auth application-default print-access-token` verifies Application Default Credentials. I updated the comments to match the official command semantics.
- The `-target` section presented targeted applies too casually. OpenTofu's `plan` docs explicitly describe targeting as something for exceptional circumstances rather than routine operations. I added that caveat while preserving the recovery workflow.
- The import section omitted a required prerequisite from the OpenTofu import docs: a matching `resource` block must exist before running `tofu import`. I added that note.
- The partial-failure section made an absolute claim about state after a failed apply. I softened it to "typically reflects" to better match OpenTofu's documented state-update and taint behavior during error cases.

## Review Notes
- The post is technically sound after the corrections above.
- `tofu import` remains valid, but current OpenTofu docs also support `import` blocks, which are often easier to review in normal `plan`/`apply` workflows. The post does not need this to be correct, but a future revision could mention it.
- The AzureRM provider's default `resource_provider_registrations` behavior differs across major versions. The post does not pin a provider version, so future revisions could add a version note if the blog wants stricter version-specific guidance.
- The `aws_ecs_service` `ignore_changes` example is a partial illustrative snippet for the lifecycle behavior, not a complete standalone ECS service configuration.
