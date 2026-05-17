# Validation Summary: How to Use Seccomp Profiles for Container Security on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux kernel seccomp (Secure Computing Mode) / seccomp-bpf
- libseccomp action types (SCMP_ACT_ERRNO, SCMP_ACT_ALLOW, SCMP_ACT_LOG)
- Docker (`--security-opt seccomp=...`)
- Moby project default seccomp profile
- strace
- Docker Compose `security_opt`
- Kubernetes Pod `securityContext.seccompProfile` (type: Localhost)
- kubelet seccomp profile root (`/var/lib/kubelet/seccomp/`)
- Linux audit subsystem (`ausearch`, `journalctl -k`)
- Ubuntu 22.04

## Sources Consulted
- Docker security documentation: https://docs.docker.com/engine/security/seccomp/
- Moby default seccomp profile: https://github.com/moby/moby/blob/master/profiles/seccomp/default.json
- Kubernetes seccomp documentation: https://kubernetes.io/docs/tutorials/security/seccomp/
- libseccomp / seccomp(2) man pages for action constants and architecture tokens
- strace(1) man page (output format with `-f`)
- Linux signal table for SIGSYS (signal 31 → shell exit code 128+31 = 159)

## Issues Found
- **Broken syscall extraction with `strace -f`**: The original command `grep -oP '^\w+' /tmp/app-trace.txt | sort -u` would miss every syscall emitted by a forked child process. With `-f`, strace prefixes child-process lines with `[pid N] `, which begins with `[` (not a `\w` character), so the anchored `^\w+` pattern never matches those lines. This would produce an incomplete syscall list and a seccomp profile that breaks the application as soon as it forks. Replaced with `grep -oP '^(?:\[pid \d+\] )?\K\w+ ...'`, which uses an optional non-capturing group for the `[pid N]` prefix and `\K` to reset the match start so only the syscall name is captured. Added a short inline comment noting why.

## Review Notes
- The "blocks around 44 system calls" figure for Docker's default profile is approximately correct; the exact number drifts slightly between Moby releases as new syscalls are added to the kernel, but the order-of-magnitude statement is accurate.
- `version: "3.8"` in the Compose example still works but the top-level `version` field is deprecated in the modern Compose Specification. Not changed since it does not affect correctness.
- Docker Compose's `security_opt` accepts both `seccomp:profile.json` (colon) and `seccomp=profile.json` (equals) forms; the colon form used here is the documented one.
- The `localhostProfile` path is resolved relative to the kubelet's seccomp root (`--root-dir` + `seccomp/`, defaulting to `/var/lib/kubelet/seccomp/`), which the post explains correctly.
- The `ExitCode 159 = 128 + SIGSYS(31)` math is correct. The aside that the exit code "may be 31" is a minor stretch (most shells/runtimes will surface 159 for a SIGSYS-killed process), but it is not strictly wrong since the raw signal number is 31, so it was left alone.
- The Moby `master` branch URL is still valid — moby/moby has not migrated its default branch to `main`.
