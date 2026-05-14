# Validation Summary: How to Uninstall Flux CD from a Kubernetes Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- kubectl
- GitOps
- Kubernetes Custom Resource Definitions

## Sources Consulted
- Flux uninstall documentation: https://fluxcd.io/flux/installation/uninstall/
- Flux CLI `flux uninstall` reference: https://fluxcd.io/flux/cmd/flux_uninstall/
- Flux CLI `flux suspend` reference: https://fluxcd.io/flux/cmd/flux_suspend/
- Flux CLI `flux suspend source` reference: https://fluxcd.io/flux/cmd/flux_suspend_source/
- Flux CLI `flux delete kustomization` reference: https://fluxcd.io/flux/cmd/flux_delete_kustomization/
- Flux Kustomization documentation for pruning and deletion policy: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux source-controller documentation for source kinds: https://fluxcd.io/flux/components/source/
- Flux controller release documentation for controller and CRD scope: https://fluxcd.io/flux/releases/controllers/
- Kubernetes `kubectl api-resources` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The original suspend commands used `flux suspend ... --all -A`, but Flux documents `--all` for suspending resources in a namespace and does not document `-A` for `flux suspend`. Changed the example to loop over namespaces and call the namespace-scoped Flux suspend commands.
- The original "all source resources" suspend example only covered GitRepository and HelmRepository resources. Added HelmChart, Bucket, and OCIRepository suspension commands, which are Flux source kinds documented by the current source-controller docs.
- The manual CRD cleanup listed a fixed subset of Flux CRDs. Replaced the fixed list with discovery of CRDs ending in `toolkit.fluxcd.io`, which covers current and optional Flux CRDs more accurately.
- The "Uninstall Without the Flux CLI" section described direct `kubectl` deletion as an uninstall method. Flux documentation states that uninstalling controllers by other means is not supported, so the section now describes it as a fallback manual cleanup procedure and keeps the CLI uninstall as the supported method.
- The manual custom-resource cleanup listed a fixed subset of Flux resources. Replaced it with `kubectl api-resources` discovery filtered to `toolkit.fluxcd.io` resources, so the cleanup tracks the CRDs actually installed on the cluster.

## Review Notes
The Flux CLI was not installed in the local workspace, and `kubectl` was also unavailable, so command behavior was validated against official Flux and Kubernetes command references rather than local `--help` output. The article remains version-neutral; future updates may want to mention Flux Operator installations separately because Flux Operator-managed controller lifecycle can differ from a plain Flux CLI bootstrap.
