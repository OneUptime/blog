# Validation Summary: How to Fix Dapr Connection Timeout Errors

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency policies
- Dapr Redis state store component
- Dapr Configuration spec
- Dapr Dashboard
- Kubernetes (network policies, kubectl)
- Python (requests library)
- gRPC / HTTP

## Sources Consulted
- Dapr Resiliency policy specification: https://docs.dapr.io/operations/resiliency/
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Configuration spec: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr API allowlist documentation: https://docs.dapr.io/operations/configuration/api-allowlist/
- Dapr service invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr default ports and networking: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- Dapr Dashboard documentation: https://docs.dapr.io/reference/cli/dapr-dashboard/

## Issues Found

### Issue 1: gRPC and HTTP Timeout Tuning section showed API allowlist instead of timeout configuration
- **What was wrong:** The section titled "gRPC and HTTP Timeout Tuning" included a Dapr Configuration YAML snippet (`spec.api.allowed`) that is actually an API access control allowlist, not timeout configuration. The Dapr Configuration spec does not have a general timeout field. This was misleading as it implied applying this config would tune timeouts.
- **What was changed:** Removed the incorrect Configuration YAML and replaced the explanation with a note that internal gRPC/HTTP timeouts between Dapr sidecars are controlled through Resiliency policies (already covered in the preceding section). The client-side Python timeout example was kept as-is since it is correct.
- **Why:** Presenting an API allowlist as timeout configuration could lead readers to apply the wrong fix and not resolve their actual timeout issues.

### Issue 2: Incorrect Dapr internal port number
- **What was wrong:** The post stated Dapr uses port 3501 as its "internal" port. Port 3501 is not a Dapr port.
- **What was changed:** Changed `3501 (internal)` to `50002 (internal gRPC)`, which is the actual default internal gRPC port used by Dapr for sidecar-to-sidecar communication.
- **Why:** Incorrect port numbers would cause readers to misconfigure their Kubernetes network policies, potentially leaving the actual internal gRPC port (50002) blocked.

## Review Notes
- The Resiliency policy YAML, Redis component metadata fields (`dialTimeout`, `readTimeout`, `writeTimeout`), service invocation URL format, kubectl commands, Dapr dashboard port (8080), and Python requests example are all correct.
- The post could benefit from mentioning additional Dapr ports (9090 for metrics, 7777 for profiling) that may also need network policy rules, but this is not an error.
- The `connection refused` error example on line 20 is technically a different class of error from a timeout (immediate refusal vs. waiting), but including it is reasonable since the troubleshooting steps overlap.
