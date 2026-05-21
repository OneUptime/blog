# Validation Summary: How to Install and Configure Istio 1.22

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Istio 1.22
- Kubernetes
- Helm
- istioctl
- Istio ambient mesh
- Istio sidecar mode
- Kubernetes Gateway API
- Istio Telemetry API
- Istio PeerAuthentication and mTLS
- Istio observability addons

## Sources Consulted
- Istio 1.22 release announcement: https://istio.io/latest/news/releases/1.22.x/announcing-1.22/
- Istio ambient mesh Helm installation docs: https://istio.io/latest/docs/ambient/install/helm/
- Istio ambient workload enrollment docs: https://istio.io/latest/docs/ambient/usage/add-workloads/
- Istio waypoint proxy docs: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DNS proxying docs: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio 1.22.0 Helm chart values from https://istio-release.storage.googleapis.com/charts/
- Kubernetes Gateway API v1.1.0 release manifest: https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.1.0/standard-install.yaml

## Issues Found
- The ambient `istiod` Helm install only set `PILOT_ENABLE_AMBIENT`, which omits other ambient profile values used by Istio 1.22. I added `--set profile=ambient` and included the relevant ambient profile settings in the values example so the control plane is configured consistently for ambient mode.
- The Gateway API install used v1.0.0 even though Istio 1.22 specifically calls out Gateway API v1.1 support. I updated the manifest URL to v1.1.0.
- The Telemetry example used `telemetry.istio.io/v1alpha1`. Istio 1.22 promoted Telemetry to `v1`, so I updated the API version.
- The DNS proxying production tip used the older sidecar proxy metadata pattern for DNS auto-allocation. For Istio 1.22 ambient mode, I updated it to `cni.ambient.dnsCapture=true` and `pilot.env.PILOT_ENABLE_IP_AUTOALLOCATE=true`.

## Review Notes
Istio 1.22 was accurate for the historical release claims, including ambient beta status and Kubernetes 1.27 through 1.30 support, but it is end-of-life as of January 22, 2025. The post remains technically relevant as a version-specific guide, but readers should prefer a supported Istio release for new production deployments.
