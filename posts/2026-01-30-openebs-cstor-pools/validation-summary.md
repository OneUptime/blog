# Validation Summary: How to Build OpenEBS cStor Pools

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenEBS cStor
- Kubernetes
- Kubernetes CSI storage
- CStorPoolCluster and cStor CSI custom resources
- Helm
- iSCSI
- Kubernetes VolumeSnapshot API
- Prometheus / Prometheus Operator alerts
- Velero

## Sources Consulted
- OpenEBS cStor install and setup documentation: https://openebs.io/docs/3.6.x/user-guides/cstor
- OpenEBS cStor advanced operations documentation: https://openebs.io/docs/3.10.x/user-guides/cstor/advanced
- OpenEBS current migration guidance from legacy CStor to Replicated Storage: https://openebs.io/docs/4.4.x/user-guides/data-migration/migration-using-pv-migrate
- OpenEBS cStor CSI driver repository: https://github.com/openebs-archive/cstor-csi
- OpenEBS cStor operators Prometheus monitoring guide: https://github.com/openebs/cstor-operators/blob/develop/docs/tutorial/volumes/prometheus-monitoring.md
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes VolumeSnapshotClass documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Velero CSI snapshot documentation: https://velero.io/docs/main/csi/
- OpenEBS Velero plugin repository: https://github.com/openebs/velero-plugin

## Issues Found
- The post described cStor as the current production-grade OpenEBS storage engine. Current OpenEBS 4.x documentation focuses on Replicated Storage/Mayastor and includes migration guidance away from legacy CStor, so the wording was changed to identify cStor as a legacy OpenEBS engine for OpenEBS 3.x deployments.
- The Helm install command included extra values for NDM, LocalPV, and Mayastor that are not part of the official cStor install example. The command was reduced to the documented `--set cstor.enabled=true` install path.
- The CSPC examples included RAIDZ/RAIDZ2 guidance. Official CSPC-based cStor docs document `stripe` and `mirror` for `dataRaidGroupType`; RAIDZ/RAIDZ2 belong to older deprecated SPC-style examples. The RAIDZ example and table rows were replaced with a CSPC-specific note.
- Pool expansion guidance implied adding a single device works generally. The text now clarifies that the shown single-device addition applies to striped pools, while mirrored pools require adding a complete mirror raid group.
- The monitoring section used undocumented metric names such as `openebs_pool_status` and `openebs_pool_used_capacity_percent`. It was changed to use documented kubelet CSI volume metrics from the OpenEBS cStor monitoring guide, and the alert examples were updated accordingly.
- The summary and production recommendations still referenced RAIDZ for CSPC pools. Those references were removed or replaced with CSPC-valid stripe/mirror guidance.

## Review Notes
cStor remains technically useful for existing OpenEBS 3.x environments, but it should be presented as legacy for new deployments. Future revisions should consider a separate OpenEBS Replicated Storage/Mayastor guide for current OpenEBS 4.x clusters.
