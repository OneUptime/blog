# Validation Summary: How to Configure the Grafana Provider in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Grafana Terraform provider
- Grafana alerting
- Prometheus
- HCL

## Sources Consulted
- Grafana Terraform provider docs (provider): https://raw.githubusercontent.com/grafana/terraform-provider-grafana/main/docs/index.md
- Grafana Terraform provider docs (`grafana_data_source`): https://raw.githubusercontent.com/grafana/terraform-provider-grafana/main/docs/resources/data_source.md
- Grafana Terraform provider docs (`grafana_rule_group`): https://raw.githubusercontent.com/grafana/terraform-provider-grafana/main/docs/resources/rule_group.md
- Grafana Terraform provider docs (`grafana_contact_point`): https://raw.githubusercontent.com/grafana/terraform-provider-grafana/main/docs/resources/contact_point.md
- Grafana Terraform provider docs (`grafana_notification_policy`): https://raw.githubusercontent.com/grafana/terraform-provider-grafana/main/docs/resources/notification_policy.md
- Grafana docs, service accounts: https://grafana.com/docs/grafana/latest/administration/service-accounts/
- Grafana docs, migrate API keys to service account tokens: https://grafana.com/docs/grafana-cloud/security-and-account-management/authentication-and-permissions/service-accounts/migrate-api-keys/
- Grafana docs, use Terraform to provision alerting resources: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/terraform-provisioning/
- Grafana docs, queries and conditions: https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rules/queries-conditions/
- Grafana docs, configure the Prometheus data source: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- OpenTofu docs, environment variables: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu docs, input variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu docs, `tofu init`: https://opentofu.org/docs/cli/init/
- OpenTofu docs, `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs, `tofu apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The post used provider version `~> 3.0`, while the current Grafana provider is on the 4.x line. I updated the version constraint to `~> 4.0` so the example reflects the current provider series.
- The authentication example exported `GRAFANA_URL` and `GRAFANA_AUTH`, but the provider block read from OpenTofu input variables. Those environment variables would not populate `var.grafana_url` or `var.grafana_api_key`. I changed the example to use `TF_VAR_grafana_url` and `TF_VAR_grafana_service_account_token`, which matches OpenTofu variable loading behavior.
- The post referred to Grafana API keys throughout. Current Grafana documentation says service account tokens replace API keys for this use case, and API keys have been deprecated/migrated. I updated the text and variable names to use a service account token.
- The alert rule model was underspecified for Prometheus and used a threshold-style expression that did not match current Grafana alerting guidance. I replaced it with a Prometheus query model that matches current exported fields and changed the expression stage to a `math` condition (`$A > 90`), which aligns with Grafana’s documented alerting workflow.

## Review Notes
- Grafana’s documentation is inconsistent about expression datasource UIDs in alert rules: provider docs describe `-100`, while current alerting export examples often show `__expr__`. The revised post follows the current alerting documentation pattern for expression stages.
- A local `tofu` validation pass was not possible in this environment because the `tofu` CLI is not installed.
