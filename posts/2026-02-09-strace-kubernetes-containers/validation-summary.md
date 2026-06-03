# Validation Summary: How to Use strace Tracing Inside Kubernetes Containers for System Call Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Ephemeral containers
- Pod security contexts and Linux capabilities
- Pod process namespace sharing
- strace
- Linux ptrace and CAP_SYS_PTRACE
- Shell scripting

## Sources Consulted
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes ephemeral containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes process namespace sharing documentation: https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Pods documentation for immutable pod update fields: https://v1-33.docs.kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- strace manual page: https://man7.org/linux/man-pages/man1/strace.1.html
- Linux capabilities manual page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- Local `strace -h` output for option validation.

## Issues Found
- The initial sidecar-style pod example mounted host `/proc` but did not enable pod process namespace sharing. Kubernetes documents `shareProcessNamespace: true` as the way to make processes visible across containers in the same pod. I added `shareProcessNamespace: true` and removed the unnecessary hostPath `/proc` mount.
- The ephemeral container command used `--share-processes` with `kubectl debug` without `--copy-to`, but the official kubectl reference says `--share-processes` only applies when creating a copied pod. I removed that flag, changed `--target` to a container name, and added `--profile=sysadmin` so the debug container has the privileges needed for ptrace-based debugging.
- The DNS debugging example traced only `connect`, which is too narrow for DNS activity because resolver traffic commonly uses send/receive network syscalls. I changed it to trace the network group and filter for `connect`, `sendto`, and `recvfrom`.
- The slow syscall search assumed timing markers existed but the saved trace example did not include `-T`, and the grep pattern also matched zero-second timings. I changed the saved trace command to include `-T` and replaced the grep with an awk filter for syscall durations greater than one second.
- The syscall counting examples used fields that do not reliably contain syscall names in strace output, especially when timestamps are enabled. I updated the standalone command and the analysis script to strip leading timestamps and split on `(` to extract syscall names.
- The troubleshooting example tried to add `SYS_PTRACE` directly to a running Pod with `kubectl patch pod`, but Kubernetes Pod updates cannot mutate arbitrary container securityContext fields. I changed it to patch a Deployment pod template so the controller creates a new Pod with the corrected security context.

## Review Notes
- Some examples still assume the container has a package manager, runs as a user that can install packages, and is allowed by admission policy to add capabilities or use privileged debug profiles. Those are environment-specific operational constraints, not command syntax errors.
- Adding `SYS_PTRACE`, using `--profile=sysadmin`, and enabling process namespace sharing are powerful debugging choices and may be blocked by Pod Security Admission or organization policy in production clusters.
