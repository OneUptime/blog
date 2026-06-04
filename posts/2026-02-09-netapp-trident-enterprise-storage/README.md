# How to Deploy NetApp Trident for Enterprise Storage Integration on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, NetApp

Description: Integrate NetApp enterprise storage systems with Kubernetes using Trident CSI driver for dynamic volume provisioning, snapshots, and advanced data management features.

---

NetApp Trident provides enterprise storage integration for Kubernetes by connecting to ONTAP, Element, Azure NetApp Files, Google Cloud NetApp Volumes, and other supported NetApp storage systems. Trident delivers advanced features including storage efficiency through deduplication and compression, data protection via snapshots and replication, and multi-protocol support for block and file storage.

This guide covers Trident installation, backend configuration for various NetApp platforms, storage class creation with performance tiers, and implementing advanced features like volume import and storage quality of service.

## Understanding Trident Architecture

Trident operates as a standard CSI driver with controller and node components. The controller handles volume provisioning by communicating with NetApp storage APIs, while node plugins mount volumes on worker nodes using appropriate protocols (iSCSI, NFS, FC, or NVMe/TCP).

Trident supports multiple backend types: ONTAP provides unified storage with extensive features, Element offers predictable performance through QoS, and cloud services integrate with AWS, Azure, and GCP through Amazon FSx for NetApp ONTAP, Azure NetApp Files, Google Cloud NetApp Volumes, and Cloud Volumes ONTAP. Each backend type uses specific configuration parameters and capabilities.

The driver maintains backend connectivity and automatically selects appropriate storage pools based on storage class requirements, topology constraints, and available capacity.

## Installing Trident Operator

Deploy Trident using the operator method for simplified lifecycle management.

```bash
# Download Trident installer

wget https://github.com/NetApp/trident/releases/download/v26.02.0/trident-installer-26.02.0.tar.gz
tar -xvf trident-installer-26.02.0.tar.gz
cd trident-installer

# Install Trident operator
kubectl apply -f deploy/namespace.yaml
kubectl create -f deploy/crds/trident.netapp.io_tridentorchestrators_crd_post1.16.yaml
kubectl create -f deploy/bundle.yaml

# Verify operator deployment
kubectl get pods -n trident
kubectl wait --for=condition=Ready pod -l app=operator.trident.netapp.io,name=trident-operator -n trident --timeout=300s
```

Create TridentOrchestrator custom resource:

```yaml
# trident-orchestrator.yaml
apiVersion: trident.netapp.io/v1
kind: TridentOrchestrator
metadata:
  name: trident
spec:
  debug: false
  namespace: trident
  IPv6: false
  k8sTimeout: 30
  silenceAutosupport: false
  autosupportImage: netapp/trident-autosupport:26.02
  tridentImage: netapp/trident:26.02.0
  imagePullSecrets: []
```

Deploy Trident:

```bash
kubectl apply -f trident-orchestrator.yaml

# Watch Trident deployment
kubectl get torc
kubectl describe torc trident

# Verify Trident pods are running
kubectl get pods -n trident
```

## Configuring ONTAP Backend

Create backend configuration for NetApp ONTAP storage.

```yaml
# backend-ontap-nas.yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-ontap-nas-secret
  namespace: trident
type: Opaque
stringData:
  username: admin
  password: your-password
---
apiVersion: trident.netapp.io/v1
kind: TridentBackendConfig
metadata:
  name: backend-ontap-nas
  namespace: trident
spec:
  version: 1
  storageDriverName: ontap-nas
  backendName: ontap-nas-backend
  managementLIF: 192.168.1.100
  dataLIF: 192.168.1.101
  svm: svm_kubernetes
  credentials:
    name: backend-ontap-nas-secret
  defaults:
    spaceReserve: none
    snapshotPolicy: default
    snapshotReserve: "10"
    splitOnClone: "false"
    encryption: "false"
    unixPermissions: "0755"
    snapshotDir: "true"
    exportPolicy: default
    securityStyle: unix
```

For iSCSI block storage:

```yaml
# backend-ontap-san.yaml
apiVersion: trident.netapp.io/v1
kind: TridentBackendConfig
metadata:
  name: backend-ontap-san
  namespace: trident
spec:
  version: 1
  storageDriverName: ontap-san
  backendName: ontap-san-backend
  managementLIF: 192.168.1.100
  svm: svm_kubernetes
  credentials:
    name: backend-ontap-nas-secret
  igroupName: netappdvp
  defaults:
    spaceReserve: none
    snapshotPolicy: default
```

Apply backend configurations:

```bash
kubectl apply -f backend-ontap-nas.yaml
kubectl apply -f backend-ontap-san.yaml

# Verify backends
kubectl get tbc -n trident
kubectl describe tbc backend-ontap-nas -n trident

# Check backend status with tridentctl
tridentctl -n trident get backend
```

## Creating Storage Classes

Define storage classes for different performance and feature requirements.

```yaml
# storage-classes.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ontap-gold
provisioner: csi.trident.netapp.io
parameters:
  backendType: "ontap-nas"
  media: "ssd"
  provisioningType: "thin"
  snapshots: "true"
  clones: "true"
allowVolumeExpansion: true
reclaimPolicy: Retain
volumeBindingMode: Immediate
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ontap-silver
provisioner: csi.trident.netapp.io
parameters:
  backendType: "ontap-nas"
  media: "hdd"
  provisioningType: "thin"
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ontap-san-performance
provisioner: csi.trident.netapp.io
parameters:
  backendType: "ontap-san"
  media: "ssd"
  provisioningType: "thick"
allowVolumeExpansion: true
reclaimPolicy: Delete
```

Apply storage classes:

```bash
kubectl apply -f storage-classes.yaml
kubectl get storageclass
```

## Implementing Volume Snapshots

Trident supports CSI snapshots for ONTAP backends.

```yaml
# volumesnapshotclass.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: trident-snapshot-class
driver: csi.trident.netapp.io
deletionPolicy: Delete
```

Create a snapshot:

```yaml
# volumesnapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: database-snapshot
spec:
  volumeSnapshotClassName: trident-snapshot-class
  source:
    persistentVolumeClaimName: database-pvc
```

Clone from snapshot:

```yaml
# cloned-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-clone
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ontap-gold
  dataSource:
    name: database-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  resources:
    requests:
      storage: 100Gi
```

## Importing Existing Volumes

Import pre-existing NetApp volumes into Kubernetes.

Create a PVC with Trident import annotations:

```yaml
# import-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: imported-pvc
  namespace: default
  annotations:
    trident.netapp.io/importOriginalName: "existing_volume_name"
    trident.netapp.io/importBackendUUID: "backend-uuid"
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: ontap-gold
  resources:
    requests:
      storage: 50Gi
```

## Configuring QoS Policies

Implement storage QoS for performance guarantees.

```yaml
# qos-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ontap-qos-guaranteed
provisioner: csi.trident.netapp.io
parameters:
  backendType: "ontap-san"
  selector: "performance=guaranteed"
allowVolumeExpansion: true
```

Create QoS policy on ONTAP before using:

```bash
# On ONTAP CLI
qos policy-group create -policy-group guaranteed-5000 -vserver svm_kubernetes -max-throughput 5000iops
```

Reference the QoS policy in the ONTAP SAN backend or storage pool:

```yaml
defaults:
  qosPolicy: guaranteed-5000
storage:
  - labels:
      performance: guaranteed
```

## Monitoring Trident

Trident exposes Prometheus metrics for monitoring.

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: trident-csi
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: controller.csi.trident.netapp.io
  namespaceSelector:
    matchNames:
    - trident
  endpoints:
  - port: metrics
    interval: 30s
```

Key metrics:

```promql
# REST success rate
(sum (trident_rest_ops_seconds_total_count{status_code=~"2.."} OR on() vector(0)) / sum (trident_rest_ops_seconds_total_count)) * 100

# Volume operations
sum by (operation) (rate(trident_operation_duration_milliseconds_count{success="true"}[5m]))

# Average operation duration in milliseconds
sum by (operation) (trident_operation_duration_milliseconds_sum{success="true"}) / sum by (operation) (trident_operation_duration_milliseconds_count{success="true"})
```

NetApp Trident brings enterprise storage capabilities to Kubernetes through seamless integration with ONTAP and other NetApp platforms. Features like space-efficient cloning, application-consistent snapshots, and storage QoS enable running demanding workloads with enterprise-grade data management. The combination of Kubernetes-native APIs and NetApp storage efficiency creates a powerful platform for stateful applications.
