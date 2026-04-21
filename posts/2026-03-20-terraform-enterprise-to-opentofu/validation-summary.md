# Validation Summary: How to Migrate from Terraform Enterprise to OpenTofu - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu S3 backend
- HCP Terraform / Terraform Cloud
- Terraform Enterprise
- HCP Terraform and Terraform Enterprise APIs
- Atlantis
- Open Policy Agent (OPA) / Rego
- Conftest
- GitHub Actions
- AWS CLI / Amazon S3

## Sources Consulted
- HashiCorp Developer - What is HCP Terraform?: https://developer.hashicorp.com/terraform/cloud-docs
- HashiCorp Developer - Terraform Enterprise: https://developer.hashicorp.com/terraform/enterprise
- HashiCorp Developer - HCP Terraform Workspaces API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HashiCorp Developer - HCP Terraform State Versions API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/state-versions
- HashiCorp Developer - Terraform Enterprise policy enforcement overview: https://developer.hashicorp.com/terraform/enterprise/policy-enforcement
- OpenTofu - Migration Guide: https://opentofu.org/docs/intro/migration/migration-guide/
- OpenTofu - What are TACOS?: https://opentofu.org/docs/intro/tacos/
- OpenTofu - S3 backend: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu - `tofu init`: https://opentofu.org/docs/cli/commands/init/
- OpenTofu - `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu - `tofu show`: https://opentofu.org/docs/cli/commands/show/
- OpenTofu - `tofu apply`: https://opentofu.org/docs/cli/commands/apply/
- Atlantis - Repo-level `atlantis.yaml` configuration: https://www.runatlantis.io/docs/repo-level-atlantis-yaml.html
- Atlantis - Custom workflows: https://www.runatlantis.io/docs/custom-workflows.html
- OPA - Policy Language: https://www.openpolicyagent.org/docs/policy-language
- OPA - Upgrading to v1.0: https://www.openpolicyagent.org/docs/v0-upgrade
- Conftest - Usage and policy rules: https://www.conftest.dev/
- GitHub Docs - Store information in variables: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables
- GitHub Docs - Contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- AWS CLI Command Reference - `aws s3 cp`: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- Spacelift Documentation - Workflow Tool / OpenTofu support: https://docs.spacelift.io/self-hosted/latest/vendors/terraform/workflow-tool
- env0 Documentation - Supported Platforms: https://docs.env0.com/docs/supported-platforms

## Issues Found
- The post referred to Terraform Cloud as the current managed product name and described Terraform Enterprise as a managed platform. Updated the wording to HCP Terraform (formerly Terraform Cloud) as the hosted service and Terraform Enterprise as the self-hosted distribution.
- The post listed "OpenTofu Cloud" as OpenTofu's own managed service. I replaced this with managed OpenTofu-compatible TACOS platforms, because OpenTofu's official documentation describes TACOS platforms but not a first-party OpenTofu Cloud service.
- The state export example hardcoded `app.terraform.io`, which would not work for Terraform Enterprise installations. I added `TFC_HOST` and used it in the API URLs, while keeping `app.terraform.io` as the HCP Terraform default.
- The HCP Terraform API examples omitted the JSON API content type header used in official API examples. I added `Content-Type: application/vnd.api+json`.
- The re-initialization step deleted `.terraform.lock.hcl`. OpenTofu uses this dependency lock file to preserve provider selections, so I removed that command and changed initialization to `tofu init -reconfigure` after changing backend configuration.
- The Atlantis example used `terraform_version: opentofu:1.9.0`, which is not the documented Atlantis syntax. I changed it to `terraform_distribution: opentofu` and `terraform_version: 1.9.0`.
- The Atlantis workflow overrode commands with `tofu` invocations and a fixed plan filename. I changed it to Atlantis built-in `init`, `plan`, and `apply` steps so Atlantis handles the configured OpenTofu distribution and plan file management.
- The Rego policy used pre-OPA-1.0 partial set syntax (`deny[msg]`). I updated it to current Rego syntax using `deny contains msg if { ... }`.
- The Sentinel statement implied all Terraform Enterprise policy enforcement is Sentinel-only. I narrowed it to "If your Terraform Enterprise policy sets use Sentinel" because current HashiCorp policy documentation includes multiple policy mechanisms.
- The conclusion said the state format is identical and no conversion is needed. I narrowed this to supported Terraform/OpenTofu version pairs, matching OpenTofu's migration guidance.

## Review Notes
- The S3 backend configuration uses `dynamodb_table`, which remains supported by OpenTofu. OpenTofu also supports native S3 lock files via `use_lockfile=true`, but DynamoDB locking is still valid.
- The GitHub Actions example correctly uses the `secrets` and `vars` contexts in a step-level `env` block.
- The AWS CLI `aws s3 cp` command uses valid `--sse aws:kms` and `--sse-kms-key-id` options.
- The OPA policy now checks encryption configuration resources for KMS encryption. It does not prove every S3 bucket in a plan has a matching encryption configuration resource, which could be expanded in a future article if stricter policy coverage is required.
