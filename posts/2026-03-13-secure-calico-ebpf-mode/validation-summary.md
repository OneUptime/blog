# Validation Summary: How to Secure Calico eBPF Mode

## Status
validated

## Post Type
Guide / Tutorial (security hardening guide)

## Technologies Covered
- Calico (eBPF dataplane mode)
- Kubernetes (NetworkPolicy, namespaces, seccomp via PodSecurityContext)
- Linux eBPF / BPF subsystem
- seccomp-bpf (OCI seccomp profile format)
- AppArmor (referenced in architecture diagram)
- Falco (runtime security, rule syntax)
- Linux Kernel Lockdown LSM
- bpftool, bpftrace

## Sources Consulted
- Calico Felix configuration reference (default ports 9091 metrics, 9099 health): https://docs.tigera.io/calico/latest/reference/felix/configuration
- Tigera Operator docs (calico-system namespace): https://docs.tigera.io/calico/latest/operations/operator-migration
- kernel_lockdown(7) man page: https://man7.org/linux/man-pages/man7/kernel_lockdown.7.html
- LWN article on lockdown LSM (merged in 5.4): https://lwn.net/Articles/791863/
- Docker seccomp profile docs: https://docs.docker.com/engine/security/seccomp/
- Kubernetes seccomp reference: https://kubernetes.io/docs/reference/node/seccomp/
- OCI Runtime Spec (LinuxSyscall, `comment` field)
- Falco default rules and rule reference: https://falco.org/docs/reference/rules/default-rules/
- falcosecurity/rules repository: https://github.com/falcosecurity/rules
- bpftrace tutorial and reference: https://github.com/bpftrace/bpftrace
- bpftool-map(8) man page: https://man7.org/linux/man-pages/man8/bpftool-map.8.html
- Kubernetes well-known labels (`kubernetes.io/metadata.name`, GA in 1.22): https://kubernetes.io/docs/reference/labels-annotations-taints/
- KEP #2161 (NamespaceDefaultLabelName): https://github.com/kubernetes/enhancements/issues/2161

## Issues Found
- **bpftrace kprobe target was non-portable on modern kernels.** The Security Control 5 example used `kprobe:sys_bpf`, which generally fails to attach on x86_64 kernels 4.17+ due to syscall ABI wrappers (the real symbol becomes `__x64_sys_bpf`). Replaced with `tracepoint:syscalls:sys_enter_bpf`, which is the kernel-stable, arch-portable equivalent and is the recommended target in bpftrace docs. The `pid` and `comm` builtins used in the action block remain valid.

## Review Notes
- The seccomp profile in Security Control 1 is presented as illustrative. With `defaultAction: SCMP_ACT_ERRNO`, the explicit `bpf` → `SCMP_ACT_ERRNO` entry is redundant (the default already blocks it). The profile as written would block *all* syscalls, so a real workload profile would need an allow-list of required syscalls. The `comment` field on the syscall entry is a recognized optional documentary field in the OCI runtime spec — not a syntax error.
- Falco rule items in `proc.name in (calico-node, felix, bpftool)` are unquoted bare identifiers; this is valid Falco list syntax for simple tokens. Process names containing special characters would need quoting.
- The Felix Prometheus metrics port (9091) is only exposed when `prometheusMetricsEnabled: true` is set on the `FelixConfiguration`; otherwise the NetworkPolicy ingress rule for port 9091 will simply have nothing to match. Worth noting for readers who have not enabled Felix metrics yet, though not a correctness issue with the NetworkPolicy itself.
- The claim that kernel lockdown "confidentiality" mode "blocks BPF entirely" is a slight simplification. Confidentiality mode disables a broader set of BPF features (notably those that can read kernel memory, plus tracing/kprobes/bpf_probe_read), which in practice is sufficient to break Calico's eBPF dataplane. The post's practical guidance (use `integrity`, not `confidentiality`, with Calico eBPF) is correct.
- `bpftool map list` is correct; `list` is an alias for `show`.
- All Kubernetes resource specifications (`networking.k8s.io/v1` NetworkPolicy, `kubernetes.io/metadata.name` namespace label) are current and accurate for Kubernetes 1.22+.
