# Validation Summary: How to Build eBPF Programs with libbpf and CO-RE on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- eBPF
- libbpf
- CO-RE
- BTF
- bpftool
- Clang/LLVM
- C
- Make

## Sources Consulted
- Linux kernel BTF documentation: https://www.kernel.org/doc/html/latest/bpf/btf.html
- libbpf API documentation: https://libbpf.readthedocs.io/en/latest/api.html
- libbpf BPF_CORE_READ documentation: https://docs.ebpf.io/ebpf-library/libbpf/ebpf/BPF_CORE_READ/
- BPF CO-RE documentation: https://docs.ebpf.io/concepts/core/
- Red Hat Enterprise Linux 9 eBPF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/assembly_understanding-the-ebpf-features-in-rhel-9_configuring-and-managing-networking
- Local bpftool help output for `bpftool btf dump` and `bpftool prog show`

## Issues Found
- The CO-RE flow diagram incorrectly said libbpf falls back to compiled offsets when BTF is unavailable. CO-RE relocations depend on target BTF, so the diagram now shows relocation failure when BTF is missing.
- The introductory RHEL claim was too broad. It now specifies RHEL 9 and ties CO-RE availability to the running kernel exposing BTF at `/sys/kernel/btf/vmlinux`.
- The BPF example read `ctx->args[0]` directly while the surrounding comment described CO-RE-safe access. It now uses `BPF_CORE_READ(ctx, args[0])`.
- The userspace loader used `bool` and `EINTR` without including the required headers. The shutdown flag now uses `sig_atomic_t`, and `<errno.h>` was added for `EINTR`.
- The userspace loader could call `ring_buffer__free(rb)` on an uninitialized pointer if loading or attaching failed before the ring buffer was created. `rb` is now initialized to `NULL` and freed only after it is created.
- The userspace loader returned success when `ring_buffer__new` failed because it set `err = 1` but only treated negative values as failures. The cleanup path now returns failure for any nonzero `err`, while treating `-EINTR` from shutdown as success.
- The debugging command claimed `bpftool btf dump file execsnoop.bpf.o` checks for CO-RE relocations. The command now checks for `.BTF` and `.BTF.ext` sections with `llvm-readelf`, which more directly validates that the object contains BTF metadata used for CO-RE.

## Review Notes
- The Makefile uses `-D__TARGET_ARCH_x86`, which is correct for x86/x86_64 targets but should be changed for other RHEL-supported architectures.
- The example requires sufficient privileges or BPF capabilities to load tracing programs; running with `sudo` is a practical default.
