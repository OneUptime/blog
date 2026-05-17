# Validation Summary: How to Configure Capabilities for Containers on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux capabilities (capabilities(7))
- Kubernetes (securityContext, Pod Security Standards / Pod Security Admission)
- containerd (default container capability set on Talos Linux)
- kubectl, jq
- Talos Linux

## Sources Consulted
- capabilities(7) man page — https://man7.org/linux/man-pages/man7/capabilities.7.html
- proc_pid_status(5) man page — https://man7.org/linux/man-pages/man5/proc_pid_status.5.html
- containerd default Unix capabilities (`pkg/oci/spec.go` `defaultUnixCaps`) — https://github.com/containerd/containerd/blob/main/pkg/oci/spec.go
- Kubernetes Pod Security Standards — https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission — https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes securityContext reference — https://kubernetes.io/docs/tasks/configure-pod-container/security-context/

## Issues Found
1. **CAP_FSETID description was inaccurate.** Post said "Set SUID/SGID bits". Per capabilities(7), CAP_FSETID is about *not clearing* SUID/SGID mode bits when a file is modified (and setting SGID on a file whose GID does not match), not about granting permission to set those bits — that is governed by chmod and CAP_FOWNER. Changed to "Preserve SUID/SGID bits on file modification".

2. **CAP_SETPCAP description was outdated.** Post said "Transfer capabilities", which reflects the pre-2.6.24 (pre-file-capabilities) semantics. In modern kernels, CAP_SETPCAP grants the ability to add to the inheritable set, drop from the bounding set (via `prctl PR_CAPBSET_DROP`), and modify securebits. Changed to "Modify process capability sets and bounding set".

## Review Notes
- The containerd default capabilities list matches `defaultUnixCaps()` in containerd exactly (14 caps).
- Pod Security Standards claims are accurate: Restricted allows only `NET_BIND_SERVICE` to be added; Baseline blocks `SYS_ADMIN`, `NET_RAW`, and `SYS_PTRACE` from being added (none are in the Baseline allow-list of 13 caps).
- The "NET_RAW (in some implementations)" qualifier for Baseline is slightly imprecise — NET_RAW is universally absent from the Baseline allow-list for `capabilities.add` since the standard was introduced. However, NET_RAW *is* part of the containerd runtime defaults, so workloads have it unless they drop it. The phrasing is defensible as referring to that nuance, so it was left as-is.
- "About 40 capabilities" is approximately correct — modern kernels have 41 (CAP_LAST_CAP = CAP_CHECKPOINT_RESTORE = 40, plus index 0). Acceptable as written.
- All YAML examples are syntactically valid and use current (non-deprecated) Kubernetes API fields. PSS uses capability names without the `CAP_` prefix in YAML, which the post follows correctly.
- The init-container example correctly demonstrates that even a UID 0 process is restricted when capabilities are dropped (capabilities are independent of UID in modern Linux).
- The `/proc/PID/status` Cap* field names and the 16-hex-char (64-bit) bitmask format are correct.
- The `kubectl label namespace ... pod-security.kubernetes.io/enforce=<level>` syntax is correct.
- The jq expressions are syntactically valid and behave as described.
