# Validation Summary: How to Implement Soft Multi-Tenancy with Node Pools and Scheduling Rules

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Kubernetes node labels, taints, tolerations, node selectors, and node affinity
- Kubernetes namespaces, ResourceQuota, and LimitRange
- Kubernetes admission webhooks
- Kubernetes NetworkPolicy
- Kubernetes RBAC
- Kubernetes PriorityClass
- Prometheus and kube-state-metrics
- Prometheus Operator PrometheusRule

## Sources Consulted
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes taints and tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes assigning pods to nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes MutatingWebhookConfiguration API: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/mutating-webhook-configuration-v1/
- Kubernetes NetworkPolicy API: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes Namespaces: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces
- Kubernetes RBAC authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- kube-state-metrics metrics documentation: https://github.com/kubernetes/kube-state-metrics/tree/main/docs/metrics

## Issues Found
- The NetworkPolicy "same namespace" rules used `namespaceSelector` with `team: team-a`, which selects all namespaces with that label rather than only the policy's own namespace. Changed those peers to `podSelector: {}` so they select pods in the same namespace.
- Several NetworkPolicy examples selected namespaces by a non-guaranteed `name` label. Changed them to use Kubernetes' built-in `kubernetes.io/metadata.name` namespace label.
- The DNS egress rule allowed only UDP port 53. Added TCP port 53 because DNS can use TCP as well as UDP.
- The "external traffic" egress rule used `namespaceSelector: {}`, which selects all Kubernetes namespaces rather than external destinations. Removed the `to` peer so the rule allows TCP 443 to any destination.
- The Prometheus cost queries grouped by `team`, but container metrics do not normally carry arbitrary pod labels directly. Updated the queries to join container metrics with `kube_pod_labels` and group by `label_team`.
- The quota alert divided summed `used` quota across all resources by summed `hard` quota across all resources, mixing CPU, memory, and object counts. Updated it to compare quota usage by `namespace` and `resource`, and added `ignoring(type)` so PromQL matches `used` and `hard` series correctly.
- The overflow Deployment had a selector but no matching `spec.template.metadata.labels`, which Kubernetes rejects for `apps/v1` Deployments. Added the required pod template label.

## Review Notes
The RBAC example is technically valid but intentionally broad for a team developer role because it uses wildcard resources and verbs. In production, Kubernetes' RBAC guidance recommends least-privilege rules where feasible. `promtool` and `kubectl` were not installed in the local environment, so CLI/API behavior was verified against official documentation and the YAML snippets were syntax-checked with PyYAML.
