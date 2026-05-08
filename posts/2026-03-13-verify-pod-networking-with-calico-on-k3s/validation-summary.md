# Validation Summary: How to Verify Pod Networking with Calico on K3s

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- K3s
- Kubernetes
- Calico
- CNI
- calicoctl
- kubectl
- CoreDNS / Kubernetes service DNS

## Sources Consulted
- K3s Basic Network Options: https://docs.k3s.io/networking/basic-network-options
- K3s Architecture: https://docs.k3s.io/architecture
- K3s Multus and IPAM plugins: https://docs.k3s.io/networking/multus-ipams
- Calico overlay networking: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico BGP peering: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico IP address management: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found
- The introduction described K3s as using its own container runtime, containerd. K3s packages containerd by default and can also use cri-dockerd, so the wording was changed to avoid implying that containerd is proprietary or the only supported runtime.
- The node status check said the container runtime should be `containerd` for all nodes. Updated this to say it should match the configured runtime, with `containerd` expected for a default K3s installation.
- The introduction said cross-node pod communication requires Calico IPIP or VXLAN encapsulation. Calico can also use BGP routing without an overlay, and VXLAN-only Calico does not require BGP. Updated the wording to describe BGP routing, IPIP, or VXLAN as configuration-dependent networking modes.
- The `calicoctl node status` guidance implied BGP sessions should always be established on multi-node K3s and referred specifically to Felix. Calico documentation states this command reports local Calico node process status and BGP peering states, and VXLAN-only networking does not use BGP. Updated the text to check the Calico process, clarify that BGP applies only when enabled, and note that the command should be run on the inspected node.
- The CNI path check used `/var/lib/rancher/k3s/agent/etc/cni/net.d/10-calico.conflist`. K3s custom CNI documentation checks Calico configuration under `/etc/cni/net.d/10-calico.conflist`; updated the command to match that documented path.

## Review Notes
The kubectl examples are syntactically valid for current kubectl references. The external connectivity check uses ICMP to `1.1.1.1`; this is a reasonable quick egress test, but environments that block ICMP may need an HTTP-based test instead.
