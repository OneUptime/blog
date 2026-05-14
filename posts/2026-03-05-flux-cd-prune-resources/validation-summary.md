# Validation Summary: How Flux CD Prunes Resources When Removed from Git

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Kubernetes
- kubectl
- Kustomize
- GitOps resource pruning and garbage collection

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux FAQ for moving resources between Kustomizations: https://fluxcd.io/flux/faq/
- Flux logs CLI reference: https://fluxcd.io/flux/cmd/flux_logs/
- Flux get kustomizations CLI reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Flux kustomize-controller source: https://github.com/fluxcd/kustomize-controller
- Flux SSA package documentation and source: https://pkg.go.dev/github.com/fluxcd/pkg/ssa and https://github.com/fluxcd/pkg/blob/ssa/v0.74.0/ssa/sort.go

## Issues Found
- The reconciliation flow described pruning before apply. Updated the text and diagram to reflect current kustomize-controller behavior: Flux applies the current manifests, builds the new inventory, diffs it against the previous inventory, then prunes stale resources when `spec.prune` is true.
- The post said pruning is not enabled by default. Current Flux documentation describes `spec.prune` as a required boolean field, so the wording was corrected to explain that `true` enables garbage collection and `false` leaves stale resources.
- The prune order was described as a generic reverse dependency order with an inaccurate resource list. Replaced it with wording based on Flux's reverse server-side apply reconcile order and adjusted the examples accordingly.
- The post claimed Flux logs warnings about orphaned resources when pruning is disabled. I did not find support for that in the current controller behavior, so the dry-run guidance was changed to checking Kustomization status while comparing inventory manually.
- The post described only an annotation for per-resource prune opt-out. Flux supports either an annotation or a label, so the wording was corrected.
- The best-practice guidance said to always add prune protection to PVCs. Adjusted this to apply to stateful resources that should survive removal from Git.

## Review Notes
The local environment did not have `flux` or `kubectl` installed, so CLI checks were validated against official command references and Flux source rather than local `--help` output.
