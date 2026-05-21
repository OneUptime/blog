# Validation Summary: How to Configure Read-Only Access to Istio Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes RBAC
- Kubernetes service accounts
- istioctl
- YAML configuration

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Istio configuration reference: https://istio.io/latest/docs/reference/config/
- Istio traffic management reference: https://istio.io/latest/docs/reference/config/networking/
- Istio security reference: https://istio.io/latest/docs/reference/config/security/
- Istio telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl diagnostic tools documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl/
- Istio upstream CRD manifests and istioctl source: https://github.com/istio/istio

## Issues Found
- The basic ClusterRole claimed to cover all Istio API groups but omitted the current `trafficextensions.extensions.istio.io` resource. Added `trafficextensions` under the `extensions.istio.io` API group.
- The `istioctl` ClusterRole omitted some Istio API groups while describing Istio CRD access broadly. Added `install.istio.io` and `extensions.istio.io` to the Istio CRD rule.
- The `istioctl` section said `proxy-config` and `proxy-status` exec into the `istio-proxy` container and required `pods/exec`. Current Istio source uses Kubernetes port-forwarding for Envoy admin and Istiod XDS access. Removed `pods/exec`, kept `pods/portforward`, and updated the explanation.
- The `istioctl proxy-status` flow creates a short-lived service account token for XDS requests. Added `serviceaccounts/token` with the `create` verb and explained why this non-read subresource permission is needed.

## Review Notes
The examples are valid Kubernetes RBAC YAML and use current `rbac.authorization.k8s.io/v1` APIs. The `istioctl-readonly` role intentionally includes `create` on subresources needed for diagnostics; this is operationally necessary for those commands but is not purely read-only in RBAC verb terms.
