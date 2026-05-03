# How to Create Persistent Volumes in Portainer via Manifest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Persistent Volume, Storage, DevOps

Description: Learn how to create Kubernetes Persistent Volumes using YAML manifests in Portainer for static storage provisioning.

## Static vs. Dynamic Provisioning

- **Dynamic provisioning** (recommended): A StorageClass automatically creates PVs when a PVC is created.
- **Static provisioning**: An administrator manually creates PVs, then PVCs are bound to them.

This guide covers static provisioning via manifests in Portainer. Use this when you have pre-existing storage (NFS shares, local SSDs) to allocate.

## Creating a Persistent Volume

1. In Portainer, use the **kubectl** shell or the YAML manifest editor.
2. Apply the PV manifest.

## NFS Persistent Volume Example

```yaml
# NFS-backed Persistent Volume

apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv-01
  labels:
    storage-type: nfs
    environment: production
spec:
  capacity:
    storage: 50Gi              # Total storage capacity
  accessModes:
    - ReadWriteMany            # Allows multiple pods to mount simultaneously
  persistentVolumeReclaimPolicy: Retain  # Keep data after PVC is deleted
  storageClassName: manual     # Must match PVC's storageClassName
  nfs:
    path: /exports/k8s-data    # NFS export path on the server
    server: 192.168.1.100      # NFS server IP
```

## Local Storage Persistent Volume

```yaml
# Local storage PV for high-performance workloads
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-pv-ssd-01
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteOnce            # Single node only
  persistentVolumeReclaimPolicy: Retain  # Local volumes only support Retain
  storageClassName: local-ssd
  local:
    path: /mnt/disks/ssd1     # Path on the specific node
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values:
                - worker-node-01  # The node with the local disk
```

## Matching PVC to a Static PV

Create a PVC that binds to the static PV:

```yaml
# PVC that binds to the NFS PV
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-data-claim
  namespace: production
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: manual    # Must match the PV's storageClassName
  resources:
    requests:
      storage: 20Gi           # Must be <= PV capacity
```

## Applying via CLI

```bash
# Create the PV
kubectl apply -f nfs-pv.yaml

# Create the PVC
kubectl apply -f nfs-pvc.yaml

# Check binding status (PVC should show "Bound")
kubectl get pv nfs-pv-01
kubectl get pvc nfs-data-claim --namespace=production
```

## Reclaim Policies

| Policy | Behavior After PVC Deletion |
|--------|---------------------------|
| `Retain` | PV kept with data intact (manual cleanup needed) |
| `Delete` | PV and underlying storage automatically deleted |
| `Recycle` | Data wiped, PV made available again (deprecated) |

## Conclusion

Static PV provisioning in Portainer via YAML manifests gives you precise control over pre-existing storage resources. For new deployments, prefer dynamic provisioning with StorageClasses to avoid manual PV management.
