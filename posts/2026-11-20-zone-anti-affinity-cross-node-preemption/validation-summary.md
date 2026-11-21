# Validation summary

Pod schema, selector scope, topology key and shell syntax checked. Official source review covered topology-domain matching, local preemption candidates, and admission restrictions. Diagram structure and image visually reviewed.

No live scheduling or relocation was run. Schema validation cannot establish admission acceptance or schedulability. Mermaid was not rendered.

## Sources

- https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/#cross-node-preemption
- https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#inter-pod-affinity-and-anti-affinity
- https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/#limitpodhardantiaffinitytopology
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/scheduler/framework/plugins/interpodaffinity/filtering.go
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/scheduler/framework/plugins/defaultpreemption/default_preemption.go
- https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/api/openapi-spec/swagger.json

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
