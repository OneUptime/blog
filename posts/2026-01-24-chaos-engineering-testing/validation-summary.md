# Validation Summary: How to Handle Chaos Engineering Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Chaos engineering
- Chaos Mesh
- Kubernetes
- Python
- Prometheus / PromQL
- Helm
- kubectl
- GitHub Actions

## Sources Consulted
- Chaos Mesh NetworkChaos documentation: https://chaos-mesh.org/docs/simulate-network-chaos-on-kubernetes/
- Chaos Mesh PodChaos documentation: https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh StressChaos documentation: https://chaos-mesh.org/docs/simulate-heavy-stress-on-kubernetes/
- Chaos Mesh scheduling documentation: https://chaos-mesh.org/docs/define-scheduling-rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- Kubernetes kubectl delete documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Azure setup-kubectl GitHub Action documentation: https://github.com/Azure/setup-kubectl
- GitHub upload-artifact Action documentation: https://github.com/actions/upload-artifact

## Issues Found
- The PromQL p99 latency example used `histogram_quantile` directly over `rate(http_request_duration_seconds_bucket[...])`. For an overall classic histogram quantile, the bucket series should be aggregated with `sum by (le)`. Updated the query accordingly.
- `is_within_tolerance` divided by `baseline` without handling a zero baseline. Added a zero-baseline guard to avoid a runtime `ZeroDivisionError`.
- The safety threshold docstring described "50% degradation" while the implementation compares absolute error-rate points. Updated the wording to "50 percentage points" to match the code.
- The network latency method said it used `tc`, but the example actually applies a Chaos Mesh `NetworkChaos` CRD. Updated the docstring.
- The `PodChaos` example used an inline `scheduler` field under `PodChaos`, but current Chaos Mesh scheduling is represented by a separate `Schedule` resource. Removed the unsupported scheduler block from the one-time pod kill example.
- The `PodChaos` and `ResourceChaos` classes called `_apply_manifest` without defining it. Added the missing helper methods and rollback methods so the examples are syntactically complete and operational in the same style as the `NetworkChaos` example.
- The GitHub Actions workflow used `azure/setup-kubectl@v3` and implied it set up a cluster. Updated it to the documented `azure/setup-kubectl@v4` usage and added an explicit kubeconfig setup step before Helm and experiment commands run.

## Review Notes
The examples remain illustrative and assume the target cluster already has matching application labels, appropriate RBAC permissions, and a valid `KUBECONFIG` secret for CI. Chaos Mesh supports richer scheduling through `Schedule` resources and workflows, which would be a good future expansion if the post needs recurring experiment examples.
