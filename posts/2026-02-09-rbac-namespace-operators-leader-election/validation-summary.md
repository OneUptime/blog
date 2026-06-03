# Validation Summary: How to Build RBAC Roles for Namespace-Scoped Operators

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes RBAC
- Kubernetes Lease API (`coordination.k8s.io/v1`)
- Kubernetes operators
- controller-runtime / Operator SDK leader election
- kubectl
- Prometheus / ServiceMonitor

## Sources Consulted
- Kubernetes Leases concept documentation: https://kubernetes.io/docs/concepts/architecture/leases/
- Kubernetes Lease API reference: https://kubernetes.io/docs/reference/kubernetes-api/coordination/lease-v1/
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- kubectl `auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- kubectl `create rolebinding` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_rolebinding/
- controller-runtime manager options documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/manager
- controller-runtime leader election documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/leaderelection
- controller-runtime leader election metrics source: https://github.com/kubernetes-sigs/controller-runtime/blob/main/pkg/metrics/leaderelection.go
- client-go leader election health check documentation: https://pkg.go.dev/k8s.io/client-go/tools/leaderelection
- Operator SDK namespace-scoped operator documentation: https://sdk.operatorframework.io/docs/building-operators/golang/operator-scope/

## Issues Found
- The ConfigMap-based leader election RBAC example combined `create` with `resourceNames`. Kubernetes RBAC cannot restrict `create` by `resourceNames`, so the example was split into name-restricted `get`, `update`, and `patch` permissions plus an unrestricted `create` rule.
- The readiness probe section said the endpoint should report ready only when the replica has acquired the lease. controller-runtime/client-go health checks are intended to report process and leader-election health, not to make follower replicas unready solely because they are followers. The wording was corrected to describe process readiness and to recommend separate health checks or metrics for current leader status.
- The failover test assumed `holderIdentity` was always a Pod name. controller-runtime's default identity appends a UUID suffix to the hostname, separated by an underscore. The command now strips that suffix before deleting the Pod.
- The Prometheus metric names `controller_runtime_leader_election_transition_seconds` and `controller_runtime_leader_election_is_leader` do not match current controller-runtime leader election metrics. They were replaced with `leader_election_slowpath_total` and `leader_election_master_status`, and the alert expression was changed to aggregate by lock name so follower replicas do not trigger false alerts.

## Review Notes
- `kubectl` was not installed in the local workspace, so CLI verification was performed against the official Kubernetes generated kubectl reference.
- The deployment flags such as `--leader-election-id`, `--leader-election-namespace`, and `--namespaces` are application/operator flags rather than generic Kubernetes Deployment fields. They are plausible for a controller-runtime-based manager when the operator binary wires them to manager options, but exact flag names can vary by scaffold or project.
