# Validation Summary: How to configure Kustomize with Flux for automated reconciliation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Flux CD
- Kustomize
- GitOps
- SOPS with age
- Flagger
- Flux image automation
- Flux notification controller

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux bootstrap for GitHub documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux SOPS decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/#decryption
- SOPS age encryption documentation: https://github.com/getsops/sops
- Flagger canary documentation: https://docs.flagger.app/usage/how-it-works
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization

## Issues Found
- Removed `spec.validation: client` from the Flux `Kustomization` example. The current `kustomize.toolkit.fluxcd.io/v1` API no longer includes this field.
- Corrected the explanation that said Flux checks the repository every 5 minutes. The Kustomization reconciles against the referenced source artifact on its interval; the GitRepository source has its own polling interval.
- Removed self-referential `postBuild.substitute` entries from the ConfigMap substitution example. The Kustomization now uses `substituteFrom` to load values from the `cluster-vars` ConfigMap.
- Reworded the SOPS section from "sealed secrets using Mozilla SOPS" to "SOPS-encrypted secrets" because Sealed Secrets is a separate project and the Flux feature is SOPS decryption.
- Clarified that private SOPS decryption keys remain in the cluster, instead of saying all encryption keys never leave the cluster.
- Added required reconciliation fields (`interval` and `prune`) to the multi-cluster Kustomization examples.
- Clarified that Flux image automation requires an existing ImageRepository and ImagePolicy named `webapp` for the shown ImageUpdateAutomation and setter annotation to work.
- Updated Flux notification examples from `notification.toolkit.fluxcd.io/v1` to `notification.toolkit.fluxcd.io/v1beta3` for Provider and Alert resources, matching current API docs.
- Added the Slack provider `address` field and changed the referenced secret name to `slack-token`, matching the current Slack Bot API provider pattern.

## Review Notes
The remaining examples are intentionally illustrative and assume the referenced Flux source objects, namespaces, CRDs, image policies, and controller installations already exist. The post could be expanded later with full ImageRepository/ImagePolicy examples, but the current wording now makes that dependency explicit.
