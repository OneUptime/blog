# Validation Summary: How to Configure RBAC to Allow Node Logs and Metrics Access Without Full Node

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes kubelet authentication and authorization
- Kubernetes node proxy, log, metrics, and stats subresources
- kubectl
- Prometheus Kubernetes service discovery
- Kubernetes metrics-server
- Kubernetes audit policy

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kubelet authentication/authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/
- Kubernetes Node API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/
- Kubernetes node metrics data documentation: https://kubernetes.io/docs/reference/instrumentation/node-metrics/
- Kubernetes node debugging with kubectl documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes v1.36 fine-grained kubelet authorization announcement: https://kubernetes.io/blog/2026/04/24/kubernetes-v1-36-fine-grained-kubelet-authorization-ga/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Prometheus configuration documentation for Kubernetes service discovery: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The post referred to a default `node-reader` role. Upstream Kubernetes does not document a default user-facing `node-reader` ClusterRole, so this was changed to "basic read-only node permissions."
- The post mixed fine-grained kubelet subresources (`nodes/log`, `nodes/metrics`) with API server node proxy URLs (`/api/v1/nodes/.../proxy/...`). Those proxy URLs require `nodes/proxy`; the log and metric examples were changed to direct kubelet HTTPS requests using a ServiceAccount bearer token.
- The node observer role omitted `nodes/stats` even though the post discussed kubelet stats. Added `nodes/stats` with `get`.
- The Prometheus scrape example routed through the API server node proxy, which would require `nodes/proxy`. It was changed to scrape kubelet port `10250` directly using node service discovery and `nodes/metrics` authorization.
- The node debugger role granted `list` and `watch` across node log, metric, and status subresources. It was split so `list` and `watch` apply only to `nodes`, while kubelet subresources use `get`.
- The node proxy explanation said `get`, `create`, and `delete` were generally required. It now states that the RBAC verb depends on the HTTP method, and the debugger example grants only `get` for the shown `kubectl get --raw` commands.
- The audit example implied direct kubelet log/metric access would appear as `nodes/log` or `nodes/metrics` API server audit events. It now distinguishes API server node proxy auditing from kubelet SubjectAccessReview auditing for direct kubelet access checks.

## Review Notes
The updated direct kubelet examples assume kubelet webhook authentication and authorization are enabled and that the client can reach the kubelet HTTPS port. The curl examples use `-k`; production monitoring should validate kubelet serving certificates when the cluster PKI supports it.
