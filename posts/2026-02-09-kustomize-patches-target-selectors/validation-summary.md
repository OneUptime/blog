# Validation Summary: How to use Kustomize patches with target selectors for precise updates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kustomize
- YAML
- JSON Patch
- Strategic merge patch

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes documentation: Labels and Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kustomize API type documentation - https://pkg.go.dev/sigs.k8s.io/kustomize/api/types
- Kustomize official source for selector regex anchoring - https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/api/types/selector.go
- Kustomize official example for patching multiple objects - https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/examples/patchMultipleObjects.md
- RFC 6902: JavaScript Object Notation (JSON) Patch - https://datatracker.ietf.org/doc/html/rfc6902
- Kubernetes strategic merge patch documentation - https://github.com/kubernetes/community/blob/main/contributors/devel/sig-api-machinery/strategic-merge-patch.md

## Issues Found
- Several JSON Patch examples added nested annotation or label keys such as `/metadata/annotations/...` or `/metadata/labels/...`. RFC 6902 requires the parent object to exist, so those examples could fail for valid Kubernetes manifests without existing `annotations` or `labels` maps. Changed those examples to strategic merge patches that add the metadata maps safely.
- The label and annotation selector examples omitted `kind: Deployment` while patching Deployment-specific paths under `/spec/template/spec`. Added `kind: Deployment` to keep the target set aligned with the patch paths.
- The annotation selector example appended to `/spec/template/spec/volumes/-`, which fails if the `volumes` list does not already exist. Changed it to a strategic merge patch that adds the named volume.
- The replica examples used JSON Patch `replace`, which requires `/spec/replicas` to already exist. Changed them to `add`, which sets the field whether it is absent or already present.

## Review Notes
The main Kustomize target selector claims are accurate: the `patches` target supports `group`, `version`, `kind`, `name`, `namespace`, `labelSelector`, and `annotationSelector`; selector criteria are intersected; label and annotation selectors use Kubernetes label selector syntax; and Kustomize compiles target GVK/name/namespace selectors as anchored regular expressions. Local execution with `kustomize`, `kubectl`, or `go` was not possible because those tools are not installed in the workspace, so validation was static against official documentation and source.
