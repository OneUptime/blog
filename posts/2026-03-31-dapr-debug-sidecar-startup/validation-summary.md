# Validation Summary: How to Debug Dapr Sidecar Startup Failures

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (kubectl, pod annotations, namespaces)
- daprd sidecar container
- Dapr sidecar injector (dapr-sidecar-injector)
- Dapr placement service
- Dapr sentry (mTLS certificate authority)

## Sources Consulted
- Dapr Kubernetes Overview — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- Dapr Kubernetes Annotations Reference — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-annotations/
- Dapr Configuration Overview — https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Troubleshooting Common Issues — https://docs.dapr.io/operations/troubleshooting/common_issues/
- Dapr Production Guidelines — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/

## Issues Found

### 1. Wrong component identified for sidecar injection (High severity)
- **What was wrong:** The post stated "The Dapr operator runs in the `dapr-system` namespace and patches pod specs" for sidecar injection. The Dapr operator handles control plane operations, not sidecar injection. The dedicated `dapr-sidecar-injector` component handles injection.
- **What was changed:** Replaced "The Dapr operator" with "The Dapr sidecar injector (`dapr-sidecar-injector`)" in the introduction.

### 2. Wrong log target for injection failures (High severity)
- **What was wrong:** The section "Checking the Dapr Operator Logs" directed readers to check `dapr-operator` logs when injection fails. Since injection is handled by `dapr-sidecar-injector`, this sends readers to the wrong logs.
- **What was changed:** Renamed the section to "Checking the Dapr Sidecar Injector Logs", updated the kubectl command to use `-l app=dapr-sidecar-injector`, and changed "operator errors" to "injector errors". Also updated the Summary section reference.

### 3. Fabricated Configuration CRD fields (High severity)
- **What was wrong:** The post included a Configuration CRD YAML example with `sidecarResourceRequests` and `sidecarResourceLimits` fields. These fields do not exist in the Dapr Configuration spec. The official docs state that sidecar resources should be set via per-pod annotations only.
- **What was changed:** Removed the entire fabricated Configuration CRD YAML block. The section now only shows the correct annotation-based approach.

### 4. Fabricated init container section (High severity)
- **What was wrong:** The "Init Container Issues" section referenced a `dapr-init` init container for certificate injection. Dapr does not use init containers for certificate injection — certificates are distributed by the Dapr Sentry service and the injector sets the relevant environment variables. The container name `dapr-init` does not appear in official documentation.
- **What was changed:** Removed the entire "Init Container Issues" section.

## Review Notes
- The per-pod annotations for sidecar resource limits (`dapr.io/sidecar-cpu-request`, `dapr.io/sidecar-memory-request`, `dapr.io/sidecar-cpu-limit`, `dapr.io/sidecar-memory-limit`) are correct per official documentation.
- The post's description mentions "analyzing init container logs" which is now slightly misaligned after removing the init container section, but since we are only fixing technical errors (not metadata), this was left as-is.
- The kubectl commands for checking pod containers, annotations, and sidecar logs are all correct.
- The placement service troubleshooting guidance is accurate for actor-based workloads.
- The official troubleshooting docs also mention that firewall rules must permit webhook communication on ports 4000 and 19443, which could be a useful addition in a future update.
