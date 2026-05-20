# Validation Summary: How to Monitor ArgoCD Reconciliation Duration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- Prometheus
- PromQL
- Prometheus Operator PrometheusRule
- Grafana

## Sources Consulted
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/metrics/
- Argo CD High Availability and application-controller documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD argocd-cm example for `timeout.reconciliation`: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/argocd-cm-yaml/
- Argo CD argocd-cmd-params-cm example for controller processor settings: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD FAQ for repository polling and reconciliation timing: https://argo-cd.readthedocs.io/en/latest/faq/
- AWS Open Source Blog on Argo CD application-controller scalability and workqueue names: https://aws.amazon.com/blogs/opensource/argo-cd-application-controller-scalability-testing-on-amazon-eks/
- Prometheus `histogram_quantile()` function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus aggregation operator syntax documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The post described `argocd_app_reconcile` as a counter and used undocumented `argocd_app_reconcile_duration_seconds_*` metric names. Argo CD documents `argocd_app_reconcile` as the reconciliation duration histogram, which exposes `argocd_app_reconcile_bucket`, `argocd_app_reconcile_sum`, and `argocd_app_reconcile_count`. I updated the metric descriptions, dashboard queries, alerts, and recording rules.
- Several PromQL examples placed `by (name)` after `rate()` or after `histogram_quantile()`, which is invalid PromQL. I rewrote those examples to use valid aggregations such as `sum by (name, le) (...)`.
- Histogram percentile examples did not aggregate classic histogram buckets by `le`, which can return per-series quantiles rather than the intended global or per-application percentile. I updated global queries to `sum by (le)` and per-application queries to `sum by (name, le)`.
- The manifest generation bottleneck query used undocumented `argocd_repo_server_request_duration_seconds_bucket`. I replaced it with the documented `argocd_repo_parallelism_wait_duration_seconds_bucket` metric and adjusted the wording to match what that metric measures.
- The workqueue depth example used `name="app_reconciliation"`. I updated it to `name="app_reconciliation_queue"`, matching Argo CD application-controller queue naming used in scaling guidance.
- The webhook optimization text said Argo CD only reconciles when changes are pushed. Official docs describe polling as a fallback unless timeout polling is explicitly disabled, so I changed the wording to recommend webhooks for immediate refresh with a longer polling fallback.
- The reconciliation interval comment used `default: 180s`. Current Argo CD documentation describes the default as `120s` plus up to `60s` jitter, so I updated the comment.

## Review Notes
The YAML snippets are syntactically well-formed by inspection, but `promtool` was not installed in the local environment, so I could not run automated Prometheus rule validation.
