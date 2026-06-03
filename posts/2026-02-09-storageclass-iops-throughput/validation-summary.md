# Validation Summary: How to Configure Storage Class Parameters for IOPS and Throughput Tuning

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes StorageClass and PersistentVolumeClaim resources
- AWS EBS CSI Driver and EBS gp3/io2/st1 volume performance
- Azure Disk CSI Driver, Premium SSD v2, Ultra Disk, and Premium SSD
- Google Kubernetes Engine Persistent Disk CSI Driver and Persistent Disk performance
- NetApp Trident with ONTAP QoS-backed storage pools
- Pure Storage through Portworx CSI
- Longhorn StorageClass parameters
- fio benchmarking in Kubernetes Jobs

## Sources Consulted
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StorageClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/storage-class-v1/
- Amazon EBS gp3 volume documentation: https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html
- Amazon EBS Provisioned IOPS SSD documentation: https://docs.aws.amazon.com/ebs/latest/userguide/provisioned-iops.html
- Amazon EKS StorageClass parameter reference: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- Azure Disk CSI driver documentation for AKS: https://learn.microsoft.com/en-us/azure/aks/azure-disk-csi
- Azure Disk CSI driver parameter reference: https://learn.microsoft.com/en-us/azure/aks/azure-csi-disk-storage-provision
- GKE Compute Engine Persistent Disk CSI driver documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- Google Cloud Persistent Disk performance documentation: https://docs.cloud.google.com/compute/docs/disks/performance
- Google Cloud Extreme Persistent Disk documentation: https://docs.cloud.google.com/compute/docs/disks/extreme-persistent-disk
- NetApp Trident StorageClass and ONTAP backend documentation: https://docs.netapp.com/us-en/trident/trident-use/trident-fsx-storageclass-pvc.html
- NetApp Trident ONTAP SAN configuration examples: https://docs.netapp.com/us-en/trident/trident-use/ontap-san-examples.html
- Portworx CSI StorageClass reference: https://docs.portworx.com/portworx-csi/reference/storage-class
- Longhorn StorageClass parameters documentation: https://longhorn.io/docs/latest/references/storage-class-parameters/

## Issues Found
- AWS gp3 limits were outdated. The post described 16,000 IOPS and 1,000 MB/s as maximum gp3 settings, but current EBS gp3 documentation lists up to 80,000 IOPS and 2,000 MiB/s when requirements are met. Updated comments to avoid claiming the example values are maximums.
- AWS io2 limits were incomplete. Updated the io2 comment to note io2 Block Express support for up to 256,000 IOPS on Nitro-based instances.
- EBS pricing comments were too specific and did not distinguish included gp3 baseline performance from chargeable extra IOPS and throughput. Reworded these as region-dependent cost considerations.
- Azure Premium SSD v2 omitted `cachingMode: None`. Azure documents that Premium SSD v2 and Ultra Disk only support `None` caching, so the Premium SSD v2 StorageClass now sets it explicitly.
- GCP balanced Persistent Disk throughput was off by two orders of magnitude. Changed the regional balanced PD comment from 28 MB/s per GB to 0.28 MiB/s per GiB and noted VM limits.
- GCP Extreme Persistent Disk limits were outdated or oversimplified. Updated the comment to use the current 2,500-120,000 IOPS range and avoid a single fixed throughput claim.
- NetApp Trident examples placed `qosPolicy` and `adaptiveQosPolicy` directly in StorageClass parameters. Trident applies those in backend or storage-pool defaults, while StorageClasses select eligible pools. Updated the StorageClasses to use `selector` and comments explaining the backend or storage-pool requirement.
- Pure Storage examples used retired `pure-csi`/PSO-style parameters. Replaced them with current Portworx CSI examples using `pxd.portworx.com`, `pure_block`, `max_iops`, and `max_bandwidth`.
- Longhorn example specified an old `engineImage` StorageClass parameter that is not part of current Longhorn StorageClass parameters. Removed the invalid engine image override.

## Review Notes
The examples are syntactically valid YAML. Actual achievable IOPS and throughput still depend on cloud region, disk size, node or VM instance limits, CSI driver version, cluster topology, and provider quotas.
