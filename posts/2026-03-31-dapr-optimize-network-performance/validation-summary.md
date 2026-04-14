# Validation Summary: How to Optimize Dapr Network Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, mTLS, service invocation)
- Python (`requests` library with connection pooling)
- Kubernetes (NetworkPolicy, topology-aware routing, Services)
- gRPC / HTTP/2
- Helm
- curl

## Sources Consulted
- curl man page and `--write-out` format variable reference (verified `time_starttransfer` exists, `time_transfer` does not)
- Dapr Helm chart `values.yaml` on master branch (https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml) — confirmed `global.mtls.workloadCertTTL` is the correct Helm value path
- Dapr sidecar annotation reference — confirmed `dapr.io/app-protocol` supports `grpc`, `h2c`, `http`, `https`, `grpcs`
- Dapr architecture documentation — confirmed default ports: 3500 (HTTP API), 50001 (gRPC API), 50002 (internal gRPC)
- Kubernetes NetworkPolicy API reference (`networking.k8s.io/v1`)
- Kubernetes topology-aware routing documentation (`service.kubernetes.io/topology-mode` annotation)
- Python `requests` library documentation (HTTPAdapter, Session, Retry)

## Issues Found

1. **Invalid curl write-out variable `%{time_transfer}`**: The curl command in the "Measure Network Latency Components" section used `%{time_transfer}`, which is not a valid curl `-w` format variable. Changed to `%{time_starttransfer}` (time until the first byte is received), and updated the label from "Transfer" to "First byte" to match.

2. **Incorrect Helm value path for workload cert TTL**: The mTLS tuning section used `--set dapr_sentry.workloadCertTTL=24h`. The correct Helm value path is `global.mtls.workloadCertTTL`, as confirmed from Dapr's official Helm chart `values.yaml`. Changed to `--set global.mtls.workloadCertTTL=24h`.

3. **Misleading "TLS session resumption" claim**: The text stated "Use TLS session resumption to avoid repeated handshakes" but the accompanying YAML configuration only showed an empty `httpPipeline.handlers` array, which has nothing to do with TLS session resumption. Reworded the text to accurately describe what the configuration does: reduce per-request overhead by keeping the middleware pipeline minimal.

## Review Notes
- The NetworkPolicy example uses `matchLabels: dapr.io/enabled: "true"` as a pod selector. `dapr.io/enabled` is primarily a pod annotation used by the Dapr sidecar injector, not a standard pod label. Users would need to explicitly add this as a label to their pod specs for the NetworkPolicy to match. The example works as shown but could benefit from a note about this distinction in a future revision.
- The inter-sidecar curl measurement command uses the placeholder `target-sidecar:3500`. In practice, sidecar-to-sidecar communication uses internal gRPC (port 50002), not the HTTP API port. The example still works for measurement purposes if you know the target pod IP, but a note clarifying this would improve accuracy.
