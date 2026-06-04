# Validation Summary: How to configure Kustomize commonLabels and commonAnnotations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kustomize
- Kubernetes labels and selectors
- Kubernetes annotations
- kubectl and kustomize CLI usage
- yq-based YAML inspection

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes documentation: Labels and Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes documentation: Annotations - https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
- Kubernetes documentation: Recommended Labels - https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- Kubernetes documentation: kubectl kustomize reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kustomize upstream repository and issue tracker - https://github.com/kubernetes-sigs/kustomize
- Local verification with Kustomize v5.8.1 downloaded from the upstream GitHub release

## Issues Found
- The Deployment output example showed `app: web` remaining in `spec.selector.matchLabels` and `spec.template.metadata.labels` after `commonLabels` set `app: web-application`. Kustomize replaces the existing `app` label value consistently in metadata, selectors, and pod template labels, so the example was updated to `app: web-application`.
- The Service output example showed `app: web` remaining in `spec.selector` after `commonLabels` set `app: web-application`. Kustomize updates the Service selector as well, so the example was corrected to `app: web-application`.
- The validation commands checked complete label keys for invalid characters and total key length. Kubernetes label keys may include an optional DNS-subdomain prefix followed by `/`, and the 63-character limit applies to the name segment, so the commands now validate the key name segment with `split("/") | .[-1]`.

## Review Notes
Kustomize v5.8.1 still builds `commonLabels`, but emits a warning that `commonLabels` is deprecated and recommends using `labels` instead. The post remains technically correct for `commonLabels` behavior, but a future update should consider showing the newer `labels` field with `includeSelectors: true` for current Kustomize usage.
