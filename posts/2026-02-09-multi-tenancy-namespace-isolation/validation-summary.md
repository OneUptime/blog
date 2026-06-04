# Validation Summary: How to Implement Multi-Tenancy with Namespace Isolation and Resource Quotas

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes namespaces
- Kubernetes ResourceQuota and LimitRange
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kubernetes Pod Security Standards and legacy PodSecurityPolicy
- Kubernetes ServiceAccounts
- Prometheus Operator PrometheusRule
- PromQL and kube-state-metrics
- Kubernetes Python client
- NGINX container deployment

## Sources Consulted
- Kubernetes multi-tenancy documentation: https://kubernetes.io/docs/concepts/security/multi-tenancy/
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission namespace labels documentation: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes PodSecurityPolicy removal documentation: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes seccomp documentation: https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics project documentation: https://github.com/kubernetes/kube-state-metrics
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- NGINX unprivileged container documentation: https://hub.docker.com/r/nginxinc/nginx-unprivileged/
- Kubernetes Python client documentation: https://kubernetes.readthedocs.io/

## Issues Found
- ResourceQuota object-count keys for Deployments, StatefulSets, Jobs, and CronJobs used `deployments.apps`, `statefulsets.apps`, `jobs.batch`, and `cronjobs.batch`. Updated them to the supported `count/<resource>.<group>` form so the quota applies to those namespaced resources.
- RBAC examples mixed resources from several API groups in the same rule and included the obsolete `extensions` API group. Split the rules by core, `apps`, `batch`, and `networking.k8s.io` API groups and removed `extensions`.
- NetworkPolicy examples selected namespaces using a custom `name` label that Kubernetes does not add automatically. Updated selectors to use the built-in immutable `kubernetes.io/metadata.name` namespace label.
- DNS egress allowed only UDP/53. Added TCP/53 so DNS fallback and larger DNS responses are not blocked by the policy.
- The PodSecurityPolicy note was vague for current Kubernetes. Clarified that PSP applies only to Kubernetes versions before v1.25 with the PSP admission controller enabled.
- The restricted tenant Deployment lacked an explicit seccomp profile, which can fail current Restricted Pod Security Standard enforcement unless cluster-wide seccomp defaulting is enabled. Added `seccompProfile.type: RuntimeDefault`.
- The tenant Deployment used the standard NGINX image with a non-root user, dropped capabilities, and `containerPort: 8080`; the default NGINX image listens on port 80 and can fail under those restrictions. Switched to `nginxinc/nginx-unprivileged:1.25-alpine`, set the container user to `101`, and added a `/tmp` emptyDir for the unprivileged image's runtime paths.
- PromQL quota utilization divided `kube_resourcequota{type="used"}` by `kube_resourcequota{type="hard"}` without ignoring the `type` label, so default vector matching would not match the used and hard series. Added `ignoring(type)` in both the alert and query examples.

## Review Notes
- YAML snippets were parsed successfully after the fixes.
- Python snippets were parsed successfully with Python AST checks.
- `promtool` was not installed in the workspace, so PromQL/rule validation was checked against official Prometheus documentation rather than with the local CLI.
