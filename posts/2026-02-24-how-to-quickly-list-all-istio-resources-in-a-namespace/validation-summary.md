# Validation Summary: How to Quickly List All Istio Resources in a Namespace

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio custom resources
- Kubernetes CustomResourceDefinitions
- kubectl
- istioctl
- Bash
- Python JSON filtering

## Sources Consulted
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference
- Istio configuration reference: https://istio.io/latest/docs/reference/config/
- Istio TrafficExtension announcement and reference: https://istio.io/latest/blog/2026/traffic-extension-api/ and https://istio.io/latest/docs/reference/config/proxy_extensions/traffic_extension/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio security API references: https://istio.io/latest/docs/reference/config/security/peer_authentication/ and https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio configuration status field reference: https://istio.io/latest/docs/reference/config/config-status/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio generated CRD manifests: https://github.com/istio/istio/blob/master/manifests/charts/base/files/crd-all.gen.yaml

## Issues Found
- Added `trafficextensions.extensions.istio.io` and `trafficextensions` to the example CRD list and all-resource commands because Istio 1.30 introduced the `TrafficExtension` API.
- Changed security short-name examples from `authorizationpolicies` to `ap`, which is the registered short name for `AuthorizationPolicy`.
- Corrected the description of combined `kubectl get` output. Not every Istio networking resource prints a host column; output columns are resource-specific.
- Clarified that Istio configuration status is optional/alpha and must be enabled before status validation messages can be relied on.
- Replaced the deprecated `security.istio.io/tlsMode=istio` sidecar-detection example with filtering based on the generated `sidecar.istio.io/status` annotation.
- Expanded the audit script resource list to include `trafficextensions`, `workloadgroups`, and `proxyconfigs` so it matches the broader all-resource command.

## Review Notes
The post is technically relevant and the remaining commands use supported `kubectl get`, `-A`, `--all-namespaces`, `--no-headers`, JSONPath, and `istioctl proxy-config` forms. The exact Istio CRD list can still vary by Istio version and installation profile, which the post already notes.
