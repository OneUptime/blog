# Validation Summary: How to Configure Azure Disk CSI on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux
- Azure Disk CSI Driver (`disk.csi.azure.com`)
- Kubernetes (StorageClass, PVC, CSIDriver)
- Helm
- Azure Managed Disks (Standard SSD, Premium SSD, Ultra Disk)
- Azure CLI (`az`)
- Azure IAM / Role assignments
- Kubernetes CSI external-snapshotter (VolumeSnapshotClass, VolumeSnapshot)

## Sources Consulted
- Azure Disk CSI driver project: https://github.com/kubernetes-sigs/azuredisk-csi-driver
- Azure Disk CSI driver Helm chart values: https://github.com/kubernetes-sigs/azuredisk-csi-driver/tree/master/charts
- Azure Disk CSI driver storage class parameters: https://github.com/kubernetes-sigs/azuredisk-csi-driver/blob/master/docs/driver-parameters.md
- Azure Managed Disks types documentation (Standard SSD, Premium SSD, Ultra Disk SKU names and caching constraints)
- Kubernetes CSI external-snapshotter: https://github.com/kubernetes-csi/external-snapshotter
- Kubernetes StorageClass v1 API (`storage.k8s.io/v1`)
- Kubernetes VolumeSnapshot v1 API (`snapshot.storage.k8s.io/v1`)
- Talos Linux documentation regarding kubelet path and CSI driver integration

## Issues Found
No technical issues found. Specifically verified:
- The `kubernetes-sigs/azuredisk-csi-driver` Helm repo URL and chart name are correct.
- Helm chart parameters (`controller.replicas`, `cloud=AzurePublicCloud`, `linux.distro=fedora`) are all valid keys in the chart's `values.yaml`.
- Azure disk SKU names (`StandardSSD_LRS`, `Premium_LRS`, `UltraSSD_LRS`) match Azure Managed Disk SKU identifiers.
- Ultra Disk-specific parameters (`diskIOPSReadWrite`, `diskMBpsReadWrite`, `logicalSectorSize`) are valid; `cachingMode: None` is correctly used since Ultra Disk does not support host caching.
- The three caching modes (`None`, `ReadOnly`, `ReadWrite`) and the guidance around them are consistent with Azure documentation.
- The snapshot CRD URLs reference the correct upstream `kubernetes-csi/external-snapshotter` paths.
- The `incremental: "true"` parameter for `VolumeSnapshotClass` is supported by the Azure Disk CSI driver.
- The required IAM actions for disks, VMs, and snapshots are accurate for the driver's needs.

## Review Notes
- The post pins Helm chart and snapshot CRD URLs to the `master` branch. For production reproducibility, readers may want to pin to a specific release tag, but using `master` is consistent with what the upstream README recommends for getting-started use.
- The node DaemonSet is described as running "on every worker node"; in practice the upstream chart tolerates standard control-plane taints and runs on control-plane nodes too. This is a minor framing nuance, not a technical error.
- `linux.distro=fedora` for Talos is a reasonable recommendation. Talos's filesystem layout is non-standard; the `fedora` value primarily affects iSCSI/host paths and is commonly suggested in Talos + Azure CSI guides. The default `debian` may also work in many setups.
- Ultra Disk requires the underlying VM size and availability zone to support Ultra Disk — readers should ensure their Talos node pool's VM SKU and zone enable Ultra Disk compatibility (the post's troubleshooting section already alludes to VM-size limits).
