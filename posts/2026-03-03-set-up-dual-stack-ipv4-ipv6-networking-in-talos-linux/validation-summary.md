# Validation Summary: How to Set Up Dual-Stack (IPv4/IPv6) Networking in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration
- Kubernetes IPv4/IPv6 dual-stack networking
- Kubernetes Services and LoadBalancer Services
- Cilium CNI
- Calico CNI
- Helm, kubectl, and talosctl commands

## Sources Consulted
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config
- Talos Linux Deploy Cilium CNI guide: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Cilium Kubernetes host-scope IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/kubernetes/
- Cilium cluster-pool IPAM documentation: https://docs.cilium.io/en/stable/network/kubernetes/ipam-cluster-pool/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Calico dual-stack / IPv6 documentation: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico quickstart guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart

## Issues Found
- The definition of dual-stack was too absolute, saying every network interface and service gets both address families. Updated it to say nodes, pods, and services can use both IPv4 and IPv6, which matches Kubernetes dual-stack behavior more accurately.
- The Talos cluster networking snippet used `cluster.network.cni.name: custom` while the guide installs the CNI manually with Helm. Changed it to `name: none`, which is the Talos-supported setting when Talos should not manage CNI installation.
- The explanation of CIDR ordering said pods would prefer the first protocol. Updated it to describe service CIDR ordering and primary service ClusterIP family, which is what Kubernetes documents for Services.
- The Cilium Helm example mixed `ipam.mode=kubernetes` with `ipam.operator.clusterPool*` settings, which only apply to Cilium cluster-pool IPAM. Replaced those with Kubernetes host-scope IPAM settings and Talos-specific Cilium settings from the official Talos guide.
- The Cilium section said "Install Cilium CLI" but used Helm commands. Updated the comment to say it adds the Cilium Helm repository.
- The Calico install example used an older v3.27.0 operator URL. Updated it to v3.32.0, added the current Calico CRD manifest step from the official quickstart, and added `natOutgoing: Enabled` to the VXLAN IP pools as recommended by Calico documentation.

## Review Notes
The examples are now technically consistent for a Talos cluster where Flannel is disabled and a dual-stack-capable CNI is installed manually. Real deployments still need environment-specific validation for routed IPv6, LoadBalancer support, firewall rules, and CNI-specific choices such as encapsulation versus native routing.
