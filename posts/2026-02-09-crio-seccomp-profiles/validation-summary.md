# Validation Summary: How to Configure CRI-O Seccomp Profiles for System Call Filtering in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- CRI-O
- Linux seccomp
- OCI runtime seccomp profiles
- auditd / auditctl

## Sources Consulted
- Kubernetes documentation: Seccomp and Kubernetes - https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes documentation: Restrict a Container's Syscalls with seccomp - https://kubernetes.io/docs/tutorials/security/seccomp/
- Kubernetes documentation: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- CRI-O crio.conf documentation - https://raw.githubusercontent.com/cri-o/cri-o/main/docs/crio.conf.5.md
- CRI-O command documentation - https://raw.githubusercontent.com/cri-o/cri-o/main/docs/crio.8.md
- OCI Runtime Specification: Linux seccomp configuration - https://github.com/opencontainers/runtime-spec/blob/main/config-linux.md

## Issues Found
- The CRI-O configuration snippet included `seccomp_use_default_when_empty` and `seccomp_profile_root`. Current CRI-O documentation describes `seccomp_profile`, but not `seccomp_profile_root`; `seccomp_use_default_when_empty` is deprecated/absent in current generated docs. I removed those keys and clarified that Kubernetes `Localhost` profiles are resolved relative to the kubelet seccomp directory.
- The custom seccomp allowlists omitted common startup syscalls such as `execve`, `arch_prctl`, `set_tid_address`, `rt_sigreturn`, and `mprotect`, which would make many normal container processes fail before exercising the intended workload behavior. I added commonly required syscalls while keeping the examples restrictive and leaving dangerous syscalls such as `reboot` unallowed.
- The auditctl example used `-a exit,always`. I changed it to the documented `-a always,exit` form.

## Review Notes
The Kubernetes `seccompProfile` API fields and `Localhost` profile usage are current. The exact syscall allowlist still needs workload-specific testing in a staging cluster because required syscalls vary by image, libc, architecture, and application behavior.
