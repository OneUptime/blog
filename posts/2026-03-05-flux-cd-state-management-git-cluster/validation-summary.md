# Validation Summary: How Flux CD Manages State Between Git and Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize Controller
- Source Controller
- Kubernetes server-side apply
- GitOps reconciliation

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization inventory documentation: https://v2-0.docs.fluxcd.io/flux/components/kustomize/kustomization/#inventory
- Flux GitRepository artifact documentation: https://fluxcd.io/flux/components/source/gitrepositories/#artifact
- Flux CLI `flux reconcile kustomization` reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `flux tree kustomization` reference: https://fluxcd.io/flux/cmd/flux_tree_kustomization/
- Kubernetes server-side apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Flux kustomize-controller source code: https://github.com/fluxcd/kustomize-controller

## Issues Found
- The inventory example used the wrong resource ID order and described the fields in the wrong order. Flux inventory IDs use `<namespace>_<name>_<group>_<kind>`, with the API version stored in the separate `v` field. Updated the explanation and sample JSON IDs.
- The post said inventory prevents conflicts between multiple Kustomizations. Inventory primarily tracks applied resources for drift detection and garbage collection; ownership visibility also comes from labels Flux sets on applied objects. Updated the wording to avoid overstating inventory behavior.
- The post said the kustomize-controller uses a field manager name based on the Kustomization resource. The controller uses its controller field manager and labels objects with the owning Kustomization name and namespace. Updated the explanation.
- The conflict section stated that conflicts between Kustomizations are always detected through field ownership by the second Kustomization. Updated the wording to account for ownership and server-side apply conflicts depending on the existing managed fields.

## Review Notes
The `flux tree kustomization --compact` command is valid, but Flux documents this command as preview and subject to change. The post could mention that caveat in a future update, but the command is current.
