# Validation Summary: How to Operationalize Calico Troubleshooting Commands

## Status
validated

## Post Type
Operational Guide / Runbook Reference

## Technologies Covered
- Calico (operator install)
- calicoctl CLI
- kubectl
- Kubernetes (NetworkPolicy, GlobalNetworkPolicy)
- Felix (Calico data-plane agent)
- BGP / IPAM
- Tigera Operator (`tigerastatus` CRD, `calico-system` namespace)

## Sources Consulted
- Tigera/Calico installation reference (TigeraStatus): https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- FelixConfiguration CRD source: https://github.com/projectcalico/calico/blob/master/libcalico-go/config/crd/crd.projectcalico.org_felixconfigurations.yaml
- `calicoctl ipam show`: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- `calicoctl node status`: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- GlobalNetworkPolicy resource: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- NetworkPolicy resource: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands

## Issues Found
No technical issues found.

All commands, resource names, namespaces, and label selectors check out against current Calico/Tigera documentation:
- `kubectl get tigerastatus` is the correct way to inspect operator-managed component health.
- `calico-system` is the correct namespace for operator installs (manifest installs would use `kube-system`).
- `k8s-app=calico-node` is the correct DaemonSet label and `calico-node` is the correct container name.
- `felixconfiguration` is the correct resource name. The `grep logSeverity` pattern is intentionally a prefix match that catches the three actual fields (`logSeverityScreen`, `logSeverityFile`, `logSeveritySys`); the post does not misname the field.
- `calicoctl ipam show`, `calicoctl node status`, `calicoctl get bgppeer`, `calicoctl get globalnetworkpolicy`, and `calicoctl get networkpolicy -n <namespace>` are all valid.

## Review Notes
- `calicoctl node status` is typically invoked on the host node (or via `kubectl exec` into the calico-node pod). The parenthetical "(on affected node's calico-node pod)" in the reference card correctly conveys this constraint.
- The post references local helper scripts (`validate-calico-commands.sh`, `calico-diag-bundle.sh`, `collect-calico-logs.sh`) which are operational artifacts owned by the reader's team, not upstream Calico tools — that's clear from context and not a technical inaccuracy.
- Content is mostly process/runbook structure rather than executable code; commands shown are correct and consistent with current operator-based Calico installs.
