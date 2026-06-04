# Validation Summary: How to Configure kube-proxy Strict ARP for MetalLB Compatibility

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubernetes
- kube-proxy
- kube-proxy IPVS mode
- MetalLB
- ARP / Linux networking sysctls
- kubectl
- Helm
- Prometheus Operator ServiceMonitor
- BGP

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB Prometheus metrics documentation: https://metallb.io/prometheus-metrics/
- MetalLB API reference: https://metallb.io/apis/
- Kubernetes kube-proxy configuration API reference: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes kube-proxy command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- MetalLB v0.16.1 native and Prometheus manifests: https://raw.githubusercontent.com/metallb/metallb/v0.16.1/config/manifests/metallb-native.yaml and https://raw.githubusercontent.com/metallb/metallb/v0.16.1/config/manifests/metallb-native-prometheus.yaml

## Issues Found
- The introduction described kube-proxy interference as a default behavior across modes. Updated it to specify kube-proxy IPVS mode, matching MetalLB's strict ARP requirement.
- The guide recommended IPVS mode broadly for MetalLB Layer 2. Updated those statements so the requirement is conditional: if kube-proxy runs in IPVS mode, enable strict ARP.
- The automated `kubectl patch` example overwrote the entire `config.conf` value and could remove existing kube-proxy settings. Replaced it with the official `kubectl diff` preview pattern for the sed-based ConfigMap change.
- The MetalLB manifest URL used v0.13.12. Updated it to v0.16.1, the current release referenced by MetalLB documentation at review time.
- The verification step used speaker logs to find the announcing node. Updated it to use `kubectl describe svc`, which MetalLB troubleshooting documentation recommends for service announcement events.
- The troubleshooting and monitoring sections used "leader election" wording. Replaced it with announcement-focused language, matching MetalLB's documented Layer 2 behavior.
- The Prometheus Service and ServiceMonitor example used an outdated metrics port and an obsolete `metallb_speaker_announced` metric. Updated the service to use `metricshttps` on port 9120, adjusted the ServiceMonitor selector and HTTPS settings, and replaced the metric list with current documented MetalLB metrics.
- The strict ARP verification text said both sysctl values should be non-zero. Updated it to require the exact expected values: `arp_announce = 2` and `arp_ignore = 1`.

## Review Notes
The kube-proxy `KubeProxyConfiguration` API remains `kubeproxy.config.k8s.io/v1alpha1` in current Kubernetes documentation. MetalLB's Helm chart now defaults to FRR-K8s mode for BGP, but the native manifest remains suitable for the Layer 2-focused examples in this post.
