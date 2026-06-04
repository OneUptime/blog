# Validation Summary: How to configure Kustomize JSON 6902 patches for complex modifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kustomize
- JSON Patch / RFC 6902
- JSON Pointer / RFC 6901
- kubectl
- yq

## Sources Consulted
- Kustomize `patches` reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/
- Kustomize `patchesJson6902` reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patchesjson6902/
- Kustomize API type definitions and deprecation warnings: https://github.com/kubernetes-sigs/kustomize/blob/master/api/types/kustomization.go
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- RFC 6902, JSON Patch: https://datatracker.ietf.org/doc/html/rfc6902
- RFC 6901, JSON Pointer: https://datatracker.ietf.org/doc/html/rfc6901

## Issues Found
- The post used the deprecated `patchesStrategicMerge` field in the "Combining with strategic merge" example. I changed the example to use the current `patches` field with a strategic merge patch file entry, because Kustomize documents `patches` as the replacement and API comments mark `patchesStrategicMerge` as deprecated.
- The post described `add` as creating fields or appending to arrays. I clarified that JSON Patch `add` can create object members, insert array elements by index, or append only when using the `-` array position.
- Several snippets added nested label keys such as `/metadata/labels/managed-by`, which fails if the parent `labels` map does not exist. I changed those examples to add the `labels` map directly.
- The conditional environment variable example appended to `/env/-`, which requires an existing `env` array. I changed it to add the `env` array directly so the snippet works when the field is absent.
- The text called `kind`-only targets "targetless selectors." I changed this to "broad target selectors" because the examples still use a `target` selector.
- The escaping example addressed keys under `annotations` and `labels`, which requires those parent maps to exist. I added a short caveat to make that precondition explicit.

## Review Notes
Local `kustomize`, `kubectl`, and `yq` binaries were not installed in the review environment, so CLI behavior was checked against official documentation rather than local command output.
