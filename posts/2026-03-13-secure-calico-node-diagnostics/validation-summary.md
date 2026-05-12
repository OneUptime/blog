# Validation Summary: How to Secure Calico Node Diagnostics

## Status
validated

## Post Type
Guide / Security how-to (RBAC, audit policy, and operational tiering for Calico node diagnostics)

## Technologies Covered
- Calico (calico-node, calicoctl, Felix)
- Kubernetes RBAC (Role, rbac.authorization.k8s.io/v1)
- Kubernetes audit policy (audit.k8s.io/v1)
- kubectl (exec, logs, debug node)
- nsenter (Linux namespace tooling)
- iptables

## Sources Consulted
- Kubernetes kubectl debug node documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Calico calicoctl ipam reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- nsenter(1) man page: https://www.man7.org/linux/man-pages/man1/nsenter.1.html

## Issues Found

1. **Incorrect claim that `kubectl debug node` uses `nodes/proxy`.**
   - Original comment: `(no specific RBAC - this uses node/proxy which requires cluster-admin)`.
   - `kubectl debug node` actually creates a debug Pod on the target node, sharing host PID/Network/IPC namespaces with the host root filesystem mounted at `/host`. It does not use the `nodes/proxy` API. The required permission is `create` on `pods` plus the ability to bypass restricted/baseline Pod Security Standards — not specifically cluster-admin via `nodes/proxy`.
   - Fix: rewrote the comment to describe the real mechanism (debug pod with host namespaces and PSS bypass requirement).

2. **`nsenter` command would not work with `--image=alpine`.**
   - Original: `kubectl debug node/"${NODE}" --image=alpine -- nsenter -t 1 -n -- iptables -L`.
   - `nsenter -t 1 -n` only enters the host network namespace; the process still uses the container's mount namespace, so it tries to run `iptables` from Alpine, which does not ship iptables by default. The command would fail with `iptables: not found`.
   - Fix: switched the image to `nicolaka/netshoot` (the de facto network-debugging image, which ships iptables) and added `-m` to nsenter so the host mount namespace is also entered. Either change alone would make the example work; both make it clearly correct.

3. **Audit policy comment "Log node debug operations" was misleading.**
   - Auditing `nodes/proxy` does not capture `kubectl debug node`, since that command creates pods rather than calling `nodes/proxy`.
   - Fix: relabeled the existing `nodes/proxy` rule to reflect what it actually catches (direct node proxy access via `kubectl proxy` / raw API), and added a second audit rule for `pods` `create` to cover the actual `kubectl debug node` audit trail.

## Review Notes
- The RBAC `Role` example targets the `calico-system` namespace, which matches Tigera Operator installations. Users on a manifest-based install (where calico-node runs in `kube-system`) should adjust the namespace accordingly.
- `calico-node -felix-live` uses single-dash flag style, which is correct (matches Go's `flag` package convention used by the calico-node binary). Same for `-felix-ready`, `-bird-live`, `-bird-ready`.
- `calicoctl ipam show` and `calicoctl get felixconfiguration` are valid commands.
- The audit policy structure (rules with `level`, `resources` containing `group`/`resources`, `namespaces`, `verbs`) is correct per `audit.k8s.io/v1`.
- The conclusion still phrases the host-level access as "cluster-admin (or equivalent)" — this is acceptable as shorthand for "a role with permission to create privileged host-namespace pods", though strictly speaking cluster-admin is one way among several to grant that capability.
