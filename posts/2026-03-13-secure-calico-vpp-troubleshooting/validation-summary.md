# Validation Summary: How to Secure Calico VPP Troubleshooting Access

## Status
validated

## Post Type
Guide / Reference (security hardening guide)

## Technologies Covered
- Calico VPP dataplane
- VPP (Vector Packet Processing) and `vppctl` CLI
- Kubernetes RBAC (Role, RoleBinding, `pods/exec` subresource)
- Kubernetes Audit Policy (audit.k8s.io/v1)
- kubectl exec
- Bash wrapper scripting

## Sources Consulted
- Calico VPP dataplane documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/
- Kubernetes RBAC API reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes pods/exec subresource: https://kubernetes.io/docs/reference/access-authn-authz/authorization/
- Kubernetes Auditing (audit.k8s.io/v1 Policy schema): https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- VPP CLI reference (`show version`, `show interface`, `show ip fib`, `show errors`, `show nat44 summary`, `trace add`, `clear trace`, `set interface state`): https://s3-docs.fd.io/vpp/ (CLI reference docs)
- projectcalico/vpp-dataplane GitHub repo (container names in calico-vpp-node DaemonSet: `vpp`, `agent`): https://github.com/projectcalico/vpp-dataplane

## Issues Found
No technical issues found.

Verification details:
- Namespace `calico-vpp-dataplane` matches the namespace used by the official Calico VPP installer.
- The container name `vpp` used in `kubectl exec -c vpp` matches the container exposed inside the `calico-vpp-node` DaemonSet pods.
- The RBAC manifest correctly scopes `get`/`list` on `pods`, `create` on `pods/exec`, and `get` on `pods/log` — these are exactly the verbs/subresources required for `kubectl exec` and `kubectl logs`.
- The RoleBinding is namespace-scoped (matching the Role) and binds a Group via `rbac.authorization.k8s.io` apiGroup, which is the supported form.
- The Audit Policy uses the correct `audit.k8s.io/v1` apiVersion and valid fields (`level`, `resources` with `group`/`resources`, `namespaces`, `verbs`). `RequestResponse` is a valid audit level.
- All listed read-only `vppctl show ...` commands are valid VPP CLI commands. The state-modifying commands listed in the warning (`trace add`, `clear trace`, `set interface state`) are also valid and do mutate VPP state as described.
- The bash wrapper script syntax is valid: heredoc with quoted delimiter, `case` pattern matching, and `"${@:2}"` to forward arguments past the first are all correct Bash.

## Review Notes
- The wrapper script in "Restrict Interactive VPP CLI Sessions" writes to `/usr/local/bin/vpp-readonly` via heredoc but does not `chmod +x` the file, and `${VPP_POD}` must be set in the caller's environment. Both are reasonable omissions for a snippet but readers should be aware before deploying as-is.
- VPP CLI accepts unambiguous prefix matches; the registered command is `show errors` (plural) but `show error` (as written) is accepted in practice. No change required.
- The `level: RequestResponse` audit setting captures full request/response bodies for `pods/exec` create calls, which is appropriate for capturing the executed command but produces verbose audit log entries — operators should size their audit backend accordingly.
- The RoleBinding grants exec access to all pods in `calico-vpp-dataplane`. If a cluster runs additional non-VPP pods in that namespace, consider tightening further with admission policies (e.g., Kyverno/OPA) that restrict exec to pods with the `calico-vpp-node` label.
