# Validation Summary: How to Migrate Monitoring Stacks from Prometheus to Victoria Metrics

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Prometheus
- VictoriaMetrics
- VictoriaMetrics Operator
- VMSingle
- VMAgent
- VMAlert and VMRule
- Kubernetes
- Helm
- Grafana
- PromQL and MetricsQL

## Sources Consulted
- VictoriaMetrics vmctl Prometheus migration documentation: https://docs.victoriametrics.com/victoriametrics/vmctl/prometheus/
- VictoriaMetrics vmctl documentation: https://docs.victoriametrics.com/victoriametrics/vmctl/
- VictoriaMetrics Operator VMSingle documentation: https://docs.victoriametrics.com/operator/resources/vmsingle/
- VictoriaMetrics Operator VMAgent documentation: https://docs.victoriametrics.com/operator/resources/vmagent/
- VictoriaMetrics Operator VMAlert documentation: https://docs.victoriametrics.com/operator/resources/vmalert/
- VictoriaMetrics Operator Prometheus integration documentation: https://docs.victoriametrics.com/operator/integrations/prometheus/
- VictoriaMetrics Operator API documentation: https://docs.victoriametrics.com/operator/api/
- VictoriaMetrics MetricsQL documentation: https://docs.victoriametrics.com/metricsql/
- VictoriaMetrics single-node documentation: https://docs.victoriametrics.com/victoriametrics/single-server-victoriametrics/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- VictoriaMetrics GitHub releases: https://github.com/VictoriaMetrics/VictoriaMetrics/releases

## Issues Found
- The VMSingle examples used `storage.volumeClaimTemplate`, which is the wrong shape for `VMSingle.spec.storage`. Updated both examples to use a PVC spec directly with `accessModes`, `storageClassName`, and `resources`.
- The migration section described Prometheus remote read, but `vmctl prometheus` imports from a local Prometheus snapshot. Updated the text and commands to create/copy a Prometheus snapshot and pass its local path to `--prom-snapshot`.
- The vmctl download URL was outdated and used an incorrect asset filename format. Updated it to a current release asset format for `v1.144.0`.
- Several VictoriaMetrics single-node URLs used port `8429`, which is vmagent's UI port. Updated VMSingle write/query/datasource URLs to port `8428`.
- The VMAgent compatibility statement implied direct ServiceMonitor and PodMonitor discovery. Clarified that VMAgent selects VictoriaMetrics scrape resources and that the operator can convert Prometheus Operator resources when the Prometheus CRDs are installed.
- The VMAlert example used `notifier.url`; the operator spec uses `notifiers` as a list. Updated the field and VMSingle datasource port.
- The PrometheusRule conversion commands used broad `sed` replacements that could create invalid multi-namespace manifests and did not remove status fields. Replaced them with a `kubectl -o json | jq` conversion that updates each item to `VMRule` and removes status.
- The Grafana comparison dashboard used invalid histogram quantile expressions and likely wrong metric names. Updated the examples to use `histogram_quantile()` over `sum(rate(..._bucket[5m])) by (le)`.
- The decommissioning commands scaled Prometheus to zero before taking a final backup, which would make `kubectl exec prometheus-0` fail. Reordered the backup before scaling down.
- The troubleshooting section suggested deduplication as a general fix for high memory usage. Narrowed it to duplicate samples from parallel scraping, which matches the purpose of `dedup.minScrapeInterval`.

## Review Notes
- The guide is now technically valid as a migration tutorial, but production migrations should still test service names and resource selectors against the exact Helm chart/operator version in use.
- The Prometheus snapshot API requires Prometheus to run with the admin API enabled.
- The resource savings claims are consistent with VictoriaMetrics documentation, but actual savings depend heavily on workload, scrape interval, churn, retention, and query mix.
