# Validation Summary: How to Create Kubernetes Resource Quotas with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes ResourceQuota
- Kubernetes PriorityClass
- OpenTofu
- HashiCorp Kubernetes provider
- HCL

## Sources Consulted
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- HashiCorp Kubernetes provider `kubernetes_resource_quota_v1` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/resource_quota.html
- HashiCorp Kubernetes provider `kubernetes_namespace_v1` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/namespace_v1
- HashiCorp Kubernetes provider source docs for `kubernetes_resource_quota_v1`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/resource_quota_v1.md
- HashiCorp Kubernetes provider source docs for `kubernetes_namespace_v1`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/namespace_v1.md

## Issues Found
- Step 2 used `system-critical` as a PriorityClass name. Kubernetes reserves the `system-` prefix for built-in PriorityClasses, and the built-in names are `system-cluster-critical` and `system-node-critical`. I changed the example to use the valid custom class name `production-critical`.
- Step 2 did not state that the example depends on an existing namespace and existing PriorityClass objects. I added a short inline comment to make that prerequisite explicit.
- Step 3 created `kubernetes_resource_quota_v1` resources for team namespaces without creating those namespaces in the example. I added a `kubernetes_namespace_v1` resource with `for_each` and made each quota reference the created namespace so the example works as written.

## Review Notes
- The quota keys used in Step 1 are valid per Kubernetes documentation, including `services.loadbalancers`, `services.nodeports`, `requests.storage`, and `<storage-class-name>.storageclass.storage.k8s.io/requests.storage`.
- PriorityClass-scoped ResourceQuota is stable in Kubernetes v1.17 and later, and the resources limited in the post (`requests.cpu` and `requests.memory`) are allowed for that scope.
- The post uses Terraform-compatible Kubernetes provider resources (`kubernetes_namespace_v1` and `kubernetes_resource_quota_v1`), which are appropriate for OpenTofu configurations.
