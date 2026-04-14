# Validation Summary: How to Choose Between Dapr HTTP and gRPC APIs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar runtime for microservices)
- HTTP API (Dapr service invocation and state management)
- gRPC API (Dapr service invocation via SDKs)
- Python Dapr SDK (`dapr-client`)
- JavaScript/TypeScript Dapr SDK (`@dapr/dapr`)
- Kubernetes (Dapr sidecar injection annotations)
- Protobuf (referenced in gRPC context)

## Sources Consulted
- Dapr Service Invocation API reference — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr State Management API reference — https://docs.dapr.io/reference/api/state_api/
- Dapr CLI `dapr run` reference (default ports) — https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Kubernetes annotations reference — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Python SDK source and docs — https://github.com/dapr/python-sdk and https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr JavaScript SDK source and docs — https://github.com/dapr/js-sdk

## Issues Found
No technical issues found.

## Review Notes
- The Python SDK example uses `response.data` which returns raw bytes. While correct, `response.text()` or `response.json()` would produce cleaner output in practice. This is a stylistic preference, not an error.
- The performance comparison table is presented as a "rough benchmark" which is appropriate — actual numbers vary significantly by payload size, infrastructure, and connection reuse settings.
- The HTTP "Per-request" connection overhead claim in the table is a simplification (HTTP/1.1 keep-alive and HTTP/2 multiplexing can reuse connections), but is reasonable in the context of a rough comparison and typical curl usage patterns.
- The JavaScript SDK constructor uses the v3.x options-object API. In v2.x, positional arguments were used instead. The current code is correct for the latest SDK version (v3.6.0).
