# Validation Summary: Secure Calico Host Endpoint Selectors

## Status
validated

## Post Type
Guide / Hardening best-practices

## Technologies Covered
- Calico (host endpoints, GlobalNetworkPolicy, selector language)
- Kubernetes RBAC (ClusterRole, apiGroups, verbs)
- Kubernetes node labels
- Kubernetes audit policy / audit logs
- `kubectl` and `calicoctl`

## Sources Consulted
- Calico selector reference (selector syntax: `has(k)`, `!has(k)`, `all()`, `==`, `&&`) — https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico HostEndpoint resource reference — https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Kubernetes RBAC documentation — https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes auditing documentation (audit Policy resource, `--audit-log-path` flag) — https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes Events reference (to confirm there is no built-in `NodeLabelUpdated` event reason) — https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/event-v1/

## Issues Found
- **Principle 6 (Audit Label History) — incorrect command.** The original section claimed to "use Kubernetes audit logs" but then ran `kubectl get events --field-selector reason=NodeLabelUpdated`. Two problems: (a) Kubernetes Events (`v1.Event`) are a separate mechanism from the API server's audit log — `kubectl get events` does not surface audit log entries; (b) there is no standard `NodeLabelUpdated` event reason emitted by Kubernetes for node label changes, so the command would return nothing on a stock cluster. Replaced the section with an actual audit `Policy` snippet (`audit.k8s.io/v1`) that captures `update`/`patch` on `nodes`, plus a `grep` example against the API server's audit log file (whose location is set by `--audit-log-path`). This matches the official Kubernetes auditing docs.

## Review Notes
- Calico selector syntax used throughout (`!has(unrestricted)`, `all()`, `trusted == 'true'`, `node-role == 'worker' && environment == 'production'`) is valid per the Calico selector reference.
- The `projectcalico.org` apiGroup for `hostendpoints` is correct for clusters running the Calico API server. Clusters using the older CRD-only installation expose Calico resources under `crd.projectcalico.org` instead — readers should adjust the apiGroup if their install is CRD-only.
- The `resourceNames: []` field on the `node-label-admin` ClusterRole is effectively a no-op (an empty list is the same as omitting it) but is not incorrect.
- The Python one-liner in Principle 5 walks `doc.get('items', [])` from `calicoctl get globalnetworkpolicies -o yaml`; `calicoctl` returns a `List` object whose top-level key is `items`, so this works. It will miss policies whose selectors contain `all()` as a substring inside a longer expression only if such usage were intended — for the stated purpose (catching bare `all()` deny rules) this is acceptable.
- No version pin is given for Calico; selector syntax shown has been stable across recent Calico v3.x releases.
