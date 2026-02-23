# How to Create Kubernetes PersistentVolumes with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, PersistentVolumes, Storage, Infrastructure as Code

Description: How to create and manage Kubernetes PersistentVolumes with Terraform for providing durable storage to your cluster workloads.

---

PersistentVolumes (PVs) are the storage resources in a Kubernetes cluster. They represent a piece of storage that has been provisioned by an administrator or dynamically provisioned using StorageClasses. PVs exist independently of any pod, so data survives pod restarts and rescheduling. Managing PVs through Terraform is particularly useful when you need to pre-provision specific storage resources or when you want your storage infrastructure defined alongside your compute resources.

This guide covers creating PersistentVolumes with Terraform, including different storage backends, access modes, and reclaim policies.

## Provider Configuration

```hcl
# providers.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}
```

## Understanding PersistentVolume Concepts

Before diving into code, let's clarify some key concepts:

- **PersistentVolume (PV)** - A cluster-level storage resource. Think of it as a physical disk.
- **PersistentVolumeClaim (PVC)** - A request for storage by a pod. Think of it as a request to use a disk.
- **StorageClass** - Defines how storage is dynamically provisioned. It is the "type" of storage.
- **Access Modes** - How the volume can be mounted (ReadWriteOnce, ReadOnlyMany, ReadWriteMany).
- **Reclaim Policy** - What happens to the PV when the PVC is deleted (Retain, Delete, Recycle).

## Basic PersistentVolume with HostPath

HostPath PVs use storage on the node's local filesystem. These are useful for development and testing but not recommended for production since data is tied to a specific node.

```hcl
# pv_hostpath.tf - PersistentVolume using node local storage
resource "kubernetes_persistent_volume" "local_storage" {
  metadata {
    name = "local-pv-01"

    labels = {
      type       = "local"
      managed-by = "terraform"
    }
  }

  spec {
    capacity = {
      storage = "10Gi"
    }

    access_modes = ["ReadWriteOnce"]

    # Retain the data when the PVC is deleted
    persistent_volume_reclaim_policy = "Retain"

    storage_class_name = "local-storage"

    persistent_volume_source {
      host_path {
        path = "/mnt/data/pv-01"
        type = "DirectoryOrCreate"
      }
    }

    # Restrict to a specific node
    node_affinity {
      required {
        node_selector_term {
          match_expressions {
            key      = "kubernetes.io/hostname"
            operator = "In"
            values   = ["worker-node-01"]
          }
        }
      }
    }
  }
}
```

## PersistentVolume with NFS

NFS volumes can be shared across multiple nodes and pods, making them suitable for shared storage needs.

```hcl
# pv_nfs.tf - NFS-backed PersistentVolume
resource "kubernetes_persistent_volume" "nfs_share" {
  metadata {
    name = "nfs-pv"

    labels = {
      type = "nfs"
    }
  }

  spec {
    capacity = {
      storage = "50Gi"
    }

    # NFS supports ReadWriteMany - multiple pods can write simultaneously
    access_modes = ["ReadWriteMany"]

    persistent_volume_reclaim_policy = "Retain"

    storage_class_name = "nfs"

    persistent_volume_source {
      nfs {
        server    = "nfs-server.internal.example.com"
        path      = "/exports/kubernetes/shared"
        read_only = false
      }
    }

    # Mount options for the NFS client
    mount_options = [
      "hard",
      "nfsvers=4.1",
      "rsize=1048576",
      "wsize=1048576",
    ]
  }
}
```

## PersistentVolume with GCE Persistent Disk

For GKE clusters, you can create PVs backed by GCE persistent disks.

```hcl
# First create the GCE disk
resource "google_compute_disk" "data_disk" {
  name = "k8s-data-disk"
  type = "pd-ssd"
  zone = "us-central1-a"
  size = 100  # GB

  labels = {
    environment = "production"
  }
}

# Then create the PV pointing to it
resource "kubernetes_persistent_volume" "gce_pv" {
  metadata {
    name = "gce-pd-pv"
  }

  spec {
    capacity = {
      storage = "100Gi"
    }

    access_modes                     = ["ReadWriteOnce"]
    persistent_volume_reclaim_policy = "Retain"
    storage_class_name               = "ssd"

    persistent_volume_source {
      gce_persistent_disk {
        pd_name   = google_compute_disk.data_disk.name
        fs_type   = "ext4"
        read_only = false
      }
    }
  }
}
```

## PersistentVolume with AWS EBS

For EKS clusters, use AWS EBS volumes.

```hcl
# Create an EBS volume
resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = 50
  type              = "gp3"
  iops              = 3000
  throughput        = 125

  tags = {
    Name = "k8s-data-volume"
  }
}

# Create the PV pointing to the EBS volume
resource "kubernetes_persistent_volume" "ebs_pv" {
  metadata {
    name = "ebs-pv"
  }

  spec {
    capacity = {
      storage = "50Gi"
    }

    access_modes                     = ["ReadWriteOnce"]
    persistent_volume_reclaim_policy = "Retain"
    storage_class_name               = "gp3"

    persistent_volume_source {
      aws_elastic_block_store {
        volume_id = aws_ebs_volume.data.id
        fs_type   = "ext4"
      }
    }

    # EBS volumes are zone-specific
    node_affinity {
      required {
        node_selector_term {
          match_expressions {
            key      = "topology.kubernetes.io/zone"
            operator = "In"
            values   = ["us-east-1a"]
          }
        }
      }
    }
  }
}
```

## StorageClass for Dynamic Provisioning

In most cases, you will use StorageClasses for dynamic provisioning instead of manually creating PVs. The StorageClass tells Kubernetes how to create PVs on demand when a PVC is created.

```hcl
# storageclass.tf - Define storage classes for dynamic provisioning
resource "kubernetes_storage_class" "ssd" {
  metadata {
    name = "fast-ssd"

    annotations = {
      # Make this the default storage class
      "storageclass.kubernetes.io/is-default-class" = "true"
    }
  }

  # GKE provisioner
  storage_provisioner = "pd.csi.storage.gke.io"

  reclaim_policy      = "Delete"
  volume_binding_mode = "WaitForFirstConsumer"
  allow_volume_expansion = true

  parameters = {
    type = "pd-ssd"
  }
}

resource "kubernetes_storage_class" "standard" {
  metadata {
    name = "standard-hdd"
  }

  storage_provisioner = "pd.csi.storage.gke.io"

  reclaim_policy      = "Delete"
  volume_binding_mode = "WaitForFirstConsumer"
  allow_volume_expansion = true

  parameters = {
    type = "pd-standard"
  }
}
```

## Creating Multiple PVs with for_each

```hcl
# multiple_pvs.tf - Create several PVs from configuration
variable "persistent_volumes" {
  type = map(object({
    capacity   = string
    host_path  = string
    node       = string
  }))
  default = {
    "pv-data-01" = {
      capacity  = "20Gi"
      host_path = "/mnt/data/vol-01"
      node      = "worker-01"
    }
    "pv-data-02" = {
      capacity  = "20Gi"
      host_path = "/mnt/data/vol-02"
      node      = "worker-02"
    }
    "pv-data-03" = {
      capacity  = "50Gi"
      host_path = "/mnt/data/vol-03"
      node      = "worker-03"
    }
  }
}

resource "kubernetes_persistent_volume" "volumes" {
  for_each = var.persistent_volumes

  metadata {
    name = each.key

    labels = {
      managed-by = "terraform"
    }
  }

  spec {
    capacity = {
      storage = each.value.capacity
    }

    access_modes                     = ["ReadWriteOnce"]
    persistent_volume_reclaim_policy = "Retain"
    storage_class_name               = "local-storage"

    persistent_volume_source {
      host_path {
        path = each.value.host_path
        type = "DirectoryOrCreate"
      }
    }

    node_affinity {
      required {
        node_selector_term {
          match_expressions {
            key      = "kubernetes.io/hostname"
            operator = "In"
            values   = [each.value.node]
          }
        }
      }
    }
  }
}
```

## Access Modes Explained

| Mode | Short | Description |
|------|-------|-------------|
| ReadWriteOnce | RWO | One node can mount read-write |
| ReadOnlyMany | ROX | Many nodes can mount read-only |
| ReadWriteMany | RWX | Many nodes can mount read-write |
| ReadWriteOncePod | RWOP | One pod can mount read-write (K8s 1.22+) |

Not all storage backends support all access modes. NFS supports RWX, while cloud block storage (EBS, GCE PD) typically only supports RWO.

## Monitoring Storage

Storage issues can bring down your applications silently. Watch for PVs approaching capacity, PVs stuck in "Released" state (meaning a PVC was deleted but the PV was not reclaimed), and I/O latency on your volumes. [OneUptime](https://oneuptime.com) can monitor application health indicators that correlate with storage problems, like increasing response times or error rates.

## Summary

PersistentVolumes in Terraform let you define your storage infrastructure as code. For most production clusters, you will want StorageClasses for dynamic provisioning rather than manually creating individual PVs. Pre-provisioned PVs make sense for specific use cases like local SSD storage, pre-existing NFS shares, or when you need fine-grained control over the underlying storage. Always set the reclaim policy to `Retain` for important data, and use node affinity to ensure zone-specific volumes are bound to the right nodes.

For the consumer side of storage, see [Kubernetes PersistentVolumeClaims with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-kubernetes-persistentvolumeclaims-with-terraform/view).
