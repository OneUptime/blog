# Validation Summary: How to Handle Mixed Linux/Windows Nodes with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar injection
- IstioOperator installation configuration
- Istio VirtualService
- Istio DestinationRule
- Istio PeerAuthentication
- Istio AuthorizationPolicy
- Kubernetes Linux and Windows nodes
- Kubernetes node selectors and pod labels
- Kubernetes health probes

## Sources Consulted
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio PeerAuthentication API reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy API reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio authorization policy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes well-known labels reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes Windows containers guide: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes guide for running Windows containers: https://kubernetes.io/docs/concepts/windows/user-guide/

## Issues Found
- Changed the Windows deployment injection override from an annotation to the documented `sidecar.istio.io/inject: "false"` pod label.
- Added pod template labels to the Windows deployment example because Istio's `neverInjectSelector` matches pod labels, not the pod's `nodeSelector`.
- Clarified that accidental injection fails because the injected Linux proxy container cannot run on Windows nodes. The original wording referred specifically to the sidecar init container, which is not always present when Istio CNI is used.
- Corrected the VirtualService source-specific traffic policy example. `sourceLabels` applies to meshed source workloads with sidecars and is not a runtime match for unmeshed Windows callers, so the example now targets a Linux caller and the text explains how to handle Windows caller retries.
- Corrected the AuthorizationPolicy example. `source.namespaces` and `source.principals` are derived from mTLS identity and do not match direct Windows callers without mTLS, so the Windows rule now uses `ipBlocks` and the text tells readers to use their actual Windows pod or node CIDR.
- Added required `apps/v1` Deployment selectors, matching pod labels, and placeholder images to the Kubernetes Deployment snippets so they are structurally valid examples.

## Review Notes
The post is accurate for Istio sidecar mode in mixed Linux/Windows Kubernetes clusters. Ambient mesh has different datapath behavior and is not covered by this guide.
