# Validation Summary: How to Explain the Calico Data Path to Your Team

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- Kubernetes NetworkPolicy
- Linux iptables/netfilter
- Linux veth interfaces
- eBPF and BPF maps
- Calico Felix

## Sources Consulted
- Calico documentation: The Calico data path: IP routing and iptables, https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Calico documentation: About Calico eBPF, https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico documentation: Workload endpoint resource, https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico documentation: Use IPVS kube-proxy, https://docs.tigera.io/calico/latest/networking/configuring/use-ipvs
- Kubernetes documentation: kubectl get, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: kubectl exec, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Local iptables help output for command syntax and flags

## Issues Found
- The eBPF explanation described service routing and policy as a single hash-table lookup. Updated it to describe Calico's eBPF dataplane more accurately: BPF programs attached to kernel hooks use BPF maps for service frontend/backend data and policy selector IP sets.
- The pod interface discovery command returned the interface name inside the pod, usually `eth0`, but the Calico `cali-tw-*` and `cali-fw-*` chains use the host-side Calico interface name. Replaced the command with a lookup that gets the pod's peer ifindex and maps it to the host-side veth on the node.
- The iptables chain examples used `<pod-iface>`, which could imply the pod namespace interface. Changed the placeholder to `<host-iface>` to match Calico's host-side chain names.
- The iptables logging example used a generic `<iface>` placeholder. Updated it to `<host-iface>` for consistency with the Calico chain names.
- The policy location answer only covered ingress. Updated it to clarify that ingress policy is enforced on the destination node and egress policy is enforced on the source node.
- The eBPF performance answer overstated all lookups as O(1) regardless of services or pods. Revised it to explain that eBPF reduces long sequential iptables rule walks by using BPF programs and maps, while avoiding a blanket complexity claim.

## Review Notes
The examples are oriented toward the standard Linux dataplane. In eBPF mode, iptables chain inspection is not the right primary debugging method; future posts could add equivalent `bpftool` or Calico eBPF troubleshooting commands.
