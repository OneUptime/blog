# Validation Summary: How to Build Istio WorkloadGroup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio WorkloadGroup
- Istio WorkloadEntry
- Istio VM integration
- Kubernetes Services and service accounts
- Istio AuthorizationPolicy and PeerAuthentication
- Istio VirtualService and DestinationRule
- Envoy sidecar on virtual machines

## Sources Consulted
- Istio Virtual Machine Installation: https://istio.io/latest/docs/setup/install/virtual-machine/
- Istio WorkloadGroup reference: https://istio.io/latest/docs/reference/config/networking/workload-group/
- Istio WorkloadEntry reference: https://istio.io/latest/docs/reference/config/networking/workload-entry/
- Istio Virtual Machine Architecture: https://istio.io/latest/docs/ops/deployment/vm-architecture/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/

## Issues Found
- Updated Istio custom resources from `networking.istio.io/v1beta1` and `security.istio.io/v1beta1` to the current `v1` API versions used in official Istio 1.30 documentation.
- Replaced the outdated `meshExpansion.enabled` installation value with current VM integration settings (`meshID`, cluster name, network, and pilot environment flags). The old value is no longer part of current VM installation guidance.
- Corrected the `istioctl x workload entry configure` example by removing the invalid `--workloadGroup` flag, using the WorkloadGroup name with `--name`, and adding `--autoregister` for automated WorkloadEntry creation.
- Updated the sidecar package version from unsupported Istio `1.20.0` to the current documented release version `1.30.1`.
- Fixed the VM install script to create `/etc/istio/config` before copying `mesh.yaml` there.
- Added the missing `runtime: vm` label to the WorkloadGroup and generated WorkloadEntry example so the later `DestinationRule` subset `vm-version` can match VM workloads.
- Corrected the sample auto-registered WorkloadEntry name to align with using the WorkloadGroup name in the bootstrap command.
- Corrected the authorization flow diagram so the `orders` workload is not shown as allowed by a policy that only allows the frontend service account.
- Reworded the DENY policy example from "external networks" to namespaces outside an allow list, matching what `source.notNamespaces` actually expresses.
- Replaced an invalid `curl` to `http://istiod.istio-system.svc:15012/debug/adsz` with an `openssl s_client` check against the istiod xDS TLS port.
- Replaced an invalid direct TLS check against the application service port with a root certificate inspection command.
- Updated the DNS troubleshooting note to mention DNS proxy or service DNS resolution, with `/etc/hosts` applying specifically to istiod reachability.

## Review Notes
The post now matches current Istio sidecar-mode VM onboarding documentation. Automated WorkloadEntry creation is still documented by Istio as an alpha feature for expert users, so future updates should re-check that workflow against the Istio version being targeted.
