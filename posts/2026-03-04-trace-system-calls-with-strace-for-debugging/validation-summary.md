# Validation Summary: How to Trace System Calls with strace for Debugging on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- strace
- Linux system calls
- DNF package management
- Shell commands

## Sources Consulted
- strace official site and command reference: https://strace.io/
- Local strace 6.8 manual page (`man strace`)
- Local strace 6.8 CLI help (`strace -h`)
- Red Hat Enterprise Linux 9 documentation, Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool

## Issues Found
- The running-process example used `strace -p $(pidof myapp)`. The strace manual documents passing multiple process IDs as a single argument, for example `-p "$(pidof PROG)"`; quoting the command substitution preserves that behavior when more than one PID is returned. Changed the command to `strace -p "$(pidof myapp)"`.
- The syscall group examples and table used bare group aliases such as `file`, `network`, `process`, `signal`, `memory`, and `ipc`. Modern strace documents the percent-prefixed forms such as `%file` and notes that the syntax without a preceding percent sign is deprecated for these groups. Updated the examples and table to use `%file`, `%network`, `%process`, `%signal`, `%memory`, and `%ipc`.

## Review Notes
The remaining strace options in the post (`-t`, `-tt`, `-r`, `-c`, `-o`, `-f`, `-s`, `-T`, and `-e trace=openat/read/write`) match the strace 6.8 manual and help output. The DNF installation command is appropriate for supported modern RHEL releases that use DNF.
