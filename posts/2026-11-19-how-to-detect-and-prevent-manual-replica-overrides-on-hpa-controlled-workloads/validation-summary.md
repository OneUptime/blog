# Validation Summary: How to Detect and Prevent Manual Replica Overrides on HPA-Controlled Workloads

## Status
validated

## Post Type
Technical troubleshooting and operational guide.

## Technologies Covered
- Kubernetes Deployments and rolling updates
- Horizontal Pod Autoscaler (HPA)
- kubectl and jq
- Server-side apply and managed fields
- Kubernetes audit policies and audit events
- Kubernetes RBAC and admission policies

## Sources Consulted
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — JSON output, namespace selection, and managed-field visibility.
- [kubectl scale reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/) — changing desired replica counts.
- [Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/) — reconciliation, Deployment replica management, bounds, and removing replica declarations.
- [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) — desired replicas and rollout surge capacity.
- [Server-Side Apply](https://kubernetes.io/docs/reference/using-api/server-side-apply/) — managed fields, update operations, and ownership semantics.
- [Transferring ownership](https://kubernetes.io/docs/reference/using-api/server-side-apply/#transferring-ownership) — safely handing replica ownership to the HPA.
- [Auditing](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/) — policy configuration, logging levels, stages, and backends.
- [Audit configuration API v1](https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/) — policy rules, resource/subresource matching, and event fields.
- [Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/) — resource and subresource permissions.
- [Validating Admission Policy](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/) — inspecting incoming and existing objects and request attributes.
- [jq manual](https://jqlang.org/manual/) — object construction, quoted field access, optional iteration, and selection.
- [Author profile](https://github.com/nawazdhandala) — verified the linked author destination.

## Issues Found
- The managed-fields inspection command omitted `--show-managed-fields`. By default, `kubectl get` omits managed fields from JSON and YAML output, so the optional jq iterator would silently produce no ownership information. Added `--show-managed-fields` to that command, as documented in the official kubectl reference. No other post changes were needed.

## Review Notes
- Confirmed that HPA reconciliation can overwrite manual desired replica changes, while rollout surge Pods do not necessarily indicate a change to Deployment desired replicas.
- Confirmed that managed-field managers describe field ownership rather than authenticated identity or a complete change history. Ordinary updates are not blocked by server-side apply ownership.
- Checked the audit policy's API version, rule fields, verbs, namespace, and Deployment/scale resource names. Request-level logging includes request bodies; response status is available at appropriate later audit stages, such as ResponseComplete. Earlier matching rules in an existing policy can take precedence.
- Confirmed the ownership-transfer warning: relinquishing the sole ownership of replicas can restore the Deployment default of one. Client-side apply also needs care when removing a previously declared replica count; its last-applied annotation procedure differs from the linked server-side apply procedure.
- Confirmed that restricting the scale subresource alone cannot prevent replica changes through whole-Deployment writes. Admission enforcement must match both paths and the actual controller identity.
- All post links resolved to their intended documentation or author destinations. No deprecated APIs or explicit version-specific claims required correction.
- Checked both shell blocks with `bash -n` and exercised all three jq filters on representative JSON, including unrelated managed fields and an absent managedFields array.
- kubectl is not installed in the review environment. Commands were verified against official CLI documentation; no live-cluster scaling, audit-backend, release, or admission-policy integration test was performed.
