# Validation Summary: How to Safely Remove Resources from Git Without Deleting from Cluster in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- Flux Kustomize Controller
- Flux Kustomization custom resources
- Kubernetes manifests
- kubectl
- GitOps pruning and garbage collection

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux FAQ, "How can I safely move resources from one dir to another?": https://fluxcd.io/flux/faq/
- Flux CLI reference for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes `kubectl annotate` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Flux kustomize-controller source code for prune delete options: https://github.com/fluxcd/kustomize-controller

## Issues Found
- The Strategy 1 manual reconcile command used `flux reconcile kustomization my-app` after a Git change. Updated it to `flux reconcile kustomization my-app --with-source` so the source is reconciled before applying the Kustomization, matching Flux CLI guidance.
- The Strategy 2 direct annotation commands did not use Flux's recommended field manager for in-cluster fields that should be preserved. Updated the commands to use `--field-manager=flux-client-side-apply` and `--overwrite`.
- Strategy 4 claimed that moving resources to a new non-pruning Kustomization would be safe because the new Kustomization would have already claimed them before the original Kustomization pruned them. Flux's FAQ documents a safer sequence: first disable garbage collection on the source Kustomization, move and reconcile the target Kustomization, reconcile the source while pruning remains disabled, then re-enable pruning. Updated the strategy to follow that sequence.

## Review Notes
The post now aligns with Flux's documented prune-disabled annotation, `spec.prune` behavior, Kustomization inventory behavior, suspend/resume commands, and Kubernetes event/annotation command syntax. Strategy 5 remains an emergency approach; the documented annotation or temporary `prune: false` workflows are preferable for planned changes.
