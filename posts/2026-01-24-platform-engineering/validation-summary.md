# Validation Summary: How to Handle Platform Engineering

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Platform engineering
- Kubernetes StatefulSets
- Terraform and the HashiCorp Kubernetes provider
- Bash scripting
- GitHub Actions
- GitOps workflows
- Prometheus PromQL
- Grafana Operator
- Service catalogs and YAML configuration

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- HashiCorp Terraform Kubernetes provider `kubernetes_stateful_set` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/stateful_set
- HashiCorp Terraform `contains` function documentation: https://developer.hashicorp.com/terraform/language/functions/contains
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions workflow commands documentation for `$GITHUB_OUTPUT`: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- Grafana Operator API reference for `GrafanaDashboard`: https://grafana.github.io/grafana-operator/docs/api/
- Grafana Operator dashboard management documentation: https://grafana.com/docs/grafana-cloud/as-code/infrastructure-as-code/grafana-operator/operator-dashboards-folders-datasources/
- Prometheus `histogram_quantile` documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile

## Issues Found
- The Bash scaffold script used `$1` and `$2` before validating arguments while `set -u` was enabled. Changed these assignments to `${1:-}` and `${2:-}` so the usage check runs correctly when required arguments are missing.
- The Terraform StatefulSet example defined a selector but did not set matching labels on `spec.template.metadata.labels`. Added matching pod template labels because Kubernetes rejects StatefulSets whose selector does not match the pod template labels.
- The GitHub Actions workflow diffed only `HEAD~1..HEAD`, which misses service changes when a push contains multiple commits. Updated the workflow to diff `github.event.before` against `github.sha`, with a fallback for an all-zero initial SHA, and quoted `$GITHUB_OUTPUT`.
- The GrafanaDashboard custom resource omitted the required `spec.instanceSelector` field. Added an example selector matching the Grafana Operator API requirements.
- The PromQL dashboard query used `histogram_quantile` directly over classic histogram buckets. Updated it to aggregate `sum(rate(..._bucket[7d])) by (le)`, preserving the `le` label as Prometheus requires when aggregating classic histograms.

## Review Notes
- Bash syntax and the embedded Grafana dashboard JSON were checked locally. Terraform and kubectl were not installed in the review environment, so Terraform and Kubernetes validation was performed against official documentation rather than local CLI validation.
- The Terraform PostgreSQL StatefulSet remains an illustrative platform template. A production-ready database module would need additional operational details such as credentials, services, probes, backups, and database replication or failover design.
