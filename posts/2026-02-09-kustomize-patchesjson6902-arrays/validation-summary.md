# Validation Summary: How to use Kustomize patchesJson6902 for array element modifications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kustomize
- JSON Patch / RFC 6902
- JSON Pointer / RFC 6901
- yq

## Sources Consulted
- Kubernetes documentation, Declarative Management of Kubernetes Objects Using Kustomize: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kustomize release notes for api/v0.13.0 deprecations: https://github.com/kubernetes-sigs/kustomize/releases/tag/api%2Fv0.13.0
- RFC 6902, JavaScript Object Notation (JSON) Patch: https://datatracker.ietf.org/doc/html/rfc6902
- RFC 6901, JavaScript Object Notation (JSON) Pointer: https://datatracker.ietf.org/doc/html/rfc6901
- Kubernetes API reference, StatefulSet v1: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes StatefulSet concept documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- yq evaluate command documentation: https://mikefarah.gitbook.io/yq/commands/evaluate

## Issues Found
- The post used `patchesJson6902` throughout as the primary Kustomize field. Kustomize v5 deprecates `patchesJson6902` in favor of `patches`, so the title, description, prose, and examples were updated to use current JSON 6902 patch syntax through `patches`, while noting that older kustomizations may still use the deprecated field.
- The post stated that strategic merge patches replace entire arrays. This is not always true for Kubernetes built-in types, where some lists merge by merge key. The wording was corrected to explain that strategic merge patches merge some Kubernetes lists and replace others, while JSON Patch supports explicit index-based operations.
- The post implied JSON Patch `add` creates missing paths generally. RFC 6902 allows `add` to create the final object member, but the containing object or array must already exist. The affected guidance was corrected, and array examples were qualified where parent arrays must already exist.
- The volumeMounts and initContainers examples used `add` to create arrays but did not mention that `add` replaces an existing object member. Notes were added explaining to skip the array-creation operation if the array already exists.
- The annotations example patched `/metadata/annotations/prometheus.io~1scrape` without noting that `/metadata/annotations` must already exist. The text was updated to state that the example applies when the annotations map already exists.
- The debugging command treated `kustomize build` output as a Kubernetes List with `.items[]`. Kustomize normally emits a multi-document YAML stream, so the yq command was corrected to `yq eval 'select(.kind == "Deployment")' -`.
- The StatefulSet example implied that adding `volumeClaimTemplates` works identically in all situations. A caveat was added that this is valid for manifests before creation, but Kubernetes restricts updates to several StatefulSet fields on live objects, including `volumeClaimTemplates`.

## Review Notes
The examples are still index-based, which is accurate for JSON Patch but can be brittle when base manifests change ordering. Future improvements could show optional `test` operations before index-based changes to make failures more explicit.
