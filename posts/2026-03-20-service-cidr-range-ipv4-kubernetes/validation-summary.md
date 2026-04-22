# Validation Summary: How to Configure Service CIDR Range for IPv4 in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- ClusterIP allocation
- Service CIDR / ServiceCIDR
- kubeadm
- kube-apiserver
- kube-controller-manager
- kube-proxy
- kubectl
- IPv4 networking

## Sources Consulted
- Kubernetes Service ClusterIP allocation: https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/
- Kubernetes Service concepts: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Virtual IPs and Service Proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes Cluster Networking: https://kubernetes.io/docs/concepts/cluster-administration/networking/
- kubeadm Configuration v1beta4: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- kubeadm dual-stack support notes: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/dual-stack-support/
- Kubernetes Extend Service IP Ranges: https://kubernetes.io/docs/tasks/network/extend-service-ip-ranges/
- Kubernetes Default ServiceCIDR Reconfiguration: https://kubernetes.io/docs/tasks/network/reconfigure-default-service-ip-ranges/
- kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The kube-proxy explanation only mentioned iptables and IPVS. Current Kubernetes documentation lists iptables, nftables, and IPVS as Linux kube-proxy modes, with IPVS deprecated in current docs. Updated the text to mention iptables, nftables, and IPVS as possible modes.
- The CoreDNS rule said the "second IP block" is for CoreDNS. Kubernetes documents CoreDNS / DNS service addressing as a soft convention using the 10th IP address, not as an automatically reserved block. Updated the rule to say CoreDNS commonly uses the 10th IP and that Kubernetes does not reserve it automatically.
- The kubeadm config example used `kubeadm.k8s.io/v1beta3`. Current kubeadm documentation uses `kubeadm.k8s.io/v1beta4`, so the snippet was updated to the current API version.
- The IP exhaustion count excluded `NodePort` services even though NodePort services also allocate ClusterIPs, and the listing command sorted only by the fourth octet. Replaced the commands with JSONPath extraction, IPv4 filtering, and numeric octet sorting.
- The final statement said the service CIDR cannot be changed without rebuilding the cluster. This is too absolute for current Kubernetes: kubeadm upgrade does not support changing Service CIDR, but supported Kubernetes versions can extend Service IP ranges with ServiceCIDR objects, and primary range replacement is a complex reconfiguration. Updated the statement to reflect that nuance.

## Review Notes
- The post remains focused on IPv4 single-stack service CIDR configuration.
- Local `kubeadm` and `kubectl` binaries were not installed in this environment, so CLI validation was performed against official Kubernetes generated command references rather than local `--help` output.
