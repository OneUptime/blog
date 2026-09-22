# Validation Summary: How to Migrate New Relic OpenMetrics Scrapers to the Prometheus Agent

## Status

validated

## Post Type

Technical migration guide with Helm values and Prometheus relabeling examples.

## Technologies Covered

- New Relic Prometheus OpenMetrics integration (`nri-prometheus`)
- New Relic Prometheus agent (`newrelic-prometheus-agent`)
- Prometheus agent mode, remote write, metric types, and relabeling
- Kubernetes pod and service discovery, annotations, and metadata
- Helm and the New Relic `nri-bundle` chart
- YAML configuration

## Sources Consulted

- [New Relic integration overview](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/get-started/send-prometheus-metric-data-new-relic/)
- [New Relic migration guide](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-prometheus-agent/migration-guide/)
- [New Relic Prometheus agent setup](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-prometheus-agent/setup-prometheus-agent/)
- [New Relic remote-write setup and metric type overrides](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-remote-write/set-your-prometheus-remote-write-integration/)
- [Official agent chart values](https://github.com/newrelic/newrelic-prometheus-configurator/blob/main/charts/newrelic-prometheus-agent/values.yaml)
- [Official bundle chart values](https://github.com/newrelic/helm-charts/blob/master/charts/nri-bundle/values.yaml)
- [Legacy OpenMetrics metric filtering](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-openmetrics/ignore-or-include-prometheus-metrics/)
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus remote-write tuning](https://prometheus.io/docs/practices/remote_write/)

## Issues Found

No technical issues found.

## Review Notes

- The post is technically relevant and contains two implementation examples. Both YAML blocks parsed successfully with PyYAML. No README changes were needed.
- Confirmed the documented Kubernetes migration path, agent-mode architecture, continued Docker OpenMetrics documentation, and recommendation to use remote write for existing Prometheus servers.
- Checked bundle enablement fields and agent configuration nesting against official chart values. The discovery fragment correctly selects annotated pods, disables endpoint discovery for its application job, and disables the integration filter for that job. Its quoted annotation value is valid YAML.
- Confirmed the documented changes to default discovery, metadata names, removed metadata, and Kubernetes label sanitization. The compatibility rules use valid Prometheus replacement syntax; default matching and replacement copy the source labels. Write relabeling runs after external labels are attached.
- Confirmed New Relic's name-based metric conversion and supported `newrelic_metric_type` overrides. The post appropriately scopes this behavior to the New Relic ingestion path rather than claiming that every remote-write protocol version lacks metadata.
- Confirmed that legacy `ignore_metrics` transformations require translation to supported relabel rules. Reviewed the guidance on preserving self-metrics jobs and checking duplicate collection and remote-write health.
- All four technical documentation links in the post resolved to the intended official resources. The post contains no terminal commands or explicit version numbers to validate.
- The configuration examples are explicitly partial values fragments. A deployment still requires its existing cluster identity, credentials, endpoint settings, and any additional target jobs. The first fragment disables the legacy collector for the release; apply it only at the intended cutover or in the isolated canary environment described in the post.
- No live Kubernetes deployment, Helm rendering, authenticated New Relic ingestion, or numerical canary was performed. Validation covers documentation, chart field checks, and YAML syntax. The installed chart version is unspecified; render the pinned release and perform the described target and numerical checks before production use.
