# Validation Summary: How to Respond to Dapr Sidecar Crash Loops

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (kubectl CLI)
- Dapr mTLS certificate management
- Dapr Component CRDs (state.redis example)
- Dapr sidecar resource annotations

## Sources Consulted
- Dapr sidecar (daprd) overview: https://docs.dapr.io/concepts/dapr-services/sidecar/
- Dapr troubleshooting logs: https://docs.dapr.io/operations/troubleshooting/logs-troubleshooting/
- Dapr common issues: https://docs.dapr.io/operations/troubleshooting/common_issues/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr mTLS setup and configuration: https://docs.dapr.io/operations/security/mtls/
- Dapr CLI mtls expiry command: https://docs.dapr.io/reference/cli/dapr-mtls/dapr-mtls-expiry/
- Dapr CLI mtls renew-certificate command: https://docs.dapr.io/reference/cli/dapr-mtls/dapr-mtls-renew-certificate/
- Dapr Redis state store component: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr component spec: https://docs.dapr.io/reference/resource-specs/component-schema/
- Kubernetes: Determine Reason for Pod Failure: https://kubernetes.io/docs/tasks/debug/debug-application/determine-reason-pod-failure/

## Issues Found

### 1. Non-functional certificate expiry check command
- **What was wrong:** The command `kubectl get secret dapr-trust-bundle -n dapr-system -o yaml | grep expiry` does not work because the secret contains base64-encoded PEM certificates with no `expiry` field in the YAML. The grep would return nothing.
- **What was changed:** Replaced with `dapr mtls expiry`, the dedicated Dapr CLI command for checking mTLS certificate expiration.
- **Why:** The Dapr CLI command reads the root CA from the cluster and reports its expiration date directly.

### 2. Wrong unit for `--valid-until` flag
- **What was wrong:** `dapr mtls renew-certificate -k --valid-until 8760h` used hours (8760h = 365 days). The `--valid-until` flag accepts a number of days, not hours.
- **What was changed:** Corrected to `dapr mtls renew-certificate -k --valid-until 365`.
- **Why:** Per the Dapr CLI reference, `--valid-until` takes a number of days (default 365).

### 3. OOMKilled listed as a sidecar log message
- **What was wrong:** `OOMKilled` was listed as a message to look for in `kubectl logs` output. OOMKilled is a Kubernetes termination reason visible via `kubectl describe pod`, not in container logs. When a container is OOM-killed, the kernel terminates it immediately with no log entry.
- **What was changed:** Moved OOMKilled out of the log messages list and added a separate note with the correct `kubectl describe pod` command to check for OOMKill termination.
- **Why:** Users following the original instructions would not find OOMKilled in logs and might miss the actual diagnosis path.

## Review Notes
- The post correctly identifies the four main categories of sidecar crash causes (component misconfiguration, mTLS issues, resource exhaustion, control plane unavailability).
- The Dapr component YAML example, sidecar resource annotations, and Kubernetes commands are all accurate.
- The control plane components listed (operator, sentry, placement) are correct, though the sidecar injector (`dapr-sidecar-injector`) is also part of the control plane and could be mentioned in a future update.
