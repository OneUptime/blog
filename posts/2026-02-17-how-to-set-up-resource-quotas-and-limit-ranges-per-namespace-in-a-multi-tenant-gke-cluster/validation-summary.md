# Validation Summary: How to Set Up Resource Quotas and Limit Ranges per Namespace in a Multi-Tenant

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes PriorityClass
- kubectl
- Bash
- jq

## Sources Consulted
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes ResourceQuota API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/resource-quota-v1/
- Kubernetes Limit Ranges documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes LimitRange API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/limit-range-v1/
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes PriorityClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/scheduling/priority-class-v1/
- Google Kubernetes Engine quotas and limits documentation: https://cloud.google.com/kubernetes-engine/quotas

## Issues Found
- Clarified that ResourceQuota caps declared resource requests, limits, storage requests, and object counts rather than directly capping actual runtime CPU or memory consumption. This avoids implying that ResourceQuota alone stops a memory leak that has already been admitted.
- Clarified the CPU and memory quota admission rule. Kubernetes requires pods to specify the corresponding requests or limits for resources constrained by quota; the article's example quota constrains both requests and limits, so pods need both.
- Changed the `low-priority` PriorityClass example from `globalDefault: true` to `globalDefault: false`. `PriorityClass` is cluster-scoped, and only one PriorityClass in the cluster can be the global default, so making a tenant example globally default is misleading.
- Changed the quota-exceeded example from applying `big-deployment.yaml` to applying `big-pod.yaml`, and added a note that Deployment creation can succeed while its Pods fail admission due to quota. This matches Kubernetes quota behavior for workload controllers.
- Reworded "no overcommit" to "no over-quota admission" because Kubernetes can still overcommit cluster capacity depending on requests and limits; the hard guarantee here is admission against the ResourceQuota.

## Review Notes
- The Kubernetes API versions and fields used in the ResourceQuota, LimitRange, and PriorityClass YAML examples are current and non-deprecated.
- The object-count quota names used in the examples, including `pods`, `services`, `services.loadbalancers`, `persistentvolumeclaims`, `secrets`, and `configmaps`, are supported by Kubernetes.
- `kubectl` is not installed in this workspace, so CLI examples were reviewed against official documentation rather than executed locally.
