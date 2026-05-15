# Validation Summary: How to Write Custom eBPF Programs with bpftool on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- eBPF
- bpftool
- libbpf
- Clang/LLVM
- Linux tracepoints
- BPF filesystem

## Sources Consulted
- Red Hat Enterprise Linux documentation, "Getting started with XDP and eBPF": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_firewalls_and_packet_filters/getting-started-with-xdp-and-ebpf
- Red Hat Developer Tools documentation, "Using LLVM 19.1.7 Toolset": https://docs.redhat.com/en/documentation/red_hat_developer_tools/1/html/using_llvm_19.1.7_toolset/llvm-toolset
- Linux kernel documentation, "Program Types and ELF Sections": https://www.kernel.org/doc/html/v6.3/bpf/libbpf/program_types.html
- bpftool-prog(8) local manpage
- bpftool-map(8) local manpage
- bpftool-link(8) local manpage
- bpftool-gen(8) local manpage
- bpftool-feature(8) local manpage

## Issues Found
No technical issues found.

## Review Notes
The bpftool command forms in the post match the installed bpftool documentation, including program loading with `autoattach`, map lookup and dump commands, skeleton generation, and feature probing. The tracepoint section name follows libbpf's documented `tracepoint/<category>/<name>` convention. The sample compile command is architecture-specific because it sets `-D__TARGET_ARCH_x86`; users on non-x86 RHEL systems should use the matching target architecture macro.
