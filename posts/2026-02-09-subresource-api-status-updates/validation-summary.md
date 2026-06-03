# Validation Summary: How to Use Kubernetes Subresource API for Status Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API subresources
- Kubernetes CustomResourceDefinitions
- Kubernetes RBAC
- kubectl
- Go
- client-go typed and dynamic clients

## Sources Consulted
- Kubernetes CustomResourceDefinitions documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes CustomResourceDefinition API reference: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes API concepts documentation: https://kubernetes.io/docs/reference/using-api/api-concepts/
- kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- client-go typed apps/v1 package documentation: https://pkg.go.dev/k8s.io/client-go/kubernetes/typed/apps/v1
- client-go dynamic package documentation: https://pkg.go.dev/k8s.io/client-go/dynamic
- Kubernetes apimachinery metav1 package documentation: https://pkg.go.dev/k8s.io/apimachinery/pkg/apis/meta/v1

## Issues Found
- Removed an unused `appsv1` import from the Deployment status update example because it would cause a Go compile error.
- Replaced `metav1.RFC3339` with `time.RFC3339` and added the `time` import because the RFC3339 layout constant is provided by Go's standard `time` package, not `metav1`.
- Fixed the CRD scale subresource example so `labelSelectorPath` points to a string field (`.status.labelSelector`). Kubernetes requires the label selector path to reference a serialized label selector string, not an object.
- Updated the `kubectl scale` example to the documented resource/name form: `kubectl scale --replicas=5 databases/my-database`.
- Added missing imports to the scale subresource Go example so the referenced packages are present.
- Added a `DatabaseStatus` type to the conditions example so the `setDatabaseCondition` function has a defined status type.
- Changed "Watching Status Changes" wording to "Watching Resources for Status Changes" because the shown watch call watches the main resource and inspects the returned object's status.
- Added missing imports and a safe type assertion to the watch example.
- Corrected the Deployment spec update examples to assign `DeploymentSpec.Replicas` through an `*int32`, matching the Kubernetes Go API type.

## Review Notes
The examples are illustrative snippets rather than complete runnable controller programs. In production controllers, status updates commonly use patches or controller-runtime's status client, and condition handling should preserve `lastTransitionTime` when only reason or message changes.
