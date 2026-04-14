# Validation Summary: How to Understand the Dapr Sidecar Architecture

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr sidecar (`daprd`)
- Dapr CLI
- Kubernetes (sidecar injection, annotations)
- gRPC and HTTP APIs
- mTLS
- Prometheus metrics
- Zipkin / Jaeger / OTLP tracing
- Redis, Kafka (as example components)

## Sources Consulted
- Dapr official documentation: https://docs.dapr.io/concepts/dapr-services/sidecar/
- Dapr sidecar API reference: https://docs.dapr.io/reference/api/
- Dapr CLI reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr building blocks overview: https://docs.dapr.io/developing-applications/building-blocks/
- Dapr observability/tracing configuration: https://docs.dapr.io/operations/observability/tracing/
- Dapr sidecar injector documentation: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- Dapr `daprd` arguments reference: https://docs.dapr.io/reference/arguments-annotations-overview/

## Issues Found
1. **Deprecated `--components-path` flag and path**: The `daprd` command example used `--components-path ~/.dapr/components`, which was deprecated in Dapr 1.9+ in favor of `--resources-path`. The default directory was also renamed from `~/.dapr/components` to `~/.dapr/resources`. Updated to `--resources-path ~/.dapr/resources` to reflect the current Dapr convention.

## Review Notes
- The port table lists port 3501 as the health endpoint. This is correct for recent Dapr versions (1.13+) where the `--dapr-public-port` flag defaults to 3501, serving health and metadata endpoints on a dedicated port separate from the main HTTP API.
- The internal gRPC port (50002) is described as "Dapr internal gRPC (operator)". While correct, this port is also used for sidecar-to-sidecar internal communication, not exclusively operator communication. The description is acceptable but slightly incomplete.
- All Kubernetes annotations (`dapr.io/app-health-check-path`, `dapr.io/app-health-probe-interval`, `dapr.io/graceful-shutdown-seconds`) are valid and correctly formatted.
- The building blocks list is comprehensive and includes newer additions like Workflow, Distributed Lock, and Cryptography.
- All mermaid diagrams are syntactically correct and accurately represent the described flows.
- The curl command for the state API is correct (POST with JSON array of key-value objects).
- The tracing Configuration resource uses the correct `dapr.io/v1alpha1` apiVersion and valid field structure.
