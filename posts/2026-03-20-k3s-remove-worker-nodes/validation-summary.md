# Validation Summary: How to Remove Worker Nodes from K3s

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- K3s
- Kubernetes
- `kubectl`
- Linux networking utilities (`ip`, `iptables`, `ip6tables`)
- systemd

## Sources Consulted
- K3s official uninstall documentation: https://docs.k3s.io/installation/uninstall
- K3s official architecture documentation, including node-password secrets: https://docs.k3s.io/architecture
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes `kubectl cordon` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes disruptions / PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes `kubectl top` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top
- K3s install script source used to verify uninstall and network-cleanup behavior: https://raw.githubusercontent.com/k3s-io/k3s/master/install.sh

## Issues Found
1. The main drain command and automation script used `--force` by default. That flag is only needed when deleting pods without a controller or with a missing managing resource, so I removed it from the default workflow and clarified when it should be used.
2. The PodDisruptionBudget example patched `minAvailable` to `0` and then restored it to `1`, which is not generally correct because the original PDB may use a different value or `maxUnavailable`. I replaced that with an inspection-and-edit workflow that is accurate for generic guidance.
3. The verification command `kubectl get pods ... | grep -v DaemonSet` was not a reliable way to confirm drain results because standard `kubectl get pods` output does not identify controller type. I changed it to listing pods on the node with `-o wide` and checking the `NODE` column for rescheduled workloads.
4. The manual uninstall section was incomplete compared with current K3s uninstall behavior. I added removal of the generated symlinks and `k3s-killall.sh`, added `/run/flannel`, and removed the broad deletion of `/etc/cni/net.d`.
5. The network cleanup section flushed entire iptables tables and reset default policies, which is much broader than K3s' own uninstall behavior and can remove unrelated host firewall rules. I replaced it with the narrower cleanup pattern used by the K3s uninstall tooling and expanded the interface list to match current K3s cleanup behavior more closely.
6. The node-password cleanup section incorrectly instructed readers to remove `/var/lib/rancher/k3s/server/cred/node-passwd`. Current K3s documents node passwords as Kubernetes secrets named `<node-name>.node-password.k3s`, and those secrets are removed automatically when the node resource is deleted. I corrected the section to reflect that behavior.
7. The cluster-health check used `kubectl top nodes`; the official command is `kubectl top node`. I corrected that and noted that Metrics Server is required.
8. The non-running pod check used `grep -v Running | grep -v Completed`, which leaves the header line and is less precise than using supported field selectors. I replaced it with a `status.phase` field-selector query.

## Review Notes
- The cordon step is technically correct even though `kubectl drain` also marks the node unschedulable.
- Example version strings such as `v1.29.3+k3s1` are illustrative and do not affect the correctness of the procedure.
- The article still assumes controller-managed workloads exist elsewhere in the cluster to receive rescheduled pods; that operational prerequisite is implied by Kubernetes drain semantics.
