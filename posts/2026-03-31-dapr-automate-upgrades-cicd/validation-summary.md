# Validation Summary: How to Automate Dapr Upgrades with CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Kubernetes sidecar runtime)
- GitHub Actions (CI/CD workflows)
- Helm (Kubernetes package manager)
- kubectl (Kubernetes CLI)
- GitHub CLI (`gh`)

## Sources Consulted
- GitHub Actions `actions/checkout` releases: https://github.com/actions/checkout/releases
- GitHub Actions `actions/upload-artifact` releases: https://github.com/actions/upload-artifact/releases
- GitHub Actions `azure/k8s-set-context` releases: https://github.com/azure/k8s-set-context/releases
- GitHub announcement on artifact actions v3 deprecation (November 2024)
- Dapr Helm chart repository: https://github.com/dapr/helm-charts
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Helm upgrade CLI reference: https://helm.sh/docs/helm/helm_upgrade/
- Dapr CRD definitions: https://github.com/dapr/dapr/tree/master/charts/dapr/crds

## Issues Found

1. **Description incorrectly mentioned ArgoCD**: The post description stated "using GitHub Actions and ArgoCD" but the post only uses GitHub Actions with Helm and kubectl — ArgoCD is never used or referenced. Fixed by removing the ArgoCD mention from the description.

2. **`actions/checkout@v3` deprecated (3 occurrences)**: v3 uses Node 16 which was deprecated by GitHub Actions. Updated all three workflow files to use `actions/checkout@v4`.

3. **`actions/upload-artifact@v3` broken**: The v3 artifact backend was removed on November 30, 2024, making `actions/upload-artifact@v3` non-functional. Updated to `actions/upload-artifact@v4`.

4. **`azure/k8s-set-context@v3` was a prerelease**: v3 of this action was only ever a prerelease, never a stable release. Updated both occurrences (staging and production workflows) to `azure/k8s-set-context@v4`.

5. **Production workflow missing Helm repo setup**: The staging workflow correctly included `helm repo add dapr ...` and `helm repo update` before running `helm upgrade`, but the production workflow omitted these steps. Since GitHub Actions runners are ephemeral and don't have the Dapr Helm repo pre-configured, the `helm upgrade dapr dapr/dapr` command would fail. Added a "Add Dapr Helm repo" step to the production workflow.

## Review Notes
- The `--atomic` flag in `helm upgrade` implies `--wait`, so specifying both `--atomic --wait` is redundant but not harmful. This is acceptable for clarity in a tutorial context.
- The Dapr Helm chart repo URL, chart name (`dapr/dapr`), CRD resource types (`components`, `configurations`, `subscriptions`), and all kubectl commands are verified as correct.
- The GitHub Actions workflow syntax (cron schedule, `workflow_dispatch`, `GITHUB_OUTPUT`, conditional steps) is all valid.
- Even newer versions of the GitHub Actions exist (checkout@v6, upload-artifact@v7, k8s-set-context@v5) but v4 is a stable, widely-adopted choice that avoids the deprecation issues of v3.
