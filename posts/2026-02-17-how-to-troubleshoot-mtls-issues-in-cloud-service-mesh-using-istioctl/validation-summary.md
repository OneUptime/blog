# Validation Summary: How to Troubleshoot mTLS Issues in Cloud Service Mesh Using istioctl

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud Service Mesh
- Istio and istioctl
- Kubernetes
- mTLS
- PeerAuthentication
- AuthorizationPolicy
- Envoy sidecar proxy diagnostics

## Sources Consulted
- Google Cloud Service Mesh: Downloading the troubleshooting tool: https://docs.cloud.google.com/service-mesh/docs/downloading-istioctl
- Google Cloud Service Mesh: Control plane revisions: https://docs.cloud.google.com/service-mesh/docs/revisions-overview
- Google Cloud Service Mesh: Supported features using Istio APIs for managed control plane: https://cloud.google.com/service-mesh/v1.24/docs/supported-features-managed
- Google Cloud Service Mesh: Check control plane implementation: https://cloud.google.com/service-mesh/v1.22/docs/check-control-plane-implementation
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio health checking of services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio security concepts and mTLS modes: https://istio.io/latest/docs/concepts/security/
- Istio TLS configuration guidance: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio common security problems: https://istio.io/latest/docs/ops/common-problems/security-issues/

## Issues Found
- The setup section used upstream Istio download instructions. Changed it to the Cloud Service Mesh documented `gcloud components install istioctl` flow.
- The mesh revision command attempted to read a revision label from `ControlPlaneRevision` metadata. Changed it to list `controlplanerevision` resources, matching Cloud Service Mesh documentation where the resource name is the release channel label.
- The guide used the old `istioctl authn tls-check` command, which is not in the current official `istioctl` command reference. Replaced it with direct `PeerAuthentication` inspection and clarified that selectors must be reviewed for the destination workload.
- The `proxy-status` guidance did not mention managed Cloud Service Mesh limitations. Added a caveat that `istioctl proxy-status` is not supported for the Traffic Director control plane implementation.
- The PeerAuthentication and AuthorizationPolicy examples used `security.istio.io/v1beta1`. Updated them to the current stable `security.istio.io/v1` API version.
- The per-port mTLS exception did not mention that `portLevelMtls` uses workload container ports, not Kubernetes Service ports. Added that clarification.
- The `istioctl analyze` description claimed it detects missing DestinationRules. Reworded this to avoid promising a diagnostic that is not generally guaranteed.
- The health probe section checked the wrong mesh config location and suggested an invalid mesh ConfigMap change. Replaced it with pod-level probe rewrite verification using rewritten probe paths and `ISTIO_KUBE_APP_PROBERS`.
- The health probe section claimed TCP and gRPC probes are not affected by mTLS. Corrected this to match Istio documentation: HTTP, TCP, and gRPC probes receive special rewrite handling, and exec probes avoid sidecar traffic.

## Review Notes
The article is now technically valid for Cloud Service Mesh deployments using Istio APIs, with caveats for managed Traffic Director limitations. Some diagnostic commands still depend on the cluster's control plane implementation and installed Cloud Service Mesh version, so future updates should keep the managed Traffic Director versus managed/in-cluster Istiod distinction explicit.
