# Validation Summary: How to Configure Alert Notifications via Microsoft Teams in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Prometheus Alertmanager
- Rancher Monitoring / kube-prometheus-stack
- Microsoft Teams Incoming Webhooks
- `prometheus-msteams`

## Sources Consulted
- Microsoft Teams: Create Incoming Webhooks: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- Microsoft Teams: Manage Microsoft 365 connectors and custom connectors: https://learn.microsoft.com/en-us/microsoftteams/m365-custom-connectors
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- `prometheus-msteams` project documentation: https://github.com/prometheus-msteams/prometheus-msteams
- kube-prometheus-stack values reference: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Rancher receiver configuration docs: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/latest/en/observability/monitoring-and-dashboards/configuration/receivers.html

## Issues Found
- The Teams channel setup steps were outdated for the current Teams client. I updated the instructions to match the current Incoming Webhook flow and corrected the example webhook URL format to `webhook.office.com`.
- The Alertmanager explanation referred to an `msteams` receiver that does not exist in Alertmanager. I changed the wording to the supported pattern: a standard `webhook_configs` receiver pointing at the `prometheus-msteams` service.
- The `alertmanager.alertmanagerSpec.secrets` example mounted a secret into Alertmanager even though the configuration never used it. I removed that unused setting from the values example.
- The custom template section would not work as written because it mounted a directory but never set `TEMPLATE_FILE`. I added the required `TEMPLATE_FILE` environment variable and a `subPath` file mount.
- The multi-channel routing section was not supported by the preceding adapter configuration. I replaced it with the documented `CONFIG_FILE` connector mapping pattern from `prometheus-msteams` and corrected the Alertmanager matcher syntax.
- The troubleshooting section referenced outdated webhook host assumptions. I updated it to point to the Teams webhook host pattern and current connector URL update guidance.

## Review Notes
- Microsoft documents that Microsoft 365 connectors are nearing deprecation and recommends Workflows for new webhook-based integrations. This post remains technically valid for current Incoming Webhook connector usage, but it should be revisited if Microsoft retires connector-based webhooks for general availability.
- The test `PrometheusRule` example assumes the monitoring Helm release name is `rancher-monitoring`; the post now notes that readers should replace that label if their release name differs.
