# Validation Summary: How to Use Kyverno Generate Policies to Auto-Create Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kyverno ClusterPolicy generate rules
- NetworkPolicy
- ResourceQuota
- RBAC RoleBinding
- ConfigMap and Secret cloning
- LimitRange
- PodDisruptionBudget
- ServiceAccount
- Prometheus Operator ServiceMonitor
- kubectl

## Sources Consulted
- Kyverno Generate Rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/generate/
- Kyverno Match and Exclude documentation: https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/
- Kyverno Preconditions documentation: https://kyverno.io/docs/policy-types/cluster-policy/preconditions/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes ServiceAccount API reference: https://kubernetes.io/docs/reference/kubernetes-api/authentication-resources/service-account-v1/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post said generated resources are owned by the source resource. Kyverno synchronization deletes downstream resources when the trigger is deleted or no longer matches, but ownerReferences are a separate optional Kubernetes mechanism. Reworded the lifecycle explanation around `synchronize: true`.
- The Deployment-to-PDB example read `.spec.replicas` without a default, even though Deployment replicas is optional. Added a default of `1` in the Kyverno precondition.
- The PDB selector used the Deployment metadata label `app`, which may not match the Deployment's pod selector and can fail when the label is absent. Changed it to use `request.object.spec.selector.matchLabels`.
- The ServiceMonitor example used `apiVersion: v1`, but ServiceMonitor is a Prometheus Operator CRD under `monitoring.coreos.com/v1`. Updated the API version and added the CRD/permission assumption.
- The monitoring section suggested checking PolicyReports for generate rules. Kyverno generate work is queued and reported through UpdateRequest resources, so the command was changed to `kubectl get updaterequests -A`.

## Review Notes
The Kubernetes built-in resource examples use current stable API versions. Generating custom resources such as ServiceMonitor may require additional RBAC for the Kyverno background controller, depending on the Kyverno installation.
