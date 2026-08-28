# Validation Summary: How to Fix “Too Many Open Files” in a Qdrant Docker or Kubernetes Deployment

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Qdrant 1.16 and later
- Docker and Docker Compose
- Kubernetes, StatefulSets, kubectl, and the Qdrant Helm chart
- Linux process resource limits (`RLIMIT_NOFILE`) and `/proc`
- Prometheus/OpenMetrics process metrics

## Sources Consulted

- [Qdrant troubleshooting: Too many files open](https://qdrant.tech/documentation/common-errors/)
- [Qdrant monitoring metrics](https://qdrant.tech/documentation/ops-monitoring/monitoring/)
- [Qdrant security and API-key authentication](https://qdrant.tech/documentation/security/)
- [Qdrant installation and persistent-storage requirements](https://qdrant.tech/documentation/installation/)
- [Qdrant optimizer and segment merging](https://qdrant.tech/documentation/ops-optimization/optimizer/)
- [Qdrant multitenancy and payload-based partitioning](https://qdrant.tech/documentation/tutorials/multiple-partitions/)
- [Qdrant snapshots](https://qdrant.tech/documentation/operations/snapshots/)
- [Qdrant upgrade and rolling-restart guidance](https://qdrant.tech/documentation/upgrades/)
- [Qdrant v1.16.0 Dockerfile](https://github.com/qdrant/qdrant/blob/v1.16.0/Dockerfile) and [entrypoint script](https://github.com/qdrant/qdrant/blob/v1.16.0/tools/entrypoint.sh), cross-checked against [v1.19.0](https://github.com/qdrant/qdrant/blob/v1.19.0/tools/entrypoint.sh)
- [Qdrant v1.16.0 release notes](https://github.com/qdrant/qdrant/releases/tag/v1.16.0) and [FD-metrics implementation](https://github.com/qdrant/qdrant/blob/v1.16.0/src/common/metrics.rs)
- [Qdrant Helm chart startup wrapper](https://github.com/qdrant/qdrant-helm/blob/main/charts/qdrant/templates/configmap.yaml), [chart values](https://github.com/qdrant/qdrant-helm/blob/main/charts/qdrant/values.yaml), [chart changelog](https://github.com/qdrant/qdrant-helm/blob/main/CHANGELOG.md), and [StatefulSet template](https://github.com/qdrant/qdrant-helm/blob/main/charts/qdrant/templates/statefulset.yaml)
- [Docker `run --ulimit` reference](https://docs.docker.com/reference/cli/docker/container/run/#set-ulimits-in-container---ulimit)
- [Docker Compose service `ulimits`](https://docs.docker.com/reference/compose-file/services/#ulimits) and [Compose recreation behavior](https://docs.docker.com/reference/cli/docker/compose/up/)
- [Kubernetes KEP-5758](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/5758-per-container-ulimits-configuration), [enhancement issue](https://github.com/kubernetes/enhancements/issues/5758), and [open implementation PR](https://github.com/kubernetes/kubernetes/pull/137023)
- [Kubernetes v1.37 release](https://kubernetes.io/blog/2026/08/26/kubernetes-v1-37-release/), [v1.37.0 core Pod API types](https://github.com/kubernetes/kubernetes/blob/v1.37.0/staging/src/k8s.io/api/core/v1/types.go), and [v0.37.0 CRI API](https://github.com/kubernetes/cri-api/blob/v0.37.0/pkg/apis/runtime/v1/api.proto)
- [Kubernetes StatefulSet update behavior](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#rolling-updates), [`kubectl rollout restart`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/), and [`kubectl rollout status`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/)
- [Kubernetes shared process namespaces](https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/), [`kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/), and [`kubectl exec`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [Linux `getrlimit(2)`](https://man7.org/linux/man-pages/man2/getrlimit.2.html), [`proc_pid_limits(5)`](https://man7.org/linux/man-pages/man5/proc_pid_limits.5.html), and [`proc_pid_fd(5)`](https://man7.org/linux/man-pages/man5/proc_pid_fd.5.html)
- [Linux kernel file-table sysctls](https://www.kernel.org/doc/html/latest/admin-guide/sysctl/fs.html)

## Issues Found

- The post incorrectly stated that the official Qdrant image normally runs Qdrant as PID 1. Its PID 1 is an entrypoint script that starts Qdrant as a child, so `/proc/1/fd` counted the wrapper's descriptors. Replaced every PID-1-based check with a dependency-free lookup of the actual `qdrant` process before reading its limits and descriptor directory.
- The Kubernetes examples did not select the Qdrant container. Added `-c qdrant` to `kubectl logs` and `kubectl exec` so sidecars do not cause the commands to inspect the wrong container, with a note to substitute a different container name.
- The post said KEP-5758 targeted an alpha feature for Kubernetes 1.37. The proposal did not ship in 1.37 and its implementation remains unreleased. Updated the version scope, proposed field path, feature-gate requirements, and runtime/CRI caveat.
- The automatic StatefulSet rollout commands did not state the conditions needed for one-Pod-at-a-time replacement. Added the `RollingUpdate`, partition `0`, `maxUnavailable: 1`, and readiness assumptions, and documented the incompatible `OnDelete`, larger `maxUnavailable`, and alpha `Recreate` behaviors.
- The Helm-chart paragraph overlooked that Qdrant chart version `qdrant-1.15.0` and later already raises the soft `nofile` limit to the inherited hard limit in `initialize.sh`. Documented that behavior and clarified that a low inherited hard limit still requires a node, runtime, or provider change.
- The metrics command did not explain that localhost must reach the selected node, API-key-protected deployments need an authorization header, and a configured metrics prefix changes the names. Added those execution conditions and made `curl` report HTTP failures.
- The restart-safety wording treated replication as deployment-wide and did not ensure an in-Pod snapshot would survive replacement. Corrected it to the per-collection replication-factor requirement and required exporting snapshots or backups outside ephemeral Pod storage.
- Several Qdrant documentation links used redirecting legacy paths. Updated them to the current canonical documentation paths.

## Review Notes

The Docker `--ulimit` command and Compose `ulimits` mapping are correct. The Linux inheritance explanation, init-container warning, Qdrant 1.16 FD metric names, optimizer guidance, persistent-storage requirements, and remaining Docker and kubectl command syntax were verified against the sources above. KEP-5758 is still under development, so its release status and final API must be rechecked before publishing a future manifest example.
