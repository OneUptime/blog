# Validation Summary: How to Configure Wildcard DNS with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Istio ServiceEntry
- Istio DestinationRule
- Istio Sidecar
- Kubernetes Services and kubectl JSONPath output
- cert-manager Certificate resources
- DNS wildcard records
- TLS, SNI, and TLS origination

## Sources Consulted
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio ServiceEntry API reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio egress wildcard hosts task: https://istio.io/latest/docs/tasks/traffic-management/egress/wildcard-egress-hosts/
- Istio egress TLS origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio DYNAMIC_DNS wildcard egress blog: https://istio.io/latest/blog/2026/egress-dynamic-dns/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- Updated Istio manifests from `networking.istio.io/v1alpha3` to the current `networking.istio.io/v1` API version used in Istio 1.30 documentation.
- Replaced matching on the pseudo-header `:authority` under `headers` with Istio's `authority` HTTP match field. Istio documents that `authority` is ignored when placed under `headers`.
- Updated wildcard `ServiceEntry` egress guidance from `resolution: NONE` to `resolution: DYNAMIC_DNS` for current Istio wildcard host support. The older `NONE` behavior remains relevant for original-destination forwarding, but current Istio provides dynamic DNS resolution for wildcard HTTP/TLS egress.
- Corrected the TLS origination example so HTTP traffic uses port 80 with `targetPort: 443`, and the `DestinationRule` applies `tls.mode: SIMPLE` under `portLevelSettings` for port 80.
- Corrected the Sidecar egress host example from `~/*.googleapis.com` to `./*.googleapis.com` and fixed the explanation. Istio Sidecar hosts use `namespace/dnsName`; `./` selects the current namespace, while `~/*` is for trimming outbound configuration.
- Adjusted the wildcard limitation wording to match Istio's left-most wildcard host support and separated that from DNS and certificate single-label wildcard behavior.
- Corrected the raw TCP limitation to avoid saying plain TCP wildcard egress requires `resolution: NONE`; current Istio documents that `DYNAMIC_DNS` is not compatible with raw TCP traffic because the original host cannot be recovered.

## Review Notes
The YAML snippets were parsed successfully after edits. `kubectl` was not installed in the local workspace, so the kubectl command syntax was checked against official Kubernetes documentation instead of local `--help` output.
