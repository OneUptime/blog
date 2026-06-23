# Validation Summary: How to Optimize MetalLB for High-Throughput Workloads

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MetalLB
- Kubernetes Services and kube-proxy
- BGP, ECMP, BFD, ARP, and NDP
- Linux kernel networking sysctl tuning
- NIC tuning with ethtool, IRQ affinity, RPS, and XPS
- Helm
- Prometheus Operator ServiceMonitor and PrometheusRule
- Grafana dashboards
- iperf3, hping3, netcat, ping, ipvsadm, and netstat
- Ubuntu netplan

## Sources Consulted
- MetalLB API reference: https://metallb.universe.tf/apis/
- MetalLB configuration docs: https://metallb.universe.tf/configuration/
- MetalLB layer 2 concepts: https://metallb.universe.tf/concepts/layer2/
- MetalLB BGP concepts: https://metallb.universe.tf/concepts/bgp/
- MetalLB usage docs: https://metallb.universe.tf/usage/
- MetalLB advanced IPAddressPool configuration: https://metallb.universe.tf/configuration/_advanced_ipaddresspool_configuration/
- MetalLB release notes: https://metallb.universe.tf/release-notes/
- MetalLB Helm chart values and templates: https://github.com/metallb/metallb/tree/main/charts/metallb
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kube-proxy configuration source: https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/kube-proxy/config/v1alpha1/types.go
- Netplan examples: https://netplan.readthedocs.io/en/0.106/examples/

## Issues Found
- The Service examples used the deprecated `metallb.universe.tf` annotation prefix. Updated the examples to the current `metallb.io` prefix for address pool selection, shared IPs, and requested load balancer IPs.
- The Helm values example included `speaker.hostNetwork`, which is not a supported configurable value in the current official MetalLB chart because speaker pods are already rendered with `hostNetwork: true`. Removed the unsupported value and clarified that the official chart sets host networking by default.
- The Helm values example placed Linux capabilities under `speaker.securityContext` as if they controlled the speaker container capabilities. The official chart templates the speaker container security context and adds `NET_RAW` itself. Removed the unsupported capability override.
- The kube-proxy section stated that IPVS mode provides better performance than iptables in all high-throughput scenarios. Adjusted the wording to the more accurate claim that IPVS can provide better scaling characteristics in large high-throughput scenarios.
- The Prometheus Operator `ServiceMonitor` example selected a `monitoring` port and did not create a Service for the ServiceMonitor to select. Updated the example to create a headless speaker metrics Service using the current `metricshttps` port and configured the ServiceMonitor for HTTPS scraping.
- The iperf3 LoadBalancer Service example used the deprecated MetalLB annotation prefix. Updated it to `metallb.io/address-pool`.
- The Ubuntu netplan example used deprecated `gateway4`. Replaced it with the documented `routes: - to: default` form.

## Review Notes
The remaining tuning values are environment-dependent and should be benchmarked before production use. Some Linux and NIC settings depend on kernel version, NIC driver, hardware support, and operational tradeoffs such as latency versus throughput.
