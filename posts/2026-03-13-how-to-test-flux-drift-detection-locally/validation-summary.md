# Validation Summary: How to Test Flux Drift Detection Locally

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Flux Kustomization and GitRepository resources
- Kubernetes
- kubectl
- kind
- Kustomize
- GitOps drift detection and pruning

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux create source git` documentation: https://fluxcd.io/flux/cmd/flux_create_source_git/
- Flux CLI `flux create kustomization` documentation: https://fluxcd.io/flux/cmd/flux_create_kustomization/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `flux events` documentation: https://fluxcd.io/flux/cmd/flux_events/
- Flux CLI `flux diff kustomization` documentation: https://fluxcd.io/flux/cmd/flux_diff_kustomization/
- kind quick start documentation: https://kind.sigs.k8s.io/docs/user/quick-start/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post said drift detection is enabled by setting the Kustomization `force` field or by using a drift detection feature. This was incorrect for Flux Kustomizations. Flux Kustomizations perform server-side apply dry-run drift detection during interval reconciliation, while `force` is only for replacing resources when immutable field changes cannot be patched. I rewrote the section and removed `force: false` from the example.
- The post described drift detection as a server-side apply conflict. Flux Kustomization drift correction is more accurately described as detecting differences during a server-side apply dry run and reapplying desired state. I updated the explanation.
- The event example showed `Deployment/default/my-app configured (server dry run)`, which is typical `kubectl apply --dry-run=server` output rather than a Flux event message. I changed it to `Deployment/default/my-app configured`.
- The `flux diff kustomization` example omitted the local `--path` argument shown in the current Flux CLI documentation. I added `--path=./apps/production`.

## Review Notes
The remaining commands and snippets are plausible for a local Flux test workflow, assuming the reader has Flux, kubectl, kind, and kustomize installed and that the referenced repository path contains valid manifests for the named resources. The automation script hard-codes `EXPECTED=3`, so readers need their Git manifest to declare three replicas for that example to pass.
