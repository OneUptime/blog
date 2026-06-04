# Validation Summary: How to implement custom seccomp profiles with JSON definition

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes securityContext seccompProfile
- Linux seccomp
- OCI runtime seccomp JSON profiles
- libseccomp actions, architectures, and comparison operators
- Kubernetes DaemonSet and ConfigMap profile distribution
- auditd ausearch seccomp event monitoring

## Sources Consulted
- Kubernetes documentation: Seccomp and Kubernetes - https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes documentation: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Open Container Initiative Runtime Specification: Linux seccomp configuration - https://github.com/opencontainers/runtime-spec/blob/main/config-linux.md
- Docker documentation: Seccomp security profiles for Docker - https://docs.docker.com/engine/security/seccomp/

## Issues Found
- The introduction referred to `runtime/default`, which is the older annotation-style profile name rather than the current Kubernetes `seccompProfile.type` value. Changed it to `RuntimeDefault`.
- The conditional `open` / `openat` example used the same argument index for both syscalls. `open` has flags at argument index 1, while `openat` has flags at argument index 2. Split the rule into separate `open` and `openat` entries.
- The O_RDONLY masked comparison used `value: 64` without `valueTwo`, which does not match the intended `SCMP_CMP_MASKED_EQ` pattern. Changed the examples to use an access-mode mask of `3` with `valueTwo: 0`.
- The comparison-operator example used `SCMP_CMP_MASKED_EQ` while its comment described `SCMP_CMP_NE`, and the values did not form a clear masked comparison. Replaced it with a `clone` masked comparison example that demonstrates `value` as the mask and `valueTwo` as the expected masked result.
- The localhost profile path statement implied that `/var/lib/kubelet` is always the kubelet root. Clarified that the shown full path applies when kubelet uses its default root directory.

## Review Notes
The example profiles are illustrative and still require workload-specific testing with tools such as `strace` and staged rollout. Kubernetes requires `Localhost` profiles to be present on every node where the Pod may run, and container runtimes may differ in supported seccomp actions or kernel-dependent behavior.
