# Validation Summary: How to Create Custom Seccomp Profiles for Kubernetes Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pod securityContext seccomp profiles
- Linux seccomp
- OCI runtime seccomp profile JSON
- strace
- Python
- Kubernetes ConfigMaps, Pods, and DaemonSets
- Fluent Bit log collection

## Sources Consulted
- Kubernetes seccomp reference: https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes seccomp tutorial: https://kubernetes.io/docs/tutorials/security/seccomp/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- OCI Runtime Specification seccomp configuration: https://oci-playground.github.io/specs-latest/specs/runtime/v1.1.0/oci-runtime-spec.html
- libseccomp seccomp_rule_add manual: https://man7.org/linux/man-pages/man3/seccomp_rule_add.3.html
- Local `strace -h` output and local `strace -c -f -S name true` behavior

## Issues Found
- The audit profile description said it logged blocked syscalls. `SCMP_ACT_LOG` allows the syscall after logging it, so the wording was changed to say it logs syscalls without blocking them.
- The audit log example used `kubectl exec` to read `/var/log/audit/audit.log` inside the application container. Seccomp audit records are node logs, so the example was changed to check the node via SSH.
- The shell pipeline for extracting syscall names from `strace -c` could include header or total rows. It now filters numeric summary rows and excludes the `total` row.
- The Python script skipped indented `strace -c` summary rows, so it would usually capture no syscall names. The parser now trims lines and accepts numeric summary rows while excluding headers, separators, and totals.
- The conditional `open` / `openat` seccomp rule used the same argument index for both syscalls and used an incorrect mask/value pair for read-only access. The rules were split so `open` checks argument 1 and `openat` checks argument 2, using the `O_ACCMODE` mask to allow read-only access mode bits.
- The test pod claimed `clock_settime` failure proved a blocked syscall. That operation can also be denied by missing Linux capabilities, so the wording was changed to describe a denied operation rather than attributing the denial only to seccomp.

## Review Notes
The Kubernetes `seccompProfile` fields, `RuntimeDefault` and `Localhost` profile types, localhost profile path behavior, and OCI seccomp JSON field names are consistent with current Kubernetes and OCI documentation. The example syscall allowlists remain illustrative and should be tested against each application and container runtime before production use.
