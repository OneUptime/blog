# Validation Summary: What is eBPF and How Does It Work?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- eBPF/BPF
- Linux kernel tracing, verifier, helpers, maps, and program types
- XDP, kprobes, uprobes, tracepoints, LSM hooks, cgroup hooks, struct_ops
- BCC/bpfcc tools
- bpftrace
- libbpf and CO-RE
- Cilium, Falco, Tetragon, Pixie, Parca, Pyroscope, Katran, Cloudflare Unimog
- OpenTelemetry eBPF profiling and auto-instrumentation

## Sources Consulted
- Linux kernel eBPF verifier documentation: https://docs.kernel.org/bpf/verifier.html
- Linux `bpf-helpers(7)` manual: https://man7.org/linux/man-pages/man7/bpf-helpers.7.html
- eBPF Docs program types reference: https://docs.ebpf.io/linux/program-type/
- eBPF Docs map types reference: https://docs.ebpf.io/linux/map-type/
- eBPF Docs bounded loops reference: https://docs.ebpf.io/linux/concepts/loops/
- eBPF Docs helper function reference for `bpf_get_current_pid_tgid`: https://docs.ebpf.io/linux/helper-function/bpf_get_current_pid_tgid/
- BCC installation documentation: https://github.com/iovisor/bcc/blob/master/INSTALL.md
- bpftrace documentation: https://bpftrace.org/docs/0.21
- libbpf-bootstrap repository documentation: https://github.com/libbpf/libbpf-bootstrap
- Microsoft eBPF for Windows project: https://github.com/microsoft/ebpf-for-windows
- OpenTelemetry Profiles public alpha announcement: https://opentelemetry.io/blog/2026/profiles-alpha/
- OpenTelemetry eBPF profiler repository: https://github.com/open-telemetry/opentelemetry-ebpf-profiler
- Cilium performance benchmark documentation: https://docs.cilium.io/en/stable/operations/performance/benchmark/
- Meta Katran engineering post: https://engineering.fb.com/2018/05/22/open-source/open-sourcing-katran-a-scalable-network-load-balancer/
- Cloudflare L4Drop/XDP DDoS mitigation post: https://blog.cloudflare.com/l4drop-xdp-ebpf-based-ddos-mitigations/
- Cloudflare Unimog edge load balancer post: https://blog.cloudflare.com/unimog-cloudflares-edge-load-balancer/

## Issues Found
- The sandboxing description said eBPF programs "can't crash the kernel." Changed this to say they are designed not to crash the kernel, which better matches verifier safety guarantees without implying absolute impossibility.
- The "Zero-Copy" key characteristic overgeneralized eBPF data movement. Changed it to "In-Kernel Processing" and described filtering/aggregation in kernel space to avoid unnecessary transfers to userspace.
- The first C example referenced `syscall_count` without defining the map. Added a minimal BTF-style `BPF_MAP_TYPE_ARRAY` map definition so the snippet is coherent.
- The process-counting example said it inserted new entries atomically and described the upper 32 bits of `bpf_get_current_pid_tgid()` as PID. Updated the prose and comment to reflect that the upper 32 bits contain the TGID/process ID.
- The low-overhead section claimed no context switching and typical overhead under 1% even with extensive tracing. Reworded this to the more accurate claim that kernel hook execution avoids a userspace round trip for every event and overhead depends on hooks, event rate, and exported data.
- The universal visibility section said eBPF can observe any container or VM. Clarified that containers on the same host are visible, while VM visibility depends on host-visible signals or running inside the guest.
- The Cilium use case claimed "10x better performance" without a versioned benchmark context. Replaced it with a more supportable statement about improved performance, scalability, and visibility.
- The OpenTelemetry eBPF profiler note called the project "formerly Prodfiler." Replaced this with its current provenance from Elastic's donated Universal Profiling eBPF agent and Parca Agent development.
- The limitations section said "Linux only" despite the active eBPF for Windows project. Updated it to "Primarily Linux" and clarified the maturity and compatibility caveat.
- The security implications section overstated that a bug would not crash the kernel. Reworded it to focus on verifier intent and operational risks such as overhead or broad policy enforcement.
- The "What eBPF Can't Do" list said eBPF cannot run on non-Linux systems or modify application behavior safely. Updated these to the more accurate limitations: non-Linux systems lack Linux-equivalent maturity/features, and eBPF cannot arbitrarily modify application business logic.

## Review Notes
The C snippets remain illustrative rather than complete standalone programs; a real libbpf program would also need headers such as `vmlinux.h` and `bpf_helpers.h`, a license section, and a userspace loader. The BCC package names and bpftrace one-liners are valid for common Debian/Ubuntu environments, but exact package availability depends on distribution release and enabled repositories.
