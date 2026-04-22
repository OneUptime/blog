# Validation Summary: How to Use Seccomp Profiles in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Kubernetes security contexts
- Kubernetes seccomp profiles
- Linux seccomp
- OCI seccomp profile JSON
- Container runtime security

## Sources Consulted
- Kubernetes documentation - Seccomp and Kubernetes: https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes documentation - Configure a Security Context for a Pod or Container: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes tutorial - Restrict a Container's Syscalls with seccomp: https://kubernetes.io/docs/tutorials/security/seccomp/
- OCI Runtime Specification - Linux seccomp configuration: https://github.com/opencontainers/runtime-spec/blob/main/config-linux.md
- Rancher Dashboard v2.14.0 release notes: https://github.com/rancher/dashboard/releases/tag/v2.14.0
- Rancher Dashboard PR #16048 adding Seccomp Profile fields to workload Pod and Container security context forms: https://github.com/rancher/dashboard/pull/16048

## Issues Found
1. **Rancher UI instructions were too broad and used the custom path as if it were the seccomp type.** Kubernetes requires `type: Localhost` with `localhostProfile` set to the node-relative profile path. Rancher Dashboard added Seccomp Profile UI fields for workload Pod and Container security contexts in the v2.14.0 line. **Fix:** Clarified that the UI path applies to Rancher v2.14.0 and later, and that custom profiles require selecting `Localhost` and setting `Localhost Profile` to `profiles/custom-nginx.json`.
2. **The audit command pointed to Rancher node-agent pod logs.** `SCMP_ACT_LOG` records syscall audit messages in the node's kernel/audit logging path, not in Rancher agent pod logs. **Fix:** Replaced `kubectl logs -n kube-system <node-agent-pod>` with node-level kernel/audit log commands using `journalctl -k`, `dmesg`, or `/var/log/syslog` depending on the node OS.
3. **The custom nginx seccomp profile could be interpreted as a complete, reusable allowlist.** Seccomp allowlists are workload, image, runtime, architecture, and kernel dependent; Kubernetes documentation recommends deriving them from audit logs and testing the workload. **Fix:** Added a caveat that the JSON is an OCI seccomp profile example and that the final syscall list must be generated and tested for the actual environment.

## Review Notes
- The Kubernetes `seccompProfile` field is stable since Kubernetes v1.19, so the Kubernetes version prerequisite is accurate.
- The profile types `RuntimeDefault`, `Localhost`, and `Unconfined` are correct.
- The `localhostProfile` value is correctly relative to the kubelet seccomp profile directory, which defaults to `/var/lib/kubelet/seccomp` on Linux.
- `SCMP_ACT_LOG` allows syscalls after logging them, which is suitable for audit-driven profile development but not for enforcement.
