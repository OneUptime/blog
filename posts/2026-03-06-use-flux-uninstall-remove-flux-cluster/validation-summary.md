# Validation Summary: How to Use flux uninstall to Remove Flux from Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- kubectl
- Helm
- GitOps

## Sources Consulted
- Flux uninstall documentation: https://fluxcd.io/flux/installation/uninstall/
- Flux CLI reference for `flux uninstall`: https://fluxcd.io/flux/cmd/flux_uninstall/
- Flux CLI reference for `flux suspend kustomization`: https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- Flux CLI reference for `flux suspend helmrelease`: https://fluxcd.io/flux/cmd/flux_suspend_helmrelease/
- Flux CLI reference for `flux export source`: https://fluxcd.io/flux/cmd/flux_export_source/
- Flux CLI reference for `flux export kustomization`: https://fluxcd.io/flux/cmd/flux_export_kustomization/
- Flux CLI reference for `flux export helmrelease`: https://fluxcd.io/flux/cmd/flux_export_helmrelease/
- Flux CLI reference for `flux export alert`: https://fluxcd.io/flux/cmd/flux_export_alert/
- Flux CLI reference for `flux export alert-provider`: https://fluxcd.io/flux/cmd/flux_export_alert-provider/
- Flux CLI reference for `flux bootstrap github`: https://fluxcd.io/flux/cmd/flux_bootstrap_github/

## Issues Found
- The post incorrectly described `flux uninstall --keep-namespace` as preserving CRDs. The Flux CLI documents this flag as skipping namespace deletion only, while uninstall still removes Flux custom resources and CRDs. Updated the section to describe keeping the namespace instead of keeping CRDs.
- The backup scripts used `flux export source all -A`, but `flux export source` does not have an `all` subcommand. Replaced it with supported source export subcommands for GitRepository, OCIRepository, HelmRepository, and Bucket sources using `--all -A`.
- Several `flux export` examples used `-A` without `--all` for resource types that export one named resource or all resources. Updated Kustomization, HelmRelease, Alert, and Provider exports to use `--all -A`.
- The post claimed Kustomizations with `prune: true` may garbage collect workloads during `flux uninstall`. Flux documents that uninstall removes Flux finalizers and does not remove reconciled Kubernetes workloads. Updated the pruning guidance to use suspension and workload verification as optional checkpoints.
- The post claimed Helm releases may be uninstalled when Flux is removed and recommended manually removing HelmRelease finalizers. Flux documents that reconciled Helm releases are not removed by `flux uninstall`, and uninstall handles Flux custom resource finalizers. Updated the HelmRelease guidance accordingly.
- The comprehensive script claimed to suspend all reconciliation but only suspended Kustomizations in one namespace. Updated it to suspend Kustomizations across namespaces.
- Added the Helm CLI as a prerequisite for the optional `helm list -A` verification command.

## Review Notes
The post is technically relevant and valid after the corrections. The Flux `flux export alert` and `flux export alert-provider` commands are documented as preview commands, so future Flux releases should be checked if this article is updated.
