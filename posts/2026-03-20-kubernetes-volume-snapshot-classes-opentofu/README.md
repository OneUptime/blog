# How to Create Kubernetes Volume Snapshot Classes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Volume Snapshot, OpenTofu, Storage, Backup, Infrastructure

Description: Learn how to create Kubernetes Volume Snapshot Classes with OpenTofu to enable on-demand and scheduled volume snapshots for persistent storage backup and recovery.

## Overview

Kubernetes Volume Snapshot Classes define the provisioner and deletion policy for volume snapshots, similar to how StorageClasses work for PVCs. OpenTofu can manage `VolumeSnapshotClass` and `VolumeSnapshot` resources, while the CSI snapshot controller handles snapshot creation and deletion.

## Step 1: Install the Snapshot Controller and Volume Snapshot CRDs

```hcl
# main.tf - Install the snapshot controller and CRDs if your cluster doesn't already provide them

resource "helm_release" "snapshot_controller" {
  name             = "snapshot-controller"
  repository       = "https://piraeus.io/helm-charts/"
  chart            = "snapshot-controller"
  namespace        = "kube-system"
  create_namespace = false
  version          = "5.0.3"
}
```

Apply this release first. The Kubernetes provider resolves custom resource schemas during planning, so the `VolumeSnapshot` CRDs must already exist before OpenTofu can plan `kubernetes_manifest` resources for `VolumeSnapshotClass` and `VolumeSnapshot`.

## Step 2: Create VolumeSnapshotClass for GKE (CSI Driver)

```hcl
# VolumeSnapshotClass for GKE persistent disks
resource "kubernetes_manifest" "gke_snapshot_class" {
  manifest = {
    apiVersion = "snapshot.storage.k8s.io/v1"
    kind       = "VolumeSnapshotClass"
    metadata = {
      name = "gke-pd-snapshot-class"
      # Set as default snapshot class
      annotations = {
        "snapshot.storage.kubernetes.io/is-default-class" = "true"
      }
    }
    driver          = "pd.csi.storage.gke.io"
    deletionPolicy  = "Delete"  # "Delete" or "Retain" snapshots

    parameters = {
      "storage-locations" = "us-central1"
    }
  }
}
```

## Step 3: Create VolumeSnapshotClass for AWS EBS

```hcl
# VolumeSnapshotClass for AWS EBS CSI driver
resource "kubernetes_manifest" "ebs_snapshot_class" {
  manifest = {
    apiVersion = "snapshot.storage.k8s.io/v1"
    kind       = "VolumeSnapshotClass"
    metadata = {
      name = "ebs-csi-snapshot-class"
      annotations = {
        "snapshot.storage.kubernetes.io/is-default-class" = "true"
      }
    }
    driver         = "ebs.csi.aws.com"
    deletionPolicy = "Retain"  # Retain snapshots even when VolumeSnapshot object is deleted

    parameters = {
      "tagSpecification_1" = "key=managed-by,value=opentofu"
    }
  }
}
```

## Step 4: Create a Volume Snapshot

```hcl
# Create an on-demand snapshot of a PVC using the default VolumeSnapshotClass for its CSI driver
resource "kubernetes_manifest" "database_snapshot" {
  manifest = {
    apiVersion = "snapshot.storage.k8s.io/v1"
    kind       = "VolumeSnapshot"
    metadata = {
      name      = "postgres-data-snapshot-initial"
      namespace = "production"
    }
    spec = {
      source = {
        persistentVolumeClaimName = "postgres-data-postgres-0"  # PVC name
      }
    }
  }
}
```

## Step 5: Restore PVC from Snapshot

```hcl
# Create a new PVC from a volume snapshot
resource "kubernetes_manifest" "restored_pvc" {
  manifest = {
    apiVersion = "v1"
    kind       = "PersistentVolumeClaim"
    metadata = {
      name      = "postgres-data-restored"
      namespace = "production"
    }
    spec = {
      accessModes = ["ReadWriteOnce"]
      resources = {
        requests = {
          storage = "50Gi"
        }
      }

      storageClassName = "premium-rwo"  # Use a StorageClass backed by the same CSI driver as the snapshot source

      dataSource = {
        name      = kubernetes_manifest.database_snapshot.manifest.metadata.name
        kind      = "VolumeSnapshot"
        apiGroup  = "snapshot.storage.k8s.io"
      }
    }
  }
}
```

## Summary

Kubernetes Volume Snapshot Classes with OpenTofu enable cloud-native backup for persistent storage. Use `deletionPolicy: Retain` for production snapshots that need independent lifecycle from the Kubernetes object. Combine with scheduled Jobs that create VolumeSnapshot resources for automated backups without external backup tools.
