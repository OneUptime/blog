# Validation Summary: How to Handle Optimistic Concurrency with ResourceVersion in Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API
- Kubernetes resourceVersion
- Kubernetes Server-Side Apply
- Kubernetes status subresources
- kubectl patch
- Go
- client-go

## Sources Consulted
- Kubernetes API Concepts: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes Server-Side Apply: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- client-go typed apps/v1 package: https://pkg.go.dev/k8s.io/client-go/kubernetes/typed/apps/v1
- client-go apply configurations apps/v1 package: https://pkg.go.dev/k8s.io/client-go/applyconfigurations/apps/v1
- client-go apply configurations package: https://pkg.go.dev/k8s.io/client-go/applyconfigurations

## Issues Found
- The first Go example imported `log` and `k8s.io/client-go/tools/clientcmd` without using them, which would make the example fail to compile. Removed those imports.
- The Server-Side Apply example passed an `*appsv1.Deployment` to the typed `Apply` method. Current client-go typed apply methods expect generated `*DeploymentApplyConfiguration` values. Rewrote the snippet to use `k8s.io/client-go/applyconfigurations/...` builders.
- The post said Server-Side Apply still uses resourceVersion internally. Official documentation describes Server-Side Apply conflict behavior in terms of field management and managed fields, so the wording was corrected to avoid implying that resourceVersion is the SSA conflict mechanism.
- The post said the status subresource has separate resourceVersion tracking. Status updates are separate subresource writes, but they update the same object's `metadata.resourceVersion`. Corrected the explanation.
- The watch section said a client can resume without missing events. Added the official caveat that old resource versions may return `410 Gone`, requiring a relist and a new watch.
- The watch example imported `k8s.io/apimachinery/pkg/watch` without using it. Removed the unused import.

## Review Notes
The remaining examples and commands align with Kubernetes API semantics: PUT updates use `metadata.resourceVersion` for optimistic concurrency, patches can be made conditional on `resourceVersion`, `RetryOnConflict` is the standard client-go retry helper, and `kubectl patch --type=json|merge|strategic` remains current. Strategic merge patch is valid for built-in Deployments but is not supported for custom resources.
