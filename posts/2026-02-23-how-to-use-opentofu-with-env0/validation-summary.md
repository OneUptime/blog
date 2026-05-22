# Validation Summary: How to Use OpenTofu with env0

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTofu
- env0
- Infrastructure as Code
- AWS IAM and OIDC
- Azure service principal environment variables
- Google Cloud service account credentials
- Open Policy Agent / Rego
- Infracost cost estimation
- Checkov Terraform plan scanning

## Sources Consulted
- env0 documentation: Custom Flows, `env0.yml` naming, schema v2, and OpenTofu hook names: https://docs.envzero.com/guides/admin-guide/custom-flows
- env0 documentation: Custom Flow Schema v2: https://docs.envzero.com/guides/admin-guide/custom-flows/version-2-schema
- env0 documentation: Managing IaC binary versions and `ENV0_OPENTOFU_VERSION`: https://docs.envzero.com/guides/admin-guide/templates/iac-binaries-versions
- env0 documentation: AWS OIDC configuration and trust policy fields: https://docs.envzero.com/guides/integrations/oidc-integrations/oidc-with-aws
- env0 documentation: Cloud credentials scopes and Google Cloud service account setup: https://docs.envzero.com/guides/getting-started/getting-started/connect-your-cloud-account
- env0 documentation: Variables and Secrets scopes: https://docs.env0.com/docs/variables
- env0 documentation: Cost Estimation / Infracost integration: https://docs.env0.com/docs/cost-estimation
- env0 documentation: Approval Policies input and expected Rego outputs: https://docs.envzero.com/guides/policies-governance/approval-policies
- env0 documentation: Time To Live policy behavior: https://docs.env0.com/docs/policy-ttl
- OpenTofu documentation: CLI commands and JSON plan output: https://opentofu.org/docs/cli/commands/ and https://opentofu.org/docs/internals/json-format/
- OpenTofu release announcement for current version context: https://opentofu.org/blog/opentofu-1-12-0/
- Checkov documentation: Terraform plan scanning requires JSON plan input: https://www.checkov.io/7.Scan%20Examples/Terraform%20Plan%20Scanning.html
- Terraform Google provider documentation: `GOOGLE_CREDENTIALS` accepts raw service account JSON or a credentials file path: https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_reference.html

## Issues Found
- The post used `.env0.yml`, `opentofuVersion`, `terraformVersion`, and custom `commands` blocks as though they configured env0's OpenTofu execution. env0 documents `env0.yml` / `env0.yaml` for custom flows, while OpenTofu versions are selected through template settings, `.opentofu-version`, or `ENV0_OPENTOFU_VERSION`. Replaced the invalid configuration with supported version-pinning examples.
- The OpenTofu version recommendation and examples pinned `1.6.2`, which is outdated as of this review. Updated examples to `1.12.0` and described using a current template version or resolving from code.
- The AWS OIDC trust policy used the wrong issuer/provider host and audience claim key. Updated it to use `login.app.env0.com/`, the documented env0 audience value, a `sub` condition, and `sts:TagSession`.
- The GCP credentials note described `GOOGLE_CREDENTIALS` as base64-encoded JSON. The Google provider expects raw JSON contents or a credentials file path when using that environment variable. Updated the guidance.
- The post claimed variables could be defined in `.env0.yml` with a `variables` block. Replaced that with an OpenTofu `.auto.tfvars` example for non-sensitive defaults and kept sensitive values in env0 variables.
- The cost estimation snippet pointed to template settings and implied built-in cost thresholds there. env0 documents cost estimation as a project policy and cost enforcement through policies, so the snippet was corrected.
- The approval workflow snippet described a generic "Require approval" setting and used an unsupported `approval_required` Rego rule. Updated it to env0 approval policy assignment guidance and a `pending[...]` Rego rule under `package env0`.
- The custom workflow example replaced OpenTofu init/plan/apply/destroy commands directly using an unsupported schema. Rewrote it as an `env0.yml` schema v2 custom flow using documented OpenTofu hook names and converted the binary plan to JSON before Checkov scanning.
- The troubleshooting section referenced `.env0.yml` for version selection and environment-scoped cloud credentials. Updated it to the documented version sources and credential scopes.

## Review Notes
The post is technically valid after corrections. Some UI labels in env0 can change over time, so future reviews should re-check navigation names against the current env0 documentation.
