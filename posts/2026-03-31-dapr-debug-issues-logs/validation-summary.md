# Validation Summary: How to Debug Dapr Issues Using Logs

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (kubectl CLI)
- Dapr sidecar (daprd)
- Dapr control plane components (sentry, sidecar-injector, operator)
- mTLS / certificate management
- OpenSSL
- jq (JSON processing)

## Sources Consulted
- Dapr Sidecar Injector overview: https://docs.dapr.io/concepts/dapr-services/sidecar-injector/
- Dapr Operator overview: https://docs.dapr.io/concepts/dapr-services/operator/
- Dapr mTLS configuration: https://docs.dapr.io/operations/security/mtls/
- Dapr arguments and annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr common troubleshooting issues: https://docs.dapr.io/operations/troubleshooting/common_issues/
- Dapr Kubernetes overview: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found

1. **Incorrect label selector for Dapr app ID (line 61)**: The command `kubectl get pods -l dapr.io/app-id=inventory-service` used `-l` (label selector), but `dapr.io/app-id` is a Kubernetes annotation, not a label. The `-l` flag only filters by labels and would return no results. Fixed by replacing with `kubectl get pods -o custom-columns=... | grep inventory-service` which queries the annotation directly.

2. **Wrong syntax highlighting for log output (line 80)**: A log line example was wrapped in a ` ```toml ` code block, but the content is a plain text log line, not TOML format. Changed to ` ```text `.

3. **Wrong control plane component for sidecar injection (line 112)**: The post directed readers to check `dapr-operator` logs for sidecar injection failures. Sidecar injection is handled by `dapr-sidecar-injector` (a mutating admission webhook), not the operator. The operator manages component updates and service endpoints. Fixed the deployment name from `dapr-operator` to `dapr-sidecar-injector`.

## Review Notes
- The `jq` command for filtering debug logs (`jq -c 'select(.level == "debug")'`) assumes Dapr outputs JSON-formatted logs, which is the default. This is correct but worth noting that if a user has configured a different log format, the command would not work as expected.
- The trust bundle secret name `dapr-trust-bundle` and the key `issuer.crt` were verified as correct against official Dapr mTLS documentation.
- All kubectl commands use correct flags and syntax.
- The Dapr annotations `dapr.io/log-level` and `dapr.io/enable-api-logging` are correct per the official annotations reference.
