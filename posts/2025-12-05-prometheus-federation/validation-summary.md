# Validation Summary: How to Configure Prometheus Federation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (federation, `/federate` endpoint, scrape configs, recording rules)
- PromQL (instant vector selectors, `rate`, `histogram_quantile`, aggregation)
- Kubernetes service discovery (`kubernetes_sd_configs`, relabeling, meta labels)
- YAML configuration
- Mermaid diagrams

## Sources Consulted
- Prometheus Federation documentation — https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus configuration reference (scrape_config, kubernetes_sd_config, relabel_config) — https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus recording rules / naming conventions — https://prometheus.io/docs/practices/rules/
- Prometheus instrumentation metrics (`scrape_samples_scraped`, `scrape_duration_seconds`, `up`, `prometheus_tsdb_head_series`)

## Issues Found
1. **Kubernetes federation Service port had no name, but the relabel filter required a port named `web`.** In the "Kubernetes Federation Setup" section, the `Service` defined `port: 9090` with no `name`, while the central Prometheus scrape config kept only endpoints where `__meta_kubernetes_endpoint_port_name` matches `web`. With an unnamed port, that meta label is empty, so the relabel `keep` action would drop every target and federate nothing. Added `name: web` to the Service port so the two snippets are consistent and the discovery actually works.

2. **Mislabeled/irrelevant metric in the "Limit Cardinality" section.** The example used `prometheus_target_scrape_pool_sync_total` under the comment "Check scrape duration." That metric counts service-discovery sync operations — it is neither scrape duration nor a cardinality signal. Replaced it with `scrape_samples_scraped{job="federate-dc1"}`, which directly reports the number of samples ingested per federation scrape and is the relevant cardinality indicator for the section.

3. **Incorrect code-fence language in "Debug Missing Metrics."** The block was fenced as `promql` but contained shell `curl` commands. Changed the fence to `bash`.

## Review Notes
- The core federation configuration (`honor_labels: true`, `metrics_path: '/federate'`, the required `match[]` parameter, longer scrape intervals for federation) matches the official Prometheus federation documentation.
- Recording rule naming follows the recommended `level:metric:operations` convention, and the PromQL expressions (including `histogram_quantile` with `le` retained in the `by` clause) are correct.
- Kubernetes meta-label names (`__meta_kubernetes_service_label_prometheus_federate`, `__meta_kubernetes_endpoint_port_name`, `__meta_kubernetes_namespace`) are accurate for current Prometheus releases.
- No version-specific deprecations identified; the configuration is valid for current Prometheus 2.x/3.x releases.
