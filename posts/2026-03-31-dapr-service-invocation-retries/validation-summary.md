# Validation Summary: How to Handle Retries in Dapr Service Invocation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (resiliency API, service invocation)
- Kubernetes (kubectl, pod logs)
- YAML (resiliency resource configuration)
- Node.js / Express (idempotency example)
- gRPC (status codes)

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Retry Policies: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Resiliency Schema Reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Service Invocation Resiliency Quickstart: https://docs.dapr.io/getting-started/quickstarts/resiliency/resiliency-serviceinvo-quickstart/
- gRPC Status Codes: https://grpc.github.io/grpc/core/md_doc_statuscodes.html

## Issues Found
1. **Misleading jitter section title and framing**: The section "Adding Jitter to Prevent Thundering Herd" implied that jitter needed to be explicitly configured. In reality, Dapr automatically applies jitter to exponential backoff retries using a random multiplier between 0.5 and 1.5 — no explicit configuration is needed. The section actually demonstrated the `matching` feature (filtering which errors trigger retries), not jitter configuration. Renamed the section to "Jitter and Matching Status Codes" and added a clarifying sentence about automatic jitter.

2. **gRPCStatusCodes used string names instead of numeric codes**: The blog used `"UNAVAILABLE,RESOURCE_EXHAUSTED"` but Dapr's `gRPCStatusCodes` field expects numeric codes and ranges (e.g., `"8,14"`). UNAVAILABLE is code 14 and RESOURCE_EXHAUSTED is code 8. Changed to `"8,14"`.

## Review Notes
- The Resiliency resource YAML structure (apiVersion, kind, spec.policies.retries, spec.targets.apps) is correct per official Dapr documentation.
- All retry policy parameters (`policy`, `maxRetries`, `duration`, `maxInterval`) use correct field names and valid values.
- The self-hosted mode instructions using `--resources-path` are correct.
- The `matching` block structure with `httpStatusCodes` and `gRPCStatusCodes` is a real, documented Dapr feature.
- The idempotency guidance is sound practical advice for retry-enabled services.
- The `maxRetries` default in Dapr is `-1` (unlimited), which is worth noting — setting an explicit limit as shown in the post is good practice.
