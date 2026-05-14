# Validation Summary: How to Use Image Policy Markers in Kustomize Files for Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image automation
- Flux ImagePolicy and ImageUpdateAutomation resources
- Kustomize bases, overlays, patches, and images transformer
- Kubernetes Deployment manifests
- JSON 6902 patches
- Flux CLI and kubectl

## Sources Consulted
- Flux documentation: Automate image updates to Git - https://fluxcd.io/flux/guides/image-update/
- Flux documentation: Image Update Automations - https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux CLI documentation: flux get images update - https://fluxcd.io/flux/cmd/flux_get_images_update/
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
No technical issues found.

## Review Notes
The Flux documentation confirms that image policy markers are inline YAML comments, that the supported marker variants include full image, tag, name, and digest forms, and that the `Setters` update strategy is the supported/default strategy for `ImageUpdateAutomation`. The Kustomize examples use current `kustomize.config.k8s.io/v1beta1` syntax, valid `patches` examples, and valid `images` transformer fields. The `flux get image update --all-namespaces` command is documented as a valid CLI example.
