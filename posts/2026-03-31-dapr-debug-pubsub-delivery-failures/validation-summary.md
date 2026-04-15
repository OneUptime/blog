# Validation Summary: How to Debug Dapr Pub/Sub Delivery Failures

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, pub/sub building block)
- Kubernetes (kubectl, pod logs, port-forwarding, annotations)
- Apache Kafka (as example pub/sub broker)
- Zipkin (distributed tracing)
- Node.js / Express (subscriber handler example)
- gRPC (mentioned in retry semantics)

## Sources Consulted
- Dapr Metadata API Reference — https://docs.dapr.io/reference/api/metadata_api/
- Dapr Pub/Sub API Reference — https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Dead Letter Topics — https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr Pub/Sub Subscription Methods — https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr Arguments and Annotations Overview — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Zipkin Tracing Setup — https://docs.dapr.io/operations/observability/tracing/zipkin/
- Dapr Sidecar Overview — https://docs.dapr.io/concepts/dapr-services/sidecar/
- Debugging Dapr Services on Kubernetes — https://docs.dapr.io/developing-applications/debugging/debug-k8s/debug-dapr-services/
- Dapr API Logs Documentation — https://docs.dapr.io/operations/troubleshooting/api-logs-troubleshooting/
- Dapr Resiliency Policies — https://docs.dapr.io/operations/resiliency/

## Issues Found
1. **Incorrect port-forward command and service name**: The post used `kubectl port-forward svc/dapr-api 3500:80 -n dapr-system` to access the Dapr metadata API. There is no `dapr-api` service in the dapr-system namespace. The Dapr HTTP API (port 3500) is served by the daprd sidecar container within each application pod. Fixed to `kubectl port-forward <app-pod> 3500:3500`.

2. **Incorrect metadata API health status claim**: The post claimed the `/v1.0/metadata` endpoint returns `"status": "healthy"` for components. The metadata endpoint returns component name, type, version, and capabilities — but does not include a health status field. Rewrote the explanation to accurately describe what the endpoint returns and how to interpret a missing component as an initialization failure.

3. **Misleading "retry with backoff" claim for HTTP 500**: The post stated "Returning 500 triggers retry with backoff." Dapr does retry on 500, but automatic exponential backoff is not the default behavior — it requires configuring a Dapr resiliency policy. Updated to clarify that 500 triggers a retry and that backoff requires a resiliency policy.

## Review Notes
- The Zipkin span names `pubsub/publish` and `pubsub/subscribe` could not be definitively verified against official documentation, though the tracing Configuration CRD structure is correct. These span names are plausible based on Dapr's internal naming conventions but readers may need to inspect actual traces to confirm exact span names in their environment.
- The dead letter topic example uses `apiVersion: dapr.io/v1alpha1` for the Subscription CRD. Dapr also supports `dapr.io/v2alpha1` which uses a `routes` field instead of `route`. Both versions are valid, but the v2alpha1 format is the more current approach.
- The general advice and debugging workflow in the post is sound and follows Dapr best practices.
