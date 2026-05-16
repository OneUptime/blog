# Validation Summary: How to Troubleshoot Network Connectivity in Talos Linux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes networking
- Flannel CNI
- kube-proxy
- Kubernetes Services and EndpointSlices
- Kubernetes NetworkPolicy
- VLANs, bonding, MTU, DNS, and packet capture

## Sources Consulted
- Sidero/Talos CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Sidero/Talos machine configuration reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Sidero/Talos networking resources: https://docs.siderolabs.com/talos/v1.7/learn-more/networking-resources/
- Sidero/Talos Host DNS documentation: https://docs.siderolabs.com/talos/v1.9/networking/host-dns
- Sidero Kubernetes Flannel CNI guide: https://docs.siderolabs.com/kubernetes-guides/cni/flannel
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The packet capture example redirected stdout to a `.pcap` file, but `talosctl pcap` decodes packets to stdout by default. Changed it to use `--output capture.pcap`, which is the documented way to save raw pcap data.
- The service troubleshooting example used the deprecated Kubernetes `Endpoints` API. Changed it to query `EndpointSlice` resources with the `kubernetes.io/service-name` label.
- The DNS troubleshooting section used `talosctl get hostdnsconfig`, which is not the documented status check for host DNS. Changed it to `talosctl get dnsupstream` for upstream DNS health.
- The VLAN configuration example used `interface: eth0.100`. Changed it to Talos' documented `vlans` list under the parent interface with `vlanId` and `addresses`.
- The MTU section implied that setting `cluster.network.cni.name: flannel` configures CNI MTU. Changed it to explain that Flannel MTU changes not exposed by Talos require disabling the Talos-managed CNI and installing a custom Flannel manifest with the required MTU.

## Review Notes
The Talos-managed Flannel namespace and ConfigMap examples are accurate for Talos-managed Flannel. For clusters using a custom CNI manifest or non-default CNI, namespace, labels, and ConfigMap names may differ.
