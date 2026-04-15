# Validation Summary: How to Debug Dapr Networking Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Dapr (sidecar architecture, mTLS, service invocation)
- Kubernetes (kubectl, pods, deployments, network policies, CoreDNS)
- Networking (DNS resolution, TLS/mTLS, gRPC, HTTP)

## Sources Consulted
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr Kubernetes overview and port reference: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- Dapr CLI reference (mtls subcommands): https://docs.dapr.io/reference/cli/dapr-mtls/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Kubernetes NetworkPolicy API: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found

1. **Health endpoint response format (Step 2)**: The post claimed `curl http://localhost:3500/v1.0/healthz` returns `{"status": "pass"}`. The Dapr health endpoint actually returns HTTP 204 with no body when healthy. Fixed the curl command to use `-o /dev/null -w "%{http_code}\n" -s` flags so readers can see the status code, and updated the expected output to `204`.

2. **Annotating a running pod for log level (Step 3)**: The post used `kubectl annotate pod order-service-abc123 dapr.io/log-level=debug` to enable debug logging. Dapr annotations are read only at sidecar injection time (by the mutating webhook), so annotating an already-running pod has no effect. Removed the ineffective command and added a reference to Step 6, which correctly patches the deployment to trigger a rollout with the new annotation.

3. **Certificate file path (Step 3)**: The post claimed workload certificates are at `/var/run/secrets/dapr.io/tls/tls.crt`. Dapr's Sentry service issues short-lived workload certificates that are held in-memory by the sidecar, not stored on disk at that path. Replaced with the correct `dapr mtls expiry` CLI command and `dapr mtls export` for direct certificate inspection.

4. **Missing internal gRPC port in network policy (Step 5)**: The post listed only ports 3500 and 50001 for network policies. Sidecar-to-sidecar communication uses the internal gRPC port (50002 by default), which was omitted. Added port 50002 to the network policy YAML, the connectivity test command, and the descriptive text.

## Review Notes
- The NetworkPolicy example uses `dapr.io/enabled: "true"` as a pod label selector. This is actually a Dapr annotation (used for sidecar injection), not a label. Users will need to ensure their pods have a matching label or adjust the selector. This is acceptable as an illustrative example but could be clarified in a future update.
- The `dapr mtls expiry` command checks the root CA certificate expiry, not individual workload certificate expiry. Workload certificates are short-lived (default 24h TTL) and auto-rotated by the sidecar, so root CA expiry is typically the more relevant concern for debugging.
