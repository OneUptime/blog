# Validation Summary: How to Configure Container Security Context for Rook-Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes (security contexts, pod security, seccomp profiles)
- Trivy (container/Kubernetes security scanner)
- CSI (Container Storage Interface)

## Sources Consulted
- Kubernetes official docs: Configure a Security Context for a Pod or Container — https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes official docs: Linux kernel security constraints — https://kubernetes.io/docs/concepts/security/linux-kernel-security-constraints/
- Rook Ceph Operator Helm Chart documentation — https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Rook values.yaml on GitHub — https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook OpenShift documentation (privileged requirements) — https://rook.io/docs/rook/v1.14/Getting-Started/ceph-openshift/
- Trivy Kubernetes target documentation — https://trivy.dev/docs/latest/target/kubernetes/
- Trivy cluster scanning tutorial — https://trivy.dev/docs/latest/tutorials/kubernetes/cluster-scanning/
- GitHub Issue rook/rook#7413 — PVC-based Ceph OSD and privileged mode interaction

## Issues Found

1. **OSD Security Context: `privileged: true` with capabilities add/drop is misleading** — When `privileged: true` is set on a Kubernetes container, all Linux capabilities are granted and any `capabilities` add/drop fields are functionally overridden. The original post set `privileged: true` alongside `capabilities.add` (SYS_ADMIN, MKNOD) and `capabilities.drop` (NET_ADMIN, SYS_PTRACE), claiming this was "the minimum required set." This is incorrect — the capabilities block has no effect in privileged mode. Fixed by removing the capabilities block from the privileged example and clarifying that privileged mode grants all capabilities.

2. **PVC-based OSD snippet showed no security context** — The text claimed PVC-based OSDs "reduce OSD privileges further" but the YAML snippet only showed `storageClassDeviceSets` configuration with no security context changes. Also removed the incorrect `preparePlacement: {}` field. Updated the text to accurately describe that PVC-based OSDs may allow running without privileged mode depending on the environment and SELinux configuration.

3. **CSI Plugin section mislabeled volumes as security context** — The YAML under "CSI Plugin Security Context" showed `csi.cephFSPluginVolume` and `csi.rbdPluginVolume`, which are volume configurations in the Rook Helm chart, not security context settings. Clarified that these are additional host volume mounts for the CSI plugin DaemonSets, and moved the note about `privileged: true` being required for CSI node plugins to be more prominent.

4. **Custom seccomp profile for OSDs was dangerously incomplete** — The original profile listed only ~14 syscalls (open, read, write, close, stat, fstat, ioctl, mmap, munmap, mprotect, io_setup, io_submit, io_getevents, io_destroy). This is far too few for a Ceph OSD to function — missing critical syscalls like socket, connect, clone3, futex, epoll_*, prctl, and many others. Also used legacy syscall names (`open`, `stat`) instead of modern equivalents (`openat`, `newfstatat`). Fixed by expanding the example, updating syscall names, and adding a prominent warning that this is an abbreviated example requiring comprehensive syscall auditing for production use.

5. **Trivy command missing `--namespace` flag** — The command used `namespace rook-ceph` (positional argument) instead of `--namespace rook-ceph` (flag). This would cause a Trivy CLI error. Fixed to `--namespace rook-ceph`.

## Review Notes
- The Rook Helm chart values for the operator security context (`operator.securityContext`) are shown in a simplified form. The actual Helm chart structure may vary between Rook versions — users should consult the values.yaml for their specific version.
- Running Trivy as a pod via `kubectl run` requires the pod's service account to have RBAC permissions to query the Kubernetes API. The post does not mention this prerequisite.
- The post does not specify which versions of Rook/Ceph it targets. Security context requirements can vary between Rook versions — particularly around PVC-based OSD privilege requirements.
