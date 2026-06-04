# Validation Summary: Using RBAC Markers in Kubernetes Operator Dev for Fine-Grained Access Control

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- Kubebuilder
- controller-gen / controller-tools
- Operator SDK
- Go-based Kubernetes operators
- kubectl authorization checks

## Sources Consulted
- Kubebuilder RBAC marker reference: https://book.kubebuilder.io/reference/markers/rbac
- Kubebuilder controller-gen CLI reference: https://book.kubebuilder.io/reference/controller-gen.html
- Kubebuilder Getting Started RBAC examples: https://kubebuilder.io/getting-started
- Kubebuilder Creating Events guide: https://book.kubebuilder.io/reference/raising-events.html
- Kubebuilder namespace-scoped manager migration guide: https://book.kubebuilder.io/migration/namespace-scoped.html
- Operator SDK operator scope documentation: https://sdk.operatorframework.io/docs/building-operators/golang/operator-scope/
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The Event RBAC examples used the core API group for `events`. Current Kubebuilder documentation for EventRecorder permissions uses `events.k8s.io`, so I updated the marker examples and generated YAML example to use `groups=events.k8s.io`.
- The non-resource URL section implied these permissions apply generally to operator health or metrics endpoints. Kubernetes RBAC non-resource URL rules apply to Kubernetes API server non-resource URLs, and Kubernetes documents that they must be in a ClusterRole bound with a ClusterRoleBinding to be effective. I clarified that scope.
- The wildcard API group warning said `groups=*` is equivalent to cluster-admin access for specified resources. That was overstated because the effective permissions still depend on the resources and verbs in the rule. I reworded it to say it grants the same resource and verb rule across all API groups.
- The marker placement explanation was narrower than controller-gen behavior. I updated it to say controller-gen scans the packages included by the `paths` argument, while keeping the recommendation to place markers above `Reconcile`.
- The Event recording section said missing Event permissions fail silently. I changed this to the precise outcome: without the permission, Event objects will not be created.

## Review Notes
The `kubectl auth can-i` examples, `resourceNames` marker usage, `namespace=` marker behavior, RoleBinding-to-ClusterRole explanation, status and finalizer subresource permissions, and `make manifests` regeneration flow are consistent with the official documentation reviewed. `controller-gen` and `kubectl` were not installed locally, so CLI syntax was verified against official documentation rather than local `--help` output.
