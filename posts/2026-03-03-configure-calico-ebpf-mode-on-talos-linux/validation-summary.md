# Validation Summary: How to Configure Calico eBPF Mode on Talos Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux
- Calico (Tigera operator)
- Calico eBPF data plane
- Kubernetes (kube-proxy replacement, services, DNS, NetworkPolicy)
- Linux eBPF / BPF (bpftool, BPF JIT sysctls, KubePrism, conntrack)
- Prometheus / Felix metrics
- calicoctl, talosctl, kubectl

## Sources Consulted
- Calico eBPF install reference: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico enabling eBPF data plane: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico eBPF troubleshooting (calico-node -bpf subcommands): https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Installation API (operator.tigera.io/v1): https://docs.tigera.io/calico/latest/reference/installation/api
- Talos KubePrism docs: https://www.talos.dev/v1.6/kubernetes-guides/configuration/kubeprism/
- Talos machine config (cluster.proxy.disabled, sysctls): https://www.talos.dev/v1.6/reference/configuration/
- Talos read of /proc/config.gz: https://github.com/siderolabs/talos/discussions/8056

## Issues Found

1. **Incorrect kernel minimum (Prerequisites section).** Post stated eBPF requires "kernel 5.3+". Calico's documented minimum is **5.10+** (with the RHEL v4.18.0-305+ backport as an exception). Updated the tradeoff sentence to reflect the actual requirement.

2. **Non-existent `calico-node -bpf show` subcommand (Step 4).** The `calico-node -bpf` binary does not expose a `show` subcommand. Valid nouns are `arp, cleanup, conntrack, counters, ifstate, ipsets, nat, policy, routes, …` typically followed by `dump`. Replaced with `calico-node -bpf conntrack dump`, `calico-node -bpf nat dump`, and `bpftool prog show` examples that actually return BPF program/state information. Also removed the misleading `nf_conntrack_count` example, since reading the netfilter conntrack counter does not verify that BPF programs are loaded.

3. **Conflated install paths for `bpfEnabled` (Step 6).** When the Tigera operator is used with `Installation.spec.calicoNetwork.linuxDataplane: BPF`, the operator manages `BPFEnabled` on FelixConfiguration automatically — manually setting `bpfEnabled: true` again is redundant and contrary to the documented workflow. Removed `bpfEnabled: true` from the FelixConfiguration snippets in Step 6, added a short clarifying sentence, and changed the empty `bpfLogLevel: ""` to the documented `"Off"` value (the field accepts `Off`/`Info`/`Debug`).

4. **Fabricated Prometheus metric names (Monitoring section).** None of the five claimed metrics (`felix_bpf_prog_run_count`, `felix_bpf_prog_run_time_seconds`, `felix_bpf_map_update_count`, `felix_bpf_map_delete_count`, `felix_bpf_conntrack_entries`) exist in the Felix metrics reference. Replaced them with real BPF-related Felix metrics (`felix_bpf_dataplane_endpoints`, `felix_bpf_happy_dataplane_endpoints`, `felix_bpf_dirty_dataplane_endpoints`, `felix_bpf_num_ip_sets`, `felix_bpf_conntrack_maglev_entries_total`) and added a pointer to the Felix Prometheus configuration fields.

## Review Notes
- `talosctl apply-config --nodes X --patch @file.yaml` (used without `-f`) is consistent across this entire blog series. The strictly canonical command for in-place patching of an existing machine config is `talosctl patch machineconfig -p @file.yaml`. Left as-is to preserve series-wide consistency; consider a future series-wide cleanup if desired.
- The Talos `localhost:7445` KubePrism endpoint mention is correct (KubePrism is on by default since Talos 1.6); the post's recommendation to use a direct node IP / VIP for Calico eBPF bootstrapping is also reasonable.
- The Calico Installation, ConfigMap (`kubernetes-services-endpoint` in `tigera-operator`), DSR mode field, and Talos `cluster.proxy.disabled` field paths are all correct as published by upstream.
- The `bpftool prog show | head -40` and `iptables-save | grep KUBE` troubleshooting commands rely on those binaries being present in the calico-node image — this is generally true for recent Calico releases but could be a gotcha on stripped images.
