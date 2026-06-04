# Validation Summary: How to Set Up OpenEBS for Container-Attached Storage in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PersistentVolumes, PersistentVolumeClaims, StorageClasses, StatefulSets, and VolumeSnapshots
- OpenEBS Local PV Hostpath
- OpenEBS Local PV LVM
- OpenEBS Replicated PV Mayastor
- Helm
- Prometheus and Grafana monitoring

## Sources Consulted
- OpenEBS Installation documentation: https://openebs.io/docs/4.3.x/quickstart-guide/installation
- OpenEBS Prerequisites documentation: https://openebs.io/docs/main/quickstart-guide/prerequisites
- OpenEBS Local PV Hostpath StorageClass documentation: https://openebs.io/docs/main/user-guides/local-storage-user-guide/local-pv-hostpath/configuration/hostpath-create-storageclass
- OpenEBS Local PV LVM StorageClass options: https://openebs.io/docs/main/user-guides/local-storage-user-guide/local-pv-lvm/configuration/lvm-storageclass-options
- OpenEBS Replicated Storage overview: https://openebs.io/docs/main/concepts/data-engines/replicated-storage
- OpenEBS Replicated PV Mayastor DiskPool documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-create-diskpool
- OpenEBS Replicated PV Mayastor StorageClass documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-create-storageclass
- OpenEBS Replicated PV Mayastor snapshot documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/advanced-operations/volume-snapshots
- OpenEBS Observability documentation: https://openebs.io/docs/main/user-guides/observability

## Issues Found
- The post used the legacy Helm repository `https://openebs.github.io/charts`. Updated it to the current OpenEBS Helm repository `https://openebs.github.io/openebs`.
- The post listed Jiva and cStor as the main replicated engines. Updated the overview to reflect current OpenEBS 4.x terminology: Local PV Hostpath, Local PV LVM/ZFS, and Replicated PV Mayastor.
- The post included the legacy `openebs-operator.yaml` kubectl installation path. Removed that alternative because current OpenEBS 4.x installation documentation uses the unified Helm chart.
- The Device LocalPV example used the legacy `openebs.io/local` device StorageClass pattern. Replaced it with the current Local PV LVM CSI StorageClass example using `local.csi.openebs.io`.
- The cStor pool and StorageClass examples used outdated CRDs and the `cstor.csi.openebs.io` provisioner. Replaced them with Mayastor `DiskPool` resources and a `io.openebs.csi-mayastor` StorageClass using `protocol: nvmf` and `repl: "3"`.
- The PVC, StatefulSet, snapshot, restore, monitoring, and expansion examples referred to cStor resource names and drivers. Updated them to use Mayastor resource names, snapshot class driver, and inspection commands.
- The monitoring example referenced a hard-coded cStor metrics port-forward. Replaced it with the documented OpenEBS monitoring Helm chart and Grafana access flow.

## Review Notes
The updated guide assumes OpenEBS 4.x. Replicated PV Mayastor has additional node prerequisites, including Mayastor node labels and huge pages, so the post now includes the required node label command but still does not fully enumerate every environment prerequisite.
