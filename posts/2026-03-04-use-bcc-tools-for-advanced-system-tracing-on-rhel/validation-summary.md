# Validation Summary: How to Use bcc Tools for Advanced System Tracing on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- BCC (BPF Compiler Collection)
- eBPF tracing tools
- Linux performance analysis
- Disk I/O, network, CPU scheduling, memory, syscall, and function tracing

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Network tracing using the BPF compiler collection": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/network-tracing-using-the-bpf-compiler-collection_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation, "Analyzing system performance with BPF Compiler Collection": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_monitoring_and_updating_the_kernel/managing_monitoring_and_updating_the_kernel
- BCC upstream tool examples and source code: https://github.com/iovisor/bcc/tree/master/tools
- BCC upstream trace examples: https://raw.githubusercontent.com/iovisor/bcc/master/tools/trace_example.txt

## Issues Found
- The `trace` example used `arg2` when printing the filename argument for `do_sys_open`. Upstream BCC examples use `arg2@user` for this case so the string is read from user memory correctly. Updated the command to `sudo /usr/share/bcc/tools/trace 'do_sys_open "%s", arg2@user'`.

## Review Notes
Most commands match BCC tool names, options, and examples from Red Hat documentation or upstream BCC. Some low-level function tracing examples depend on kernel symbol availability, so users may need to adapt function names on kernels where a symbol such as `do_sys_open` is not present or has changed.
