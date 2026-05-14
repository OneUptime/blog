# Validation Summary: How to Avoid Common Mistakes with the Calico Data Path

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- CNI networking
- Linux iptables
- Linux conntrack
- eBPF
- VXLAN and IP-in-IP encapsulation
- Linux sysctl networking settings

## Sources Consulted
- Calico documentation: Configure MTU to maximize network performance, https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico documentation: The Calico data path: IP routing and iptables, https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Calico documentation: Connection tracking, https://docs.tigera.io/calico/latest/reference/host-endpoints/conntrack
- Calico documentation: Install in eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Troubleshoot eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: System requirements for Kubernetes, https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Kubernetes documentation: kubectl delete, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes documentation: Field selectors, https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- iptables local CLI help for `iptables -L`, `-n`, `-v`, and `--line-numbers`

## Issues Found
- The MTU fix only mentioned editing the `calico-config` ConfigMap. Calico's current documentation distinguishes operator-based installs, which use `spec.calicoNetwork.mtu` on the `Installation` resource, from manifest-based installs, which use the `veth_mtu` ConfigMap key. Updated the fix to cover both and added the required `calico-node` restart/new-workload caveat.
- The stale iptables diagnosis claimed `iptables -L` could check rule timestamps with `iptables-restore --noflush`. iptables list output does not expose rule timestamps, and `iptables-restore --noflush` is unrelated to timestamp inspection. Replaced this with packet and byte counter inspection using `iptables -L -n -v --line-numbers`.
- The `calico-node` restart examples mixed `kube-system` and `calico-system` without explaining the namespace difference. Added a note that `calico-system` is typical for operator installs and `kube-system` is common for manifest installs.
- The eBPF kernel-upgrade explanation implied Calico eBPF programs are necessarily compiled only for the previous kernel version. Current Calico documentation describes CO-RE support and kernel requirements, so the text was changed to say programs may need to be reloaded for the running kernel and unsupported kernels can cause load failures.

## Review Notes
The remaining diagnostic commands and explanations are technically plausible for Calico troubleshooting. The post would benefit in the future from separate operator and manifest command examples throughout, but the current text is accurate after the fixes.
