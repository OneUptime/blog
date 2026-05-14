# Validation Summary: How to Install Flux CD on Amazon EKS Anywhere

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Flux CD / Flux CLI
- GitOps
- Kubernetes
- Amazon EKS Anywhere
- GitHub and GitLab bootstrap workflows
- Kustomize manifests

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux getting started guide: https://fluxcd.io/flux/get-started/
- Flux CLI reference for `flux bootstrap`: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux CLI reference for `flux bootstrap github`: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux CLI reference for `flux bootstrap gitlab`: https://fluxcd.io/flux/cmd/flux_bootstrap_gitlab/
- Flux CLI reference for `flux check`: https://fluxcd.io/flux/cmd/flux_check/
- Flux CLI reference for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI reference for `flux logs`: https://fluxcd.io/flux/cmd/flux_logs/
- Flux CLI reference for `flux uninstall`: https://fluxcd.io/flux/cmd/flux_uninstall/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Amazon EKS deployment options documentation: https://docs.aws.amazon.com/eks/latest/userguide/eks-deployment-options.html
- EKS Anywhere overview documentation: https://anywhere.eks.amazonaws.com/docs/getting-started/overview/

## Issues Found
- The test namespace example placed `demo-namespace.yaml` under `clusters/eks-anywhere/namespaces/` and added a nested Kustomize file, but the Flux bootstrap example configures the `flux-system` Kustomization to track the cluster path itself. The official Flux getting started guide places additional manifests directly under the bootstrapped cluster path. Updated the example path to `clusters/eks-anywhere/demo-namespace.yaml` and removed the nested Kustomization snippet so the manifest is included by the bootstrapped Flux reconciliation.

## Review Notes
- The Flux CLI commands, bootstrap flags, controller names, repository structure, monitoring commands, and uninstall command are consistent with current Flux documentation.
- The post correctly treats EKS Anywhere as a customer-managed Kubernetes option for on-premises or edge infrastructure. Flux version compatibility depends on the Kubernetes version of the target EKS Anywhere cluster, so the `flux check --pre` step is important.
