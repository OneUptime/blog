# Validation Summary: How to Set Up Azure Container Storage for AKS with Local NVMe

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Container Storage version 1.x
- Local NVMe / Ephemeral Disk storage pools
- Azure Managed Disk storage pools
- Kubernetes StorageClasses, PersistentVolumeClaims, and StatefulSets
- Azure CLI and kubectl

## Sources Consulted
- Microsoft Learn: Quickstart: Use Azure Container Storage (version 1.x) with Azure Kubernetes Service - https://learn.microsoft.com/en-us/azure/storage/container-storage/container-storage-aks-quickstart-version-1
- Microsoft Learn: Tutorial: Install Azure Container Storage (version 1.x) for use with Azure Kubernetes Service - https://learn.microsoft.com/en-us/azure/storage/container-storage/install-container-storage-aks-version-1
- Microsoft Learn: Use Azure Container Storage (version 1.x) with local NVMe - https://learn.microsoft.com/en-us/azure/storage/container-storage/use-container-storage-with-local-disk-version-1
- Microsoft Learn: Use Azure Container Storage (version 1.x) with local NVMe replication - https://learn.microsoft.com/en-us/azure/storage/container-storage/use-container-storage-with-local-nvme-replication
- Microsoft Learn: Use Azure Container Storage (version 1.x) with Azure Managed Disks - https://learn.microsoft.com/en-us/azure/storage/container-storage/use-container-storage-with-managed-disks
- Microsoft Learn: Storage pool parameters for Azure Container Storage (version 1.x) - https://learn.microsoft.com/en-us/azure/storage/container-storage/container-storage-storage-pool-parameters
- Microsoft Learn: What is Azure Container Storage? - https://learn.microsoft.com/en-us/azure/storage/container-storage/container-storage-introduction
- Kubernetes documentation: StatefulSet basics and volumeClaimTemplates - https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The post used an older feature-flag and `az k8s-extension create` installation flow. Updated it to the documented Azure CLI `az aks update --enable-azure-container-storage ... --container-storage-version 1` flow because Azure Disk support requires Azure Container Storage version 1.x.
- The prerequisites listed Azure CLI 2.50 or newer. Updated this to Azure CLI 2.83.0 or newer to match current Microsoft documentation.
- The post implied Azure Container Storage v2 could be used for Azure Disk. Added a version note explaining that Azure Disk remains on the v1 path, while v2 supports local NVMe and Azure Elastic SAN.
- The NVMe persistent-volume example was missing the required persistent-volume opt-in for ephemeral storage. Added `--ephemeral-disk-volume-type PersistentVolumeWithAnnotation` to the install command and `acstor.azure.com/accept-ephemeral-storage: "true"` to the PVC template.
- The post manually created StorageClasses that Azure Container Storage creates automatically from storage pools. Replaced those manifests with a `kubectl get sc` verification step and updated workload `storageClassName` values to the generated `acstor-<storage-pool-name>` names.
- The NVMe StoragePool included a storage resource request that is not part of the documented local NVMe replication example. Removed that block and left the documented `ephemeralDisk.diskType` and `replicas` settings.
- Several commands used `storagepool` where Microsoft documentation commonly uses the `sp` short name. Updated verification and cleanup commands to use `kubectl get/describe/delete sp`.
- The PostgreSQL StatefulSet mounted the volume directly at the default data directory. Added `PGDATA=/var/lib/postgresql/data/pgdata` so initialization uses a subdirectory on the mounted volume.
- The StatefulSet examples referenced `serviceName` values without defining the corresponding headless Services. Added headless Service manifests for Redis and PostgreSQL and included them in cleanup.
- The cleanup command used extension deletion. Updated it to the documented `az aks update --disable-azure-container-storage all` approach.

## Review Notes
Azure Container Storage now has a split version story: version 2.x is the current major version for local NVMe and Azure Elastic SAN, while Azure Disk support requires version 1.x. Future revisions could consider replacing Azure Disk with Azure Elastic SAN if the goal is to use only the latest Azure Container Storage major version.
