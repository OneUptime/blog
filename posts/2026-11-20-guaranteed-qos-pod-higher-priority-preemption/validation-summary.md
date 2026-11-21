# Validation summary

Both manifests passed official Kubernetes1.34.0 OpenAPI schema checks. Exact jq filter executed against representative and empty JSON; priority and QoS stayed separate and missing fields remained null. Embedded shell syntax passed. Pinned QoS and preemption source reviewed. Diagram structure and social image reviewed.

No Kubernetes workload, admission, QoS assignment, or preemption test was run. Resource values are illustrative. Mermaid was not rendered.

## Sources

- https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/#interactions-of-pod-priority-and-quality-of-service
- https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/apis/core/v1/helper/qos/qos.go
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/scheduler/framework/plugins/defaultpreemption/default_preemption.go
- https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/api/openapi-spec/swagger.json

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
