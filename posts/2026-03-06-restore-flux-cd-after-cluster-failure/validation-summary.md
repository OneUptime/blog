# Validation Summary: How to Restore Flux CD After Cluster Failure

## Status
validated

## Post Type
Tutorial / disaster recovery guide

## Technologies Covered
- Flux CD
- Kubernetes
- kubectl
- SOPS with age keys
- Helm and Flux HelmRelease resources
- Amazon EKS and eksctl
- Velero
- DNS and LoadBalancer recovery

## Sources Consulted
- Flux bootstrap command reference: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux bootstrap git command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_git/
- Flux bootstrap GitHub command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux generic Git bootstrap guide: https://fluxcd.io/flux/installation/bootstrap/generic-git-server/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- Flux get all command reference: https://fluxcd.io/flux/cmd/flux_get_all/
- Flux resume kustomization command reference: https://fluxcd.io/flux/cmd/flux_resume_kustomization/
- Flux reconcile helmrelease command reference: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- eksctl getting started documentation: https://eksctl.io/getting-started/
- Velero restore reference: https://velero.io/docs/v1.18/restore-reference/

## Issues Found
- The EKS example used Kubernetes `1.29`, which is no longer available for new EKS clusters as of the validation date. Updated the example to `1.34`, which is in standard support.
- The generic Git bootstrap example used `--secret-ref=flux-system`, but current Flux bootstrap commands use `--secret-name` for the sync credentials secret. Updated the flag to `--secret-name=flux-system`.
- The GitHub deploy-key bootstrap example included `--token-auth` and `--personal`, which conflicted with the text describing a newly generated deploy key for an organization repository. Removed those flags and added the required `GITHUB_TOKEN` export used by `flux bootstrap github` to configure the repository.
- The Helm release reconciliation example used `flux reconcile helmrelease -A --all`, but the Flux HelmRelease reconcile command takes a specific resource name and namespace. Replaced it with `flux reconcile helmrelease <name> -n <namespace>`.
- The suspended Kustomization check used `--status-selector suspended=true`, but Flux `--status-selector` filters conditions such as `ready=false`, not the suspend spec field. Replaced it with `flux get kustomizations -A` so the user can inspect the suspended state.
- The verification script could report success when pods were Pending or otherwise non-running, because the final condition only checked Failed pods. Added a `NON_RUNNING_PODS` count and included it in the success condition.

## Review Notes
The guide is technically relevant and accurate after the targeted fixes. Helm release history backup and restore is valid as an operational consideration, but teams should still test it with their Helm storage namespace and Flux HelmRelease `storageNamespace` settings during disaster recovery drills.
