# Validation Summary: How to Scale the ArgoCD Repo Server

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD repo-server
- Argo CD CLI and repository configuration
- Kubernetes Deployments, ConfigMaps, Secrets, and emptyDir volumes
- Argo Helm chart values
- Prometheus metrics and alert rules
- Helm, Kustomize, and Config Management Plugins

## Sources Consulted
- Argo CD high availability and repo-server scaling documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD repo-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD command parameters ConfigMap example: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD repo add CLI reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD repositories declarative setup example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-repositories-yaml/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo Helm chart values and repo-server deployment templates: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd

## Issues Found
- The Git optimization section used non-existent repo-server-wide `reposerver.git.shallow.clone` and `reposerver.git.lfs.enabled` ConfigMap keys. Replaced them with the supported per-repository `depth: "1"` Secret setting and `argocd repo add --depth 1` / `--enable-lfs` CLI examples.
- The tmpfs Helm values example added duplicate `tmp` volumes through `repoServer.volumes` and `repoServer.volumeMounts`. Updated it to override the chart's built-in `tmp` and `helmWorkingDir` volumes via `repoServer.existingVolumes`.
- The deployment patch mounted a custom `helm-cache` volume at `/helm-working-dir`, which conflicts with the standard repo-server Helm working directory volume name. Changed it to `helm-working-dir`.
- The "connection pool" section described settings that are actually request timeout and manifest-generation parallelism controls. Renamed the section and corrected the explanatory text and inline comment.
- The Prometheus latency alert used `histogram_quantile` directly on a cumulative bucket metric. Updated it to use `sum(rate(argocd_git_request_duration_seconds_bucket[5m])) by (le)`.

## Review Notes
The sizing numbers and scaling thresholds are operational recommendations rather than official limits. They are plausible starting points, but real deployments should tune them using repo-server metrics and workload-specific profiling.
