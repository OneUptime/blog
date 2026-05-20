# Validation Summary: How to Configure argocd-repo-server Options

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD repo-server
- Kubernetes Deployments, ConfigMaps, Secrets, and volumes
- Helm chart values for Argo CD installation
- Config Management Plugins
- Redis caching
- Prometheus metrics

## Sources Consulted
- Argo CD argocd-repo-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD v2.10 argocd-repo-server command reference: https://argo-cd.readthedocs.io/en/release-2.10/operator-manual/server-commands/argocd-repo-server/
- Argo CD argocd-cmd-params-cm reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD high availability and repo-server scaling guidance: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD TLS configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo Project Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Argo CD GitHub releases: https://github.com/argoproj/argo-cd/releases

## Issues Found
- The post used `--parallelism-limit`, but the repo-server flag is `--parallelismlimit`. Updated all command, Helm, and explanatory references.
- The post documented `--git-request-timeout` as a repo-server command-line flag, but Git request timeout is configured through `reposerver.git.request.timeout` in `argocd-cmd-params-cm`. Replaced the command snippet with a ConfigMap example.
- The post documented `--git-retry-max-duration`, which is not a repo-server flag. Replaced it with `ARGOCD_GIT_ATTEMPTS_COUNT`, which Argo CD documents for retrying failed Git requests.
- The post documented `--git-shallow-clone`, which is not a repo-server command-line flag. Replaced it with the supported per-repository `depth: "1"` configuration.
- The post documented `--tls-cert-file` and `--tls-key-file`, which are not repo-server command-line options. Replaced them with the documented `argocd-repo-server-tls` Secret pattern.
- The repo cache explanation incorrectly tied cache expiration to frequent Git clones and non-webhook detection. Clarified that the option controls repo-state and manifest-generation cache behavior and is relevant for cases such as Kustomize remote bases or unchanged Helm chart versions.
- The Config Management Plugin sidecar example referenced volumes that were not defined and omitted documented sidecar requirements. Added the `var-files`, `plugins`, and separate `cmp-tmp` volumes, mounted `plugin.yaml` with `subPath`, and added the recommended non-root user 999 security context.
- The production example used the outdated `quay.io/argoproj/argocd:v2.10.0` image. Updated it to the current release image `quay.io/argoproj/argocd:v3.4.1`.
- The metrics explanation described `argocd_repo_pending_request_total` as pending manifest generation requests. Updated it to the documented meaning: pending requests waiting on a repository lock.

## Review Notes
The recommended resource values and `--parallelismlimit` ranges are operational guidance rather than fixed Argo CD defaults; they should be validated against workload-specific repository size, chart complexity, and cluster capacity.
