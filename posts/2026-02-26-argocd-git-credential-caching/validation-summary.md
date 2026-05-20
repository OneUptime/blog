# Validation Summary: How to Configure Git Credential Caching in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD repo server
- Argo CD repository credential templates
- Git credential helpers
- Kubernetes ConfigMaps, Secrets, Deployments, and PersistentVolumeClaims
- GitHub App authentication
- Prometheus metrics and PromQL
- Argo CD Helm chart values

## Sources Consulted
- Argo CD private repository and credential template documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD Git configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/git_configuration/
- Argo CD command parameters documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD repo credentials declarative example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-repo-creds-yaml/
- Git credential-cache documentation: https://git-scm.com/docs/git-credential-cache
- Argo CD source code for askpass and GitHub App credential caching: https://github.com/argoproj/argo-cd/blob/master/util/askpass/server.go and https://github.com/argoproj/argo-cd/blob/master/util/git/creds.go
- Argo CD Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml

## Issues Found
- The post instructed users to mount Git configuration at `/home/argocd/.gitconfig`. Current Argo CD runs Git with `HOME=/dev/null`, so global Git configuration is not supported. Updated the examples to mount system Git configuration at `/etc/gitconfig`.
- The post described Git credential caching as storing authenticated sessions. Git credential-cache stores credentials in a daemon's memory, not full authenticated sessions. Updated the wording to avoid overstating what is cached.
- The Git credential-cache examples relied on the default socket path even though Argo CD sets `HOME=/dev/null`. Added an explicit writable socket path under `/tmp`.
- The GitHub App section suggested configuring caching to minimize redundant token generation. Argo CD already caches GitHub App credential transport/token data internally by default. Updated the section to explain the built-in cache and the `ARGOCD_GITHUB_APP_CREDS_EXPIRATION_DURATION` setting.
- The repo-server cache example only used `reposerver.default.cache.expiration` and used a shortened duration. Added the documented `reposerver.repo.cache.expiration` key and used `24h0m0s`, matching Argo CD examples.
- The PromQL example used `argocd_git_request_total{grpc_code="Unauthenticated"}`, but the documented repo-server Git metrics do not define that label. Replaced it with `argocd_git_fetch_fail_total`.
- The troubleshooting command `git credential-cache --daemon` was not an appropriate check for a running helper. Replaced it with `git config --system --get-all credential.helper` and `git credential-cache exit` for clearing the cache.

## Review Notes
The persistent `/tmp` volume example is technically plausible because the repo server uses `/tmp` for local repository paths, but production deployments with multiple repo-server replicas need storage planning so each replica has a compatible writable volume.
