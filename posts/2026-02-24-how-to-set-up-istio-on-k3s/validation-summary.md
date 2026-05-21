# Validation Summary: How to Set Up Istio on k3s

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Istio
- k3s
- Kubernetes
- Traefik
- ServiceLB
- MetalLB
- Flannel CNI
- Kiali
- Prometheus
- Grafana

## Sources Consulted
- K3s documentation: What is K3s, packaged components, default SQLite datastore, Flannel, Traefik, and ServiceLB: https://docs.k3s.io/
- K3s configuration options and config file/drop-in behavior: https://docs.k3s.io/installation/configuration
- K3s packaged component disabling with `--disable=traefik` and `--disable=servicelb`: https://docs.k3s.io/installation/packaged-components
- K3s networking services, Traefik, and ServiceLB behavior: https://docs.k3s.io/networking/networking-services
- K3s basic network options and custom CNI guidance: https://docs.k3s.io/networking/basic-network-options
- Istio installation with `istioctl` and IstioOperator support: https://istio.io/latest/docs/setup/install/istioctl/
- Istio installation configuration profiles, including `default`, `minimal`, and `k3s` platform profile: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio IstioOperator API reference for component resources, services, and replica count: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio DNS proxying configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio sidecar injection and Bookinfo getting started documentation: https://istio.io/latest/docs/setup/getting-started/
- Istio gateway installation and Gateway selector guidance: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio Kiali, Prometheus, and Grafana integration pages: https://istio.io/latest/docs/ops/integrations/kiali/, https://istio.io/latest/docs/ops/integrations/prometheus/, https://istio.io/latest/docs/ops/integrations/grafana/
- MetalLB installation documentation and current native manifest: https://metallb.io/installation/
- MetalLB L2 configuration resources: https://metallb.io/configuration/_advanced_l2_configuration/

## Issues Found
- The prerequisites referenced k3s 1.26+ and istioctl 1.20+, but the post used current `networking.istio.io/v1` examples and should align with the currently documented Istio release. Updated the prerequisites and sample URLs to Istio 1.29, which the Istio docs list as tested with Kubernetes 1.31-1.35.
- The existing-cluster Traefik disable instructions used `systemctl edit k3s` without showing a valid persistent override. Replaced it with a k3s config drop-in that disables the packaged `traefik` component and then restarts k3s.
- The IstioOperator configuration did not set Istio's documented k3s platform profile. Added `values.global.platform: k3s`.
- The custom CNI guidance incorrectly implied that Istio relies on CNI NetworkPolicy support. Reworded it to focus on Istio's Kubernetes networking and traffic interception requirements, with NetworkPolicy support called out separately.
- The MetalLB section installed MetalLB while leaving k3s ServiceLB enabled and used an older MetalLB manifest URL. Added instructions to disable `servicelb` when replacing it with MetalLB and updated the manifest to the current documented native manifest version.
- The observability section claimed the sample add-ons had reduced resource requirements. Istio documents these as sample/demo installations, so the wording was corrected.
- The multi-node section said istiod runs on a server node. istiod is a Kubernetes Deployment and can run on any schedulable node matching its constraints, so the explanation was corrected.
- The HA note said two k3s server nodes were required for multiple istiod replicas to make sense. Updated it to distinguish schedulable nodes for istiod pods from Kubernetes API/server-node availability.

## Review Notes
The guide is technically valid after the fixes. The Istio sample add-ons remain suitable for demos and labs, but Istio's own documentation does not recommend them as production-grade installations.
