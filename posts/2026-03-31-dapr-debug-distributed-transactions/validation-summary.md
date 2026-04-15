# Validation Summary: How to Debug Distributed Transactions Using Dapr Traces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Zipkin (distributed tracing backend)
- OpenTelemetry (Python tracing API)
- Flask (Python web framework)
- W3C Trace Context (traceparent header)
- Python requests library

## Sources Consulted
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Tracing Overview: https://docs.dapr.io/operations/observability/tracing/tracing-overview/
- Dapr gRPC Tracing Source Code: https://github.com/dapr/dapr/blob/master/pkg/diagnostics/grpc_tracing.go
- Zipkin API v2 Specification: https://github.com/openzipkin/zipkin-api/blob/master/zipkin2-api.yaml
- W3C Trace Context Specification: https://www.w3.org/TR/trace-context/
- OpenTelemetry Python Trace API: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html

## Issues Found

### 1. Unused Flask import (`g`)
- **What was wrong:** The Python code example imported `g` from Flask (`from flask import Flask, request, g`) but never used it.
- **What was changed:** Removed `g` from the import statement: `from flask import Flask, request`.
- **Why:** Unused imports are a code quality issue and could confuse readers trying to follow the example.

### 2. Fabricated Dapr trace span names
- **What was wrong:** The "Debugging State Operations" section listed `DaprServiceInvocation` and `DaprStateOperation` as span names to look for in traces. These are not real Dapr span names and would not appear in Zipkin or Jaeger.
- **What was changed:** Updated to use actual Dapr span naming patterns: `CallLocal/<app-id>/<method>` for service invocations and `/v1.0/state/<store-name>` for state operations.
- **Why:** Dapr generates span names based on the invocation path or gRPC method, not these invented labels. Readers searching for `DaprServiceInvocation` in their traces would find nothing.

## Review Notes
- The OpenTelemetry Python import uses `import opentelemetry.trace as trace` rather than the more canonical `from opentelemetry import trace`. Both work identically, so this was left as-is.
- The Zipkin query parameter `annotationQuery=error` is valid per the Zipkin v2 API spec — it searches both annotations and tags, which will correctly match spans with error tags.
- The W3C traceparent parsing logic (`parts[1]` after splitting by `-`) correctly extracts the trace-id from the standard `{version}-{trace-id}-{parent-id}-{trace-flags}` format.
- The Dapr configuration YAML, service invocation API paths, and overall saga pattern implementation are all accurate.
