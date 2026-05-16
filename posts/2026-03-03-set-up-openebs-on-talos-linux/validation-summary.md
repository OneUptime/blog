# Validation Summary: How to Set Up OpenEBS on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- OpenEBS
- Replicated PV Mayastor
- OpenEBS Local PV Hostpath
- Helm
- Kubernetes StorageClass, PersistentVolumeClaim, and Pod manifests
- Prometheus Operator ServiceMonitor

## Sources Consulted
- OpenEBS 4.4 Installation documentation: https://openebs.io/docs/quickstart-guide/installation
- OpenEBS Replicated PV Mayastor prerequisites: https://openebs.io/docs/quickstart-guide/prerequisites
- OpenEBS Replicated PV Mayastor installation on Talos: https://openebs.io/docs/Solutioning/openebs-on-kubernetes-platforms/talos
- OpenEBS Replicated PV Mayastor DiskPool documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-create-diskpool
- OpenEBS Replicated PV Mayastor StorageClass documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-create-storageclass
- OpenEBS Local PV Hostpath documentation: https://openebs.io/docs/user-guides/local-storage-user-guide/local-pv-hostpath/hostpath-overview
- OpenEBS Local PV Hostpath StorageClass documentation: https://openebs.io/docs/user-guides/local-storage-user-guide/local-pv-hostpath/configuration/hostpath-create-storageclass
- OpenEBS Local PV Helm chart values: https://github.com/openebs/dynamic-localpv-provisioner/blob/v4.2.0/deploy/helm/charts/values.yaml
- OpenEBS unified Helm chart values: https://github.com/openebs/openebs/blob/helm-testing/release/4.4/charts/values.yaml
- Talos Kubernetes storage documentation: https://docs.siderolabs.com/kubernetes-guides/csi/storage

## Issues Found
- The Talos setup omitted the OpenEBS namespace Pod Security exemption required for Replicated PV Mayastor on Talos. Added the control-plane configuration snippet.
- The Mayastor worker config used kernel module entries and missed the required `openebs.io/engine=mayastor` node label. Replaced it with the current Talos/OpenEBS worker patch guidance and kept the HugePages setting.
- The Mayastor data mount used `/var/local/openebs`, while current OpenEBS/Talos guidance mounts `/var/local` for Mayastor component hostpaths. Updated the mount and added `rw`.
- The command used `talosctl apply-config` with a partial machine config. Changed it to `talosctl patch --mode=no-reboot machineconfig --patch @worker-openebs.yaml` and added the kubelet restart note required after changing HugePages.
- The Helm values used stale OpenEBS keys such as `mayastor.enabled`, `mayastor.agents.node`, `localProvisioner`, `jivaOperator`, and `cstor`. Updated them to OpenEBS 4.x chart keys under `engines`, `mayastor.csi.node.initContainers`, `mayastor.io_engine.resources`, and `localpv-provisioner`.
- The DiskPool examples used `openebs.io/v1beta2` and unstable `/dev/sdb` paths. Updated the CRD API to `openebs.io/v1beta3` and changed examples to persistent `/dev/disk/by-id/...` URIs.
- The Mayastor StorageClass included undocumented/stale parameters `ioTimeout` and `local`. Removed them and kept the current documented `protocol` and `repl` parameters.
- The Local PV StorageClass used `parameters.hostpath`, which is not the documented OpenEBS Local PV Hostpath configuration. Replaced it with the required `cas.openebs.io/config` annotation containing `StorageType` and `BasePath`.
- The Mayastor monitoring commands referenced `mayastorvolumes`, which is not the current documented way to inspect volumes. Updated them to use the OpenEBS Mayastor kubectl plugin commands.
- The ServiceMonitor selector used a generic label that does not match the current Mayastor metrics exporter service. Updated it to select `app=metrics-exporter-io-engine`.
- The troubleshooting log selector used a stale agent label. Updated it to the current `app=agent-core` label.
- The summary still mentioned iSCSI/Jiva as a key Talos setup requirement. Replaced that with the current Talos-specific OpenEBS requirements.

## Review Notes
- The post now targets current OpenEBS 4.x behavior. Readers using OpenEBS 3.x would need different Helm repository and chart keys.
- Helm and kubectl were not available in the local environment, so command behavior was validated against official documentation and chart source rather than by deploying a live cluster.
