# Validation Summary: How to Use CRD SubResources for Status and Scale

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CustomResourceDefinition
- Kubernetes status and scale subresources
- Horizontal Pod Autoscaler
- kubectl
- Go
- controller-runtime

## Sources Consulted
- Kubernetes documentation: Extend the Kubernetes API with CustomResourceDefinitions - https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes API reference: CustomResourceDefinition v1 - https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes API concepts: resourceVersion and watches - https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes kubectl patch reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes Horizontal Pod Autoscaling documentation - https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- controller-runtime client package documentation - https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/client
- controller-runtime predicate package documentation - https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/predicate

## Issues Found
- The post said status subresource updates do not increment the main resource version. Kubernetes objects still have their `metadata.resourceVersion` updated when the object changes. I changed this to explain that status subresource updates do not increment `metadata.generation`, which matches Kubernetes CRD and controller-runtime documentation.
- The first Go example imported `k8s.io/client-go/kubernetes/scheme` without using it, which would not compile. I replaced it with `k8s.io/apimachinery/pkg/runtime` and added a minimal `DeepCopyObject` implementation so the custom resource type satisfies controller-runtime's `client.Object` expectations.
- The `ApplicationStatus` type omitted `Replicas` and `Selector`, but the later controller example assigned `app.Status.Replicas` and `app.Status.Selector`. I added those fields to keep the examples internally consistent.
- The controller example dereferenced `deployment.Spec.Replicas` without checking for nil. I added a nil check and assigned a local replica variable before updating the Deployment.

## Review Notes
The CRD `scale` configuration uses the correct `specReplicasPath`, `statusReplicasPath`, and string `labelSelectorPath` shape for Kubernetes CRDs. The kubectl `--subresource=status` patch usage is current, but kubectl was not installed in the local environment, so CLI verification was done against official kubectl documentation rather than local `--help` output.
