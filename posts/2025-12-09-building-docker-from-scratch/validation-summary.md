# Validation Summary: Building Your Own Container Engine: A Step-by-Step Guide to Understanding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker/container runtime concepts
- Linux namespaces
- Linux cgroups v2
- Linux chroot and procfs
- Go `os/exec` and `syscall`
- Alpine Linux minirootfs

## Sources Consulted
- Linux namespaces manual: https://man7.org/linux/man-pages/man7/namespaces.7.html
- Linux PID namespaces manual: https://man7.org/linux/man-pages/man7/pid_namespaces.7.html
- Linux network namespaces manual: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- Linux chroot manual: https://man7.org/linux/man-pages/man2/chroot.2.html
- Linux cgroups manual: https://man7.org/linux/man-pages/man7/cgroups.7.html
- Linux kernel cgroup v2 documentation: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Go `syscall` package documentation: https://pkg.go.dev/syscall

## Issues Found
- The initial namespace test claimed `echo $$` inside `/bin/bash` should show PID 1. In the shown implementation, the Go wrapper process created with `CLONE_NEWPID` is PID 1, and it starts the shell as a child process, so the shell is usually PID 2. Updated the comment and explanation to reflect the actual process hierarchy.
- The memory-limit test used `dd if=/dev/zero of=/dev/null bs=1M count=200`, which streams data through a small buffer and does not allocate 200MB of resident process memory. Replaced it with a shell loop that grows a variable until the process is killed or allocation fails under the 100MB cgroup limit.

## Review Notes
The Go toolchain is not installed in this workspace, so I could not compile the snippets locally. The code was reviewed against the Go `syscall.SysProcAttr` documentation and Linux kernel/man-page documentation. On systemd-managed cgroup v2 hosts, creating cgroups directly under `/sys/fs/cgroup` and enabling controllers may require host-specific setup; the post already notes that it assumes cgroup v2.
