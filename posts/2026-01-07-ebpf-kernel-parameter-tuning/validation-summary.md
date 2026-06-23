# Validation Summary: How to Tune Kernel Parameters for eBPF Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- eBPF
- Linux kernel sysctl
- BPF verifier
- bpftool
- libbpf
- Docker Compose
- Kubernetes
- XDP and TC networking

## Sources Consulted
- Linux Kernel BPF Design Q&A: https://docs.kernel.org/bpf/bpf_design_QA.html
- Linux Kernel eBPF verifier documentation: https://docs.kernel.org/bpf/verifier.html
- Linux Kernel `/proc/sys/kernel` documentation: https://docs.kernel.org/admin-guide/sysctl/kernel.html
- Linux Kernel `/proc/sys/net` documentation: https://docs.kernel.org/admin-guide/sysctl/net.html
- Linux `bpf(2)` manual: https://man7.org/linux/man-pages/man2/bpf.2.html
- bpftool map command help from the installed bpftool CLI
- libbpf overview: https://libbpf.readthedocs.io/en/latest/libbpf_overview.html
- eBPF resource limit reference: https://docs.ebpf.io/linux/concepts/resource-limit/
- eBPF tail call reference: https://docs.ebpf.io/linux/concepts/tail-calls/

## Issues Found
- The post stated that eBPF maps and programs generally require locked memory. Updated the memory sections to distinguish pre-5.11 `RLIMIT_MEMLOCK` accounting from Linux 5.11+ cgroup memory accounting.
- The Docker Compose example described `SYS_ADMIN` as required for loading BPF programs. Updated the capability guidance to prefer `CAP_BPF` and `CAP_PERFMON` on newer kernels, while retaining `SYS_RESOURCE` and `NET_ADMIN` where relevant.
- The stack section described the 512-byte limit as a compile-time limit and implied tail calls provide `33 x 512` bytes of stack. Updated this to verifier-enforced stack limits, 32 successful tail calls, and 33 total programs.
- The large stack-allocation example understated the structure size and used an unnecessarily awkward `bpf_get_current_comm()` argument. Corrected the size estimate and buffer argument.
- The XDP tail-call example used `htons()` in BPF C. Replaced it with `bpf_htons()`.
- The map section claimed `bpftool map update` could resize maps at runtime. Corrected this to state that `max_entries`, key size, and value size are fixed at map creation, and that `bpftool map update` updates entries only.
- The verifier section claimed sysctls control verifier behavior and treated `bpf_stats_enabled` as a verifier log level. Corrected this to describe `bpf_stats_enabled` as runtime statistics and clarified that core verifier limits are kernel implementation limits.
- The `kernel.unprivileged_bpf_disabled` value descriptions were incorrect. Updated values `0`, `1`, and `2` to match kernel documentation.
- Several sysctl comments were inaccurate or overbroad, including `perf_event_paranoid`, `perf_event_max_sample_rate`, `bpf_jit_limit`, and `kptr_restrict`. Updated the descriptions to match kernel documentation.
- The troubleshooting section treated locked-memory failures as universal. Updated it to mention cgroup memory limits on Linux 5.11+.

## Review Notes
Some tuning values in the post are workload-dependent examples rather than universal recommendations. Future improvements could add distro-specific caveats for sysctl availability and container runtime support for newer Linux capabilities such as `BPF` and `PERFMON`.
