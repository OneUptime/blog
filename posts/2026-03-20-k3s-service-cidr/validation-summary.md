# Validation Summary: How to Configure K3s Service CIDR

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes Services
- Kubernetes ServiceCIDR / ClusterIP allocation
- CoreDNS
- kube-proxy

## Sources Consulted
- K3s Server CLI: https://docs.k3s.io/cli/server
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Networking Services: https://docs.k3s.io/networking/networking-services
- K3s overview / architecture: https://docs.k3s.io/
- Kubernetes Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service ClusterIP allocation: https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/
- Kubernetes default ServiceCIDR reconfiguration: https://kubernetes.io/docs/tasks/network/reconfigure-default-service-ip-ranges/
- Kubernetes Service IP range extension: https://kubernetes.io/docs/tasks/network/extend-service-ip-ranges/
- kube-apiserver command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/

## Issues Found
- The introduction said every Service receives a virtual IP from the service CIDR and implied newer K3s uses eBPF for this by default. Updated it to note that headless Services and `ExternalName` Services do not receive a ClusterIP, and that K3s typically relies on Kubernetes Service networking via kube-proxy.
- The "Setting a Custom Service CIDR" example used the default `10.43.0.0/16` range instead of a custom one. Updated the example to use `172.21.0.0/16` with `cluster-dns: "172.21.0.10"`.
- The verification section relied on grepping separate `kube-controller-manager` processes, which is not a reliable K3s-specific validation method because K3s wraps control-plane components inside the `k3s` process. Replaced that guidance with `ServiceCIDR` inspection commands for Kubernetes v1.33+.
- The NodePort section used `kube-apiserver-arg` for `service-node-port-range` even though K3s exposes `service-node-port-range` as a native configuration key. Updated the example to use the direct K3s setting.
- The post stated that service CIDR cannot be changed after installation and that rebuilding is required. Updated this section to reflect current Kubernetes support for extending Service IP ranges with `ServiceCIDR` objects on v1.33+, while clarifying that replacing the primary Service CIDR is still disruptive and manual.
- The conclusion overstated that the setting must always be finalized before cluster initialization. Updated it to say the primary service CIDR should be planned before initialization because later replacement is disruptive.

## Review Notes
- The `ServiceCIDR` verification and post-install change examples require Kubernetes v1.33+ for the GA workflow described in upstream documentation. On older K3s/Kubernetes releases, those commands may not exist.
- The `iptables` and `ipvsadm` inspection commands remain valid for kube-proxy in those modes, but clusters using different service implementations or proxy modes may expose Service handling differently.
