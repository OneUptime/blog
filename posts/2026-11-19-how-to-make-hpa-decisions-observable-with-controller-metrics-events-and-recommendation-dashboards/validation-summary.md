# Validation Summary: How to Make HPA Decisions Observable with Controller Metrics, Events, and Recommendation Dashboards

## Status
validated

## Post Type
Technical guide for Kubernetes HPA observability and troubleshooting.

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler (autoscaling/v2), controller-manager, Deployments, and Events
- Kubernetes 1.35 HPA controller instrumentation
- kube-state-metrics
- Prometheus and PromQL
- kubectl, shell pipelines, and jq
- Mermaid flowcharts

## Sources Consulted
- Kubernetes 1.35 controller metric definitions: https://raw.githubusercontent.com/kubernetes/kubernetes/v1.35.0/pkg/controller/podautoscaler/monitor/metrics.go
- Kubernetes 1.35 HPA reconciliation implementation: https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/horizontal.go
- kube-state-metrics HPA metric reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/horizontalpodautoscaler-metrics.md
- Kubernetes HPA algorithm and behavior: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HPA API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Event API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Prometheus query functions, including rate and ceil: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus selectors and staleness: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus aggregation operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- jq object construction and field access: https://jqlang.org/manual/
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
- The reconciliation query was introduced as counting errors, but `rate(...[5m])` returns an average per-second counter increase over five minutes. Changed the introductory sentence to describe the per-second error rate. The query itself is correct and remains unchanged.

## Review Notes
- Confirmed the Kubernetes 1.35 metric names, alpha stability, reconciliation labels, metric-type label, and desired-replica gauge labels against the pinned release source. The aggregate counters do not provide per-HPA attribution.
- Confirmed that the desired-replica gauge is observed after the scaling decision, with the current replica count used when no rescale occurs. It is not a history of raw recommendations. Early error returns can bypass the observation, and status persistence happens afterward; the gauge and stored object status are not an atomic snapshot.
- Confirmed that SuccessfulRescale follows a successful target scale update and does not establish application readiness or traffic delivery. Deployment availability and application outcomes remain separate signals.
- Checked HPA status fields, kubectl flags, supported Event field selectors, jq object shorthand, PromQL selectors and aggregation, and Mermaid flowchart syntax. Sorting by metadata.creationTimestamp orders event objects by creation, not by their latest repeated occurrence.
- Event retention is limited and event information is best effort. UID-based association is appropriate when an HPA name is reused.
- The recommendation formula is mathematical shorthand, not a complete recording-rule configuration. The post correctly labels it an estimate and accounts for missing metrics, CPU startup eligibility, multiple metrics, and behavior rules. PromQL multiplication would use `*` when implementing the formula.
- The Kubernetes 1.35 references are explicitly version-specific, not a claim about the latest release. Alpha metric availability and the moving kube-state-metrics main reference should be checked against the deployed versions, as the post advises.
- Leader changes and Prometheus lookback/staleness can affect comparisons between controller samples and fresh object status. Scrape access in managed clusters is provider-specific; no universal endpoint availability is assumed.
- Source links resolve to the intended official documentation or repositories. The GitHub metric-definition page could not be fetched through the browser cache, so its matching raw file at the same release tag was inspected successfully.
- Review used official documentation and source inspection. No live Kubernetes cluster, controller scrape, Prometheus query execution, or load/failure experiment was performed; environment-specific telemetry availability remains an operational check.
