# Validation Summary: How to Avoid Common Mistakes with Calico eBPF Troubleshooting

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico eBPF dataplane
- Kubernetes
- kubectl
- Tigera Operator Installation resource
- FelixConfiguration
- Linux eBPF and bpftool
- Calico BPF conntrack and NAT maps

## Sources Consulted
- Calico documentation: Troubleshoot eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: Install in eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Enabling the eBPF data plane: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: FelixConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes documentation: kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post used `calico-node -bpf-list-progs`, which is not the documented syntax for the embedded Calico BPF helper. Changed it to `calico-node -bpf help`, matching the documented `calico-node -bpf <command>` form.
- The post used `calico-node -bpf-conntrack-dump` and `calico-node -bpf-nat-dump`. Changed these to `calico-node -bpf conntrack dump` and `calico-node -bpf nat dump`, which match the Calico eBPF troubleshooting documentation.
- The post patched `installation default` without the full operator API resource name. Changed these examples to `installation.operator.tigera.io default` to match Calico documentation and avoid ambiguity.
- The post stated that `iptables -L -n` will show no Calico rules in eBPF mode and gave a fixed expected BPF program count. Adjusted the wording to refer to the absence of the normal Calico iptables dataplane rules and changed the expected BPF program output to a non-zero count because the exact count varies by Calico version and node configuration.

## Review Notes
The guidance is broadly consistent with Calico's official eBPF troubleshooting model: eBPF mode replaces the standard iptables dataplane, the operator `Installation` resource controls `linuxDataplane`, Felix log severity can be changed through `FelixConfiguration`, and the Calico BPF helper can inspect NAT and conntrack maps. The examples assume an operator-based installation using the `calico-system` and `tigera-operator` namespaces.
