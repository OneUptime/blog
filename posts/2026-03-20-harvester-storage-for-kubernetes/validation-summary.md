# Validation Summary: How to Set Up Harvester Storage for Kubernetes - For

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Harvester
- Kubernetes
- Harvester CSI Driver
- Longhorn
- Helm
- RKE2
- K3s
- cloud-init
- iSCSI / open-iscsi
- PostgreSQL
- Kubernetes Volume Snapshots

## Sources Consulted
- Harvester CSI Driver documentation: https://docs.harvesterhci.io/v1.7/rancher/csi-driver/
- Harvester CSI driver helper script: https://github.com/harvester/harvester-csi-driver/blob/master/deploy/generate_addon_csi.sh
- Harvester CSI chart sources: https://github.com/harvester/charts/tree/master/charts/harvester-csi-driver
- Longhorn installation requirements: https://longhorn.io/docs/latest/deploy/install/
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes external-snapshotter project: https://github.com/kubernetes-csi/external-snapshotter
- SUSE Virtualization Harvester CSI driver snapshot notes: https://documentation.suse.com/cloudnative/virtualization/v1.8/en/integrations/rancher/csi-driver.html

## Issues Found
- The manual install flow was incorrect. The post created a guest-cluster secret from the Harvester kubeconfig, but the current Harvester-documented flow uses `generate_addon_csi.sh` to create the host-side service account and RBAC, then generate the `cloud-provider-config` and cloud-init output consumed by the CSI driver. I replaced the section with the official workflow.
- The guest-node preparation order was wrong for iSCSI. Longhorn requires `iscsi_tcp` to be loaded before `iscsid` starts. I reordered the cloud-init commands accordingly and changed the module file write to overwrite instead of append.
- The Helm install example used the wrong namespace and an incorrect value name/path. Current Harvester documentation and chart sources use `kube-system`, and the chart reads `cloudConfig.hostPath` rather than `cloudConfigPath`. I corrected the install and verification examples.
- The expected pod names were outdated. The current chart deploys controller pods named like `harvester-csi-driver-controllers-*` and daemonset pods named like `harvester-csi-driver-*`. I updated the example output.
- The StorageClass section was outdated. The current chart creates a default `harvester` StorageClass with volume expansion enabled, so the extra patch step was unnecessary and potentially misleading. I updated the section to reflect the chart’s current behavior.
- The PVC verification commands were inaccurate. The original post attempted to grep for a placeholder string on the Harvester cluster. I replaced that with a verification flow that reads the CSI volume ID from the guest cluster and matches it against the backing PVC created on the Harvester cluster.
- The PostgreSQL example was incomplete and would not apply cleanly as written because the `production` namespace, `postgres-secret`, and governing Service were missing. I added those required resources so the example is runnable.
- The snapshot section was outdated and incomplete. It installed only snapshot CRDs from the moving `main` branch and then created a custom `VolumeSnapshotClass`, but the current Harvester CSI chart creates a default `harvester-snapshot` class and RKE2 already deploys the snapshot controller and CRDs by default. I updated the section to match the current documented behavior.

## Review Notes
- The post now reflects the current Harvester CSI driver documentation and chart behavior as of 2026-04-30.
- The workspace does not have a local `helm` binary installed, so chart behavior was validated against the official Harvester chart source and documentation rather than `helm show` output from the published repo.
