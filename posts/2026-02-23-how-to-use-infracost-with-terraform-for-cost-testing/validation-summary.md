# Validation Summary: How to Use Infracost with Terraform for Cost Testing

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Terraform
- Infracost CLI
- Infracost Cloud guardrails
- GitHub Actions
- Bash
- jq

## Sources Consulted
- Infracost Get started documentation: https://www.infracost.io/docs/
- Infracost CLI commands documentation: https://www.infracost.io/docs/features/cli_commands/
- Infracost config file documentation: https://www.infracost.io/docs/features/config_file/
- Infracost usage costs documentation: https://www.infracost.io/docs/features/usage_based_resources/
- Infracost supported resources overview: https://www.infracost.io/docs/supported_resources/overview/
- Infracost cost guardrails documentation: https://www.infracost.io/docs/infracost_cloud/guardrails/
- Infracost GitHub comment CLI documentation: https://www.infracost.io/docs/features/cli_commands/
- Infracost JSON schema: https://raw.githubusercontent.com/infracost/infracost/master/schema/infracost.schema.json
- Infracost usage file example: https://raw.githubusercontent.com/infracost/infracost/master/infracost-usage-example.yml

## Issues Found
- The Linux install command used the old `infracost/infracost` repository path for the install script. Updated it to the current official `infracost/cli` install script URL.
- The "Setting Cost Policies" section showed a `policies:` block inside `infracost.yml` with fields such as `evaluation.monthly_cost.max`. That is not a supported Infracost config-file format. Replaced it with the current Infracost Cloud guardrails model for cost change, percentage, and monthly cost thresholds.
- The output format examples showed `infracost breakdown --format html`, `infracost breakdown --format slack-message`, and `infracost diff --format diff`. Current Infracost documentation shows JSON being generated first and then converted with `infracost output` for formats such as `slack-message` and `diff`; HTML is not listed as a current output format. Updated the examples accordingly.
- The supported resources section grouped unsupported resources with free resources. Clarified that free resources are reported as free, while unsupported resources are shown as skipped with `--show-skipped`.

## Review Notes
The post still uses the established `breakdown` and `diff` CLI workflow, which remains documented, while current Infracost docs increasingly emphasize `infracost scan`, Infracost Cloud, and guardrails. Future updates could modernize the workflow around `scan`, but the corrected examples are technically valid for the tutorial's current structure.
