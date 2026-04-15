# Validation Summary: How to Use Dapr and Istio Together

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Istio (service mesh)
- Kubernetes
- Helm
- Envoy proxy

## Sources Consulted
- Dapr documentation: Configuration spec and mTLS settings (https://docs.dapr.io/operations/configuration/configuration-overview/)
- Dapr documentation: Kubernetes deployment with Helm (https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/)
- Dapr documentation: Default ports (3500 HTTP, 50001 gRPC, 50002 internal gRPC)
- Istio documentation: Sidecar resource API reference (https://istio.io/latest/docs/reference/config/networking/sidecar/)
- Istio documentation: Installation profiles (https://istio.io/latest/docs/setup/install/istioctl/)
- Istio documentation: Traffic management annotations including excludeInboundPorts/excludeOutboundPorts (https://istio.io/latest/docs/reference/config/annotations/)
- Istio documentation: VirtualService API reference (https://istio.io/latest/docs/reference/config/networking/virtual-service/)

## Issues Found

### 1. Namespace ordering bug in installation steps (fixed)
**What was wrong:** The original installation commands ran `kubectl label namespace dapr-system istio-injection=enabled` before the `dapr-system` namespace existed. The namespace was only created later by the `helm install --create-namespace` flag, so the label command would fail with `Error from server (NotFound): namespaces "dapr-system" not found`.

**What was changed:** Added an explicit `kubectl create namespace dapr-system` command before the label command, and removed the `--create-namespace` flag from the Helm install (since the namespace is now created manually).

**Why:** The namespace must exist before it can be labeled. Creating it explicitly before labeling ensures both the label and the subsequent Helm install succeed.

### 2. Missing required `hosts` field in Istio Sidecar egress listeners (fixed)
**What was wrong:** The Istio Sidecar resource in the "Configuring Istio for Dapr Ports" section had egress listeners with only `port` defined but was missing the required `hosts` field. According to the Istio Sidecar API specification, `hosts` is a required field in `IstioEgressListener`.

**What was changed:** Added `hosts: ["./*"]` to each egress listener entry, which scopes the listener to services in the same namespace as the Sidecar resource.

**Why:** Without the `hosts` field, the Sidecar resource may be rejected by Istio's admission webhook or fail to function as intended.

## Review Notes
- The post uses `networking.istio.io/v1alpha3` for the Sidecar and VirtualService resources. While this API version is still supported, Istio has promoted these resources to `networking.istio.io/v1` (stable since Istio 1.22) and encourages users to transition. The current version still works, but a future update to `v1` would align with current best practices.
- The Helm install command uses `helm install` rather than the officially recommended `helm upgrade --install` and omits the `--version` flag. This works for first-time installs but is less robust than the pattern shown in Dapr's official docs.
- The post correctly identifies all three key Dapr ports (3500, 50001, 50002) in the port exclusion annotations section.
- The Dapr Configuration CRD for disabling mTLS, the Istio port exclusion annotations, and the VirtualService for traffic routing are all technically correct.
