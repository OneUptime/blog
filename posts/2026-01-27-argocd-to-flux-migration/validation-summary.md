# Validation Summary: How to Migrate from ArgoCD to Flux

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Kubernetes
- GitOps
- Argo CD
- Argo CD Application and ApplicationSet resources
- Flux CD
- Flux GitRepository, Kustomization, HelmRepository, HelmRelease, Provider, and Alert resources
- Helm
- SOPS and age
- External Secrets Operator
- kubectl, yq, jq, and shell scripting

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux bootstrap GitHub CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux create secret git CLI documentation: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD ApplicationSet List Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-List/

## Issues Found
- The post described Argo CD as having a "Single Controller" and "Built-in Secrets." Updated this to "Integrated Components" and "Repository Secrets" to avoid implying Argo CD has a single controller or built-in encrypted secret management.
- The concept mapping said ApplicationSet maps to a Kustomization with variable substitution. Updated it to multiple Kustomizations generated from templates, because Flux `postBuild.substitute` substitutes values inside rendered manifests and does not generate Flux resources by itself.
- The self-healing and pruning mapping was imprecise. Updated it to distinguish Flux reconciliation, `spec.prune`, and `spec.force`.
- The examples said Flux automatically creates `targetNamespace`. Corrected this: `spec.targetNamespace` sets or overrides the namespace on applied resources, but the namespace must already exist or be managed as a manifest.
- HelmRelease examples used target namespaces without noting that those namespaces must exist. Added comments to create or manage them first.
- The SOPS section implied SOPS is installed in the cluster and omitted installing SOPS locally. Corrected the explanation and install command, and changed the age key secret creation to use the documented `.agekey` key mapping.
- The "install Flux without disruption" snippet patched `--watch-all-namespaces=true`, which is unnecessary and did not address whether Flux manages Argo CD resources. Replaced it with guidance to keep Argo CD manifests out of Flux-managed paths until cleanup.
- The migration script mapped Argo CD `targetRevision: HEAD` directly to `ref.branch`, which would produce an invalid or unintended branch reference. Updated the script to normalize `HEAD` or missing values to `main` and clarified that the script targets branch-based applications.
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1` for Provider and Alert, but current Flux Provider and Alert resources are documented under `notification.toolkit.fluxcd.io/v1beta3`. Updated both manifests.

## Review Notes
The guide is technically useful after the corrections. Future improvements could add separate handling for Argo CD applications pinned to tags, semver ranges, or commits, because Flux `GitRepository.spec.ref` supports those as separate fields rather than always using `ref.branch`.
