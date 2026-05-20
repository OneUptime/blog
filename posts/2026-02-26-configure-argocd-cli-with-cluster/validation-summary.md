# Validation Summary: How to Configure ArgoCD CLI with Your Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD CLI
- Kubernetes
- GitOps
- GitHub Actions
- GitLab CI
- Jenkins Pipeline
- YAML and Kubernetes ConfigMaps

## Sources Consulted
- Argo CD CLI command reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/commands/argocd/
- Argo CD login command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD context command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_context/
- Argo CD account token command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD Core operator manual: https://argo-cd.readthedocs.io/en/stable/operator-manual/core/
- Argo CD environment variables: https://argo-cd.readthedocs.io/en/latest/user-guide/environment-variables/
- Argo CD local users/account management: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD app sync command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD app wait command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_wait/

## Issues Found
- The core mode section implied that running `argocd app list --core` alone was the primary setup path. Current Argo CD Core documentation says core mode should be configured with `argocd login --core`, usually after setting the kube context namespace to `argocd`. Updated the example accordingly while keeping the per-command/global flag guidance.
- The core mode explanation said the CLI reads Application CRDs directly from the Kubernetes API. Argo CD Core documentation explains that the CLI uses Kubernetes API access and spawns a local API server process for CLI commands. Updated the wording to avoid the inaccurate direct-read description and to mention Kubernetes RBAC access for `Application` and `ApplicationSet` resources.
- The TLS custom certificate examples used `--certificate-authority` with `argocd login`. The current Argo CD CLI login command inherits `--server-crt` for the Argo CD server certificate; `--certificate-authority` is not the general login flag. Replaced the examples with `--server-crt` and adjusted the heading to describe trusting a custom server certificate.

## Review Notes
- The CI examples use `--insecure`, which is technically valid but should generally be limited to development or explicitly trusted environments.
- The GitLab CI example pins `argoproj/argocd:v2.13.3`; this is syntactically valid, but future maintenance should keep the image tag aligned with the Argo CD server version in use.
