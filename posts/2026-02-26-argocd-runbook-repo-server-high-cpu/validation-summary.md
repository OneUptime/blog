# Validation Summary: ArgoCD Runbook: Repo Server High CPU

## Status
validated

## Post Type
Runbook / Troubleshooting guide

## Technologies Covered
- Argo CD repo server
- Argo CD CLI and configuration
- Kubernetes deployments, pods, resources, and volumes
- Helm chart dependency handling
- Redis cache checks
- Prometheus metrics
- Linux cgroup CPU throttling

## Sources Consulted
- Argo CD high availability and scaling documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD repo-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD argocd-cm example configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD app manifests command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- Argo CD app list command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes patch task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Kubernetes volumes documentation for memory-backed emptyDir: https://kubernetes.io/docs/concepts/storage/volumes/
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html

## Issues Found
- The post referenced `argocd_repo_server_request_duration_seconds`, which is not listed in the official repo-server metrics. Replaced it with `argocd_git_request_duration_seconds` and `argocd_repo_pending_request_total`, both documented repo-server metrics.
- The Prometheus example used the same invalid repo-server request duration metric. Replaced it with a query based on `argocd_git_request_duration_seconds_sum` grouped by `repo` and `request_type`.
- The cgroup throttling comment referred to `throttled_periods_total`, which is a Prometheus-style container metric name rather than a field in `cpu.stat`. Updated the guidance to look for `nr_throttled` and `throttled_usec` or `throttled_time`.
- The repo-server parallelism flag was written as `--parallelism-limit`, but the official Argo CD flag is `--parallelismlimit`. Updated the command and prevention checklist.
- The tmpfs mitigation replaced the entire deployment volume list and did not mount the volume, which could remove required volumes from the repo-server pod. Replaced it with a strategic merge patch that updates the `tmp` volume and mounts it at `/tmp`.
- The reconciliation interval example used a bare numeric value. Updated it to documented duration-string values and added `timeout.reconciliation.jitter` because jitter is the mechanism Argo CD documents for spreading refresh load.
- The CPU profiling command omitted that Argo CD disables profiling by default. Added the required `reposerver.profile.enabled` prerequisite.

## Review Notes
The runbook is technically relevant and useful. Some diagnostic log greps are heuristic and may vary by Argo CD version or log format, but they are acceptable as operational examples. The Redis `CONFIG SET maxmemory` mitigation may not persist across pod restarts unless managed in deployment configuration, but it is valid as an immediate live mitigation.
