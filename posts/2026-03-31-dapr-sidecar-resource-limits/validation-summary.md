# Validation Summary: How to Configure Dapr Sidecar Resource Limits

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Dapr (sidecar architecture, daprd)
- Kubernetes (Deployments, annotations, resource requests/limits)
- Helm (Dapr chart configuration)
- Prometheus (alerting rules, cAdvisor metrics)
- Vertical Pod Autoscaler (VPA)

## Sources Consulted
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr production guidelines on Kubernetes: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Helm chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr sidecar (daprd) overview: https://docs.dapr.io/concepts/dapr-services/sidecar/
- Dapr configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Kubernetes VPA documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- cAdvisor Prometheus metrics: https://github.com/google/cadvisor/blob/master/metrics/prometheus.go

## Issues Found

1. **Probe annotations missing `-seconds` suffix**: The liveness and readiness probe annotations for delay, timeout, and period were missing the `-seconds` suffix. For example, `dapr.io/sidecar-liveness-probe-delay` was corrected to `dapr.io/sidecar-liveness-probe-delay-seconds`. The threshold annotations correctly had no suffix and were left unchanged.

2. **Incorrect Helm values structure**: The blog used a non-existent `dapr_sidecar_injector.defaultContainerConfig` Helm value path. Corrected to use the actual flat Helm values: `sidecarCPURequest`, `sidecarMemoryRequest`, `sidecarCPULimit`, `sidecarMemoryLimit` under `dapr_sidecar_injector`.

3. **Incorrect ConfigMap reference**: The blog referenced a ConfigMap named `dapr-config` in the `dapr-system` namespace. Dapr does not use a ConfigMap for this; it uses a custom resource of kind `Configuration` (apiVersion `dapr.io/v1alpha1`) named `daprsystem`. Corrected Method 3 to reference the proper CRD and clarified that sidecar resource limits are not set via the Configuration resource.

4. **`dapr.io/sidecar-drop-all-capabilities` is not a per-pod annotation**: This was presented as a pod annotation alongside `dapr.io/sidecar-seccomp-profile-type`. In reality, dropping all capabilities is only available as a global Helm value (`dapr_sidecar_injector.sidecarDropALLCapabilities`), not as a per-pod annotation. Corrected the Security Context section to separate the per-pod annotation from the Helm-only setting.

## Review Notes
- The sizing guidelines (low/medium/high traffic) are reasonable rules of thumb but are not from official Dapr documentation. They are presented as guidelines, which is appropriate.
- The Prometheus alert expressions use standard cAdvisor metrics and are technically correct. The CPU alert threshold of 0.8 represents 80% of one core, which may need adjustment depending on the configured limit.
- The `dapr.io/sidecar-image` annotation references version `1.14.0`, which may become outdated. This is acceptable as a reference example.
- The VPA configuration is valid standard Kubernetes VPA usage and correctly targets the `daprd` container.
