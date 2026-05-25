# Validation Summary: How to Configure TFLint Rules for GCP

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Terraform
- TFLint
- tflint-ruleset-google
- Google Cloud Platform
- GitHub Actions
- Google Cloud Build
- Trivy

## Sources Consulted
- TFLint official README and CLI help: https://github.com/terraform-linters/tflint
- TFLint configuration documentation: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/config.md
- TFLint working directory and recursive mode documentation: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/working-directory.md
- TFLint annotation documentation: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/annotations.md
- TFLint Google ruleset README: https://github.com/terraform-linters/tflint-ruleset-google
- TFLint Google ruleset configuration documentation: https://github.com/terraform-linters/tflint-ruleset-google/blob/master/docs/configuration.md
- TFLint Google ruleset rule documentation: https://github.com/terraform-linters/tflint-ruleset-google/blob/master/docs/rules/README.md
- TFLint Google ruleset deep checking documentation: https://github.com/terraform-linters/tflint-ruleset-google/blob/master/docs/deep_checking.md
- setup-tflint official action documentation: https://github.com/terraform-linters/setup-tflint

## Issues Found
- The post used `tflint-ruleset-google` version `0.28.0`, while the current official README documents `0.39.0`. Updated all plugin examples to `0.39.0`.
- The plugin configuration incorrectly showed `project` inside the `plugin "google"` block. The Google ruleset plugin only accepts `deep_check`; the project is read from the Google provider block or environment variables. Moved the project example into `provider "google"`.
- The post claimed deep checking validates zone-specific machine type availability. Official documentation shows the current deep checking rule is `google_disabled_api`, which checks required Google Cloud APIs. Updated the explanation and example.
- Several listed rules did not exist in the official Google ruleset documentation or source: disk type, Cloud SQL tier, GKE version, storage class, generic region/zone, `google_compute_firewall_invalid_protocol`, and `google_project_invalid_name`. Replaced those examples and table entries with actual rules such as `google_project_iam_member_invalid_member`, `google_compute_address_invalid_network_tier`, `google_container_cluster_invalid_machine_type`, `google_compute_forwarding_rule_invalid_ip_protocol`, and `google_disabled_api`.
- Compute instance snippets were missing a `network_interface` block. Added `network_interface { network = "default" }` to make the examples closer to valid Google provider resources.
- Recursive TFLint examples implied the root `.tflint.hcl` would automatically apply to each child module. Official TFLint documentation says config files are resolved after `--chdir`/`--recursive`; updated recursive examples to pass `--config "$(pwd)/.tflint.hcl"`.
- The GitHub Actions example used `terraform-linters/setup-tflint@v4`, while the current official setup action documentation uses `@v6`. Updated the workflow to `@v6`.

## Review Notes
The terminal flags shown for TFLint, including `--init`, `--recursive`, `--format json`, `--format compact`, `--minimum-failure-severity error`, and `--chdir`, match the official TFLint CLI options. Inline `# tflint-ignore:` suppression syntax is also valid.
