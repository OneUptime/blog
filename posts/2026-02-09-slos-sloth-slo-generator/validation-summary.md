# Validation Summary: How to Define and Configure SLOs for Kubernetes Services

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Kubernetes
- Sloth SLO generator
- Prometheus and PromQL
- Prometheus Operator PrometheusRule resources
- Helm
- Grafana dashboards

## Sources Consulted
- Sloth installation documentation: https://sloth.dev/introduction/install/
- Sloth Kubernetes controller documentation: https://sloth.dev/usage/kubernetes/
- Sloth Kubernetes CRD specification and examples: https://sloth.dev/specs/kubernetes/
- Sloth Kubernetes getting started example: https://sloth.dev/examples/kubernetes/getting-started/
- Sloth default generated rules example: https://sloth.dev/examples/default/getting-started/
- Sloth Kubernetes API Go documentation for PrometheusServiceLevel and SLIEvents: https://pkg.go.dev/github.com/slok/sloth/pkg/kubernetes/api/sloth/v1
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/
- Helm install command documentation: https://docs.helm.sh/docs/helm/helm_install/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found
- The Helm install command used `--namespace monitoring` without creating or updating the target namespace setup. Added `helm repo update` and `--create-namespace`, matching Helm's supported install behavior and Sloth's Helm repository workflow.
- The latency SLO examples used the histogram bucket with `le` as the `errorQuery`. In Sloth event SLIs, `errorQuery` must count bad events, while a Prometheus histogram bucket counts requests less than or equal to the threshold. Updated the latency queries to subtract the threshold bucket from the total count so the error query counts requests slower than the threshold.
- The payment latency SLO was named and described as a p95 objective while the Sloth objective was `99.5`. Updated the SLO name and description to describe the actual 99.5% under 1 second objective.
- The Grafana "Error Budget Remaining" query inverted Sloth's `slo:period_error_budget_remaining:ratio`, which would show consumed budget rather than remaining budget. Updated the expression to use the remaining-budget metric directly.
- The Grafana "SLI vs SLO" example compared Sloth's error ratio directly with the success objective ratio. Updated the SLI query to `1 - slo:sli_error:ratio_rate30d` so it compares success ratio to success objective.
- The deployment-gate Job used `curlimages/curl` while the script also required `jq` and `bc`. Changed the example to use Alpine, install the required tools, and use POSIX-compatible shell syntax for the numeric comparison.

## Review Notes
The Sloth CRD fields shown in the post use the current Kubernetes-style camelCase names such as `errorQuery`, `totalQuery`, `pageAlert`, and `ticketAlert`. The generated-rule sample is intentionally abbreviated; Sloth's current generated rules also include labels such as `sloth_id` and additional alert expressions for page and ticket burn-rate windows.
