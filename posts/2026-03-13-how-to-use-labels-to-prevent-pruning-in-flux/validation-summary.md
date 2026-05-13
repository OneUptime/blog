# Validation Summary: How to Use Labels to Prevent Pruning in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2 Kustomization pruning
- Kubernetes labels and annotations
- Kustomize patches and label selectors
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kustomize multiple-object patch examples: https://github.com/kubernetes-sigs/kustomize/blob/master/examples/patchMultipleObjects.md
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes kubectl kustomize reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/

## Issues Found
- The post claimed labels do not directly control Flux pruning. Flux documentation states pruning can be disabled for specific resources by either labeling or annotating them with `kustomize.toolkit.fluxcd.io/prune: disabled`. Updated the explanation and examples to use Flux's documented prune label.
- The examples used a custom label, `flux.oneuptime.com/no-prune: "true"`, as if it directly protected resources. Updated direct protection examples to use `kustomize.toolkit.fluxcd.io/prune: disabled`, and kept the custom label only as an organizational selector that Kustomize can transform into the Flux prune label.
- The Kustomize patch examples used `kind: __any__`, which is not a documented Kubernetes or Kustomize wildcard kind. Replaced those examples with JSON patches targeted by `labelSelector` that add the Flux prune label to matching resources.
- The verification section checked `.metadata.annotations` while the corrected examples use labels. Updated the command and surrounding text to check `.metadata.labels`.
- The base Kustomize example used `commonLabels`, which current Kustomize versions warn is deprecated in favor of `labels`. Updated the example to use `labels`.

## Review Notes
The manual `kubectl annotate` fallback remains valid because Flux supports the prune control as either a label or an annotation. The local environment did not have `kustomize`, `kubectl`, or `flux` installed, so CLI behavior was verified against official documentation rather than local `--help` output.
