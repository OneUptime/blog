# Validation Summary: How to Operationalize Calico eBPF Mode

## Status
validated

## Post Type
Operational guide / Runbook

## Technologies Covered
- Calico (eBPF data plane)
- Kubernetes (kubectl, DaemonSets, node operations)
- eBPF / BPF (bpftool, BPF maps)
- Felix (Calico's per-node agent and its Prometheus metrics)
- Tigera Operator (calico-system namespace, ImageSet)
- Bash scripting

## Sources Consulted
- Calico eBPF troubleshooting docs: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico enabling eBPF docs: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Red Hat solution on Calico BPF program naming: https://access.redhat.com/solutions/6965315

## Issues Found
1. **Incorrect `calico-node` BPF CLI syntax.** The post used `calico-node -bpf-nat-dump` as a single hyphenated flag. The actual Calico CLI uses `-bpf` followed by a command + subcommand (e.g., `nat dump`, `conntrack dump`, `routes dump`). Changed to `calico-node -bpf nat dump`.
2. **Non-existent Felix metric `felix_bpf_enabled`.** Felix does not expose a metric by that name. The actual BPF-related metrics are in the `felix_bpf_*` family (`felix_bpf_dataplane_endpoints`, `felix_bpf_num_ip_sets`, etc.). The authoritative on/off signal is the `bpfEnabled` field on FelixConfiguration. Updated the rollback step to point to those.
3. **Incorrect `grep` pattern for Calico BPF programs.** Calico's BPF programs are named with the `cali_` prefix (e.g., `cali_tc_preambl`), and kernel truncates BPF program names to 16 characters, so `grep -c calico` matches nothing on a Calico eBPF node. Replaced both occurrences (`validate_new_node` and `daily-ebpf-health-check.sh`) with `grep -c cali_`.

## Review Notes
- Kernel `>= 5.3` is correct as the documented minimum, though current Calico docs recommend 5.8+ for the best experience; RHEL 8.4 with the 4.18.0-305+ backport is also supported. Left the post's flowchart as-is since 5.3 is still the documented floor.
- The `awk '{sum += NF} END {print sum}'` heuristic for endpoint counting is a rough proxy (sums field counts across `kubectl get endpoints` rows, not actual endpoint addresses). It is acknowledged in the post as an estimate, so left unchanged.
- `kubectl debug node/... --image=alpine -it --quiet` is valid; `--quiet` (`-q`) is a supported flag on `kubectl debug`. The `-it` combination may behave oddly in non-interactive CI contexts, but it is syntactically valid.
- "BPF maps have fixed maximum sizes set at compile time" is slightly imprecise — sizes are set at load time based on Felix configuration (e.g., `BPFMapSizeNATFrontend`, `BPFMapSizeConntrack`). Not factually wrong enough to require a fix in this operational post.
