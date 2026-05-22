# Validation Summary: How to Use OpenTofu with Spacelift

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Spacelift
- Spacelift Terraform provider
- Terraform / HCL
- Rego / Open Policy Agent
- AWS cloud integration
- Azure cloud integration
- VCS integrations
- Drift detection
- Stack dependencies

## Sources Consulted
- Spacelift create stack documentation: https://docs.spacelift.io/getting-started/create-stack
- Spacelift stack documentation: https://docs.spacelift.io/concepts/stack/
- Spacelift stack settings documentation: https://docs.spacelift.io/concepts/stack/stack-settings
- Spacelift drift detection documentation: https://docs.spacelift.io/self-hosted/latest/concepts/stack/drift-detection
- Spacelift push policy documentation: https://docs.spacelift.io/concepts/policy/push-policy
- Spacelift plan policy documentation: https://docs.spacelift.io/concepts/policy/terraform-plan-policy
- Spacelift Terraform provider source documentation for `spacelift_stack`: https://github.com/spacelift-io/terraform-provider-spacelift/blob/main/docs/resources/stack.md
- Spacelift Terraform provider source documentation for cloud integrations, environment variables, mounted files, policies, drift detection, and stack dependencies: https://github.com/spacelift-io/terraform-provider-spacelift/tree/main/docs/resources
- OpenTofu v1.11 documentation: https://opentofu.org/docs/v1.11/
- OpenTofu write-only attributes documentation: https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/
- Spacelift pricing page: https://spacelift.io/pricing

## Issues Found
- The Spacelift UI instructions said to choose OpenTofu under a Backend section. Current Spacelift stack creation documentation places this in the Choose vendor step as the workflow tool, so the wording was corrected.
- The `spacelift_stack` examples used `opentofu_version`, which is not a current provider argument. The examples now use `terraform_workflow_tool = "OPEN_TOFU"` with `terraform_version`.
- The `spacelift_stack` examples used repository values like `my-org/infrastructure`, but the provider schema expects the repository name without the owner part. The examples now use `repository = "infrastructure"`.
- The stack dependency examples omitted the required `branch` argument on `spacelift_stack`. `branch = "main"` was added to both stack resources.
- The push policy used `input.push.affected_files[_] == glob.match(...)`, which compares a filename to a boolean and would not work as intended. The policy now iterates affected files and calls `glob.match` directly with `/` as the delimiter.
- The environment-variable example described `write_only = true` as a sensitive value not visible in the UI. This is true for Spacelift visibility, but the provider documentation notes that secret values should use write-only attributes to avoid storing values in state when supported. The comment was clarified to avoid implying that the value is absent from Terraform state.
- The OpenTofu version in examples was updated from `1.6.2` to `1.11.6` to use a currently supported release line in the reviewed examples.

## Review Notes
Terraform/OpenTofu was not installed in the local environment, so snippet behavior was verified against current Spacelift and OpenTofu documentation rather than local CLI validation. The examples remain illustrative and still require real Spacelift VCS integration, cloud credentials, IAM/Azure permissions, and provider authentication to run successfully.
