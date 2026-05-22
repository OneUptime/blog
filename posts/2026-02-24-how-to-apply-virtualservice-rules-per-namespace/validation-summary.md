# Validation Summary: How to Apply VirtualService Rules per Namespace

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio VirtualService
- Istio Sidecar
- Istio traffic management
- Istio delegation
- Kubernetes namespaces
- kubectl
- istioctl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration analysis documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/

## Issues Found
- Updated all Istio networking examples from `apiVersion: networking.istio.io/v1beta1` to the current documented `apiVersion: networking.istio.io/v1`.
- Corrected the Sidecar resource explanation to avoid implying Sidecar egress host scoping is a security boundary. Istio's Sidecar resource controls sidecar configuration visibility; enforcement should use authorization policies where a security boundary is required.
- Softened the "Missing Sidecar resource" warning because default sidecar configuration breadth depends on mesh visibility and configuration, rather than always literally including every service in every deployment.

## Review Notes
The VirtualService `exportTo`, delegated VirtualService, `sourceNamespace`, timeout, retry, rewrite, weighted route, and destination examples match the current Istio API shape. The verification commands are valid for checking live Istio configuration and analyzer output.
