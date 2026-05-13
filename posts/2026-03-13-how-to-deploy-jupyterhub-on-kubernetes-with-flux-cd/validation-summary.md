# Validation Summary: How to Deploy JupyterHub on Kubernetes with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease
- HelmRepository
- Flux Kustomization
- Zero to JupyterHub Helm chart
- JupyterHub GitHub OAuth authentication
- KubeSpawner user profiles
- Kubernetes Secrets, Ingress, PVC-backed storage, and GPU resource limits

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Helm releases guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux `reconcile helmrelease` CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux `reconcile kustomization` CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- JupyterHub Helm chart repository: https://hub.jupyter.org/helm-chart/
- Zero to JupyterHub authentication documentation: https://z2jh.jupyter.org/en/stable/administrator/authentication.html
- Zero to JupyterHub configuration reference: https://z2jh.jupyter.org/en/stable/resources/reference.html
- OAuthenticator GitHubOAuthenticator reference: https://oauthenticator.readthedocs.io/en/latest/reference/api/gen/oauthenticator.github.html
- OAuthenticator general setup guide: https://oauthenticator.readthedocs.io/en/latest/tutorials/general-setup.html

## Issues Found
- The HelmRelease used `spec.createNamespace`, but Flux HelmRelease v2 defines `createNamespace` under `spec.install`. Moved it to `install.createNamespace`.
- The GitHub OAuth credentials used Kubernetes `valueFrom.secretKeyRef` syntax inside `hub.config.GitHubOAuthenticator`. JupyterHub/OAuthenticator expects string traitlet values, so this would not be interpreted correctly. Changed the example to use a SOPS-encrypted Secret consumed by Flux `valuesFrom`.
- The OAuth Secret was placed in the `jupyterhub` namespace, but `valuesFrom` references for this HelmRelease must be available to the HelmRelease in `flux-system`. Moved the example Secret to `flux-system`.
- The chart version selector used `3.x`, while the current stable JupyterHub chart line is `4.3.x`. Updated the HelmRelease to use `4.3.x`.
- The example HelmRelease and Secret file paths were outside the Flux Kustomization path shown later in the guide. Updated the path comments so those resources sit under `clusters/production/apps/jupyterhub`.
- The apply/verify sequence reconciled the HelmRelease without first applying and reconciling the Flux Kustomization that creates it. Added `kubectl apply` for the Kustomization and `flux reconcile kustomization`.
- The `helm get values` command used the target namespace and release name, but Flux stores the release in the HelmRelease namespace by default and derives the release name from the target namespace plus HelmRelease name when `targetNamespace` is set. Updated it to `helm get values jupyterhub-jupyterhub -n flux-system`.

## Review Notes
The remaining examples are technically plausible but environment-dependent: the `standard` StorageClass name, nginx ingress class, cert-manager issuer, GPU resource name, notebook image tags, and GitHub organization name must match the reader's cluster and registry setup. The local `flux`, `kubectl`, `helm`, and `yq` commands were not installed in this review environment, so CLI syntax was checked against official documentation rather than local help output.
