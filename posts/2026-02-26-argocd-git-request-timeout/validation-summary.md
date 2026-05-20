# Validation Summary: How to Configure Git Request Timeout in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD repo server
- Argo CD Helm chart
- Kubernetes ConfigMaps and Deployments
- Git HTTP configuration
- Prometheus and PromQL

## Sources Consulted
- Argo CD `argocd-cmd-params-cm` reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD repo-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- Argo Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Git config documentation: https://git-scm.com/docs/git-config/

## Issues Found
- The Git request timeout examples used bare numeric values and described the default as 60 seconds. Argo CD documents `reposerver.git.request.timeout` as a duration string with a current default of `15s`, so the examples now use values such as `90s`, `120s`, and `180s`.
- The Helm example used `repoServer.extraArgs` with `--git-request-timeout=90s`, but the current `argocd-repo-server` command reference does not document that flag. Replaced it with the Helm chart's `configs.params.reposerver.git.request.timeout` path.
- The post described `reposerver.git.request.timeout` as a repo-server gRPC timeout. It is the Git request timeout, so the wording and Mermaid label were corrected.
- The API server timeout snippet omitted `controller.repo.server.timeout.seconds`, which is needed for controller-to-repo-server operations during reconciliation. Added it to the relevant examples.
- The manifest generation section used `reposerver.default.cache.expiration` as a timeout. That parameter is cache expiration, not a manifest generation timeout, so it was replaced with repo-server RPC timeout parameters and retained `ARGOCD_EXEC_TIMEOUT` for command execution timeout.
- The Git HTTP example included `http.connectTimeout`, which is not documented by Git config. Removed it and kept the documented `http.lowSpeedLimit` and `http.lowSpeedTime` settings.
- The PromQL histogram examples did not aggregate buckets by `le`, and the timeout counter used an undocumented `grpc_code` label on `argocd_git_request_total`. Updated the histogram queries and replaced the failed-request example with documented `argocd_git_fetch_fail_total`.

## Review Notes
The remaining Kubernetes and Helm commands are syntactically plausible. The post still gives scenario-based timeout values as operational recommendations rather than official defaults; those are acceptable as guidance but should be tuned from observed repo-server metrics in real deployments.
