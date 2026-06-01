# Validation Summary: How to Implement Resource Quotas and Limit Ranges per Namespace on AKS

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- kubectl
- kube-state-metrics / Prometheus PromQL
- Azure Policy for Kubernetes
- Azure CLI

## Sources Consulted
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes ResourceQuota v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/resource-quota-v1/
- Kubernetes Limit Ranges documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes LimitRange v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/limit-range-v1/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics ResourceQuota metric reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md
- Prometheus PromQL operators and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Azure Policy for AKS documentation: https://learn.microsoft.com/en-us/azure/aks/use-azure-policy
- Azure Policy Kubernetes built-in policy reference: https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/policy-reference
- Azure CLI `az policy assignment create` reference: https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Azure built-in policy definition for container resource limits: https://github.com/Azure/azure-policy/blob/master/built-in-policies/policyDefinitions/Kubernetes/ContainerResourceLimits.json

## Issues Found
- Clarified ResourceQuota request/limit requirements. Kubernetes requires requests when request quotas are set and limits when limit quotas are set; the original wording implied any CPU or memory quota always required both.
- Corrected LimitRange wording and comments so `max` is described as a maximum limit for container and pod compute resources, rather than only as a maximum request.
- Fixed PromQL examples by adding `ignoring(type)` so `type="used"` series match `type="hard"` series during division.
- Updated the LoadBalancer quota comment to avoid implying every LoadBalancer service consumes a public IP, since internal LoadBalancer services are possible.
- Updated the Secret quota warning to avoid the outdated claim that Kubernetes always creates a token Secret for each default service account.
- Fixed the Azure Policy example to include required `cpuLimit` and `memoryLimit` parameters for policy `e345eecc-fa47-480f-9e88-67dcc122b164`, and clarified that this policy requires and caps container resource limits.
- Changed "fail to schedule" to "fail admission" for pods rejected by quota or LimitRange admission checks.

## Review Notes
The Kubernetes manifests use current `apiVersion: v1` APIs and valid ResourceQuota, LimitRange, scope, and scopeSelector fields. The Azure Policy section still does not create ResourceQuota or LimitRange objects per namespace; it enforces container resource limit policy, so a future improvement could add a separate Azure Policy/GitOps example for namespace quota and LimitRange object creation.
