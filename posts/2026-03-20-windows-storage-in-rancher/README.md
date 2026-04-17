# How to Configure Windows Storage in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Windows Storage, Persistent Volume, SMB, CSI Driver, Kubernetes

Description: Configure persistent storage for Windows containers in Rancher using SMB CSI driver, hostPath volumes, and Windows-compatible StorageClasses.

## Introduction

Windows containers have different storage requirements than Linux containers. Not all CSI drivers support Windows, and volume types that work on Linux (such as NFS) may not be natively supported. This guide covers the available storage options for Windows workloads in Rancher.

## Step 1: Install the SMB CSI Driver

SMB is the recommended persistent storage option for Windows containers:

```bash
# Install SMB CSI driver on the cluster (runs on Linux control plane)

helm repo add csi-driver-smb https://raw.githubusercontent.com/kubernetes-csi/csi-driver-smb/master/charts
helm install csi-driver-smb csi-driver-smb/csi-driver-smb \
  --namespace kube-system \
  --set windows.enabled=true \
  --set linux.enabled=false
```

## Step 2: Create an SMB Secret

```bash
# Create secret with SMB server credentials
kubectl create secret generic smb-credentials \
  --from-literal=username=smbuser \
  --from-literal=password=smbpassword \
  -n production
```

## Step 3: Create an SMB StorageClass

```yaml
# smb-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: smb-storage
provisioner: smb.csi.k8s.io
parameters:
  source: "//smb-server.example.com/share"
  csi.storage.k8s.io/provisioner-secret-name: smb-credentials
  csi.storage.k8s.io/provisioner-secret-namespace: production
  csi.storage.k8s.io/node-stage-secret-name: smb-credentials
  csi.storage.k8s.io/node-stage-secret-namespace: production
reclaimPolicy: Delete
volumeBindingMode: Immediate
mountOptions:
  - dir_mode=0777
  - file_mode=0777
```

## Step 4: Create a PVC for Windows

```yaml
# windows-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: production
spec:
  accessModes:
    - ReadWriteMany    # SMB supports multiple readers/writers
  storageClassName: smb-storage
  resources:
    requests:
      storage: 20Gi
```

## Step 5: Mount Storage in Windows Pod

```yaml
# windows-deployment.yaml
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
    - name: app
      image: myregistry/windows-app:latest
      volumeMounts:
        - name: app-data
          mountPath: 'C:\app\data'    # Windows path notation (quoted for YAML)
  volumes:
    - name: app-data
      persistentVolumeClaim:
        claimName: app-data
```

## Step 6: Use hostPath for Local Storage

For non-shared local storage:

```yaml
spec:
  containers:
    - name: app
      volumeMounts:
        - name: local-data
          mountPath: 'C:\app\local'
  volumes:
    - name: local-data
      hostPath:
        path: 'C:\kubernetes\data'    # Path on the Windows worker node
        type: DirectoryOrCreate
```

## Storage Options Comparison

| Storage Type | Multi-Node | Windows Native | Notes |
|---|---|---|---|
| SMB/CIFS | Yes | Yes | Best option for shared storage |
| hostPath | No | Yes | Single-node only |
| Azure Disk | No | Yes | Azure-specific |
| Azure Files | Yes | Yes | SMB-based, Azure-specific |
| NFS | Yes | Limited | Requires Windows NFS client |

## Conclusion

SMB is the most reliable shared storage option for Windows containers in Rancher. The SMB CSI driver integrates seamlessly with Kubernetes PVC provisioning while leveraging Windows' native SMB support. For workloads that don't need shared access, hostPath volumes are simpler but limit pod scheduling to specific nodes.
