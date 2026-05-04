# Validation Summary: How to Set Up Cost Management for Rancher Clusters

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenCost (Helm chart, allocation API, custom pricing, cloud integration)
- Kubecost (referenced)
- Vertical Pod Autoscaler (VPA, Fairwinds chart)
- Kubernetes (LimitRange, kubectl, jsonpath, deployments, PVCs)
- Prometheus + PrometheusRule (monitoring.coreos.com/v1)
- Helm
- AWS (Athena/CUR-based cost integration)
- Rancher (target platform)

## Sources Consulted
- OpenCost Helm chart values: https://github.com/opencost/opencost-helm-chart (charts/opencost/values.yaml)
- OpenCost API reference: https://www.opencost.io/docs/integrations/api
- OpenCost API examples: https://www.opencost.io/docs/integrations/api-examples
- OpenCost cloud integration & custom pricing docs: https://www.opencost.io/docs/configuration/
- Fairwinds VPA Helm chart: https://github.com/FairwindsOps/charts/tree/master/stable/vpa
- Kubernetes VPA API reference: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md
- Kubernetes LimitRange / PrometheusRule reference docs

## Issues Found

1. **Step 1 — incomplete external-Prometheus Helm flags.** The original `helm install` only set `opencost.prometheus.internal.enabled=false` and `opencost.prometheus.external.url=...`. The chart also requires `opencost.prometheus.external.enabled=true` for the external block to take effect. Added the missing `--set opencost.prometheus.external.enabled=true` flag.

2. **Step 2 — invented Helm values for cloud integration and custom pricing.** Several keys did not exist in the official `opencost/opencost` Helm chart:
   - `opencost.cloudProviderApiKey` — not a chart value.
   - `opencost.cloudCostLabel` — not a chart value.
   - `opencost.cloudIntegration.aws.{enabled, region, spotDataBucket, spotDataPrefix, projectID}` — wrong structure. Cloud integration is supplied via `opencost.cloudIntegrationJSON` (inline JSON) or `opencost.cloudIntegrationSecret` (existing Secret). The AWS block uses Athena-based fields (`athenaBucketName`, `athenaRegion`, `athenaDatabase`, `athenaTable`, `projectID`, `serviceKeyName`, `serviceKeySecret`). Cloud-cost ingestion is gated by the separate `opencost.cloudCost.enabled` toggle.
   - `opencost.customPricesEnabled` and `opencost.customPrices.{cpu, memory, storage}` — wrong path and field names. Correct path is `opencost.customPricing.{enabled, provider, costModel}`, and the cost-model keys are uppercase `CPU`, `RAM`, `storage`.
   Rewrote the entire `opencost-values.yaml` block to use the correct schema while preserving the same intent and the same custom price values.

3. **Step 3 — wrong API endpoint and wrong jq response shape.** The original `curl http://localhost:9003/model/allocation/query` used the legacy Kubecost path. The OpenCost endpoint is `/allocation` (default port 9003). The jq pipeline `.data[].sets[].allocations | to_entries[]` was also wrong — the `/allocation` response has no `sets` or `allocations` keys; `data` is an array of objects, each directly keyed by the aggregation dimension. Updated both `curl` calls to hit `/allocation` and rewrote the jq to `.data[] | to_entries[] | { ... }` (and `.data[]` for the team-label query).

4. **Step 7 — incorrect PromQL cost expression.** `container_cpu_usage_seconds_total` is a monotonically increasing counter (cumulative CPU seconds), so summing it directly and multiplying by `0.031611 * 730` does not yield monthly cost. Wrapped it in `rate(...[5m])` so the expression yields current vCPU usage, then `* 730` (hours/month) `* 0.031611` ($/vCPU-hour) gives a meaningful projected monthly cost.

## Review Notes

- The Fairwinds VPA install command (`helm install vpa fairwinds-stable/vpa --namespace vpa-system --create-namespace`) is valid; the upstream README uses namespace `vpa` instead of `vpa-system`, but the namespace name is user-chosen and `vpa-system` works fine.
- VPA API examples (`autoscaling.k8s.io/v1`, `kind: VerticalPodAutoscaler`, `updatePolicy.updateMode: "Off"`) are correct.
- LimitRange (`v1`) and PrometheusRule (`monitoring.coreos.com/v1`) examples are syntactically correct.
- Step 5's `docker image prune` only applies to nodes still using the Docker container runtime; modern Kubernetes (1.24+) typically uses containerd, where the equivalent is `crictl rmi --prune`. Left as-is since dockershim-based clusters still exist and the post does not claim it works for all runtimes.
- The OpenCost `cloudIntegrationJSON` example contains placeholder credentials (`AKIA...`, `secret`) — readers must replace them and ideally use `cloudIntegrationSecret` referencing a real Secret in production.
- Cost figures used as examples ($0.031611/vCPU-hr, $0.004237/GB-hr, etc.) match common AWS on-demand approximations — kept the original numbers since they are illustrative, not normative.
