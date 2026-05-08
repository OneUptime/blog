# Validation Summary: How to Validate Calico eBPF Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico eBPF dataplane
- Kubernetes
- kube-proxy
- Kubernetes NetworkPolicy
- kubectl
- iptables
- bpftool
- iperf3

## Sources Consulted
- Calico documentation: Install in eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Enabling the eBPF data plane, https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Troubleshoot eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: Felix configuration, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes documentation: kubectl wait, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes documentation: kubectl exec, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: kubectl run, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl expose, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes documentation: Network Policies, https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post said Felix silently falls back to iptables if the kernel does not support BPF. Calico documents that Felix logs an error and disables BPF mode, so the wording was corrected.
- The BPF validation script relied only on `bpftool prog list | grep "calico"`, which can miss Calico programs and is not Calico's documented inspection path. The script now checks Felix's BPF startup log message and uses the documented `calico-node -bpf` tool, with `bpftool` as a fallback.
- The iptables validation claimed that zero Calico iptables rules confirms eBPF mode. This was changed to describe iptables state as a secondary signal, since Calico's eBPF validation should come from node dataplane state and kube-proxy conflict checks.
- The iptables rule-count command could output two zeroes when `grep -c` found no matches because `grep` still exits non-zero. The command was changed to run the count inside the remote shell with `grep -Ec ... || true`.
- The kube-proxy warning claimed kube-proxy might cause double NAT. Calico documentation frames the issue as wasted resources, reduced performance, and possible iptables cleanup conflicts, so the warning was corrected.
- The service-routing test used `http://kubernetes.default.svc.cluster.local`, but the default Kubernetes service is HTTPS on port 443 rather than an HTTP endpoint. The example now creates a temporary nginx deployment and service, then tests service routing against that service.
- The examples used `kubectl wait --for=condition=completed` for Pods, but `Completed` is not a Pod condition in the kubectl wait reference. The examples now wait for `.status.phase` to become `Succeeded`.
- The network policy test used a service DNS name after applying a deny-all egress policy, which could fail at DNS resolution rather than validating the intended connection denial. The example now resolves the Service ClusterIP before the deny test and connects to that IP.
- The policy-drop validation checked calico-node logs for generic "denied" or "drop" strings and claimed that proved BPF enforcement. The example now checks Calico BPF counters with `calico-node -bpf counters dump`.

## Review Notes
The performance benchmark remains a simple smoke test. A rigorous performance comparison would need a controlled baseline, repeated runs, node placement control, and awareness of Calico's documented overlay-mode performance caveats.
