# Validation Summary: How to Implement Prometheus Federation for Multi-Cluster Metrics Aggregation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Prometheus federation
- Prometheus scrape configuration and PromQL
- Prometheus recording and alerting rules
- Prometheus Basic Auth and web configuration
- Prometheus Operator / kube-prometheus-stack
- Kubernetes service discovery and Secrets
- Grafana dashboards

## Sources Consulted
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTPS and authentication documentation: https://prometheus.io/docs/prometheus/latest/configuration/https/
- Prometheus Basic Auth guide: https://prometheus.io/docs/guides/basic-auth/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/3.0/configuration/recording_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/3.9/querying/functions/
- Prometheus node exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- kube-prometheus-stack values reference: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml

## Issues Found
- The post described federation as pulling metrics "on-demand." Prometheus federation is configured as a scrape job against `/federate`; the endpoint returns selected current series, but the central Prometheus pulls them on its configured scrape interval. Updated the wording to "scheduled scrapes."
- The node CPU utilization recording rule averaged non-idle CPU modes, which is not a correct utilization calculation. Replaced it with `1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) by (node)`.
- The node memory utilization recording rule returned used bytes while the recording rule name said utilization. Replaced it with a memory utilization ratio using `1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)`.
- The Basic Auth example mixed a Kubernetes Secret containing htpasswd-style data with a `prometheusSpec.web.httpConfig` snippet that does not configure Prometheus Basic Auth for `/federate`. Replaced it with the native Prometheus `web.yml` / `--web.config.file` pattern, and noted that Prometheus Operator / kube-prometheus-stack deployments should use an authenticated ingress or reverse proxy in front of Prometheus.
- The central Prometheus `password_file` path pointed at the mounted Secret directory rather than a key file. Updated the Secret example and path to `/etc/prometheus/secrets/federation-password/password`, matching the Prometheus Operator Secret mount behavior.
- The troubleshooting section labeled `scrape_samples_post_metric_relabeling` as "Scrape failures." That metric reports samples remaining after metric relabeling, not failed scrapes. Updated the comment.
- The "Use Both" section called federation dashboards "real-time." Updated this to "near-real-time" to reflect scrape interval and federation staleness.

## Review Notes
The remaining examples are intentionally illustrative and assume the referenced job names, metric names, service labels, and application labels exist in the reader's environment. `promtool`, `yq`, `ruby`, and `helm` were not installed in the local environment, so validation was performed by source review against official documentation rather than local CLI/schema execution.
