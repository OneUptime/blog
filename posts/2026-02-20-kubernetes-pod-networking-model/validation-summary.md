# Validation Summary: Understanding the Kubernetes Pod Networking Model

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes pod networking
- Kubernetes Services and kube-proxy
- Container Network Interface (CNI)
- Linux network namespaces
- Linux veth pairs and bridges
- VXLAN overlays
- Calico BGP routing
- Flannel VXLAN backend
- kubectl, crictl, iproute2, iptables, IPVS

## Sources Consulted
- Kubernetes documentation: Services, Load Balancing, and Networking - https://kubernetes.io/docs/concepts/services-networking/
- Kubernetes documentation: Pods - https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes documentation: Network Plugins - https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Kubernetes documentation: Virtual IPs and Service Proxies - https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes kubectl reference: kubectl exec - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- CNI specification - https://www.cni.dev/docs/spec/
- Calico documentation: Configure BGP peering - https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: System requirements and VXLAN ports - https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Flannel documentation: VXLAN backend - https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md
- Linux man-pages: veth(4) - https://man7.org/linux/man-pages/man4/veth.4.html

## Issues Found
- The pod setup flow implied that the CNI plugin creates the network namespace. Updated the wording to reflect that Kubernetes uses CRI/container-runtime-managed pod network namespaces and CNI configures pod networking for that namespace.
- The veth and bridge sections described a host bridge as universal. Updated the wording to clarify that this applies to bridge-based CNI implementations; other plugins can use routing, overlays, eBPF, or other datapaths.
- The VXLAN section stated broadly that Flannel and Weave use VXLAN and used UDP port 4789 in the diagram. Updated it to reference Flannel's VXLAN backend and many overlay implementations, and changed the example port to Flannel/Linux's common UDP 8472 with wording that makes it an example.
- The Service networking section listed only iptables and IPVS. Updated it to include nftables, which is a stable kube-proxy mode on current Linux Kubernetes releases.

## Review Notes
The examples are intentionally illustrative and depend on the cluster's CNI plugin, runtime, OS, and kube-proxy mode. Some commands require node access and root privileges, and specific interface names such as cni0 are implementation-dependent.
