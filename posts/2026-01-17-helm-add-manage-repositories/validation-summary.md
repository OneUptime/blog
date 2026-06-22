# Validation Summary: How to Add and Manage Helm Repositories

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes
- Helm chart repositories
- OCI registries
- Artifact Hub

## Sources Consulted
- Helm command reference: `helm repo add` - https://helm.sh/docs/helm/helm_repo_add/
- Helm command reference: `helm repo update` - https://helm.sh/docs/helm/helm_repo_update/
- Helm command reference: `helm repo remove` - https://helm.sh/docs/helm/helm_repo_remove/
- Helm command reference: `helm search repo` - https://helm.sh/docs/helm/helm_search_repo/
- Helm command reference: `helm search hub` - https://helm.sh/docs/helm/helm_search_hub/
- Helm command reference: `helm registry login` - https://helm.sh/docs/helm/helm_registry_login/
- Helm command reference: `helm pull` - https://helm.sh/docs/helm/helm_pull/
- Helm command reference: `helm install` - https://helm.sh/docs/helm/helm_install/
- Helm chart repository guide - https://helm.sh/docs/topics/chart_repository/
- Helm OCI registry guide - https://helm.sh/docs/topics/registries/

## Issues Found
- The private repository "bearer token" example used `--pass-credentials` without actually supplying credentials. Updated it to show a token-style password passed with `--username`, `--password`, and `--pass-credentials`. Helm's `--pass-credentials` flag only controls whether credentials are passed to all domains; it does not provide a bearer token by itself.
- The secure credential example claimed that using environment variables with `--password "$HELM_REPO_PASSWORD"` keeps credentials out of the process list. The shell expands that value into a command-line argument. Updated the example to use Helm's `--password-stdin` option instead.

## Review Notes
- Helm was not installed in the local environment, so command behavior was verified against the official Helm documentation instead of local `helm --help` output.
- The OCI section is accurate for Helm 3.8 and later, where OCI support is enabled by default. The current Helm documentation also notes Helm 4 documentation caveats, but the commands shown remain consistent with the documented CLI behavior.
