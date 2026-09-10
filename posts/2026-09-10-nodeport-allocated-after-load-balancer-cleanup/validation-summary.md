# Validation Summary: How to Diagnose NodePort Allocation After Load Balancer Cleanup

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Kubernetes Services and NodePorts
- Load balancer cleanup finalizers
- Kubernetes Service port allocator
- kubectl and jq

## Sources Consulted

- [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes external load balancer lifecycle](https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/)
- [Kubernetes finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
- [Kubernetes v1.34.0 Service port allocation and release](https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/registry/core/service/storage/alloc.go)
- [kubectl wait](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [kubectl auth can-i](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [jq manual](https://jqlang.org/manual/)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed on 2026-09-10 against the cited official documentation and source. This was a static technical review, not an execution test.
- Read the complete post and traced its ordinary-port and health-check-port ownership query against the Service fields and allocation/release implementation.
- Reviewed deletion timestamps, finalizer protection, all-namespace permissions, waiting for object deletion, and the node-port allocation opt-out caveat. The jq query includes both port locations and does not filter out terminating objects.
- An orphan allocation cannot be diagnosed from documentation alone. The article correctly requests control-plane evidence instead of claiming that removing cloud resources or editing etcd is a routine repair. No cluster allocator or deletion scenario was executed.
