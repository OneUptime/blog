# Validation Summary: How to Reset Flux Reconciliation State After Disaster Recovery

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Flux Kustomizations
- Flux HelmReleases
- Flux GitRepository sources
- Flux notification Alerts
- kubectl

## Sources Consulted
- Flux CLI reference: `flux get all` - https://fluxcd.io/flux/cmd/flux_get_all/
- Flux CLI reference: `flux suspend kustomization` - https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- Flux CLI reference: `flux suspend helmrelease` - https://fluxcd.io/flux/cmd/flux_suspend_helmrelease/
- Flux CLI reference: `flux reconcile source git` - https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux CLI reference: `flux reconcile kustomization` - https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI reference: `flux bootstrap github` - https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux CLI reference: `flux bootstrap gitlab` - https://fluxcd.io/flux/cmd/flux_bootstrap_gitlab/
- Flux uninstall documentation - https://fluxcd.io/flux/installation/uninstall/
- Flux install CLI reference - https://fluxcd.io/flux/cmd/flux_install/
- Flux Kustomization documentation - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository authentication documentation - https://fluxcd.io/flux/components/source/gitrepositories/
- Flux notification Alert documentation - https://fluxcd.io/flux/components/notification/alerts/
- Flux bootstrap cheatsheet for source-controller persistent storage - https://v2-0.docs.fluxcd.io/flux/cheatsheets/bootstrap/
- Kubernetes kubectl patch reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post used `flux reconcile source git --all` and `flux reconcile kustomization --all --with-source`, but the official Flux reconcile commands require a resource name and do not expose `--all`. Replaced these with loops that enumerate GitRepository and Kustomization objects and reconcile each one by name and namespace.
- The post claimed to suspend all Kustomizations but only suspended Kustomizations in `flux-system`, and `flux suspend helmrelease --all -A` used an unsupported all-namespaces pattern for suspend. Replaced these with `kubectl patch` commands that suspend Flux Kustomizations and HelmReleases across all namespaces.
- The soft reset status patches only handled Kustomizations in `flux-system` and attempted to patch status without using the Kubernetes status subresource. Updated the loops to cover all namespaces and patch the `status` subresource.
- The GitHub bootstrap examples used `--personal` with an organization-style owner. Removed `--personal` from organization examples and the bootstrap script.
- The source authentication example did not make clear that the recreated Secret must be the one referenced by the GitRepository. Updated the wording and command.
- The orphan-resource check described labels as Flux inventory. Clarified that the selector checks for resources not labeled as managed by a Flux Kustomization.
- The brand-new cluster recovery example applied `gotk-sync.yaml` before `gotk-components.yaml`. Reordered the files so components are applied before sync resources.
- The source-controller recovery section assumed a PVC exists, but Flux defaults source artifact storage to `emptyDir`. Updated the section to explain that a restart clears the default cache and PVC deletion applies only when persistent storage has been configured.
- The notification Alert example used `notification.toolkit.fluxcd.io/v1`, but current Flux Alert examples and API coverage use `notification.toolkit.fluxcd.io/v1beta3` for Alert resources. Updated the apiVersion.

## Review Notes
The local workspace did not have `flux` or `kubectl` installed, so command validation was performed against official Flux and Kubernetes documentation rather than local `--help` output.
