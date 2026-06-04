# Validation Summary: How to Set Up OpenYurt NodePool and UnitedDeployment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- OpenYurt NodePool
- OpenYurt YurtAppSet
- Helm
- kubectl
- Prometheus/kube-state-metrics style queries

## Sources Consulted
- OpenYurt NodePool documentation: https://openyurt.io/docs/next/user-manuals/node-pool-management/create-a-node-pool/
- OpenYurt YurtAppSet documentation: https://openyurt.io/docs/user-manuals/workload/yurt-app-set/
- OpenYurt workload management overview: https://openyurt.io/docs/user-manuals/workload/workload-management-overview/
- OpenYurt manual installation documentation: https://openyurt.io/docs/installation/manually-setup/
- OpenYurt v1.7.0 CRD and API source: https://github.com/openyurtio/openyurt/tree/v1.7.0
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The post used the older `UnitedDeployment` API as the main workload API. Current OpenYurt documentation describes YurtAppSet as the current NodePool-based workload API and calls UnitedDeployment the previous API, so the post was updated to use `YurtAppSet` `apps.openyurt.io/v1beta1`.
- The NodePool examples used `apps.openyurt.io/v1beta1` with `spec.selector`. Current OpenYurt v1.7 uses `NodePool` `apps.openyurt.io/v1beta2`; node membership is driven by OpenYurt node pool labels, so the examples now use `v1beta2` and `apps.openyurt.io/nodepool`.
- The installation command referenced an old raw `all_in_one.yaml` path. The post now uses the official Helm chart installation flow for `yurt-manager`.
- The YurtAppSet/YurtAppDaemon examples used invalid or outdated field shapes. They were rewritten with the current `spec.workload.workloadTemplate` and `spec.workload.workloadTweaks` structure.
- The per-location override examples used UnitedDeployment `topology.pools.patch`. They now use YurtAppSet `workloadTweaks` with pool selection and JSON patch operations.
- The progressive rollout commands used `kubectl set image uniteddeployment/...`, which is not applicable to the current YurtAppSet flow. The post now shows a canary NodePool label and a YurtAppSet `containerImages` tweak.
- The ResourceQuota example claimed Kubernetes supports `scopeName: NodePool`. Kubernetes ResourceQuota is namespace-scoped and has no built-in NodePool scope, so the section was corrected to use per-location namespaces.
- The multi-cluster NodePool example used a nonexistent `spec.clusters` field. The post now states that NodePools are cluster-scoped resources and shows applying equivalent NodePools to multiple cluster contexts.
- Monitoring queries referenced nonstandard OpenYurt metrics. They were replaced with label-based kube-state-metrics style examples.
- The automation example used the deprecated NodePool API and a generic `kubectl:latest` image. It now uses `apps.openyurt.io/v1beta2` and a real kubectl image reference.

## Review Notes
The post now targets OpenYurt v1.7-era APIs. Older OpenYurt versions may still serve deprecated resources, but new tutorials should use the current `NodePool` and `YurtAppSet` APIs.
