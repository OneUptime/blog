# Validation Summary: How to Configure Kubeflow Multi-Tenancy

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubeflow Profiles and namespaces
- Kubeflow Pipelines multi-user isolation
- Kubernetes ResourceQuota, LimitRange, PriorityClass, NetworkPolicy, RBAC, and audit policy
- Istio AuthorizationPolicy
- Dex OIDC and LDAP connectors
- KServe InferenceService
- Prometheus, kube-state-metrics, Grafana, and NVIDIA DCGM Exporter
- Python Kubernetes client

## Sources Consulted
- Kubeflow Profiles and Namespaces: https://www.kubeflow.org/docs/components/central-dash/profiles/
- Kubeflow Pipelines multi-user isolation: https://www.kubeflow.org/docs/components/pipelines/operator-guides/multi-user/
- Kubeflow Pipelines REST API reference: https://www.kubeflow.org/docs/components/pipelines/reference/api/kubeflow-pipeline-api-spec/
- Kubeflow Notebook API reference: https://www.kubeflow.org/docs/components/notebooks/api-reference/notebook-v1/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Dex OIDC connector documentation: https://dexidp.io/docs/connectors/oidc/
- Dex LDAP connector documentation: https://dexidp.io/docs/connectors/ldap/
- Dex storage documentation: https://dexidp.io/docs/configuration/storage/
- KServe InferenceService documentation: https://kserve.github.io/website/
- kube-state-metrics ResourceQuota metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md
- NVIDIA DCGM Exporter documentation: https://docs.nvidia.com/datacenter/dcgm/latest/gpu-telemetry/dcgm-exporter.html

## Issues Found
- The post showed profile contributors under `spec.contributors`, but current Kubeflow documentation describes profile contributors as RoleBinding and Istio AuthorizationPolicy resources. Replaced the contributor YAML and programmatic contributor management code with RoleBinding and AuthorizationPolicy creation.
- The post described profiles as creating an "isolated namespace" without the documented caveat that isolation is based on Kubernetes namespaces and Kubeflow authorization resources. Adjusted the wording to avoid overstating hard isolation guarantees.
- The RBAC examples referenced `pipelines` and `pipelineruns` resources in the `kubeflow.org` API group. Kubeflow Pipelines uses its REST API for pipeline resources, and Argo-backed runs are represented by Argo Workflow resources. Updated the examples and audit policy to use `argoproj.io` `workflows` where Kubernetes RBAC/audit resources are relevant.
- The KServe RBAC example used the outdated/non-current `serving.kubeflow.org` API group. Updated it to `serving.kserve.io`.
- The Kustomization example used `namespace: ${NAMESPACE}`, which Kustomize does not expand as a shell environment variable. Replaced it with a concrete namespace value.

## Review Notes
The corrected snippets parse as valid YAML/Python. Actual admission of Kubeflow, Istio, Argo, and KServe resources still depends on the relevant CRDs and controllers being installed in the target cluster.
