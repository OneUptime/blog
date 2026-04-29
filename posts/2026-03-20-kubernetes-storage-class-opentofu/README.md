# How to Configure Kubernetes Storage Classes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Storage Class, Persistent Volume, Infrastructure as Code, Cloud Native

Description: Learn how to create and manage Kubernetes StorageClasses using OpenTofu for dynamic persistent volume provisioning on AWS EBS, Azure Disk, and GCP Persistent Disk.

---

StorageClasses define the type of storage that can be dynamically provisioned for Kubernetes workloads. Without StorageClasses managed in code, teams end up with inconsistent storage configurations across clusters. OpenTofu lets you define and version-control your storage topology.

## Creating AWS EBS StorageClasses

```hcl
# providers.tf

terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 3.0"
    }
  }
}

provider "kubernetes" {
  host                   = var.cluster_endpoint
  cluster_ca_certificate = base64decode(var.cluster_ca_cert)
  token                  = var.cluster_token
}
```

## Standard GP3 StorageClass

```hcl
# storage_classes.tf
# GP3 SSD storage - good default for most workloads
resource "kubernetes_storage_class_v1" "gp3" {
  metadata {
    name = "gp3"
    annotations = {
      # Make this the default storage class
      "storageclass.kubernetes.io/is-default-class" = "true"
    }
  }

  # EBS CSI driver provisioner
  storage_provisioner = "ebs.csi.aws.com"

  # ReclaimPolicy: Delete removes the volume when the PVC is deleted
  reclaim_policy = "Delete"

  # WaitForFirstConsumer: delay binding until pod is scheduled (multi-AZ safe)
  volume_binding_mode = "WaitForFirstConsumer"

  allow_volume_expansion = true

  parameters = {
    type      = "gp3"
    encrypted = "true"
    # Optionally specify a KMS key
    # kmsKeyId = var.ebs_kms_key_arn
  }
}

# High-performance IO2 storage for databases
resource "kubernetes_storage_class_v1" "io2_database" {
  metadata {
    name = "io2-database"
  }

  storage_provisioner    = "ebs.csi.aws.com"
  reclaim_policy         = "Retain"  # Keep the volume when PVC is deleted
  volume_binding_mode    = "WaitForFirstConsumer"
  allow_volume_expansion = true

  parameters = {
    type      = "io2"
    iops      = "3000"
    encrypted = "true"
  }
}
```

## Azure Managed Disk StorageClasses

```hcl
# azure_storage.tf
# Premium SSD for production workloads
resource "kubernetes_storage_class_v1" "azure_premium_ssd" {
  metadata {
    name = "azure-premium-ssd"
    annotations = {
      "storageclass.kubernetes.io/is-default-class" = "true"
    }
  }

  storage_provisioner    = "disk.csi.azure.com"
  reclaim_policy         = "Delete"
  volume_binding_mode    = "WaitForFirstConsumer"
  allow_volume_expansion = true

  parameters = {
    skuName = "Premium_LRS"
    # Enable on-demand bursting for eligible Premium SSD disks
    enableBursting = "true"
  }
}

# Ultra Disk for extremely high IOPS requirements
resource "kubernetes_storage_class_v1" "azure_ultra_disk" {
  metadata {
    name = "azure-ultra-disk"
  }

  storage_provisioner    = "disk.csi.azure.com"
  reclaim_policy         = "Retain"
  volume_binding_mode    = "WaitForFirstConsumer"
  allow_volume_expansion = true

  parameters = {
    skuName           = "UltraSSD_LRS"
    cachingMode       = "None"
    diskIopsReadWrite = "2000"
    diskMbpsReadWrite = "200"
  }
}
```

## GCP Persistent Disk StorageClasses

```hcl
# gcp_storage.tf
# Standard PD-SSD for most workloads
resource "kubernetes_storage_class_v1" "gcp_ssd" {
  metadata {
    name = "pd-ssd"
    annotations = {
      "storageclass.kubernetes.io/is-default-class" = "true"
    }
  }

  storage_provisioner    = "pd.csi.storage.gke.io"
  reclaim_policy         = "Delete"
  volume_binding_mode    = "WaitForFirstConsumer"
  allow_volume_expansion = true

  parameters = {
    type = "pd-ssd"
  }
}

# Regional PD for multi-zone HA
resource "kubernetes_storage_class_v1" "gcp_regional_ssd" {
  metadata {
    name = "pd-ssd-regional"
  }

  storage_provisioner    = "pd.csi.storage.gke.io"
  reclaim_policy         = "Retain"
  volume_binding_mode    = "WaitForFirstConsumer"
  allow_volume_expansion = true

  parameters = {
    type               = "pd-ssd"
    "replication-type" = "regional-pd"
  }

  # Constrain which zones the regional persistent disk can be provisioned in
  allowed_topologies {
    match_label_expressions {
      key    = "topology.gke.io/zone"
      values = ["us-central1-a", "us-central1-b"]
    }
  }
}
```

## Best Practices

- Set `WaitForFirstConsumer` as the volume binding mode when using zone-aware storage to prevent pods from being scheduled in a different zone than their volume.
- Use `Retain` reclaim policy for database storage to prevent accidental data loss when a PVC is deleted.
- Enable volume expansion (`allow_volume_expansion = true`) when the CSI driver and storage backend support it, so you can increase volume size without recreating the PVC.
- Only mark one StorageClass as default during steady state - Kubernetes allows multiple defaults for migration, but a PVC without `storageClassName` uses the most recently created default.
- Use encrypted volumes in production by setting the encryption parameter - many compliance frameworks require this.
