# Validation Summary: How to Build Custom RBAC Roles for Kubernetes Operators

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes Operators
- CustomResourceDefinitions and custom resources
- Kubernetes admission and conversion webhooks
- Kubernetes leader election with Leases and ConfigMaps
- kubectl
- Kubebuilder controller-gen RBAC markers

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes RBAC API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/access-kubernetes-api/extend-api-custom-resource-definitions/
- Kubernetes CRD versioning and conversion webhook documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i
- Kubernetes core Event API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/
- Kubernetes events.k8s.io Event API reference: https://kubernetes.io/docs/reference/kubernetes-api/events/event-v1/
- Kubebuilder controller-gen documentation: https://book.kubebuilder.io/reference/controller-gen
- Kubebuilder RBAC marker documentation: https://book.kubebuilder.io/reference/markers/rbac
- Kubebuilder marker syntax documentation: https://book.kubebuilder.io/reference/markers.html

## Issues Found
- The introduction said operators watch for changes to Custom Resource Definitions. Operators normally watch custom resource instances; CRDs define the API type. Updated the wording to "custom resource instances."
- The webhook RBAC example used `resourceNames` with top-level `create` verbs. Kubernetes RBAC cannot restrict top-level create requests by resource name because the object name may not be known at authorization time. Split the create permission into a separate rule without `resourceNames` and kept named-resource restrictions for get/update/patch.
- The webhook TLS Secret RBAC example used `resourceNames` with top-level `create`. Split the create permission into a separate rule without `resourceNames`.
- The legacy ConfigMap leader election example used `resourceNames` with top-level `create`. Split the create permission into a separate rule without `resourceNames`.

## Review Notes
The examples use current Kubernetes RBAC API versions (`rbac.authorization.k8s.io/v1`) and current CRD API group references (`apiextensions.k8s.io`). The `kubectl auth can-i` syntax was verified against the official Kubernetes reference because `kubectl` is not installed in this workspace.
