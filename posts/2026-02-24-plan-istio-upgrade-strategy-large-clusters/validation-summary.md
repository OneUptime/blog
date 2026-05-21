# Validation Summary: How to Plan an Istio Upgrade Strategy for Large Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecars
- Prometheus and PromQL
- Bash scripting

## Sources Consulted
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio pilot-discovery command and exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Prometheus promtool command reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/

## Issues Found
- The namespace inventory command for revision labels counted the table header as a namespace. I added `--no-headers` and changed the counting logic to count only namespaces whose revision column is not `<none>`.
- The sidecar count command counted the `istioctl proxy-status` header row. I changed it to skip the first line before counting.
- The control plane metrics list included `pilot_xds_push_errors`, which is not listed in the current Istio exported metrics reference, and described `pilot_xds_pushes` as a config push rate. I replaced these with current documented metrics for push triggers and XDS error/reject signals.
- The Prometheus `promtool query instant` commands omitted the required Prometheus server argument. I added `http://localhost:9090`, which is appropriate when executing inside the Prometheus deployment.
- The automation script comment said it checked that the error rate did not spike, but the script only captured and printed the metric values. I changed the comment to accurately describe the code.

## Review Notes
The guide is conceptually aligned with Istio's documented canary upgrade approach: install a new revision, remove `istio-injection` where needed, apply `istio.io/rev`, restart workloads to trigger re-injection, validate with `istioctl proxy-status`, and remove the old control plane after migration. The resource sizing values are reasonable planning examples but should still be calibrated against each cluster's actual istiod telemetry and load profile.
