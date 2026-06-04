# Validation Summary: How to implement Kustomize replacements for advanced field substitution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kustomize
- Kustomize replacements
- Kustomize generators and transformers
- Kubernetes manifests
- yq

## Sources Consulted
- Kustomize replacements reference: https://github.com/kubernetes-sigs/kustomize/blob/master/site/content/en/docs/Reference/API/Kustomization%20File/replacements.md
- Kustomize images reference: https://github.com/kubernetes-sigs/kustomize/blob/master/site/content/en/docs/Reference/API/Kustomization%20File/images.md
- Kustomize labels reference: https://github.com/kubernetes-sigs/kustomize/blob/master/site/content/en/docs/Reference/API/Kustomization%20File/labels.md
- Kustomize ConfigMap generator task: https://github.com/kubernetes-sigs/kustomize/blob/master/site/content/en/docs/Tasks/configmap_generator.md
- Kubernetes kubectl kustomize reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/

## Issues Found
- The introduction claimed replacements can perform transformations and use computed values. Updated the wording to describe supported delimiter-based scalar replacement and transformed resource names.
- The basic replacement example applied delimiter options to both the label and image target fields. Split the targets so the delimiter option only applies to the image field.
- Namespace propagation targeted fields that may not exist. Added `options.create: true` to the namespace target entries.
- The service port example said it extracted port numbers while the snippet copied the named port. Updated the wording.
- The ConfigMap hash example omitted a target resource reference and overstated the behavior. Added `resources: - deployment.yaml` and clarified that the generated hash-suffixed name is copied into the target field.
- The label example used `commonLabels`, which is superseded by the current `labels` field. Updated the snippet to use `labels` with `includeSelectors: true`.
- The conditional replacement example used unsupported `annotationSelector` syntax. Reframed the section around supported resource selection by kind and name.
- Several examples created fields that might not exist. Added `options.create: true` where the examples depend on creating target fields.
- The delimiter splitting example placed delimiter options on the target, but the text intended to extract part of the source value. Moved delimiter options to the source and used `create: true` on the target.
- The "Regular expression replacements" section implied regex support, which Kustomize replacements do not provide. Renamed and reworded it as delimiter-based partial replacement.
- The environment-specific example copied a ConfigMap string into `spec.replicas`, which expects an integer. Changed the target to an environment variable value.
- The troubleshooting section described `--enable-alpha-plugins` as verbose output. Updated it to describe the flag as plugin-specific.

## Review Notes
Local `kustomize` was not available in PATH, so validation was performed against upstream Kustomize and Kubernetes documentation rather than by executing `kustomize build` locally.
