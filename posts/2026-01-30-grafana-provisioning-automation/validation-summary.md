# Validation Summary: How to Create Grafana Provisioning Automation

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Grafana provisioning
- Grafana datasources and dashboards
- Grafana Alerting file provisioning
- Grafana HTTP APIs
- GitHub Actions
- Kubernetes ConfigMaps and Deployments
- Helm and the Grafana Helm chart
- Prometheus, Loki, Tempo, InfluxDB, CloudWatch

## Sources Consulted
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Alerting file provisioning documentation: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana Alerting Provisioning HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/alerting_provisioning/
- Grafana Admin HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/admin/
- Grafana Helm chart values: https://raw.githubusercontent.com/grafana-community/helm-charts/main/charts/grafana/values.yaml
- Grafana Helm chart migration notice: https://github.com/grafana/helm-charts/blob/main/charts/grafana/README.md
- Grafana Helm installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/helm/
- Grafana download page for current release version: https://grafana.com/grafana/download

## Issues Found
- The post implied all provisioning file changes are watched and automatically reloaded. Grafana only detects dashboard file changes according to dashboard provider behavior; datasources, plugins, and alerting resources are provisioned at startup or through explicit Admin API reload endpoints. Updated the explanation and directory-structure notes.
- The dashboard and alert examples referenced datasource UIDs `prometheus` and `loki`, but the datasource provisioning examples did not define those UIDs. Added explicit `uid` fields.
- The `deleteDatasources` comment said it deletes datasources not defined in the file. Grafana deletes the explicitly listed datasources before adding or updating configured ones. Corrected the comment.
- The deployment script posted file-provisioning alert YAML directly to `/api/v1/provisioning/alert-rules`, but Grafana's alerting API uses a different JSON request format and exported/file provisioning formats cannot be used to update resources through that endpoint. Replaced the invalid curl example with copy/reload guidance.
- The Kubernetes deployment mounted a `grafana-alerting` ConfigMap that was not defined. Added a matching ConfigMap example.
- The Kubernetes image tag used Grafana `10.2.0`, which is outdated relative to the current Grafana release. Updated the example to `13.0.2`.
- The Helm values example was nested under `grafana:` even though the command installs the Grafana chart directly. Unnested the values so they match the direct chart install.
- The Helm dashboard provider used `editable: false`; Grafana dashboard provider provisioning uses `allowUiUpdates`. Replaced it with `allowUiUpdates: false`.
- The Helm install command used the old Grafana Helm chart repository. Updated it to the post-migration `grafana-community` repository and chart name.
- The Helm values example depended on `$SLACK_TOKEN` substitution but did not pass that environment variable to the Grafana pod. Added `--set env.SLACK_TOKEN="${SLACK_TOKEN}"`.
- Updated legacy "notification channels" wording to "contact points" for Grafana Alerting terminology.

## Review Notes
Grafana 13 deprecates legacy `/api` endpoints in favor of `/apis`, but the legacy endpoints used in the post remain available according to Grafana's API documentation. Future revisions should consider updating API-based deployment examples when Grafana provides complete App Platform replacements for those workflows.
