# Validation Summary: How to Fix 'context deadline exceeded' in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Helm
- Kustomize
- gRPC and gRPC-Web
- Prometheus metrics

## Sources Consulted
- Argo CD high availability guide for repo-server behavior, `ARGOCD_EXEC_TIMEOUT`, shallow clones, controller repo-server timeout guidance, reconciliation timing, and cluster information update timeout: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD `argocd-cmd-params-cm.yaml` reference for `reposerver.git.request.timeout`, `controller.repo.server.timeout.seconds`, and `server.repo.server.timeout.seconds`: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD declarative setup guide for repository Secret proxy configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD FAQ for `timeout.reconciliation` and `timeout.reconciliation.jitter` in `argocd-cm`: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD `argocd login` command reference for `--grpc-web` and `--grpc-web-root-path`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD metrics reference for `argocd_git_request_duration_seconds`: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/

## Issues Found
- The Git request timeout example used a bare integer and described separate default timeouts for ls-remote and fetch. Argo CD documents `reposerver.git.request.timeout` as a duration string with a current default of `15s`, so the example now uses `300s`.
- The shallow clone section had an empty `argocd-cm` snippet. Argo CD documents shallow cloning as repository configuration via `depth: "1"` or `argocd repo add --depth`, so the snippet now uses a repository Secret.
- The Git proxy example used an undocumented `reposerver.git.proxy.url` key. Replaced it with the documented repository Secret `proxy` and `noProxy` fields.
- The manifest generation ConfigMap example used `reposerver.default.cache.expiration` as if it were a manifest generation timeout. That setting controls cache expiration, not command execution timeout. Replaced it with documented repo-server RPC timeout keys and kept `ARGOCD_EXEC_TIMEOUT` as the exec timeout control.
- The Helm timing note said local rendering over 30 seconds would definitely time out. Argo CD documents a default config management command timeout of 90 seconds, so the note now references 90 seconds and avoids overstatement.
- The cluster communication section used an undocumented `controller.k8s.client.timeout` key. Replaced it with the documented `ARGO_CD_UPDATE_CLUSTER_INFO_TIMEOUT` environment variable for slow cluster information updates.
- The gRPC timeout section used an undocumented `reposerver.timeout.seconds` key. Replaced it with `controller.repo.server.timeout.seconds` and `server.repo.server.timeout.seconds`.
- The CLI login section described `--grpc-web` as increasing the client-side timeout. The flag switches protocol mode for proxies/load balancers that do not support HTTP/2 gRPC, so the wording now reflects that.
- The webhook section described `timeout.reconciliation` as webhook processing timeout and placed it in `argocd-cmd-params-cm`. Argo CD documents it as the reconciliation/polling interval in `argocd-cm`, so the section now describes webhook-driven fallback polling.
- The general reference mixed `argocd-cmd-params-cm` keys with `argocd-cm` keys and included unsupported timeout keys. Split the reference into the documented ConfigMaps and corrected the key names and duration values.

## Review Notes
The post remains a high-level troubleshooting guide. Argo CD timeout behavior can vary by version and installation method, so operators should still verify their deployed version's generated command arguments and restart affected Argo CD components after ConfigMap changes when required.
