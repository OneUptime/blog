# Validation Summary: How to Configure Mesh-Wide mTLS Policy in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- PeerAuthentication
- Mutual TLS (mTLS)
- Kubernetes
- kubectl
- istioctl
- Prometheus metrics

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Mutual TLS Migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio MeshConfig reference for rootNamespace: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/

## Issues Found
- The post described `DISABLE` as turning off mTLS mesh-wide without caveat. Updated the text to specify that this applies in sidecar mode and that `DISABLE` is not supported in ambient mode, matching the current PeerAuthentication reference.
- The post claimed that port-level mTLS settings could be used in a mesh-wide PeerAuthentication policy. Current Istio documentation says `portLevelMtls` only applies when a workload selector is specified, and that the port refers to the workload port rather than the Kubernetes Service port. Updated the section and YAML example to show a workload-selected policy instead of a root-namespace mesh-wide port exception.

## Review Notes
The remaining PeerAuthentication examples use the current `security.istio.io/v1` API and valid `STRICT`, `PERMISSIVE`, and `DISABLE` modes. The `istioctl analyze --all-namespaces` and `istioctl x describe pod` commands align with current Istio documentation. The Prometheus metric labels used in the monitoring examples are present in Istio standard metrics, though operators should confirm that their Telemetry configuration has not suppressed or customized those labels.
