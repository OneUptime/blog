# Validation Summary: How to Use BCC Tools (eBPF) for Performance Analysis on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- BPF Compiler Collection (BCC)
- eBPF tracing
- Linux performance analysis
- BCC command-line tools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Analyzing system performance with BPF Compiler Collection": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/analyzing-system-performance-with-bpf-compiler_collection_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 documentation, "Network tracing using the BPF compiler collection": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/network-tracing-using-the-bpf-compiler-collection_configuring-and-managing-networking
- Red Hat Customer Portal solution on RHEL BCC man page names: https://access.redhat.com/solutions/6922011
- iovisor/bcc official repository and tool examples: https://github.com/iovisor/bcc
- iovisor/bcc `profile` example: https://raw.githubusercontent.com/iovisor/bcc/master/tools/profile_example.txt
- iovisor/bcc `trace` source examples: https://raw.githubusercontent.com/iovisor/bcc/master/tools/trace.py

## Issues Found
- The prerequisite said "Kernel 5.14 or later (included in RHEL)", which was too broad because RHEL 9 includes the 5.14 kernel baseline. Changed it to "included in RHEL 9".
- The command examples used `sudo execsnoop`, `sudo opensnoop`, and similar short command names after adding `/usr/share/bcc/tools` to the user's `PATH`. On RHEL, `sudo` can use a restricted `secure_path`, so the user-level `PATH` update may not apply. Changed the examples to use the full `/usr/share/bcc/tools/` paths, matching Red Hat documentation.
- The `trace` example used `arg2` for a user-space string argument. BCC's own `trace` examples use `arg2@user` for this `do_sys_open` string argument so the string is read from user memory. Updated the command accordingly.
- The man page example used `man execsnoop-bpfcc`, which is Debian/Ubuntu-style naming. RHEL `bcc-tools` man pages use a `bcc-` prefix, such as `man bcc-execsnoop`. Updated the example and added the Red Hat-documented `/usr/share/bcc/tools/doc/execsnoop_example.txt` reference.

## Review Notes
Most BCC tool descriptions in the post match Red Hat and upstream BCC documentation. The `trace` example depends on kernel symbol availability, so users may need to adjust the traced function on kernels where `do_sys_open` is not exposed.
