# Validation Summary: How to Set Up OpenEBS Local PV on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- OpenEBS Local PV Hostpath
- Kubernetes PersistentVolumes, PersistentVolumeClaims, and StorageClasses
- Helm
- StatefulSets and Kubernetes scheduling

## Sources Consulted
- OpenEBS Installation documentation: https://openebs.io/docs/main/quickstart-guide/installation
- OpenEBS Helm chart repository documentation: https://openebs.github.io/openebs/
- OpenEBS Local PV Hostpath overview: https://openebs.io/docs/user-guides/local-storage-user-guide/local-pv-hostpath/hostpath-overview
- OpenEBS Local PV Hostpath StorageClass documentation: https://openebs.io/docs/main/user-guides/local-storage-user-guide/local-pv-hostpath/configuration/hostpath-create-storageclass
- OpenEBS Local PV Device legacy documentation: https://openebs.io/docs/3.10.x/user-guides/localpv-device
- OpenEBS GitHub organization legacy engine notice: https://github.com/openebs
- Talos Linux machine configuration reference for kubelet extraMounts: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The post described OpenEBS Local PV Hostpath as a CSI driver. Current OpenEBS Hostpath uses the dynamic LocalPV provisioner with Kubernetes Local PersistentVolumes, so the wording was corrected.
- The Helm values used legacy keys such as `localprovisioner`, `ndm`, `ndmOperator`, `cstor`, and `jiva`, which do not match the current OpenEBS 4.x chart. The values were updated to use `localpv-provisioner`, `engines.*`, `loki.enabled`, and `alloy.enabled`.
- The post presented OpenEBS LocalPV Device and Node Disk Manager as current install targets. They were deprecated and migrated to the OpenEBS Archive in 2024, so the device workflow was replaced with guidance to use Hostpath, LVM, or ZFS for new OpenEBS 4.x installs.
- The custom StorageClass examples used plain `parameters.storageType` and `parameters.basePath`. Current OpenEBS Local PV Hostpath StorageClasses use the `cas.openebs.io/config` annotation, so both examples were corrected.
- The verification steps expected `openebs-device` and BlockDevice resources after installing the current OpenEBS chart. Those checks were removed because the corrected OpenEBS 4.x Hostpath-only install creates `openebs-hostpath`.
- The Talos setup did not create `/var/openebs/local` before binding it into the kubelet mount namespace. Commands were added to create the path on each worker before applying the machine config patch.
- The Elasticsearch scheduling example used `discovery.type: zen` with Elasticsearch 8.x, which is not valid. The example was changed to a neutral BusyBox workload because the section is demonstrating anti-affinity and `WaitForFirstConsumer`, not Elasticsearch cluster setup.

## Review Notes
- The local Helm, kubectl, and talosctl CLIs were not installed in the review environment, so command syntax was checked against official documentation and chart templates instead of local CLI help.
- OpenEBS Local PV Hostpath does not replicate data across nodes. The post correctly explains that workloads should handle their own replication or tolerate local-node availability constraints.
