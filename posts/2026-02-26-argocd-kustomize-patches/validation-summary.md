# Validation Summary: How to Use Kustomize Patches with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kustomize
- Kubernetes manifests
- Strategic merge patches
- JSON Patch / JSON 6902
- JSON Pointer / JSON 6901

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes documentation: kubectl kustomize command reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kustomize official repository: patches reference - https://github.com/kubernetes-sigs/kustomize/blob/master/site/content/en/docs/Reference/API/Kustomization%20File/patches.md
- Kustomize official repository: patch multiple objects example - https://github.com/kubernetes-sigs/kustomize/blob/master/examples/patchMultipleObjects.md
- Argo CD documentation: Kustomize user guide - https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD documentation: Application specification reference - https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD documentation: argocd app manifests command reference - https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- RFC 6902: JavaScript Object Notation (JSON) Patch - https://www.rfc-editor.org/rfc/rfc6902
- RFC 6901: JavaScript Object Notation (JSON) Pointer - https://datatracker.ietf.org/doc/html/rfc6901

## Issues Found
- The JSON 6902 example appended to `/spec/template/spec/containers/0/env/-` without stating that the parent `env` list must already exist, and then removed `/env/2`, which could remove the newly added item depending on the base list length. Changed the example to add an `env` list and remove a separate field, with a note showing how to append when `env` already exists.
- The label-selector JSON 6902 annotation example added `/metadata/annotations/cdn.myorg.com~1enabled`, which fails if the parent `metadata.annotations` map is absent. Changed it to a strategic merge patch targeted at labeled Services, which safely merges the annotation.
- The target selector field list described `name` as supporting "regex with `|` separator." Kustomize documents target `name` and `namespace` as automatically anchored regular expressions, so the wording was corrected.

## Review Notes
The post uses the current `patches` field rather than the older `patchesStrategicMerge` and `patchesJson6902` fields. Strategic merge behavior for custom resources can require OpenAPI configuration, but the examples focus on built-in Kubernetes resource types.
