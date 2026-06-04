# Validation Summary: Use Helm Post-Renderer Hooks to Apply Kustomize Patches to Rendered Manifests

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Helm post-renderers
- Kubernetes manifests
- Kustomize patches, labels, namespaces, and generators
- JSON6902 patches
- kubectl dry-run validation
- GitHub Actions deployment workflows

## Sources Consulted
- Helm Advanced Techniques: Post Rendering: https://helm.sh/docs/topics/advanced/#post-rendering
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- kubectl apply generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubernetes-sigs/kustomize official repository and examples: https://github.com/kubernetes-sigs/kustomize
- actions/checkout official repository: https://github.com/actions/checkout
- Azure/setup-helm official repository and releases: https://github.com/Azure/setup-helm
- Azure/k8s-set-context official repository: https://github.com/Azure/k8s-set-context

## Issues Found
- Replaced deprecated Kustomize fields `commonLabels`, `patchesStrategicMerge`, and `patchesJson6902` with the current `labels` and `patches` fields.
- Fixed StrategicMerge patch examples that used `metadata.name: not-important` as if it were a wildcard. Kustomize still needs object metadata in StrategicMerge patch documents, but resource selection is now handled through `patches[].target`.
- Changed container-level patches that used a placeholder container name to JSON6902 patches targeting the first container, because StrategicMerge container patches match by container name.
- Fixed the first shell heredoc so `${NAMESPACE:-default}` is expanded by Bash before Kustomize reads the file.
- Corrected the advanced JSON patch example so JSON patch operation lists are stored in separate patch files and referenced with explicit `target` entries.
- Fixed JSON patch paths that would fail when `env` or `strategy` did not already exist by adding those fields as complete values.
- Fixed the multi-layer renderer by creating the missing `layer1` directory and building each Kustomize layer into the next layer's local `resources.yaml`, avoiding default Kustomize load-restrictor errors from parent-directory resource references.
- Fixed the multi-layer timestamp heredoc so `$(date -u ...)` is evaluated by Bash instead of emitted as a literal string.
- Updated GitHub Actions examples to current major versions: `actions/checkout@v6`, `azure/setup-helm@v5`, and `azure/k8s-set-context@v4`.

## Review Notes
- The examples now validate with Kustomize v5.8.1 using representative Deployment, Service, and ConfigMap manifests.
- Some patches intentionally target the first container (`containers/0`). In real charts, users should adjust targets when a chart has multiple containers or a non-primary first container.
