# Validation Summary: How to Build OpenEBS Jiva Volumes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenEBS Jiva
- Kubernetes PersistentVolumes, PersistentVolumeClaims, StorageClasses, and StatefulSets
- Kubernetes CSI
- iSCSI
- Helm
- Prometheus alerting
- Velero backup and restore

## Sources Consulted
- OpenEBS 4.x installation documentation: https://openebs.io/docs/user-guides/installation
- OpenEBS 3.10 Jiva prerequisites: https://openebs.io/docs/3.10.x/user-guides/jiva/jiva-prerequisites
- OpenEBS 3.10 Jiva install and setup: https://openebs.io/docs/3.10.x/user-guides/jiva/jiva-install
- OpenEBS Jiva Helm chart repository documentation: https://openebs-archive.github.io/jiva-operator/
- OpenEBS Jiva operator policy documentation: https://github.com/openebs-archive/jiva-operator/blob/develop/docs/tutorials/policies.md
- OpenEBS legacy data engine deprecation announcement: https://github.com/openebs/openebs/issues/3709
- OpenEBS Jiva source metrics implementation: https://github.com/openebs-archive/jiva
- Velero CSI documentation: https://velero.io/docs/main/csi/
- Velero File System Backup documentation: https://velero.io/docs/main/file-system-backup/
- Velero install customization documentation: https://velero.io/docs/main/customize-installation/
- Velero AWS plugin releases: https://github.com/vmware-tanzu/velero-plugin-for-aws/releases

## Issues Found
- Jiva was presented as a current OpenEBS engine. Updated wording to identify it as a legacy engine and adjusted production recommendations toward current OpenEBS Replicated PV Mayastor and Local PV engines.
- The Helm repository and chart path used the current OpenEBS 4.x chart repo, which does not match the legacy Jiva workflow. Updated the commands to use the archived Jiva Helm repository and Jiva chart.
- The iSCSI setup omitted loading `iscsi_tcp`, which OpenEBS Jiva prerequisites include. Added `modprobe iscsi_tcp` and persistent module loading commands.
- The StorageClass mixed policy-based Jiva CSI configuration with an extra `replicaCount` parameter. Replaced it with the documented `jivaVolumePolicy` parameter and removed the incorrect table row.
- The anti-affinity example used a replica selector that did not match the Jiva policy documentation. Updated it to the documented `openebs.io/replica-anti-affinity` selector and softened the explanation.
- The monitoring section listed metrics that are not exported by the archived Jiva implementation. Replaced them with the Jiva registration metrics present in the source code and updated the example Prometheus alerts.
- The Velero section implied CSI snapshot backup support for Jiva. Updated it to use Velero File System Backup with the node agent and a current AWS plugin version.
- The cleanup command used the wrong Helm release name after correcting the install command. Updated it to uninstall `openebs-jiva`.

## Review Notes
The Jiva-specific material is technically useful for existing legacy Jiva environments, but readers should not treat it as the preferred path for new OpenEBS 4.x deployments.
