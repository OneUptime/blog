# Validation Summary: How to Set Up Istio on Rancher Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Rancher Manager and Rancher-Istio
- RKE and RKE2 Kubernetes clusters
- Kubernetes
- Helm
- istioctl
- Calico, Canal, and Flannel networking
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Istio 1.30 release announcement and Kubernetes support matrix: https://istio.io/latest/news/releases/1.30.x/announcing-1.30/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio CNI installation documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio DNS proxying documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio in-place upgrade documentation: https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Rancher Istio documentation: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/istio
- Rancher Istio configuration options: https://ranchermanager.docs.rancher.com/integrations-in-rancher/istio/configuration-options
- Rancher RKE network plug-ins documentation: https://rke.docs.rancher.com/config-options/add-ons/network-plugins

## Issues Found
- The prerequisite "Kubernetes version 1.25 or newer" was stale for current Istio releases. Updated it to require a Kubernetes version supported by the chosen Istio release, with Istio 1.30's supported Kubernetes 1.32 through 1.36 range as the current example.
- The command `kubectl version --short` is no longer documented in current kubectl. Replaced it with `kubectl version`.
- The Rancher UI customization snippet was shown as a generic chart values block with a top-level `istio:` key. Rancher documents advanced Istio customization through an IstioOperator overlay file, so the snippet was converted to a valid `IstioOperator` overlay.
- The manual IstioOperator snippet used `ISTIO_META_DNS_AUTO_ALLOCATE`, which Istio deprecated in favor of current DNS proxy auto-allocation behavior. Removed that proxy metadata setting and kept `ISTIO_META_DNS_CAPTURE`.
- The CNI exclusion note implied that `values.cni.excludeNamespaces` directly controls sidecar injection. Clarified that it controls Istio CNI processing and that Rancher system namespaces should also not be labeled for sidecar injection.
- The install verification used `istioctl verify-install`, which is not present in the current istioctl reference. Updated the install command to use `--verify` and the follow-up check to use `istioctl analyze -n istio-system`.
- The Calico GlobalNetworkPolicy example omitted several current Istio ports, including 443, 15008, 15020, 15021, 15090, and DNS capture port 15053/UDP in some directions. Expanded the example to cover the documented control-plane, data-plane, health, telemetry, HBONE, and DNS capture ports.
- The upgrade example pinned Istio 1.22.1, which is outside the current supported release window. Updated the example to Istio 1.30.0.
- The introduction implied Rancher's built-in Istio support was generally current. Added a caveat that Rancher-Istio is deprecated in Rancher v2.12.0 and later.

## Review Notes
The post remains a practical tutorial, but Rancher-Istio versioning changes quickly. Future reviews should re-check Rancher chart availability and the latest Istio supported Kubernetes version range before publishing or republishing.
