# Validation Summary: How to Use Parameter Overrides from the ArgoCD CLI

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Argo CD CLI
- Helm
- Kustomize
- Kubernetes manifests
- Argo CD config management plugins
- GitHub Actions

## Sources Consulted
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_set/
- Argo CD `argocd app unset` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_unset/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD CLI environment variables documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/environment-variables/
- Argo CD CLI installation documentation: https://argo-cd.readthedocs.io/en/stable/cli_installation/
- Argo CD Parameter Overrides documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/parameters/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/

## Issues Found
- The introduction claimed the post covered every parameter override command. The current Argo CD CLI includes additional source and tool-specific flags, so this was changed to "common parameter override commands."
- The metadata and plain manifest section implied plain YAML directory manifests can consume `--plugin-env` directly. Argo CD documents `--plugin-env` for config management plugins, so the description and section were changed to refer to config management plugins.
- The Helm value types section used `--helm-set-json`, which is not listed in the current Argo CD `argocd app set` command reference. The example was changed to repeated `--helm-set` flags using indexed value paths.
- The Kustomize name prefix and suffix examples used unsupported flags `--kustomize-name-prefix` and `--kustomize-name-suffix`. They were corrected to `--nameprefix` and `--namesuffix`, including the unset examples.
- The Helm unset examples used unsupported `argocd app unset --helm-set` syntax. They were corrected to use `-p` parameter unsets, matching the official `argocd app unset` documentation.
- The GitHub Actions install step wrote to `/usr/local/bin` without elevated privileges. It was updated to use `sudo` for the download and chmod commands on GitHub-hosted Ubuntu runners.

## Review Notes
The examples are generally valid for current stable Argo CD CLI behavior after the fixes. The post still intentionally uses placeholder application names, registries, domains, and image digests; those are illustrative and would need replacement in a real environment.
