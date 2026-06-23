# Validation Summary: How to Build Portable eBPF Programs with CO-RE

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- eBPF
- BPF CO-RE
- BTF
- libbpf
- bpftool
- Clang BPF target
- Linux tracing, tracepoints, and kprobes
- BPF ring buffers

## Sources Consulted
- Linux kernel libbpf overview: https://docs.kernel.org/bpf/libbpf/libbpf_overview.html
- Linux kernel BTF documentation: https://docs.kernel.org/bpf/btf.html
- libbpf `bpf_core_read.h` source: https://raw.githubusercontent.com/libbpf/libbpf/master/src/bpf_core_read.h
- bpftool BTF manual: https://manpages.debian.org/testing/bpftool/bpftool-btf.8.en.html
- bpftool gen manual: https://manpages.debian.org/testing/bpftool/bpftool-gen.8.en.html
- bpftool prog manual: https://manpages.debian.org/testing/bpftool/bpftool-prog.8.en.html

## Issues Found
- The introduction overstated CO-RE portability as working on any BTF-enabled kernel. Updated it to clarify that the target kernel must also support the helpers, map types, program types, and attach points used by the program.
- The simplified libbpf macro definitions used incorrect forms and obsolete/incorrect constants such as `BPF_FIELD_SIZE` and `BPF_FIELD_OFFSET`. Updated the excerpt to match current libbpf macro names and variadic forms.
- The eBPF tracepoint example used `bpf_probe_read_str` for kernel memory. Updated it to `bpf_probe_read_kernel_str`.
- The user-space loader used `bool` and `va_list` without explicitly including `<stdbool.h>` and `<stdarg.h>`. Added the missing includes.
- The renamed-field section described the technique as field aliases. Reworded it to describe preserve-access-index local structures and field existence checks.
- The runtime feature detection example claimed an initialization program ran once and used an invalid `bpf_core_field_exists` form. Updated the explanation and corrected the field existence expression.
- The compatibility testing section implied ordinary Docker containers can test different kernel versions. Updated it to state that tests must run on hosts, VMs, or CI runners actually booted into the target kernels.
- The kernel list labeled Linux 6.8 as "Latest stable", which is no longer accurate. Changed the comment to Ubuntu 24.04 LTS.
- The best-practices section overstated "always" rules for direct field access and field-existence checks. Narrowed the guidance to relocatable kernel structure access and optional/version-specific fields.
- The `vmlinux.h` guidance claimed generating from the oldest kernel ensures all field names match older kernels. Updated it to describe using a baseline header for the minimum required fields and local structures for optional newer fields.
- The enum relocation example used a non-portable `enum task_state` example. Replaced it with a real kernel enum-style example using `enum bpf_cmd` and `BPF_LINK_CREATE`.
- The troubleshooting section focused on an "Unknown relocation" error. Generalized it to CO-RE relocation errors caused by missing target BTF types, fields, or enum values.

## Review Notes
The article is technically relevant and useful after correction. I could not compile the examples locally because `clang` and libbpf development pkg-config metadata are not installed in this environment, but the commands and APIs were checked against the installed `bpftool v7.7.0` where possible and against the official kernel/libbpf documentation and source.
