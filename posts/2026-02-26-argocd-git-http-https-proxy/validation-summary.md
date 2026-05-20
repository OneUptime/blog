# Validation Summary: How to Configure Git HTTP/HTTPS Proxy in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Git and Git HTTP/HTTPS proxy configuration
- Kubernetes Deployments, ConfigMaps, and Secrets
- Argo Helm chart values
- Prometheus / PromQL

## Sources Consulted
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD Git Configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/git_configuration/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD `argocd repo list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_list/
- Argo Helm chart `values.yaml`: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Git `git-config` documentation: https://git-scm.com/docs/git-config
- curl proxy environment variable documentation: https://everything.curl.dev/usingcurl/proxies/env.html
- Helm `helm upgrade` documentation: https://helm.sh/docs/v3/helm/helm_upgrade/

## Issues Found
- The proxy environment examples used uppercase `HTTP_PROXY`. Git uses libcurl behavior, where the HTTP proxy environment variable is lowercase-only. Changed the examples to use lowercase `http_proxy` and `https_proxy` while keeping `NO_PROXY`.
- The Git configuration section mounted a ConfigMap to `/home/argocd/.gitconfig`. Current Argo CD documentation states that repo-server runs Git with `HOME=/dev/null`, so global Git configuration is not supported. Replaced that section with Argo CD's documented per-repository `proxy` and `noProxy` Secret fields.
- The TLS certificate ConfigMap example used the proxy hostname as the key. Argo CD expects `argocd-tls-certs-cm` keys to be the Git repository server hostname, not the proxy hostname. Changed the example key to `github.com` and clarified the comment.
- The PromQL example filtered `argocd_git_request_total` by `grpc_code="OK"`, but Argo CD's documented repo-server Git metric does not expose that label. Replaced it with a calculated success rate using `argocd_git_fetch_fail_total` and `argocd_git_request_total`.

## Review Notes
- Argo CD documents that `noProxy` syntax support may vary across underlying tools such as Helm and Kustomize; full domains may be more reliable than wildcard patterns or IP ranges if bypass rules are not respected.
- Local CLI verification for `helm`, `kubectl`, and `argocd` was not possible because those binaries are not installed in this workspace; command syntax was checked against official documentation instead.
