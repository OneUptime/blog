# Validation Summary: How to Connect Grafana Cloud to Google Cloud Monitoring as a Data Source

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Cloud and Grafana data sources
- Google Cloud Monitoring
- Google Cloud IAM service accounts
- Google Cloud CLI (`gcloud`)
- Grafana HTTP API
- Grafana Terraform provider
- Grafana dashboards and alerting
- Monitoring Query Language (MQL)

## Sources Consulted
- Grafana Google Cloud Monitoring data source documentation: https://grafana.com/docs/grafana/latest/datasources/google-cloud-monitoring/
- Grafana Google Cloud Monitoring configuration documentation: https://grafana.com/docs/grafana/latest/datasources/google-cloud-monitoring/configure/
- Grafana Google Cloud Monitoring query editor documentation: https://grafana.com/docs/grafana/latest/datasources/google-cloud-monitoring/query-editor/
- Grafana Google Cloud Monitoring template variables documentation: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/google-cloud-monitoring/template-variables/
- Grafana data source HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/data_source/
- Grafana Alerting documentation: https://grafana.com/docs/grafana/latest/alerting/
- Grafana alerting provisioning documentation: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/
- Grafana Terraform provider `grafana_data_source` documentation: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/data_source
- Google Cloud CLI service account create reference: https://docs.cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- Google Cloud IAM service account creation documentation: https://docs.cloud.google.com/iam/docs/service-accounts-create
- Google Cloud Monitoring MQL deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql
- Google Cloud Load Balancing metrics documentation: https://docs.cloud.google.com/load-balancing/docs/metrics
- Google Cloud Monitoring filter syntax documentation: https://docs.cloud.google.com/monitoring/api/v3/filters

## Issues Found
- The post described the Google Cloud Monitoring integration as a plugin. Grafana documentation says Google Cloud Monitoring support is built in, so the wording was changed to "native Google Cloud Monitoring data source."
- The Grafana API data source example put `clientEmail` under `secureJsonData`. Official provisioning examples place `clientEmail` in `jsonData` and only the private key in `secureJsonData`, so the API snippet was corrected and `universeDomain` was added.
- The Terraform example also placed `clientEmail` under `secure_json_data_encoded`. It was moved into `json_data_encoded`, matching the current Grafana data source documentation.
- The dashboard panel titled "Error Rate (%)" only queried 5xx request rate and did not divide by total request rate. The title was changed to "5xx Request Rate" so it accurately describes the query.
- The MQL section did not mention Google's current MQL status. A caveat was added that MQL is still supported but no longer recommended for new Cloud Monitoring work, with PromQL recommended by Google.
- The alerting JSON used the legacy dashboard alert format, including `frequency`, `handler`, and `notifications`, which is not the current Grafana-managed alerting model. It was replaced with current guidance to create a Grafana-managed alert rule or provision alerting resources through the Alerting provisioning API or Terraform `grafana_rule_group`.
- The multi-project dashboard section said to create a Google Cloud Monitoring query variable that lists projects. Current Google Cloud Monitoring variable documentation does not list a project-list query type, so the guidance was changed to use a project ID variable such as a Custom variable.

## Review Notes
- The `gcloud` CLI was not installed in the local environment, so command verification was performed against official Google Cloud CLI documentation rather than local `--help` output.
- Google service account keys can be blocked by organization policy in some environments. The post's key-based JWT flow remains valid for Grafana Cloud, but Workload Identity Federation or default service account authentication may be preferable where available.
