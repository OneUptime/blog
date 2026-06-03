# Validation Summary: How to Use Kubernetes Resource Quotas for Namespace Budgeting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes namespaces
- kubectl
- kube-state-metrics / Prometheus
- Kyverno admission policies
- jq

## Sources Consulted
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes ResourceQuota API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/resource-quota-v1/
- kube-state-metrics ResourceQuota metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md
- Kyverno Add Quota sample policy: https://kyverno.io/policies/best-practices/add-ns-quota/add-ns-quota/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno generate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/generate/

## Issues Found
- The LimitRange section said defaults are required whenever quotas are active and that teams must set requests on all pods. Kubernetes specifically requires CPU or memory requests/limits when CPU or memory quotas are enforced. Updated the wording to say CPU or memory quotas require the relevant requested or limited resources, and clarified that the shown LimitRange constrains containers.
- The Kyverno example attempted to validate that a Namespace had a ResourceQuota by reading ResourceQuotas during Namespace admission. That rule would not ensure a quota exists for newly created namespaces, and it used the deprecated top-level `validationFailureAction` field. Replaced it with a Kyverno generate policy that creates a default ResourceQuota for each new namespace.
- The troubleshooting section used `kubectl annotate ... kubectl.kubernetes.io/last-applied-configuration-` as a "force quota resync" command. That command only removes an annotation and is not a documented ResourceQuota resync mechanism. Replaced it with guidance to re-check quota status and consult controller logs if usage remains incorrect beyond the quota sync period.

## Review Notes
The PromQL examples are structurally consistent with kube-state-metrics' `kube_resourcequota` labels, but production alerts should usually aggregate by namespace/resourcequota/resource and handle missing or zero hard quota values to avoid noisy or invalid ratios.
