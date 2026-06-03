# Validation Summary: How to Set Up SPIFFE and SPIRE for Workload Identity in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- SPIFFE
- SPIRE
- SPIRE Server and Agent
- Kubernetes RBAC
- Go
- go-spiffe
- Istio
- Prometheus Operator ServiceMonitor

## Sources Consulted
- SPIFFE Quickstart for Kubernetes: https://spiffe.io/docs/latest/try/getting-started-k8s/
- SPIRE Server Configuration Reference: https://spiffe.io/docs/latest/deploying/spire_server/
- SPIRE Agent Configuration Reference: https://spiffe.io/docs/latest/deploying/spire_agent/
- SPIRE Telemetry Configuration: https://spiffe.io/docs/latest/deploying/telemetry_config/
- SPIRE Configuring SPIRE guide: https://spiffe.io/docs/latest/deploying/configuring/
- go-spiffe tlsconfig package documentation: https://pkg.go.dev/github.com/spiffe/go-spiffe/v2/spiffetls/tlsconfig
- Istio SPIRE integration documentation: https://istio.io/latest/docs/ops/integrations/spire/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/

## Issues Found
- The introduction described Kubernetes service account tokens as long-lived in general. Updated it to distinguish bearer service account tokens from legacy secret-backed tokens, since modern Kubernetes uses bound tokens by default.
- Helm was listed as a required prerequisite even though the tutorial uses raw manifests. Clarified that Helm is only needed when using Helm charts instead of these manifests.
- The SPIRE server manifest omitted the bundle ConfigMap, ConfigMap RBAC, and ClusterRoleBinding required for Kubernetes PSAT attestation and bundle publishing. Added the missing ConfigMap, Role, RoleBinding, and ClusterRoleBinding, and expanded RBAC to include pods as documented by SPIRE.
- The SPIRE server had liveness probes and a metrics Service but did not enable health checks or Prometheus telemetry in `server.conf`. Added `health_checks`, `telemetry`, readiness probe, and named health/metrics ports.
- The SPIRE agent manifest omitted Kubernetes API RBAC, projected service account token mounting for `k8s_psat`, kubelet node environment configuration, and health check configuration. Added the ClusterRole, ClusterRoleBinding, projected token volume, `MY_NODE_NAME`, and health/readiness probes.
- The registration commands created only the workload entry. Added the required node registration entry for the SPIRE agents before creating the workload entry.
- The Go mTLS example imported `crypto/tls` without using it, which would fail Go compilation. Removed the unused import while keeping the SPIFFE TLS configuration intact.
- The Istio example implied that setting a SPIRE bundle endpoint environment variable on Pilot configures SPIRE workload identity. Replaced that with a minimal trust-domain configuration and clarified that Istio's documented SPIRE SDS integration must be followed for Envoy to fetch identities from SPIRE.
- The ServiceMonitor selected a Service by `app=spire-server`, but the metrics Service had no matching label. Added the label to the Service.

## Review Notes
The examples still use SPIRE image tag `1.8.0`, which matches the original post but is old as of June 3, 2026. Future maintenance should update the tutorial to a currently supported SPIRE release and retest the full manifest set against a current Kubernetes cluster.
