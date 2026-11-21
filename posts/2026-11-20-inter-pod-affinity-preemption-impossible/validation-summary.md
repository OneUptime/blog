# Validation summary

Pod YAML passed official Kubernetes1.34.0 schema validation. Selector scope, non-self-matching labels and arithmetic reviewed. Shell syntax passed. The tagged source confirms the first removal simulation can fail affinity before reprieve. Diagram and social image reviewed.

No live scheduler or simulation was run; arithmetic is explanatory. Schema checks do not verify actual cluster placement. Mermaid was not rendered.

## Sources

- https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#inter-pod-affinity-and-anti-affinity
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/scheduler/framework/plugins/defaultpreemption/default_preemption.go
- https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/#inter-pod-affinity-on-lower-priority-pods
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/api/openapi-spec/swagger.json

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
