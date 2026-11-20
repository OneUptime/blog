# Validation Summary: Recalculate HPA Replica Decisions by Hand from Metrics and Resource Requests

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands and a Python calculation.

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler (HPA), including the v1.35.0 implementation
- CPU resource requests, resource metrics, and ContainerResource metrics
- kubectl and the metrics.k8s.io/v1beta1 API
- Bash, jq, and Python 3

## Sources Consulted
- [Kubernetes HPA documentation](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/) — algorithm, tolerance, metric failures, status reporting, stabilization, and scaling policies.
- [Resource metrics pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/) — CPU measurement windows and metrics response structure.
- [Kubernetes v1.35.0 utilization calculation](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/metrics/utilization.go) — request-weighted utilization and integer truncation.
- [Kubernetes v1.35.0 replica calculator](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/replica_calculator.go) — Pod eligibility, missing samples, request selection, and rounding replica counts.
- [Kubernetes v1.35.0 metrics client](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/metrics/client.go) — label-filtered metrics queries, per-container millicore conversion, and aggregation.
- [Kubernetes apimachinery v0.35.0 Quantity implementation](https://github.com/kubernetes/apimachinery/blob/v0.35.0/pkg/api/resource/quantity.go) — MilliValue rounding semantics.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — JSON output, namespace, selector, and raw request flags.
- [jq manual](https://jqlang.org/manual/) — field selection, iteration, object construction, and comma-separated outputs.
- [Python math.ceil documentation](https://docs.python.org/3/library/math.html#math.ceil) — ceiling operation.

## Issues Found
- The CPU unit-conversion guidance omitted the controller's per-container rounding to whole millicores. Exact conversion alone can produce a different result for nanocore samples near a decision boundary. Added the v1.35.0 metrics client's MilliValue behavior and the example `300000001n` becoming `301m`, with a source link. The original arithmetic and Python example remain correct and unchanged.

## Review Notes
- Executed the Python example successfully: output was `80 6`, and both assertions passed.
- Checked the shell block with `bash -n`; it passed. Executed both jq expressions against representative Deployment and PodMetrics JSON; both produced the expected fields.
- Checked kubectl flags and the resource metrics request against official documentation and the controller client. No live cluster requests were executed; actual results require the example resources, API availability, and appropriate access.
- Confirmed that utilization uses total matching usage divided by total matching requests, with the integer percentage calculated before the ratio.
- Confirmed the distinction between observed status metrics and conservative internal adjustments, and the documented multi-metric failure and recommendation behavior.
- The pinned v1.35.0 source links are valid version-specific references, not claims that v1.35.0 is the newest release. Pod-level request handling depends on feature availability and enablement; ContainerResource selects the named container.
- A currently Ready Pod can still have a CPU sample excluded during initialization if its measurement window overlaps the readiness transition. The post already directs readers to check CPU initialization handling before treating the simple calculation as definitive.
- The one-Pod rate-limit example assumes that policy is the effective constraint and that one additional Pod remains permitted in its interval; policy selection and prior scaling activity matter.
- The linked technical resources resolved successfully. The author profile is attribution, not a technical reference.
