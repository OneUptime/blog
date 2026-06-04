# Validation Summary: How to Use Data Encryption at Rest for StatefulSet Persistent Volumes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StatefulSets, Services, StorageClasses, PersistentVolumes, PersistentVolumeClaims, Secrets, CronJobs, and RBAC
- AWS EBS CSI Driver and AWS KMS encryption
- Google Kubernetes Engine Persistent Disk CSI Driver and CMEK
- Azure Disk CSI Driver and Disk Encryption Sets
- Linux LUKS / dm-crypt encryption patterns
- HashiCorp Vault Agent Injector for Kubernetes
- PostgreSQL pgcrypto
- AWS CLI for EBS volume inspection and replacement volume creation
- jq, openssl, and shred command-line utilities

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolume API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-v1/
- Kubernetes Pod API reference for volumeDevices: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes CSI storage class secrets documentation: https://kubernetes-csi.github.io/docs/secrets-and-credentials-storage-class.html
- Amazon EKS StorageClass documentation for EBS CSI encryption parameters: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- AWS Storage Blog example for EBS CSI gp3 parameters: https://aws.amazon.com/blogs/storage/simplifying-amazon-ebs-volume-migration-and-modification-using-the-ebs-csi-driver/
- Google Cloud GKE CMEK documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/using-cmek
- Azure AKS Disk CSI storage provisioning documentation: https://learn.microsoft.com/en-us/azure/aks/azure-csi-disk-storage-provision
- Azure AKS Disk CSI driver documentation: https://learn.microsoft.com/en-us/azure/aks/azure-disk-csi
- HashiCorp Vault Agent Injector documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector
- HashiCorp Vault Agent Injector annotations reference: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- PostgreSQL pgcrypto documentation: https://www.postgresql.org/docs/current/pgcrypto.html
- AWS CLI describe-volumes command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-volumes.html

## Issues Found
- PostgreSQL was described as supporting Transparent Data Encryption. Updated the explanation to say PostgreSQL commonly uses pgcrypto for column-level encryption rather than built-in TDE.
- The Azure Disk CSI StorageClass included an `encrypted: "true"` parameter. Removed it because Azure managed disks are encrypted at rest by default, and the documented CSI parameter for customer-managed keys is `diskEncryptionSetID`.
- The StatefulSet examples referenced `serviceName` values without defining matching headless Services. Added headless Service manifests so the StatefulSet examples match Kubernetes StatefulSet requirements.
- The LUKS example attempted to mount a PVC as `/dev/nvme1n1`, format it in an init container, and expose a hostPath-mounted mapper device to the main container. Replaced this with the correct Kubernetes guidance: use a CSI driver or storage operator that performs LUKS in the node staging/publishing path, with CSI node-stage secret parameters where supported.
- The Vault example mixed a Vault Agent ConfigMap with annotation-based injection and manually mounted `/vault/secrets`, which conflicts with the injector behavior. Simplified it to the documented annotation-based injection pattern and let Vault Agent Injector create the shared secrets volume.
- The monitoring CronJob used a service account without RBAC, assumed `amazon/aws-cli` contained `kubectl` and `jq`, read the deprecated in-tree `.spec.awsElasticBlockStore.volumeID` field, and relied on a single StorageClass name. Added RBAC, changed the image to a custom image placeholder that must include `aws`, `kubectl`, and `jq`, selected StorageClasses by documented encryption parameters, and updated the PV query to read CSI EBS `volumeHandle`.
- The compliance script relied on StorageClass names containing `encrypted`, which missed the GCP and Azure examples, could fail on null storageClassName values, and divided by zero when there were no PVCs. Updated it to build the encrypted StorageClass list from provider encryption parameters, count PVCs against that list, and handle empty clusters.
- The key rotation section implied complete automatic key rotation. Reworded it to describe creating replacement EBS volumes as part of a controlled storage migration.

## Review Notes
- The LUKS StorageClass example is intentionally driver-specific because Kubernetes does not define a universal LUKS StorageClass parameter. Users must verify the encryption parameter names in the selected CSI driver's documentation.
- The monitoring CronJob still requires AWS credentials or workload identity, and the custom image must include AWS CLI, kubectl, and jq.
- The AWS, GCP, and Azure StorageClass examples are current for CSI-based dynamic provisioning, but cloud-provider encryption behavior also depends on IAM/KMS permissions and regional key configuration.
