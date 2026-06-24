# How to Configure Windows Storage in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Window, Storage, CSI, PersistentVolume

Description: Configure persistent storage for Windows containers in Rancher using local-path provisioner, iSCSI, and Windows-specific CSI drivers for stateful Windows workloads.

## Introduction

Storage for Windows containers in Kubernetes has specific requirements and limitations compared to Linux. Volume mounts use Windows paths, certain storage types are not supported, and CSI drivers must have Windows-compatible components. This guide covers configuring persistent storage for Windows workloads in Rancher.

## Prerequisites

- Rancher cluster with Windows worker nodes
- Storage infrastructure compatible with Windows nodes (SMB shares or cloud block storage)
- kubectl access with storage admin permissions
- For AWS EBS, IAM permissions for the EBS CSI driver

## Step 1: Understand Windows Volume Limitations

```text
Windows Container Storage Limitations:
- Volume mounts use Windows paths (C:\mountpath)
- No support for Linux file permissions/ownership (chmod/chown)
- NFS based storage/volume support not supported
- Volume subPath mounts not supported
- Memory-backed volumes (emptyDir medium: Memory) not supported
- Expanding the mounted volume filesystem (resizefs) not supported
- ReadWriteMany not supported for node-local storage

Common Windows-compatible volume options:
- emptyDir (disk-backed)
- hostPath
- SMB (via SMB CSI driver)
- AWS EBS (via Windows CSI driver)
- Azure Disk (via Windows CSI driver)
```

## Step 2: Use a Windows-Compatible CSI Driver

```text
Rancher's local-path-provisioner is documented for Linux-style paths and uses
Linux helper pods and shell scripts, so it is not a Windows storage solution.

For Windows worker nodes, use a CSI driver that provides Windows node support,
such as:
- AWS EBS for block storage on AWS
- SMB CSI driver for shared file storage
- Azure Disk on Azure
```

## Step 3: Create PVC for Windows Pod

```yaml
# windows-pvc.yaml - PVC for a Windows workload
# Uses the StorageClass created in Step 4
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: windows-app-data
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ebs-gp3-windows
  resources:
    requests:
      storage: 20Gi
---
# windows-deployment.yaml - Use PVC in a Windows pod
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-server-iis
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: windows-server-iis
  template:
    metadata:
      labels:
        app: windows-server-iis
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
        - name: windows-server-iis
          image: mcr.microsoft.com/windows/server:ltsc2022
          command:
            - powershell.exe
            - -command
            - "while ($true) { Start-Sleep -Seconds 3600 }"
          volumeMounts:
            - name: app-data
              mountPath: "C:\\data"
      volumes:
        - name: app-data
          persistentVolumeClaim:
            claimName: windows-app-data
```

## Step 4: Configure AWS EBS for Windows (Windows CSI Driver)

```bash
# Ensure the driver has AWS IAM permissions, and CSI Proxy is available on Windows nodes
kubectl apply -k "github.com/kubernetes-sigs/aws-ebs-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-1.59"

# Verify the driver pods and the Windows node daemonset
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-ebs-csi-driver
kubectl get daemonset ebs-csi-node-windows -n kube-system
```

```yaml
# windows-ebs-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-gp3-windows
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  # Format Windows volumes as NTFS
  fstype: ntfs
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

## Step 5: Configure SMB/CIFS Volumes

```bash
# SMB volume for shared Windows storage
# Requires csi-driver-smb installed

# Install SMB CSI driver
curl -skSL https://raw.githubusercontent.com/kubernetes-csi/csi-driver-smb/v1.20.1/deploy/install-driver.sh | bash -s v1.20.1 --

# Create SMB credentials secret
kubectl create secret generic smb-credentials \
  --from-literal=username=smbuser \
  --from-literal=password=smbpassword \
  -n production
```

```yaml
# Create PV for SMB share
apiVersion: v1
kind: PersistentVolume
metadata:
  name: smb-shared-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  csi:
    driver: smb.csi.k8s.io
    readOnly: false
    volumeHandle: unique-volumeid
    volumeAttributes:
      source: "//fileserver.example.com/shared"
    nodeStageSecretRef:
      name: smb-credentials
      namespace: production
```

## Step 6: hostPath Volume for Windows

```yaml
# Use hostPath for direct access to Windows host filesystem
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-log-agent
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: windows-log-agent
  template:
    metadata:
      labels:
        app: windows-log-agent
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
        - name: log-agent
          image: mcr.microsoft.com/windows/server:ltsc2022
          command:
            - powershell.exe
            - -command
            - "Get-ChildItem 'C:\\logs'; while ($true) { Start-Sleep -Seconds 3600 }"
          volumeMounts:
            - name: windows-logs
              mountPath: "C:\\logs"
              readOnly: true
      volumes:
        - name: windows-logs
          hostPath:
            path: "C:\\Windows\\System32\\winevt\\Logs"
            type: Directory
```

## Conclusion

Windows storage in Kubernetes requires careful CSI driver selection and volume path configuration. For Windows workloads, use a CSI driver with Windows node support rather than Rancher's local-path-provisioner. For production, AWS EBS with the Windows CSI driver provides reliable block storage with NTFS formatting. SMB shares via the SMB CSI driver enable shared storage across multiple Windows pods (ReadWriteMany), which is essential for applications that require shared file system access. Always specify Windows-compatible mount paths using Windows-style paths (`C:\data`) in volume mounts.
