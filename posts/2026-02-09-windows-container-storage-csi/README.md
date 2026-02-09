# How to Configure Windows Container Storage with CSI Drivers on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Windows, Storage

Description: Comprehensive guide to setting up Container Storage Interface (CSI) drivers for persistent storage on Windows nodes in Kubernetes clusters.

---

Persistent storage for Windows containers in Kubernetes presents unique challenges compared to Linux. Windows uses different filesystems, mounting mechanisms, and storage drivers. The Container Storage Interface (CSI) standard provides a unified way to provision and manage storage, but implementing it for Windows requires understanding Windows-specific storage concepts. This guide covers configuring CSI drivers for Windows nodes, from basic setup to advanced storage scenarios.

## Understanding Windows Storage in Kubernetes

Windows containers can use several types of storage:

**EmptyDir volumes** provide temporary storage that gets deleted when the pod terminates. These work well for scratch space and caching.

**HostPath volumes** mount directories from the Windows node's filesystem into containers. Use these carefully as they create tight coupling between pods and nodes.

**Persistent volumes** backed by CSI drivers provide durable storage that survives pod restarts and can move between nodes.

Windows supports NTFS and ReFS filesystems, both of which handle permissions, symbolic links, and file attributes differently than Linux filesystems. CSI drivers must account for these differences.

## Supported CSI Drivers for Windows

Several CSI drivers support Windows nodes:

**Azure Disk CSI Driver** provides block storage for AKS clusters running Windows nodes.

**Azure File CSI Driver** offers SMB-based shared storage accessible from multiple Windows pods.

**AWS EBS CSI Driver** supports Windows nodes on EKS with block storage volumes.

**GCP Persistent Disk CSI Driver** works with Windows nodes on GKE.

**Local Path Provisioner** creates persistent volumes using local node storage.

This guide focuses on the Azure Disk CSI driver as an example, but the concepts apply to other drivers.

## Installing the Azure Disk CSI Driver

For Azure Kubernetes Service with Windows nodes, install the CSI driver:

```bash
# Add the Azure Disk CSI driver Helm repository
helm repo add azuredisk-csi-driver https://raw.githubusercontent.com/kubernetes-sigs/azuredisk-csi-driver/master/charts
helm repo update

# Install the driver with Windows support
helm install azuredisk-csi-driver azuredisk-csi-driver/azuredisk-csi-driver \
  --namespace kube-system \
  --set windows.enabled=true \
  --set controller.runOnControlPlane=true

# Verify driver installation
kubectl get pods -n kube-system -l app=csi-azuredisk-controller
kubectl get pods -n kube-system -l app=csi-azuredisk-node

# Check Windows node pods specifically
kubectl get pods -n kube-system -l app=csi-azuredisk-node -o wide | grep -i windows
```

Verify the CSI driver is registered:

```bash
kubectl get csidrivers
kubectl describe csidriver disk.csi.azure.com
```

## Creating Storage Classes for Windows

Storage classes define different storage tiers and configurations. Create a storage class for Windows workloads:

```yaml
# azure-disk-windows-sc.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-premium-windows
provisioner: disk.csi.azure.com
parameters:
  # Storage account type
  skuName: Premium_LRS
  # Kind of disk
  kind: Managed
  # Enable encryption at rest
  encryption: enabled
  # Cache mode (None, ReadOnly, ReadWrite)
  cachingMode: ReadOnly
  # Filesystem type (NTFS is default for Windows)
  fsType: ntfs
  # Tags to apply to created disks
  tags: environment=production,os=windows
# Reclaim policy when PVC is deleted
reclaimPolicy: Delete
# Allow volume expansion
allowVolumeExpansion: true
# Volume binding mode
volumeBindingMode: WaitForFirstConsumer
# Mount options
mountOptions:
  - uid=0
  - gid=0
```

Apply the storage class:

```bash
kubectl apply -f azure-disk-windows-sc.yaml

# Verify storage class
kubectl get storageclass managed-premium-windows -o yaml
```

Create additional storage classes for different performance tiers:

```yaml
# azure-disk-standard-windows.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-standard-windows
provisioner: disk.csi.azure.com
parameters:
  skuName: Standard_LRS
  kind: Managed
  fsType: ntfs
  cachingMode: None
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
# High-performance storage class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-premium-ssd-windows
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_ZRS
  kind: Managed
  fsType: ntfs
  cachingMode: ReadWrite
  diskIOPSReadWrite: "5000"
  diskMBpsReadWrite: "200"
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: Immediate
```

## Creating Persistent Volume Claims

Create a PVC to request storage:

```yaml
# windows-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: windows-app-data
  namespace: default
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: managed-premium-windows
  resources:
    requests:
      storage: 50Gi
```

Apply and verify:

```bash
kubectl apply -f windows-pvc.yaml

# Check PVC status
kubectl get pvc windows-app-data

# Watch PVC provisioning
kubectl get pvc windows-app-data -w

# View PVC details
kubectl describe pvc windows-app-data
```

## Using Persistent Volumes in Windows Pods

Mount the PVC in a Windows pod:

```yaml
# windows-pod-with-storage.yaml
apiVersion: v1
kind: Pod
metadata:
  name: windows-app-with-storage
  namespace: default
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: iis
    image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
    volumeMounts:
    - name: data-volume
      mountPath: C:\inetpub\wwwroot\data
    ports:
    - containerPort: 80
    resources:
      requests:
        memory: "1Gi"
        cpu: "500m"
      limits:
        memory: "2Gi"
        cpu: "1"
  volumes:
  - name: data-volume
    persistentVolumeClaim:
      claimName: windows-app-data
```

Deploy and verify:

```bash
kubectl apply -f windows-pod-with-storage.yaml

# Wait for pod to be ready
kubectl wait --for=condition=Ready pod/windows-app-with-storage --timeout=300s

# Verify volume is mounted
kubectl exec windows-app-with-storage -- powershell -Command "Get-Volume"
kubectl exec windows-app-with-storage -- powershell -Command "Get-ChildItem C:\inetpub\wwwroot\data"

# Write test data to persistent volume
kubectl exec windows-app-with-storage -- powershell -Command "Set-Content -Path C:\inetpub\wwwroot\data\test.txt -Value 'Hello from persistent storage'"

# Verify data persists
kubectl exec windows-app-with-storage -- powershell -Command "Get-Content C:\inetpub\wwwroot\data\test.txt"
```

## Using Storage in StatefulSets

StatefulSets provide stable storage for stateful applications:

```yaml
# windows-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: windows-database
  namespace: default
spec:
  serviceName: windows-db-service
  replicas: 3
  selector:
    matchLabels:
      app: windows-db
  template:
    metadata:
      labels:
        app: windows-db
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: sql-server
        image: mcr.microsoft.com/mssql/server:2022-latest
        env:
        - name: ACCEPT_EULA
          value: "Y"
        - name: SA_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mssql-secret
              key: password
        volumeMounts:
        - name: data
          mountPath: C:\data
        - name: logs
          mountPath: C:\logs
        ports:
        - containerPort: 1433
          name: sql
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: managed-premium-windows
      resources:
        requests:
          storage: 100Gi
  - metadata:
      name: logs
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: managed-standard-windows
      resources:
        requests:
          storage: 20Gi
```

Create the required secret and deploy:

```bash
# Create SQL Server password secret
kubectl create secret generic mssql-secret \
  --from-literal=password='YourStrong!Passw0rd'

# Deploy StatefulSet
kubectl apply -f windows-statefulset.yaml

# Monitor StatefulSet rollout
kubectl rollout status statefulset/windows-database

# Check PVCs created by StatefulSet
kubectl get pvc | grep windows-database

# Verify each pod has its own storage
kubectl exec windows-database-0 -- powershell -Command "Get-Volume"
kubectl exec windows-database-1 -- powershell -Command "Get-Volume"
```

## Configuring Azure Files for Shared Storage

Azure Files provides SMB-based shared storage accessible from multiple pods:

```yaml
# azure-files-sc.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-files-windows
provisioner: file.csi.azure.com
parameters:
  skuName: Premium_LRS
  protocol: smb
  # Enable Active Directory authentication (optional)
  # adDomainName: contoso.com
  # adUserName: azureuser
mountOptions:
  - dir_mode=0777
  - file_mode=0777
  - uid=0
  - gid=0
  - mfsymlinks
  - cache=strict
  - actimeo=30
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: Immediate
```

Create a shared PVC:

```yaml
# shared-storage-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-windows-storage
spec:
  accessModes:
  - ReadWriteMany
  storageClassName: azure-files-windows
  resources:
    requests:
      storage: 100Gi
```

Use the shared storage in multiple pods:

```yaml
# shared-storage-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-file-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: file-server
  template:
    metadata:
      labels:
        app: file-server
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: server
        image: mcr.microsoft.com/windows/servercore:ltsc2022
        command:
        - powershell
        - -Command
        - |
          # Create test files
          $hostname = $env:COMPUTERNAME
          $file = "C:\shared\$hostname.txt"
          Set-Content -Path $file -Value "Created by $hostname at $(Get-Date)"

          # List all files (from all pods)
          Get-ChildItem C:\shared

          # Keep running
          Start-Sleep -Seconds 86400
        volumeMounts:
        - name: shared
          mountPath: C:\shared
      volumes:
      - name: shared
        persistentVolumeClaim:
          claimName: shared-windows-storage
```

## Volume Snapshots for Windows

Create volume snapshots for backup and cloning:

```yaml
# volume-snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: azure-disk-snapshot-class
driver: disk.csi.azure.com
deletionPolicy: Delete
parameters:
  incremental: "true"
---
# Create snapshot of existing PVC
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: windows-app-data-snapshot
  namespace: default
spec:
  volumeSnapshotClassName: azure-disk-snapshot-class
  source:
    persistentVolumeClaimName: windows-app-data
```

Restore from snapshot:

```yaml
# restore-from-snapshot.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restored-windows-data
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: managed-premium-windows
  dataSource:
    name: windows-app-data-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  resources:
    requests:
      storage: 50Gi
```

## Expanding Persistent Volumes

Expand an existing volume:

```bash
# Edit the PVC to increase size
kubectl patch pvc windows-app-data -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'

# Watch expansion progress
kubectl get pvc windows-app-data -w

# Verify new size in the pod
kubectl exec windows-app-with-storage -- powershell -Command "Get-Volume | Format-Table -AutoSize"
```

For Windows, the filesystem resize happens automatically if the CSI driver supports it.

## Troubleshooting Storage Issues

Common troubleshooting steps:

```powershell
# Check CSI driver logs on Windows nodes
kubectl logs -n kube-system -l app=csi-azuredisk-node --tail=100

# View volume attachment status
kubectl get volumeattachment

# Describe a specific volume attachment
kubectl describe volumeattachment <attachment-name>

# Check PV details
kubectl get pv
kubectl describe pv <pv-name>

# Inside a Windows pod, check mounted volumes
kubectl exec <pod-name> -- powershell -Command "Get-Volume"
kubectl exec <pod-name> -- powershell -Command "Get-Disk"
kubectl exec <pod-name> -- powershell -Command "Get-Partition"
```

If volumes fail to mount, check Windows event logs:

```powershell
kubectl exec <pod-name> -- powershell -Command "Get-WinEvent -LogName System -MaxEvents 50 | Where-Object {$_.Message -like '*disk*' -or $_.Message -like '*volume*'}"
```

## Performance Optimization

Optimize storage performance for Windows containers:

```yaml
# High-performance storage configuration
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ultra-ssd-windows
provisioner: disk.csi.azure.com
parameters:
  skuName: UltraSSD_LRS
  cachingMode: None
  diskIOPSReadWrite: "20000"
  diskMBpsReadWrite: "1000"
  fsType: ntfs
mountOptions:
  - uid=0
  - gid=0
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

Monitor disk performance:

```powershell
# Inside Windows pod
kubectl exec <pod-name> -- powershell -Command @"
`$disk = Get-Disk | Where-Object {`$_.PartitionStyle -ne 'RAW'}
`$perf = Get-Counter -Counter '\PhysicalDisk(*)\Disk Reads/sec', '\PhysicalDisk(*)\Disk Writes/sec' -SampleInterval 1 -MaxSamples 10
`$perf.CounterSamples | Format-Table -AutoSize
"@
```

## Conclusion

Configuring CSI drivers for Windows containers in Kubernetes requires understanding Windows-specific storage concepts and CSI driver implementations. With proper configuration, Windows pods can leverage persistent storage for databases, file servers, and stateful applications.

The combination of storage classes, persistent volume claims, and CSI drivers provides a flexible storage layer for Windows workloads. Choose the right storage type based on your performance requirements, sharing needs, and cost constraints. Always test storage configurations thoroughly before deploying production workloads, and implement proper backup strategies using volume snapshots.
