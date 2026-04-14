# Validation Summary: How to Present Dapr Benefits to Your Engineering Team

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Python SDK (`dapr-client`)
- Python (`redis` library)
- Kubernetes (`kubectl`)
- Zipkin (distributed tracing)
- Redis, PostgreSQL (as Dapr state store backends)

## Sources Consulted
- Dapr Python SDK source code (`dapr/clients/grpc/client.py`) — verified `save_state` method signature and type constraints (`Union[bytes, str]`)
- Dapr Configuration CRD specification — verified tracing YAML structure, `apiVersion: dapr.io/v1alpha1`, `samplingRate` as string type, and Zipkin endpoint format
- CNCF project landscape — verified Dapr graduated from CNCF in December 2024 (incubating since November 2021)
- Kubernetes CLI documentation — verified `kubectl top pods` command syntax

## Issues Found

1. **Dapr Python SDK `save_state` value type** (line 39): The `save_state` method only accepts `str` or `bytes` as the `value` parameter. Passing a Python dict directly raises `ValueError: invalid type for data <class 'dict'>`. Changed `d.save_state('statestore', 'order-123', order)` to `d.save_state('statestore', 'order-123', json.dumps(order))`.

2. **Outdated CNCF status** (line 60): The post stated Dapr is a "CNCF incubating project (as of 2021)". Dapr graduated from the CNCF in December 2024, which is a stronger signal of project health and more relevant when arguing against the "What if Dapr is abandoned?" objection. Updated to "CNCF graduated project (incubating since 2021, graduated in 2024)".

## Review Notes
- The Python code snippets are missing `import os`, `import json` imports, but this is acceptable for illustrative snippets in a blog post context.
- The `samplingRate: "1"` in the tracing config means 100% sampling, which is appropriate for a demo but would be too expensive for production. The post doesn't clarify this, but since the context is a demo presentation, this is acceptable.
- The daprd sidecar resource estimates (50m CPU, 80Mi memory) are reasonable typical values but will vary by workload and Dapr version.
