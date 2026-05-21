# Validation Summary: How to Handle mTLS Rollout for Large Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio PeerAuthentication
- Istio mutual TLS and auto mTLS
- Istio telemetry metrics
- Kubernetes
- kubectl
- Prometheus PromQL
- jq

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Mutual TLS Migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio Understanding TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Installing the Sidecar: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The port-level PeerAuthentication example used `portLevelMtls` without a workload selector. Istio documents that `portLevelMtls` only applies when a workload selector is specified, and that the port is the workload port rather than the Kubernetes Service port. Updated the explanation to refer to workloads, added the workload-port caveat, and added a selector to the YAML example.

## Review Notes
- The Istio API version `security.istio.io/v1`, `PeerAuthentication` fields, `STRICT` and `PERMISSIVE` modes, and mesh/root namespace examples are current.
- The PromQL examples use standard Istio metric and label names for HTTP/gRPC request telemetry.
- The automation example is syntactically plausible, but checking `istiod` logs is only a coarse safeguard. In a production rollout, namespace-specific service SLOs, Prometheus error-rate queries, and smoke tests would be better rollback gates.
