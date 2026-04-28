# Validation Summary: How to Set Up OpenTofu with Azure DevOps Pipelines

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (v1.6+, examples target 1.7.0)
- Azure DevOps Pipelines (YAML pipelines, environments, deployment jobs, approvals)
- HCL configuration language (terraform block, providers, backends, variables, locals, validation)
- AWS provider for OpenTofu (S3 + DynamoDB backend, default_tags)
- Cloud credential environment variables (AWS_PROFILE, ARM_SUBSCRIPTION_ID, GOOGLE_APPLICATION_CREDENTIALS)

## Sources Consulted
- OpenTofu standalone install documentation: https://opentofu.org/docs/intro/install/standalone/ (confirms install script URL `https://get.opentofu.org/install-opentofu.sh` and `--install-method standalone --opentofu-version <ver>` flags)
- OpenTofu install overview: https://opentofu.org/docs/intro/install/
- Azure DevOps Environments documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/environments (confirms YAML structure for `deployment` jobs, `environment:` targeting, and approval checks)
- Azure DevOps deployment jobs and approvals & checks documentation
- HashiCorp/OpenTofu HCL reference for `terraform`, `required_providers`, `backend "s3"`, `default_tags`, `variable validation { condition }`, and `locals` blocks
- OpenTofu CLI reference for `tofu init`, `tofu plan -out`, `tofu show`, `tofu apply`, `tofu state list`, `tofu state show`, `tofu plan -refresh-only`, `TF_LOG`, `TF_INPUT`

## Issues Found
1. **Step 4 used GitHub Actions instead of Azure DevOps Pipelines.** The post title, tags, description, and conclusion all say "Azure DevOps Pipelines", but the original Step 4 YAML was a `.github/workflows/infrastructure.yml` GitHub Actions workflow using `opentofu/setup-opentofu@v1`, `aws-actions/configure-aws-credentials@v4`, `actions/upload-artifact@v3`, etc. This is a critical mismatch — none of those constructs exist in Azure DevOps Pipelines.
   - **Fix:** Replaced the entire Step 4 YAML with a working `azure-pipelines.yml` that uses the correct Azure DevOps constructs:
     - `trigger:` and `pr:` blocks (Azure DevOps triggers, not `on:`)
     - `stages:` -> `jobs:` -> `steps:` hierarchy
     - `pool: vmImage: ubuntu-latest` (Microsoft-hosted agents)
     - OpenTofu installation via the official standalone install script (`https://get.opentofu.org/install-opentofu.sh`) with `--install-method standalone --opentofu-version $(TOFU_VERSION) --skip-verify` (verified against OpenTofu standalone install docs)
     - `publish:` / `download:` tasks instead of GitHub Actions artifact actions
     - A `deployment` job with `environment: production` and `runOnce` strategy in the Apply stage — this is the Azure DevOps mechanism that triggers manual approvals when approvers are configured on the environment
     - Conditional execution via `condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))` (Azure DevOps expression syntax)
     - Cloud credentials passed via secret pipeline variables on each script step
   - Also added a brief explanatory paragraph before the YAML telling the reader to create the `production` environment in the Azure DevOps UI and configure approvers there, since approvals are configured on the environment object, not in YAML.

## Review Notes
- The OpenTofu install script verifies file integrity via cosign or GnuPG. The example uses `--skip-verify` for simplicity in CI; production users may prefer to install cosign (e.g., `apt-get install -y cosign` if available) and drop `--skip-verify`.
- Microsoft-hosted Ubuntu agents already have `curl` available; no additional setup is needed for the install script.
- The post mixes AWS-specific configuration (S3 backend, AWS provider, AWS credentials) into what is otherwise a generic OpenTofu + Azure DevOps walkthrough. This is technically correct but readers using Azure or GCP would need to substitute the corresponding backend, provider, and credentials. Not changed because the original author clearly intended AWS as the example, and the Step 1 environment-variables block already shows the equivalent variables for Azure and GCP.
- All HCL snippets (terraform block, required_providers, backend "s3", default_tags, locals, variable validation) are syntactically correct and match current OpenTofu/HCL behavior.
- All `tofu` CLI invocations (`tofu version`, `tofu init -backend-config=...`, `tofu plan -out=...`, `tofu show`, `tofu apply <plan>`, `tofu state list`, `tofu state show`, `tofu plan -refresh-only`, `tofu refresh`) use real, current command-line syntax.
- `TF_LOG` and `TF_INPUT` environment variables are honored by OpenTofu (carried over from Terraform compatibility).
