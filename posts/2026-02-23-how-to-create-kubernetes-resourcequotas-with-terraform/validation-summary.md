# Validation Summary: How to Create Kubernetes ResourceQuotas with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.0)
- HashiCorp Kubernetes provider (~> 2.25)
- Kubernetes ResourceQuota API
- Kubernetes LimitRange API
- kubectl CLI

## Sources Consulted
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Terraform kubernetes_resource_quota resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/resource_quota
- Terraform kubernetes_limit_range resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/limit_range
- Kubernetes resource quota scopes reference (Terminating, NotTerminating, BestEffort, NotBestEffort, PriorityClass, CrossNamespacePodAffinity)
- Kubernetes StorageClass quota syntax: `<storage-class-name>.storageclass.storage.k8s.io/requests.storage` and `.../persistentvolumeclaims`

## Issues Found
1. **Misleading comment in scoped quota example**: The first `kubernetes_resource_quota` block in the "Quota with Scopes" section was labeled `best_effort` with a comment that read "Only count pods with BestEffort QoS (no resource requests or limits)", but the actual `scope_selector` used `scope_name = "PriorityClass"` with `values = ["low-priority"]`. These are two distinct quota scopes — BestEffort filters by QoS class with no values list, while PriorityClass filters by assigned priority class name. Fixed by renaming the resource to `low_priority`, updating the metadata `name` to `low-priority-quota`, and rewriting the comment to accurately describe what the code does (filtering on the low-priority PriorityClass). This keeps the example consistent with the adjacent `high_priority` resource and avoids confusing readers about which scope is in use.

## Review Notes
- All other resource type names in the object count quota (`pods`, `services`, `services.loadbalancers`, `services.nodeports`, `configmaps`, `secrets`, `persistentvolumeclaims`, `replicationcontrollers`) match the canonical Kubernetes quota resource names.
- The StorageClass-scoped quota syntax is correct.
- The `kubernetes_limit_range` block correctly uses `default`, `default_request`, and `type = "Container"`.
- The Terraform provider version `~> 2.25` is older than the current latest (~2.38 at time of review) but the resource schema shown is fully compatible across these versions; no need to bump.
- `replicationcontrollers` remains a valid quota resource even though ReplicationControllers themselves are largely superseded by Deployments/ReplicaSets — leaving it in for completeness is reasonable.
- The Markdown link to the related LimitRanges post is internal to the blog and is consistent with other posts in this series.
