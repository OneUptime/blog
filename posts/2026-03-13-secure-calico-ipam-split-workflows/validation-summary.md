# Validation Summary: Securing Calico IPAM Split Workflows

## Status
validated

## Post Type
Tutorial / Security hardening guide

## Technologies Covered
- Calico (Project Calico, v3.x) — IPPool, IPAM CRDs
- Kubernetes RBAC (ClusterRole, ClusterRoleBinding)
- Kubernetes audit policy
- `kubectl` and `calicoctl` CLI
- Bash scripting

## Sources Consulted
- Calico IPPool resource reference — https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking (IPIP/VXLAN) — https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- `kubectl auth can-i` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes auditing reference — https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- projectcalico/calico issue #5046 (CRD API group `crd.projectcalico.org`)
- projectcalico/calico issue #6412 (`crd.projectcalico.org/v1` vs `projectcalico.org/v3`)

## Issues Found
No technical issues found. Key claims verified:
- `crd.projectcalico.org` is the correct API group to use in RBAC rules and audit policy when targeting the underlying CRDs (`ippools`, `ipamblocks`, `ipamconfigs`, `blockaffinities`) — these are the resources kube-apiserver sees in the Kubernetes datastore (KDD) mode.
- `projectcalico.org/v3` is the correct apiVersion for the IPPool manifest applied via `calicoctl`.
- All IPPool spec fields used (`cidr`, `nodeSelector`, `ipipMode`, `vxlanMode`, `natOutgoing`, `disabled`) are valid. The `ipipMode: Never` + `vxlanMode: Always` combination is the documented VXLAN-only pool configuration.
- `kubectl auth can-i delete ippools.crd.projectcalico.org --as=<user>` is valid syntax.
- The audit policy snippet uses correct field names (`level`, `resources`, `group`, `verbs`) and valid values.
- `calicoctl ipam check`, `calicoctl get ippool ... -o jsonpath=...`, and `calicoctl delete ippool ...` are all valid commands.

## Review Notes
- The pre-deletion script greps for the literal string "consistent" in `calicoctl ipam check` output. Healthy output does generally include the word "consistent" (e.g. "IPAM is consistent" / "Found no inconsistencies"), but the exact wording varies between Calico versions, so the check is somewhat fragile. The grep would also match "inconsistent" — operators relying on this script in production should consider checking the command's exit code or using a more specific regex (`grep -E "(^|[^n])consistent"`).
- If the cluster runs the Calico API server aggregation layer (exposing `projectcalico.org/v3` directly to kube-apiserver), the audit policy and RBAC rules targeting `crd.projectcalico.org` won't catch operations made against the aggregated API. A separate rule for the `projectcalico.org` group would be needed in that deployment model. The post implicitly assumes the standard KDD mode, which is the most common setup.
- The "finalizer annotation" phrasing in the Step 4 heading is slightly imprecise (annotations are not finalizers), but the in-post comment clarifies the distinction and explains why the post uses annotations as a process-level guard rather than real finalizers.
