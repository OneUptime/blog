# Validation Summary: How to Configure MetalLB with K3s for Lightweight Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- K3s
- Kubernetes Services and LoadBalancer Services
- MetalLB
- MetalLB Layer 2 mode
- MetalLB BGP mode
- Helm
- Prometheus Operator monitoring resources
- Eclipse Mosquitto MQTT broker

## Sources Consulted
- MetalLB installation documentation: https://metallb.universe.tf/installation/
- MetalLB configuration documentation: https://metallb.universe.tf/configuration/
- MetalLB usage documentation: https://metallb.universe.tf/usage/
- MetalLB Layer 2 concepts: https://metallb.universe.tf/concepts/layer2/
- MetalLB BGP concepts: https://metallb.universe.tf/concepts/bgp/
- MetalLB advanced L2 configuration: https://metallb.universe.tf/configuration/_advanced_l2_configuration/
- MetalLB advanced BGP configuration: https://metallb.universe.tf/configuration/_advanced_bgp_configuration/
- MetalLB troubleshooting documentation: https://metallb.universe.tf/troubleshooting/
- MetalLB Prometheus metrics documentation: https://metallb.universe.tf/prometheus-metrics/
- MetalLB v0.16.1 manifest and Helm values: https://raw.githubusercontent.com/metallb/metallb/v0.16.1/config/manifests/metallb-native.yaml and https://raw.githubusercontent.com/metallb/metallb/v0.16.1/charts/metallb/values.yaml
- K3s networking services documentation: https://docs.k3s.io/networking/networking-services
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- Updated the MetalLB manifest install URL from v0.14.5 to v0.16.1 to match the current official installation documentation.
- Changed K3s ServiceLB disable examples from `--disable servicelb` to `--disable=servicelb`, matching the documented K3s server flag form.
- Replaced deprecated `spec.loadBalancerIP` usage in MetalLB static IP examples with the current `metallb.io/loadBalancerIPs` annotation.
- Replaced old MetalLB annotation keys under `metallb.universe.tf/*` with current `metallb.io/*` annotation keys.
- Corrected the Helm monitoring values to match the MetalLB chart shape and current metrics port.
- Replaced invalid manual ServiceMonitor examples with PodMonitor examples that match the labels and HTTPS metrics port exposed by the plain MetalLB manifest.
- Updated BGP metric names to note the `frrk8s_*` metric prefix used by the current default FRR-K8s BGP backend.
- Replaced the non-existent `metallb_layer2_announcements_total` metric with `metallb_k8s_client_config_stale_bool`, which is documented by MetalLB.
- Corrected the K3s ServiceLB conflict section so it disables ServiceLB in K3s configuration before removing old generated DaemonSets.
- Corrected troubleshooting log and NetworkPolicy label selectors to match the labels used by the documented plain MetalLB manifest.
- Fixed the complete Mosquitto example so the broker configuration matches the unauthenticated `mosquitto_pub` test command and removed the advertised TLS port that was not configured with TLS certificates.

## Review Notes
The tutorial is technically relevant and mostly accurate after the fixes. The BGP section remains a simplified example; production deployments should choose the MetalLB BGP backend deliberately, with FRR-K8s preferred by current MetalLB documentation for BFD, IPv6, and multiprotocol BGP support.
