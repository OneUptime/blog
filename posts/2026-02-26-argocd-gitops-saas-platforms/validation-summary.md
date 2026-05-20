# Validation Summary: How to Implement GitOps for SaaS Platforms with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSets
- GitOps
- Kubernetes Deployments, Jobs, Namespaces, ResourceQuotas, and NetworkPolicies
- Kustomize-style environment overlays
- Prometheus Operator PrometheusRule
- PromQL
- kube-state-metrics

## Sources Consulted
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD ApplicationSet pruning and resource deletion documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- kube-state-metrics ResourceQuota metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md

## Issues Found
- The ApplicationSet Git generator example used older-style `{{path[...]}}` template references. Updated it to current Go template syntax with `goTemplate: true`, `{{.path.basenameNormalized}}`, `{{index .path.segments 1}}`, and `{{.path.path}}`, matching the current Argo CD documentation.
- The tenant ApplicationSet example set `CreateNamespace=true` without specifying `spec.destination.namespace`. Argo CD documents that namespace auto-creation requires the destination namespace field, and the tenant example already includes a Namespace manifest, so the ineffective sync option was removed.
- The environment promotion Application snippets omitted required practical fields such as `metadata.namespace`, `spec.project`, `spec.source.repoURL`, and `spec.destination`. Added those fields so the examples are complete Argo CD Application manifests.
- The `TenantQuotaExhausted` PromQL expression divided `kube_resourcequota{type="used"}` by `kube_resourcequota{type="hard"}` without ignoring the `type` label, so the two vectors would not match. Updated the expression to use `ignoring(type)`.

## Review Notes
The remaining examples are illustrative and assume supporting resources exist, such as AppProjects, Secrets, repository access, namespace labels for NetworkPolicies, Prometheus Operator CRDs, kube-state-metrics, and application-specific migration commands. The database migration hook pattern is valid, but production systems should also make migration commands idempotent and account for tenant batching or rollback strategy.
