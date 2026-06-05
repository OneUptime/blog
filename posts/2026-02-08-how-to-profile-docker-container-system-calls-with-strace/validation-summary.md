# Validation Summary: How to Profile Docker Container System Calls with strace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- strace
- Linux system calls
- Linux capabilities and seccomp
- nsenter / Linux namespaces
- bpftrace / eBPF
- Alpine apk and Debian apt package installation
- Shell scripting and awk

## Sources Consulted
- strace(1) Linux manual page: https://man7.org/linux/man-pages/man1/strace.1.html
- Docker run / container capabilities documentation: https://docs.docker.com/engine/containers/run/
- Docker seccomp security profiles documentation: https://docs.docker.com/engine/security/seccomp/
- Docker CLI `docker inspect` documentation: https://docs.docker.com/reference/cli/docker/inspect/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- nsenter(1) Linux manual page: https://man7.org/linux/man-pages/man1/nsenter.1.html
- capabilities(7) Linux manual page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- bpftrace system call tracing documentation: https://bpftrace.org/hol/system-calls
- bpftrace language documentation: https://bpftrace.org/docs/0.22
- Alpine apk documentation: https://docs.alpinelinux.org/user-handbook/0.1a/Working/apk.html

## Issues Found
- The introduction said every memory allocation passes through a system call. This is too broad because user-space allocators can satisfy allocations without a syscall. Changed the wording to memory mappings.
- The Docker capability/seccomp explanation said Docker's default seccomp profile simply blocks the ptrace syscall. Updated it to reflect that containers lack `CAP_SYS_PTRACE` by default and Docker's default seccomp profile restricts process-inspection syscalls unless the required capability is present.
- Several strace examples used deprecated bare syscall groups such as `trace=network` and `trace=file`. Replaced them with current percent-prefixed groups such as `trace=%network`, `trace=%file`, `trace=%memory`, `trace=%process`, and `trace=%signal`.
- The nsenter example entered the container mount namespace while claiming to run host strace. That can fail if strace is not installed inside the container filesystem. Removed `-m` and clarified that the command enters the PID and network namespaces while using host strace.
- The file I/O summary used `trace=file` while showing `read` in the sample output. Updated the command to trace `%file,read,write` and adjusted the sample summary.
- The seccomp-profile extraction script could include the strace summary `total` row as a syscall name. Replaced the `grep | awk` pipeline with an awk filter that excludes `total`.
- The Debian package installation fallback attempted `apt-get install` without updating package indexes. Added `apt-get update` before `apt-get install -y strace`.
- The file descriptor leak awk parser deleted the wrong field for `close(3) = 0`, so closed descriptors would remain in the report. Rewrote the parser to extract the fd from `close(...)` correctly.
- The production tracing section described bpftrace as "truly minimal-overhead." Changed this to "lower-overhead" because eBPF tracing still has runtime overhead.

## Review Notes
The examples remain intentionally generic and still assume the target image has a shell and an `/app/entrypoint.sh` path. For real seccomp profile generation, strace output should be collected across representative workload paths and converted into a complete seccomp JSON profile rather than used as a final policy directly.
