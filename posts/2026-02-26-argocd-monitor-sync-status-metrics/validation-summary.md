# Validation Summary: How to Monitor ArgoCD Application Sync Status with Metrics

## Status
validated

## Post Type
Tutorial / Monitoring guide

## Technologies Covered
- Argo CD
- Kubernetes
- Prometheus
- PromQL
- Prometheus alerting and recording rules
- Grafana dashboards
- DORA deployment frequency metrics

## Sources Consulted
- Argo CD official metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD official automated sync documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD application-controller metrics source: https://github.com/argoproj/argo-cd/blob/master/controller/metrics/metrics.go
- Argo CD application-controller metrics tests: https://github.com/argoproj/argo-cd/blob/master/controller/metrics/metrics_test.go
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Google Cloud Deploy metrics documentation for DORA deployment frequency context: https://docs.cloud.google.com/deploy/docs/metrics

## Issues Found
- The `argocd_app_info` sample omitted labels that are part of the current application-controller metric, while later examples rely on `autosync_enabled`. Added `autosync_enabled` and `operation` to the sample so it matches current Argo CD behavior more closely.
- The `argocd_app_sync_total` sample omitted the current `dry_run` label. Added `dry_run="false"` to match the current metric label set.
- The sync phase list omitted `Terminating`, which is documented by Argo CD as a possible `phase` label value. Added `Terminating`.
- The drift detection example comment said the instant query identified applications OutOfSync for more than five minutes. A plain instant-vector query only shows the current state; the duration is enforced by the later alert `for` clause. Updated the comment to say "currently OutOfSync."
- The cross-reference example treated `argocd_app_sync_total{phase="Error"}` as a Git fetch error signal and matched only on `name`. That metric is sync history, not a dedicated Git fetch error metric, and matching only on `name` can be ambiguous. Updated the example to join OutOfSync applications with recent sync errors using `increase(...)` aggregated by `name`, `namespace`, `project`, and `dest_server`.

## Review Notes
- The PromQL examples are syntactically valid and use current Argo CD metric names. In production dashboards, success-rate expressions may need `or vector(0)` or denominator guards for periods with no sync activity.
