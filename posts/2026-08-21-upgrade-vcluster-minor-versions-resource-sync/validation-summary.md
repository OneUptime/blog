# Validation Summary: How to Upgrade vCluster Across Minor Versions Without Breaking Resource Sync

## Status

validated

## Post Type

Technical operations guide

## Technologies Covered

- vCluster 0.20 through 0.36 and the vCluster CLI
- Kubernetes and `kubectl`
- Helm and the vCluster Helm chart
- etcd 3.5 and 3.6
- vCluster snapshots and external database backups
- vCluster resource synchronization, translation, and custom resources
- Kubernetes Ingress and Gateway API status
- Persistent volumes and Velero or application-level backups

## Sources Consulted

- [vCluster: Upgrade vCluster](https://www.vcluster.com/docs/vcluster/manage/upgrade/upgrade-version)
- [vCluster: Lifecycle and supported versions](https://www.vcluster.com/docs/vcluster/manage/upgrade/supported_versions)
- [vCluster CLI: `vcluster upgrade`](https://www.vcluster.com/docs/vcluster/cli/vcluster_upgrade)
- [vCluster CLI: `vcluster create`](https://www.vcluster.com/docs/vcluster/cli/vcluster_create)
- [vCluster CLI: `vcluster connect`](https://www.vcluster.com/docs/vcluster/cli/vcluster_connect)
- [vCluster CLI: `vcluster snapshot create`](https://www.vcluster.com/docs/vcluster/cli/vcluster_snapshot_create)
- [vCluster CLI: `vcluster snapshot get`](https://www.vcluster.com/docs/vcluster/cli/vcluster_snapshot_get)
- [vCluster: Create snapshots](https://www.vcluster.com/docs/vcluster/manage/backup-restore/backup)
- [vCluster: Restore snapshots](https://www.vcluster.com/docs/vcluster/manage/backup-restore/restore)
- [vCluster: Safely upgrade etcd from 3.5 to 3.6](https://www.vcluster.com/docs/vcluster/learn-how-to/control-plane/container/safely-upgrade-etcd)
- [etcd: Upgrade etcd from 3.5 to 3.6](https://etcd.io/docs/v3.6/upgrades/upgrade_3_6/)
- [vCluster: Conversion guide from pre-v0.20 to v0.20](https://www.vcluster.com/docs/vcluster/reference/migrations/0-20-migration)
- [vCluster: Migrate from K3s to Kubernetes](https://www.vcluster.com/docs/vcluster/manage/upgrade/distro-migration)
- [vCluster: Migrate an etcd backing store](https://www.vcluster.com/docs/vcluster/manage/migrate-etcd-backing-store)
- [vCluster: Synchronization](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/)
- [vCluster: Sync resources to the control plane](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host)
- [vCluster: Sync resources from the control plane](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/)
- [vCluster: Sync ConfigMaps](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/core/config-maps)
- [vCluster: Sync Secrets](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/core/secrets)
- [vCluster: Sync custom resources to the control plane](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/advanced/custom-resources)
- [vCluster: Annotations and labels reference](https://www.vcluster.com/docs/vcluster/reference/annotations)
- [vCluster 0.36.0 release](https://github.com/loft-sh/vcluster/releases/tag/v0.36.0)
- [Helm: `helm get values`](https://helm.sh/docs/helm/helm_get_values/)
- [Kubernetes: API server health endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)
- [Kubernetes: `kubectl` quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/)
- [Kubernetes: `kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes: Ingress v1 API](https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/)
- [Gateway API: Troubleshooting and status](https://gateway-api.sigs.k8s.io/docs/concepts/troubleshooting/)
- [Gateway API: HTTPRoute](https://gateway-api.sigs.k8s.io/reference/api-types/httproute/)

## Issues Found

- The etcd prerequisite described an undocumented waiting period and did not distinguish vCluster-managed etcd from external databases. Replaced it with the documented staged upgrade requirement, the release-specific safe patch path for embedded or deployed etcd, and an etcd member-health check.
- The snapshot example implied that `vcluster snapshot get` waits for completion. Clarified that it must be re-run until the status is `Completed`, added the vCluster namespace to both snapshot commands, and scoped the workflow to a running K8s-distribution tenant with a supported backing store.
- The backup caveat mentioned persistent volumes but omitted other documented limitations. Added that cluster certificates are excluded and that external MySQL or PostgreSQL databases require native backups instead of the vCluster CLI snapshot and restore workflow.
- The sync canary could leave its ConfigMap unused, while default ConfigMap and Secret synchronization is usage-based. Changed it to a Pod that consumes both resources and added ConfigMaps and Secrets to the verification commands.
- The rollout log command required a manually substituted Pod name and could miss containers. Replaced it with the vCluster 0.36 chart's control-plane labels plus `--all-containers` and `--prefix`.
- The readiness example wrote a kubeconfig whose generated connection can rely on a live proxy process. Changed it to run the `/readyz` check through `vcluster connect -- kubectl`, which manages the connection for the duration of the command.
- The control-plane resource selector was too broad. Scoped it with the documented `vcluster.loft.sh/name` and `vcluster.loft.sh/namespace` labels so objects from other vClusters do not satisfy the canary check.
- The Event commands sorted on `lastTimestamp`, a legacy Event field that may be empty for newer events. Changed both commands to the Kubernetes-documented `.metadata.creationTimestamp` sort key.
- The synchronization wording assumed every counterpart is a name-translated host object and every import is strictly read-only. Reworded it for both sync directions and mapped namespaces, and documented the node `syncBackChanges` exception and custom-resource version selection rules.
- The Ingress check incorrectly grouped Gateway API conditions with Ingress status. Split the guidance so Ingress uses `.status.loadBalancer` and events, Routes use parent `Accepted` and `ResolvedRefs` conditions, and Gateways use `Accepted`, `Programmed`, addresses, and listener conditions.

## Review Notes

- The one-minor-at-a-time route, target-version CLI requirement, v0.20 configuration conversion, v0.33 K3s removal, and one-way K3s-to-K8s migration are accurate for vCluster 0.36.
- The CLI syntax was checked against the vCluster 0.36.0 binary, and the control-plane selectors were checked against a rendered vCluster 0.36.0 Helm chart and the official label reference.
- vCluster 0.34 and 0.33 are end-of-support as of the validation date, while vCluster 0.36 is stable. Operators starting on an older release should recheck the lifecycle page and obtain any required support guidance before entering an unsupported hop.
- Safe etcd patch floors are version-specific and may evolve. Operators should use the dedicated vCluster guide for the exact source version rather than copying a patch number from an unrelated upgrade path.
