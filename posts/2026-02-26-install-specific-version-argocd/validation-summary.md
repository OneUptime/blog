# Validation Summary: How to Install a Specific Version of ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Helm
- Kustomize
- Terraform Helm provider

## Sources Consulted
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD Core documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/core/
- Argo CD release process and cadence: https://argo-cd.readthedocs.io/en/stable/developer-guide/release-process-and-cadence/
- Argo CD tested Kubernetes versions for 2.13: https://argo-cd.readthedocs.io/en/release-2.13/operator-manual/tested-kubernetes-versions/
- Argo CD 2.12 installation and tested versions documentation: https://argo-cd.readthedocs.io/en/release-2.12/operator-manual/installation/
- Argo CD v2.13 to v2.14 upgrade notes: https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/2.13-2.14/
- Argo CD CLI version command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_version/
- Argo CD v2.13.3 GitHub release metadata: https://api.github.com/repos/argoproj/argo-cd/releases/tags/v2.13.3
- Argo CD v2.13.3 install manifests: https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.3/manifests/install.yaml
- Argo Helm chart 7.7.10 metadata and values: https://github.com/argoproj/argo-helm/tree/argo-cd-7.7.10/charts/argo-cd
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Terraform Helm provider helm_release resource documentation: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release

## Issues Found
- The introductory `kubectl apply` example omitted the `argocd` namespace and did not use the server-side apply flags now shown in the Argo CD install docs. Updated the command to include `-n argocd --server-side --force-conflicts`.
- The Kubernetes compatibility table overstated tested Kubernetes versions for Argo CD v2.13.x and v2.12.x, and gave the wrong minimum for v2.10.x. Updated the table to match Argo CD's tested-version documentation and changed wording from "supports" to "is tested against."
- `kubectl version --short` is no longer present in current kubectl reference documentation. Replaced it with `kubectl version`.
- Version-pinned Argo CD manifest install examples did not use the current server-side apply flags recommended by Argo CD. Added `--server-side --force-conflicts` to the standard, HA, core, and Kustomize apply commands.
- The Helm values example pinned Dex to `v2.38.0`, while Argo CD v2.13.3 and argo-cd chart 7.7.10 use Dex `v2.41.1`. Updated the Dex tag to `v2.41.1`.
- The Terraform `helm_release` example used the older `set` block style. Updated it to the current Terraform Helm provider `set = [{ ... }]` form.
- The verification section said the pinned version should appear in all image tags, but Dex and Redis use separate image tags. Updated the wording to distinguish Argo CD component images from companion images.
- The example version file used Argo CD `v2.14.0`; Argo CD's upgrade notes identify the tagged v2.14.0 manifests as containing a nonexistent image. Updated the example to `v2.14.1`, which exists and matches chart `7.8.0`.

## Review Notes
- The Argo CD v2.13.3 standard, HA, and core manifest URLs were verified as existing.
- The Argo CD v2.13.3 CLI asset names for Linux amd64, macOS Intel, and macOS Apple Silicon were verified in GitHub release metadata.
- Helm and kubectl were not installed in the local environment, so command behavior was verified against official documentation and upstream release/chart metadata rather than by executing those CLIs locally.
