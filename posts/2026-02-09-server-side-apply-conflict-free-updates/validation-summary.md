# Validation Summary: How to Use Server-Side Apply in Custom Controllers for Conflict-Free Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Server-Side Apply
- client-go
- controller-runtime
- Go
- kubectl

## Sources Consulted
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes API concepts, PATCH operations: https://kubernetes.io/docs/reference/using-api/api-concepts
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- controller-runtime client package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/client
- client-go package documentation: https://pkg.go.dev/k8s.io/client-go
- client-go typed core/v1 package documentation: https://pkg.go.dev/k8s.io/client-go/kubernetes/typed/core/v1
- Kubernetes Server-Side Apply GA announcement and client-go support notes: https://kubernetes.io/blog/2021/08/06/server-side-apply-ga/

## Issues Found
- The first client-go code example used `json.Marshal` without importing `encoding/json` and imported `sigs.k8s.io/controller-runtime/pkg/client` without using it. I added the missing import and removed the unused import so the example is syntactically correct.
- Several server-side apply examples omitted `TypeMeta` (`apiVersion` and `kind`) from the objects being applied. I added `TypeMeta` to the applied Kubernetes objects so the examples represent valid apply intent objects.
- The conflict-handling example returned before showing the force-ownership branch, making the force example unreachable. I changed the example so the skip option is shown as an alternative and the force patch is reachable.
- The reconcile-loop import block included an unused Kubernetes API errors import. I removed it.
- The `managedFields` sample showed Service ports as owned at `f:ports: {}`. Service ports are represented as list-map entries in managed fields, so I updated the sample to show ownership of the specific port/protocol entry.

## Review Notes
The post is technically relevant and the core explanations match Kubernetes' Server-Side Apply documentation. Some snippets are still illustrative partial examples and require normal surrounding imports or project-specific types such as `examplev1.Application`.
