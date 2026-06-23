# Validation Summary: How to Get Started with eBPF Programming on Linux

## Status
validated

## Post Type
Tutorial / Getting-started guide

## Technologies Covered
- eBPF
- Linux kernel tracing
- libbpf
- bpftool
- C
- Clang/LLVM
- eBPF maps
- kprobes/syscall probes
- tracepoints
- XDP
- Linux capabilities

## Sources Consulted
- Linux kernel documentation: BPF libbpf overview, https://docs.kernel.org/bpf/libbpf/libbpf_overview.html
- Linux kernel documentation: Program Types and ELF Sections, https://docs.kernel.org/bpf/libbpf/program_types.html
- Linux kernel documentation: BPF maps, https://docs.kernel.org/bpf/maps.html
- Linux kernel documentation: BPF Design Q&A, https://docs.kernel.org/bpf/bpf_design_QA.html
- libbpf API documentation, https://libbpf.readthedocs.io/en/latest/api.html
- Linux capabilities manual page, https://man7.org/linux/man-pages/man7/capabilities.7.html
- bpftool local help output from installed bpftool v7.7.0 / libbpf v1.7

## Issues Found
- The first kprobe example hard-coded `SEC("kprobe/__x64_sys_execve")`, which is x86_64-specific and less portable than libbpf's syscall-name section format. Changed it to `SEC("ksyscall/execve")` and updated the comments.
- The `bpf_get_current_comm` example passed `&comm`; this works as the same address but is non-idiomatic for the helper's buffer argument. Changed it to `comm`.
- The `bpftool feature` verification command was less precise and may produce incomplete output without privileges. Changed it to `sudo bpftool feature probe kernel`.
- The kernel configuration grep did not match `CONFIG_HAVE_BPF_JIT` or `CONFIG_HAVE_EBPF_JIT` even though the expected output listed JIT capability options. Changed the grep pattern and added `CONFIG_HAVE_EBPF_JIT`.
- The Makefile comment said GCC does not support an eBPF target. That is outdated because GCC has an eBPF backend, even though Clang remains the common compiler for libbpf examples. Updated the comment.
- The run instructions said root is required because loading eBPF programs needs `CAP_BPF`. Updated the wording to clarify that root is the simple path and non-root use depends on capabilities such as `CAP_BPF` and `CAP_PERFMON` on modern kernels.
- The syscall counter described `SEC("tracepoint/raw_syscalls/sys_enter")` as a raw tracepoint. This is a regular tracepoint section; raw tracepoints use `raw_tp/...` or `raw_tracepoint/...` sections. Updated the comment.
- The XDP drop comment said `XDP_DROP` tells the NIC to drop the packet. That is too specific because XDP may run in different modes. Updated it to say XDP drops the packet.

## Review Notes
The examples remain intentionally simple and are suitable for a beginner tutorial. I did not compile the examples locally because `clang` and `llc` are not installed in this environment; code and command checks were performed against official documentation and local `bpftool` help. A future improvement would be to use libbpf skeletons and generated `vmlinux.h` throughout, since the kernel documentation recommends skeletons and CO-RE for more robust modern applications.
