# Validation Summary: How to Troubleshoot Calico Operator Migration

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Tigera Operator
- Kubernetes
- kubectl
- calicoctl
- Kubernetes networking and IP pools

## Sources Consulted
- Calico documentation: Migrate Calico to an operator-managed installation, https://docs.tigera.io/calico/latest/operations/operator-migration
- Calico documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Create multiple IP pools, https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico documentation: Overlay networking, https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico documentation: TigeraStatus reference, https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Kubernetes documentation: Node Status, https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes documentation: kubectl get, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get

## Issues Found
- The node condition command checked for `NetworkReady`, which is not the Kubernetes node condition used for network setup status. Changed it to `NetworkUnavailable`, matching the Kubernetes Node Status documentation.
- The post advised force-deleting old `kube-system` Calico pods during migration. Calico's official operator migration procedure warns not to edit or delete resources in `kube-system` during the migration because it can interfere with the upgrade. Replaced this with guidance to inspect TigeraStatus and operator logs first.
- The post advised deleting `kube-system` Calico pods to force operator takeover in a partial migration. Calico's official migration procedure says the operator cleans up `kube-system` resources after migration completes and no manual cleanup is required. Replaced the deletion command with diagnostic commands.
- The conclusion and rollback section implied a general operator rollback mechanism for manifest-to-operator migration. Official documentation for this migration path does not document that as a recovery mechanism, so the wording was changed to focus on backup-based restoration after deliberately abandoning the migration.

## Review Notes
The Installation `spec.calicoNetwork.ipPools` fields and `encapsulation: VXLAN` example are consistent with the Calico operator Installation API. `kubectl` was not installed in the local environment, so command behavior was checked against official Kubernetes CLI documentation rather than local `kubectl --help` output.
