# How to Fix Kubernetes PersistentVolumeClaim Stuck in Pending Due to Storage Class Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Persistent Volumes

Description: Learn how to diagnose and fix PersistentVolumeClaims stuck in Pending status due to StorageClass issues, provisioner failures, and insufficient storage capacity.

---

PersistentVolumeClaims stuck in Pending status prevent pods from starting and block application deployments. When PVCs can't bind to PersistentVolumes, pods remain in ContainerCreating or Pending state indefinitely. Storage Class configuration, provisioner availability, and capacity constraints all contribute to PVC binding failures.

This guide walks through diagnosing PVC binding issues, fixing Storage Class problems, and implementing solutions that ensure reliable persistent storage provisioning.

## Understanding PVC Binding Process

When you create a PVC, Kubernetes attempts to bind it to a matching PersistentVolume. For dynamic provisioning, the storage provisioner creates a new PV automatically. For static provisioning, Kubernetes searches for an existing PV matching the PVC's requirements.

Binding requires matching storage capacity, access modes, volume mode, and Storage Class. The PVC stays Pending until all requirements are met. Dynamic provisioning can fail if the provisioner isn't running, lacks permissions, or encounters infrastructure errors. Static provisioning fails when no suitable PVs exist.

## Identifying PVC Pending Issues

Check PVC status to confirm it's stuck Pending.

```bash
# List PVCs
kubectl get pvc -n default

# Output:
# NAME        STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   AGE
# app-data    Pending                                       fast-ssd       5m

# Get detailed PVC information
kubectl describe pvc app-data -n default
```

The Events section shows why binding failed.

```bash
# Common error messages:
# waiting for a volume to be created, either by external provisioner or manually created
# storageclass.storage.k8s.io "fast-ssd" not found
# failed to provision volume: rpc error: code = ResourceExhausted desc = Insufficient quota
```

Check if pods are blocked waiting for the PVC.

```bash
# Find pods using the PVC
kubectl get pods -n default -o json | \
  jq -r '.items[] | select(.spec.volumes[]?.persistentVolumeClaim.claimName=="app-data") | .metadata.name'

# Check pod status
kubectl describe pod <pod-name> -n default | grep -A 5 Events
```

## Fixing Missing StorageClass

When the PVC references a StorageClass that doesn't exist, provisioning fails immediately.

```bash
# Check if StorageClass exists
kubectl get storageclass

# Output might show:
# NAME                 PROVISIONER             RECLAIMPOLICY   AGE
# standard (default)   kubernetes.io/aws-ebs   Delete          30d
# fast-ssd             <missing>

# The PVC requests "fast-ssd" but it doesn't exist
```

Create the missing StorageClass or update the PVC to use an existing one.

```yaml
# Create the StorageClass
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
```

Or update the PVC to reference an existing StorageClass.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard  # Use existing StorageClass
```

Apply the configuration.

```bash
kubectl apply -f storageclass.yaml
# or
kubectl apply -f pvc.yaml

# Check PVC status
kubectl get pvc app-data -n default -w
```

## Diagnosing Provisioner Issues

Dynamic provisioning requires a functioning storage provisioner. Check if the provisioner is running and healthy.

```bash
# For AWS EBS CSI driver
kubectl get pods -n kube-system | grep ebs-csi

# Output:
# ebs-csi-controller-0   6/6     Running   0          5d
# ebs-csi-node-xyz       3/3     Running   0          5d

# Check controller logs for errors
kubectl logs -n kube-system ebs-csi-controller-0 -c csi-provisioner | tail -50

# Look for errors like:
# failed to provision volume: rpc error: code = Internal desc = Could not create volume
```

For other provisioners, check their specific deployment.

```bash
# For GCE PD CSI driver
kubectl get pods -n kube-system | grep gce-pd-csi

# For Longhorn
kubectl get pods -n longhorn-system

# For Rook-Ceph
kubectl get pods -n rook-ceph
```

Check provisioner RBAC permissions.

```bash
# Verify ServiceAccount exists
kubectl get serviceaccount ebs-csi-controller-sa -n kube-system

# Check ClusterRole permissions
kubectl describe clusterrole ebs-csi-provisioner-role

# Verify ClusterRoleBinding
kubectl get clusterrolebinding | grep ebs-csi
```

## Fixing Insufficient Storage Capacity

Cloud providers and storage backends have capacity and quota limits. Check if you've hit limits.

```bash
# For AWS, check account limits
aws service-quotas get-service-quota \
  --service-code ebs \
  --quota-code L-D18FCD1D  # EBS volume limit

# Check current usage
aws ec2 describe-volumes --query 'length(Volumes)'

# For GCP, check quotas
gcloud compute project-info describe --project=<project-id> | \
  grep -A 5 "DISKS_TOTAL_GB"
```

Check PVC size requirements against available capacity.

```bash
# List all PVCs and their sizes
kubectl get pvc -A -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
CAPACITY:.status.capacity.storage,\
REQUEST:.spec.resources.requests.storage

# Sum total requested storage
kubectl get pvc -A -o json | \
  jq -r '.items[].spec.resources.requests.storage' | \
  sed 's/Gi//' | paste -sd+ | bc
```

If at capacity limits, either increase quotas or reduce storage requests.

## Handling VolumeBindingMode Issues

The `WaitForFirstConsumer` binding mode delays PV creation until a pod uses the PVC. This ensures volumes are created in the same availability zone as the pod.

```bash
# Check StorageClass binding mode
kubectl get storageclass fast-ssd -o jsonpath='{.volumeBindingMode}'

# Output: WaitForFirstConsumer
```

With this mode, the PVC stays Pending until a pod references it.

```yaml
# Create a pod that uses the PVC
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: app-data
```

Apply the pod definition.

```bash
kubectl apply -f pod.yaml

# PVC should now provision and bind
kubectl get pvc app-data -n default -w
```

## Troubleshooting Access Mode Mismatches

PVCs must request access modes supported by the storage backend.

```bash
# Check what access modes are supported
kubectl describe storageclass standard | grep "Allowed Topologies\|Parameters"

# Common access modes:
# ReadWriteOnce (RWO) - single node read-write
# ReadOnlyMany (ROX) - many nodes read-only
# ReadWriteMany (RWX) - many nodes read-write
```

Not all storage types support all access modes. Block storage typically only supports ReadWriteOnce.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
spec:
  accessModes:
  - ReadWriteOnce  # Supported by most storage types
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
```

For ReadWriteMany, use file storage or shared storage systems.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: shared-nfs
provisioner: nfs.csi.k8s.io
parameters:
  server: nfs-server.example.com
  share: /exports
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
spec:
  accessModes:
  - ReadWriteMany  # Supported by NFS
  resources:
    requests:
      storage: 50Gi
  storageClassName: shared-nfs
```

## Implementing Static Provisioning

When dynamic provisioning fails or isn't desired, manually create PersistentVolumes.

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: manual-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  hostPath:
    path: /mnt/data
    type: DirectoryOrCreate
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: manual-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: manual
```

The PVC binds to the manually created PV.

```bash
kubectl apply -f pv.yaml
kubectl apply -f pvc.yaml

# Verify binding
kubectl get pv,pvc
```

## Checking Storage Provisioner Logs

Detailed provisioner logs reveal infrastructure-level issues.

```bash
# For CSI provisioners, check the provisioner sidecar
kubectl logs -n kube-system deployment/ebs-csi-controller -c csi-provisioner

# Look for errors like:
# CreateVolume failed: Could not create volume "pvc-xyz": InvalidParameterValue: Encrypted flag must be true
# CreateVolume failed: operation error EC2: CreateVolume, exceeded maximum number of attempts

# Check the CSI driver itself
kubectl logs -n kube-system deployment/ebs-csi-controller -c ebs-plugin
```

Enable debug logging for more details.

```yaml
# Update provisioner deployment with verbose logging
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ebs-csi-controller
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: csi-provisioner
        args:
        - --csi-address=/csi/csi.sock
        - --v=5  # Increase verbosity
        - --timeout=60s
        - --extra-create-metadata
```

## Monitoring PVC Provisioning

Set up alerts for PVCs stuck in Pending.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: storage
      rules:
      - alert: PVCStuckPending
        expr: |
          kube_persistentvolumeclaim_status_phase{phase="Pending"} > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "PVC {{ $labels.namespace }}/{{ $labels.persistentvolumeclaim }} stuck pending"
          description: "Check StorageClass and provisioner"

      - alert: PVProvisioningFailed
        expr: |
          rate(storage_operation_duration_seconds_count{status="fail-unknown"}[5m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "PV provisioning failures detected"
```

Create a dashboard tracking PVC provisioning times and failure rates.

```bash
# Query PVC age
kubectl get pvc -A -o json | \
  jq -r '.items[] | select(.status.phase=="Pending") |
  "\(.metadata.namespace)/\(.metadata.name): \(.metadata.creationTimestamp)"'
```

PersistentVolumeClaim provisioning failures block application deployments and cause extended outages. By understanding Storage Class configuration, ensuring provisioner health, monitoring capacity limits, and implementing proper error handling, you create reliable persistent storage for Kubernetes workloads. Combined with alerts and automated remediation, these practices minimize storage-related downtime.
