# Validation Summary: How to Handle Cold Starts with Dapr Serverless

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar, resiliency policies, health endpoints, metrics)
- Kubernetes (Deployments, DaemonSets, probes, events)
- KEDA (ScaledObject for autoscaling)
- Docker (distroless base images)
- Prometheus (PromQL histogram queries)

## Sources Consulted
- Dapr Resiliency spec: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Retry policies: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Kubernetes annotations: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr health endpoints: https://docs.dapr.io/reference/api/health_api/
- Dapr metrics reference: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr metrics list (GitHub): docs/development/dapr-metrics.md
- KEDA ScaledObject spec: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- Kubernetes DaemonSet docs: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes registry migration: https://kubernetes.io/blog/2023/02/06/k8s-gcr-io-freeze-announcement/

## Issues Found

1. **Resiliency policy `gRPCStatusCodes` used symbolic name instead of numeric code.**
   - Wrong: `gRPCStatusCodes: "UNAVAILABLE"`
   - Fixed: `gRPCStatusCodes: "14"`
   - Why: Dapr's `matching.gRPCStatusCodes` field requires numeric gRPC status codes, not symbolic names. The UNAVAILABLE status corresponds to code 14.

2. **Prometheus metric name was incorrect.**
   - Wrong: `dapr_http_server_request_latency_ms_bucket`
   - Fixed: `dapr_http_server_latency_bucket`
   - Why: The actual Dapr HTTP server latency histogram metric is `dapr_http_server_latency`, which Prometheus exposes with the `_bucket` suffix. There is no metric named `dapr_http_server_request_latency_ms_bucket`.

3. **DaemonSet template was missing required `metadata.labels`.**
   - Added `metadata.labels.name: image-prepuller` under `spec.template`.
   - Why: Kubernetes requires `spec.selector.matchLabels` to match `spec.template.metadata.labels`. The API server rejects DaemonSets where these don't match.

4. **DaemonSet used deprecated pause image registry.**
   - Wrong: `gcr.io/google_containers/pause`
   - Fixed: `registry.k8s.io/pause:3.10`
   - Why: The `gcr.io/google_containers` registry is deprecated and `k8s.gcr.io` was frozen in April 2023. The current registry is `registry.k8s.io`.

5. **kubectl events sort field is unreliable on newer clusters.**
   - Wrong: `--sort-by='.lastTimestamp'`
   - Fixed: `--sort-by='.metadata.creationTimestamp'`
   - Why: Newer Kubernetes components populate `eventTime` instead of `lastTimestamp`, which can be null and cause unpredictable sorting. `metadata.creationTimestamp` is always populated.

## Review Notes
- The KEDA ScaledObject example omits the `triggers` array, which is required for the ScaledObject to actually scale. This is acceptable in context since the snippet is illustrating `minReplicaCount` configuration, not a complete KEDA setup.
- The "Typical Dapr Cold Start Timeline" section provides illustrative timing values. Actual cold start times vary significantly based on cluster configuration, image sizes, and component count. The relative ordering of events is accurate.
- The `cooldownPeriod` in the KEDA ScaledObject only applies when scaling to zero; scaling between 1-N replicas is governed by the HPA stabilization window.
- All six Dapr annotations used in the post are valid and correctly documented.
- The `/v1.0/healthz/outbound` health endpoint on port 3500 is correctly used as a startup probe — it checks component initialization and HTTP port availability without requiring the app channel.
