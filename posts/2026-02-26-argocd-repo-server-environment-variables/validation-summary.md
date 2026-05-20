# Validation Summary: How to Configure ArgoCD Repo Server Environment Variables

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD repo server
- Kubernetes ConfigMaps, Secrets, Deployments, and volumes
- Git, Git LFS, and repository credentials
- Helm, Kustomize, Jsonnet, and Config Management Plugins
- Prometheus metrics
- kubectl

## Sources Consulted
- Argo CD argocd-cmd-params-cm example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD repo server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD repository Secret example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-repositories-yaml/
- Argo CD Git configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/git_configuration/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD source code for repo-server flags and metrics: https://github.com/argoproj/argo-cd

## Issues Found
- The Git request timeout example used bare seconds and an outdated default. Changed `reposerver.git.request.timeout` to a duration string (`120s`) and noted the current default of `15s`.
- The Git credential caching example used unsupported `GIT_CREDENTIAL_CACHE_TIMEOUT`. Replaced it with a supported repository Secret credential example.
- The Git LFS example used unsupported `ARGOCD_GIT_LFS_ENABLED`. Replaced it with the supported per-repository `enableLfs: "true"` Secret setting.
- The exec timeout example used unsupported `reposerver.exec.timeout`. Replaced it with `controller.repo.server.timeout.seconds` plus the supported `ARGOCD_EXEC_TIMEOUT` environment variable.
- The TLS example used unsupported `reposerver.tls.cert` and `reposerver.tls.key` keys. Replaced them with supported repo-server TLS protocol settings.
- The plugin environment variable example implied users must directly set `ARGOCD_ENV_` variables on the repo-server Deployment. Updated it to use Application plugin environment variables, which Argo CD prefixes with `ARGOCD_ENV_` before plugin execution.
- Several Prometheus metric names did not match current Argo CD repo-server metrics. Replaced them with supported metrics such as `argocd_git_request_duration_seconds`, `argocd_git_request_total`, `argocd_repo_pending_request_total`, and `argocd_repo_parallelism_wait_duration_seconds`.
- The OOMKilled event command used an event reason that is not a reliable Kubernetes field selector. Replaced it with a pod describe command that searches container state output.

## Review Notes
The workload-size parallelism recommendations are heuristic guidance rather than official Argo CD defaults. They are reasonable as tuning advice, but production values should still be validated with metrics and load testing for each installation.
