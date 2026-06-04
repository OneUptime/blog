# Validation Summary: How to Configure kubectl port-forward for Local Access to Pod Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes Services, Pods, Deployments, StatefulSets, and ReplicaSets
- Kubernetes RBAC and API auditing
- Bash scripting
- PostgreSQL, MySQL, MongoDB, Redis, Prometheus, Grafana, Kubernetes Dashboard, Elasticsearch, and Kibana client access patterns

## Sources Consulted
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes port-forward task guide: https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Pod API reference for portforward subresource: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- MongoDB Shell documentation: https://www.mongodb.com/docs/mongodb-shell/connect/

## Issues Found
- The service port-forwarding example claimed service forwarding automatically handles pod restarts and load balances to healthy pods. Kubernetes documentation states that resource forwarding selects a pod automatically and the session ends when the selected pod terminates. Updated the comments to say that service forwarding selects a matching pod and must be rerun if the selected pod terminates.
- The MongoDB example used the legacy `mongo` shell command. Updated it to `mongosh`, which is the current MongoDB Shell command shown in MongoDB documentation and Kubernetes' own port-forwarding tutorial.
- The security section described `kubectl get events` as a way to audit port-forward usage. Kubernetes Events are not the API audit log mechanism. Updated the guidance to use Kubernetes API audit logs and include `pods/portforward` in the audit policy.
- The security section said to "Use strong authentication" while only forwarding to an HTTPS port. Updated the wording to prefer TLS and application authentication, since `kubectl port-forward` does not itself configure application authentication.
- The RBAC note said users need `pods/portforward` permission. Updated it to specify create access on the `pods/portforward` subresource, matching the Kubernetes API's create connect portforward operation.

## Review Notes
The local environment did not have `kubectl` installed, so command validation was performed against official Kubernetes generated reference documentation rather than local `kubectl --help` output. The remaining examples are syntactically consistent with the documented `kubectl port-forward TYPE/NAME [LOCAL_PORT:]REMOTE_PORT` form, including multiple port mappings, random local port allocation, and `--address`.
