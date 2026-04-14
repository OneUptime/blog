# Validation Summary: How to Conduct Dapr Chaos Engineering Tests

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (v1.10+) — Resiliency policies, sidecar architecture, metrics
- Chaos Mesh — PodChaos, NetworkChaos experiments
- Kubernetes — pod management, kubectl CLI
- Prometheus — Dapr metrics querying
- GitHub Actions — CI/CD chaos test automation
- Helm — Chaos Mesh installation
- Redis — state store component

## Sources Consulted
- Dapr Resiliency spec documentation (https://docs.dapr.io/operations/resiliency/resiliency-overview/)
- Dapr observability / metrics documentation (https://docs.dapr.io/operations/observability/metrics/)
- Chaos Mesh PodChaos documentation (https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/)
- Chaos Mesh NetworkChaos documentation (https://chaos-mesh.org/docs/simulate-network-chaos-on-kubernetes/)
- Chaos Mesh Helm installation guide (https://chaos-mesh.org/docs/production-installation-using-helm/)
- Other validated posts in this blog for consistent Dapr metric naming conventions

## Issues Found
1. **Prometheus metric label name**: The PromQL query used `status_code` as the label name for HTTP status codes (`dapr_http_server_request_count{status_code=~"5.."}`). The correct label name in Dapr metrics is `status`, not `status_code`. Fixed to `dapr_http_server_request_count{status=~"5.."}`.

## Review Notes
- The `pod-kill` action in Chaos Mesh (Test 4 - Redis failure) is a one-shot operation. The `duration: "60s"` field controls how long the experiment object stays in "running" state, but it does not repeatedly kill the pod during that window. If repeated kills are intended, a Chaos Mesh `Schedule` resource would be needed. The current YAML is syntactically valid and the test will work (Kubernetes will restart the Redis pod, causing a brief outage), but readers should understand pod-kill is instantaneous. The same applies to `container-kill` in Test 1.
- The Resiliency policy's exponential retry does not specify an initial `duration` (backoff interval), so it will use the library default. This is valid but could be made explicit for clarity.
- The CI/CD pipeline example is intentionally simplified and assumes a pre-configured Kubernetes cluster with kubeconfig available to the GitHub Actions runner.
