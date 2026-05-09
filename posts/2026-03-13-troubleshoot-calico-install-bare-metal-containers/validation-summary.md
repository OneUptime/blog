# Validation Summary: How to Troubleshoot Calico on Bare Metal

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- Tigera Operator
- Linux networking
- iptables
- BGP
- containerd
- CRI-O
- CNI plugins

## Sources Consulted
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico IP autodetection: https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico system requirements for Kubernetes: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico eBPF installation requirements: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico BGP configuration reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico troubleshooting and diagnostics: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs

## Issues Found
- The NIC autodetection fix used `kubectl set env ds/calico-node -n calico-system`, which mixes an operator-style namespace with the manifest-based environment variable workflow. Updated it to patch the Tigera Operator `Installation` resource using `spec.calicoNetwork.nodeAddressAutodetectionV4.interface`, matching the operator-managed Calico setup shown elsewhere in the post.
- The eBPF kernel requirement stated `5.3+`. Current Calico documentation lists Linux kernel `5.10+` as the base eBPF dataplane requirement, so the command comment was updated to `5.10+`.
- The outbound BGP iptables example allowed packets with source port `179`, which does not allow initiating outbound TCP sessions to a remote BGP peer on port `179`. Updated the OUTPUT rule to match destination port `179`.

## Review Notes
The post is now technically valid for an operator-based Calico installation, which is consistent with its use of the `calico-system` and `tigera-operator` namespaces. For manifest-based installations, Calico documentation uses the `kube-system` namespace and environment variables on the `calico-node` DaemonSet.
