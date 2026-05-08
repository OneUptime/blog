# Validation Summary: Troubleshooting Common Cilium Installation and Setup Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- kubectl
- Linux kernel eBPF support
- Container Network Interface (CNI)
- Cilium IPAM

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes CNI Configuration: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium IP Address Management: https://docs.cilium.io/en/stable/network/concepts/ipam/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Kubernetes Network Plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post stated that Cilium requires kernel 4.19+ minimum with 5.10+ recommended. Current Cilium stable documentation lists Linux kernel >= 5.10, or an equivalent vendor kernel such as 4.18 on RHEL 8.10. Updated the requirement and troubleshooting guidance accordingly.
- The post suggested checking required kernel modules with `lsmod | grep -E "bpf|xdp|vxlan"` and listed `bpf` as a required module. Cilium's requirements are primarily kernel configuration options, and built-in kernel support would not appear in `lsmod`. Replaced the command with a kernel config check and clarified that VXLAN support is required when using tunnel mode.
- The BPF filesystem mount example used a valid but noncanonical argument order. Updated it to the standard `mount -t bpf bpffs /sys/fs/bpf` form used in Linux documentation and common Cilium troubleshooting.

## Review Notes
The remaining kubectl, Cilium CLI, CNI path, Cilium CNI binary, and `/etc/cni/net.d/05-cilium.conflist` references match current Cilium and Kubernetes documentation. Future updates may need to revisit exact kernel requirements because Cilium tracks current stable releases and vendor kernel equivalency can change by distribution.
