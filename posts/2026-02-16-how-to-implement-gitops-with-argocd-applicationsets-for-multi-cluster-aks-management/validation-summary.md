# Validation Summary: How to Use GitOps with ArgoCD ApplicationSets for Multi-Cluster AKS Management

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CLI
- Kubernetes
- Argo CD
- Argo CD CLI
- Argo CD ApplicationSet
- GitOps
- Helm
- Kustomize

## Sources Consulted
- Argo CD Getting Started: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD ApplicationSet Generators: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/
- Argo CD ApplicationSet Cluster Generator: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Git Generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Azure CLI `az aks get-credentials` reference: https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest#az-aks-get-credentials

## Issues Found
- The cluster registration commands named the Argo CD clusters `prod-east-aks` and `prod-west-aks`, while later examples expected cluster names that match the repository directories under `clusters/` (`prod-east`, `prod-west`, and `staging`). Updated the `argocd cluster add` commands to use logical Argo CD cluster names that match the directory layout.
- The cluster generator example filtered on `environment: production`, but the registration commands did not add those labels. Added `--label environment=production` for production clusters and `--label environment=staging` for the staging cluster, matching the official `argocd cluster add --label` flag.
- The Git directory generator example built a destination API server URL from the directory basename. That would only work if every registered cluster server URL followed that exact artificial naming convention. Changed the destination to use `name: '{{path.basename}}'`, which matches the registered Argo CD cluster names and the Application destination spec.

## Review Notes
The Argo CD installation command in the current docs recommends server-side apply for the stable manifest because some CRDs can exceed Kubernetes annotation limits. The post's `kubectl apply -n argocd -f ...` command remains a common install form, but using `--server-side --force-conflicts` would be a future improvement for newer Argo CD installs and upgrades.
