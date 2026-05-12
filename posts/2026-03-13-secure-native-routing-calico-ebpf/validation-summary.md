# Validation Summary: How to Secure Native Routing with Calico eBPF

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (eBPF dataplane, FelixConfiguration)
- Kubernetes (kubectl, DaemonSets, kube-proxy)
- eBPF / BPF (XDP, TC hooks, bpftool)
- iperf3 (benchmarking)
- calicoctl

## Sources Consulted
- [Enabling the eBPF data plane | Calico Documentation](https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf)
- [Troubleshoot eBPF mode | Calico Documentation](https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf)
- [Felix configuration | Calico Documentation](https://docs.tigera.io/calico/latest/reference/resources/felixconfig)
- [projectcalico/calico repository — felix/cmd/calico-bpf/commands](https://github.com/projectcalico/calico/tree/master/felix/cmd/calico-bpf/commands)
- Calico FelixConfiguration CRD reference for `bpfEnabled`, `bpfDisableUnprivileged`, and `bpfLogLevel`

## Issues Found
1. **Incorrect verification command**: The original "Verify kube-proxy replacement" step used `kubectl exec -n calico-system ds/calico-node -- calico-node -bpf-log-level Debug`. This is wrong on two counts:
   - `bpfLogLevel` is a FelixConfiguration field (valid values: `Off`, `Info`, `Debug`), not a CLI flag for the `calico-node` binary.
   - Setting a log level — even if it worked — does not verify that kube-proxy has been replaced by the eBPF dataplane.

   Replaced with the correct `calico-node -bpf` subcommand syntax that actually inspects the BPF state programmed in place of kube-proxy:
   ```
   kubectl exec -n calico-system ds/calico-node -- calico-node -bpf nat dump
   kubectl exec -n calico-system ds/calico-node -- calico-node -bpf conntrack dump
   ```
   These commands dump the BPF NAT and conntrack maps; populated entries confirm Calico's eBPF dataplane is handling service load balancing in place of kube-proxy. The `calico-bpf` subcommands (`nat`, `conntrack`, `routes`, `arp`, `counters`, etc.) are embedded in the `calico-node` binary and invoked via the `-bpf` flag.

## Review Notes
- **Kernel requirements are version-dependent.** The post states "Linux kernel 5.3+ (5.8+ recommended)". This is accurate for Calico v3.13 (the eBPF dataplane's initial release), which the post explicitly targets via "Calico v3.13+". Current Calico docs (v3.32) raise the floor to 5.10+. If readers are deploying recent Calico releases, they should verify against the docs for that specific version.
- **`bpfDisableUnprivileged: true` is the default**, so setting it explicitly in the patch is harmless but redundant. It instructs Felix to set the `kernel.unprivileged_bpf_disabled` sysctl, preventing unprivileged users from interacting with Calico's BPF maps/programs — appropriate given the security framing.
- **Operator vs. manifest installs**: The post uses `calicoctl patch felixconfiguration` to enable eBPF, which works for both install types. For operator-based installs, the more idiomatic approach is `kubectl patch installation.operator.tigera.io default --type merge -p '{"spec":{"calicoNetwork":{"linuxDataplane":"BPF"}}}'`. The post's approach still works but isn't the operator-native path.
- **Description/content mismatch**: The frontmatter description promises coverage of "auditing BPF program permissions, enabling WireGuard encryption, and verifying policy enforcement", but the body covers enablement, verification, and benchmarking. This is a content/scope concern rather than a technical inaccuracy.
- The `kubectl patch ds kube-proxy` nodeSelector workaround (`non-calico: true`) to neutralize kube-proxy is the canonical pattern from Calico docs and is correct.
