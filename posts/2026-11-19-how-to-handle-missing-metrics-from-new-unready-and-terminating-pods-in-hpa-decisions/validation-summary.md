# Validation Summary: Handle Missing Metrics from New, Unready, and Terminating Pods in HPA Decisions

## Status

validated

## Post Type

Technical troubleshooting guide with diagnostic shell commands and a worked autoscaling calculation.

## Technologies Covered

- Kubernetes Horizontal Pod Autoscaler (HPA), specifically Kubernetes 1.35.0 behavior
- CPU and memory resource utilization, raw per-Pod metrics, custom metrics, object metrics, and external metrics
- Pod lifecycle, readiness, resource requests, and the resource metrics API
- kubectl, Bash, and jq

## Sources Consulted

- [Kubernetes 1.35.0 replica calculator](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/replica_calculator.go): Pod classification, CPU eligibility, fallback values, request handling, and recalculation guards.
- [Kubernetes 1.35.0 utilization helpers](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/metrics/utilization.go): request-weighted utilization and usage ratios.
- [Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/#algorithm-details): status reporting, tolerance, multiple metrics, stabilization, and scaling policies.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/): raw requests, namespace selection, label selectors, and JSON output.
- [Kubernetes Metrics v1beta1 reference](https://kubernetes.io/docs/reference/external-api/metrics.v1beta1/): PodMetrics fields and collection windows.
- [Resource metrics pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/): resource metric collection and API access.
- [jq manual](https://jqlang.org/manual/): object construction, optional iteration, filtering, and shell quoting.

## Issues Found

No technical issues found.

## Review Notes

- Left README.md unchanged. The post is technically relevant and its implementation details are explicitly scoped to Kubernetes 1.35, rather than presented as the latest release.
- Confirmed the classification order: deleting and failed Pods are ignored for metrics, Pending Pods are unready, missing samples are separated, and CPU eligibility checks apply afterward. The table describes metric participation; request validation remains a separate step over selected Pods.
- Confirmed that CPU initialization is conditional on readiness and the sample window, rather than an unconditional five-minute exclusion. Memory and custom metrics do not use the CPU-specific checks.
- Verified utilization fallback as the request multiplied by max(100, target utilization) / 100 for downscaling, and zero for upscaling. Raw per-Pod average-value calculations instead use the target on downscaling. Object and external calculations follow separate paths.
- Independently checked the example: 20% observed utilization, a 500m fallback, 40% adjusted utilization, and ceil(3.2) = 4 replicas. The original observation can remain in HPA status while the adjusted recommendation retains four replicas.
- Confirmed the explanations of tolerance, direction reversal, final scaling constraints, and partial metric failure. Unavailable measurements and legitimate idle zeros represent different conditions.
- Bash syntax validation passed. Both jq expressions executed successfully against representative JSON, including a Pod without conditions. The API fields and kubectl flags match official references; metrics.k8s.io/v1beta1 remains the documented resource metrics API.
- No live cluster requests or lifecycle experiments were run; kubectl is not installed in this environment. Actual command execution requires cluster access, appropriate read permissions, and an available resource metrics API. The two diagnostic requests are sequential snapshots and may differ slightly from a controller reconciliation.
- Verified that the two technical links resolve to the intended resources and that the author profile URL redirects to the matching GitHub profile.
