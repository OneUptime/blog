# Validation Summary: How to Use kubectl Debug for Live Container Troubleshooting

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Kubernetes (`kubectl debug`, ephemeral containers, node debugging)
- kubectl CLI
- Container runtimes (containerd, `crictl`)
- cgroup v1 and cgroup v2
- Debugging images (busybox, alpine, ubuntu, nicolaka/netshoot)
- JDK tooling (jps, jstack, jmap, jstat)
- PostgreSQL (`psql`, `pg_stat_activity`, `pg_locks`)
- Docker (custom debug image build)

## Sources Consulted
- Kubernetes docs — Debug Running Pods (`kubectl debug`, ephemeral containers): https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes docs — Ephemeral Containers concept: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes feature gate / release history for EphemeralContainers (alpha 1.16, beta 1.23 enabled by default, GA 1.25): https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- kubectl debug reference (`--target`, `--copy-to`, `--set-image`, `--share-processes`): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#debug
- Kubernetes node debugging behavior (hostNetwork/hostPID/hostIPC, `/host` mount, `node-debugger-` pod naming): https://kubernetes.io/docs/tasks/debug/debug-cluster/
- cgroup v2 documentation (memory.current/memory.max/cpu.max paths): https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- PostgreSQL docs — pg_stat_activity and pg_locks: https://www.postgresql.org/docs/15/monitoring-stats.html

## Issues Found
- **Feature gate requirement misstated for Kubernetes 1.23 (line 18).** The original text read "Kubernetes 1.23+ (ephemeral containers in beta, requires EphemeralContainers feature gate)." Ephemeral containers graduated to **beta and were enabled by default** in 1.23; manually enabling the `EphemeralContainers` feature gate was only necessary during the alpha phase (1.16–1.22). Corrected the requirements list to reflect the actual lifecycle: alpha 1.16–1.22 (feature gate required), beta 1.23 (enabled by default), GA 1.25+ (no feature gate).

## Review Notes
- The `--target` examples correctly enable process-namespace sharing with the target container; this depends on container-runtime support (CRI runtimes such as containerd/CRI-O support it), which is the common case and worth noting but not an error.
- `ps aux --sort=-%mem` requires the full procps `ps`, which is why the post correctly installs `procps` (alpine) before using it; busybox `ps` does not support `--sort`.
- The `openjdk:11` image is officially deprecated on Docker Hub (superseded by `eclipse-temurin`), but it still pulls and runs, so the JDK debugging example remains functional. Future updates could switch to `eclipse-temurin:11`.
- All kubectl flags, node-debugging behavior, cgroup v1/v2 paths, and the kubectl exec vs kubectl debug comparison table verified as accurate.
