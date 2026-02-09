# How to Configure Volume Expansion for In-Use Persistent Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, VolumeExpansion, PersistentVolume

Description: Learn how to expand persistent volumes while they're in use by running pods, including online expansion, filesystem resizing, and troubleshooting common issues across different storage providers.

---

Volume expansion allows you to increase the size of persistent volumes without downtime. This capability is essential for growing databases and applications that need more storage without service interruption.

## Understanding Volume Expansion

Kubernetes supports two types of volume expansion:

1. **Offline expansion** - Requires pod restart after volume resize
2. **Online expansion** - Expands volume while pod is running (if CSI driver supports it)

The expansion process involves three stages:

1. Storage backend expands the volume
2. Kubernetes updates the PV capacity
3. Filesystem is resized (if needed)

## Enabling Volume Expansion

First, ensure your StorageClass allows expansion:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: expandable-storage
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
# Enable volume expansion
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

For existing StorageClasses:

```bash
# Enable expansion on existing StorageClass
kubectl patch storageclass standard -p '{"allowVolumeExpansion": true}'

# Verify the change
kubectl get storageclass standard -o yaml | grep allowVolumeExpansion
```

## Creating an Expandable PVC

Create a PVC using an expandable StorageClass:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: expandable-storage
  resources:
    requests:
      storage: 10Gi
```

Deploy an application using the PVC:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "password123"
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: mysql-data
```

Deploy the resources:

```bash
kubectl apply -f storageclass.yaml
kubectl apply -f pvc.yaml
kubectl apply -f deployment.yaml

# Wait for pod to be ready
kubectl wait --for=condition=ready pod -l app=mysql --timeout=120s

# Verify initial size
kubectl exec deploy/mysql -- df -h /var/lib/mysql
```

## Expanding a Volume (Online Expansion)

For CSI drivers that support online expansion (like AWS EBS CSI), simply edit the PVC:

```bash
# Edit the PVC to increase size from 10Gi to 20Gi
kubectl patch pvc mysql-data -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'

# Watch the expansion progress
kubectl get pvc mysql-data -w
```

Monitor the expansion:

```bash
# Check PVC status
kubectl describe pvc mysql-data

# Look for these conditions:
# - FileSystemResizePending: False (means expansion complete)
# - Resizing: The volume is being expanded
# - FileSystemResizePending: Waiting for pod to pick up changes

# Verify new size in the pod
kubectl exec deploy/mysql -- df -h /var/lib/mysql

# Check PV capacity
kubectl get pv
```

The expansion happens in stages, shown in PVC conditions:

```yaml
status:
  capacity:
    storage: 20Gi  # New size reflected here
  conditions:
  - type: Resizing
    status: "True"
    lastTransitionTime: "2026-02-09T10:00:00Z"
  - type: FileSystemResizePending
    status: "False"
    lastTransitionTime: "2026-02-09T10:01:00Z"
```

## Expanding Volumes with Offline Expansion

Some CSI drivers require pod restart for filesystem resize:

```bash
# Step 1: Expand the PVC
kubectl patch pvc mysql-data -p '{"spec":{"resources":{"requests":{"storage":"30Gi"}}}}'

# Step 2: Check if FileSystemResizePending is true
kubectl get pvc mysql-data -o jsonpath='{.status.conditions[?(@.type=="FileSystemResizePending")].status}'

# If output is "True", restart the pod
kubectl rollout restart deployment mysql

# Step 3: Verify expansion
kubectl exec deploy/mysql -- df -h /var/lib/mysql
```

## Automated Expansion Script

Create a script to safely expand volumes:

```bash
#!/bin/bash
# expand-volume.sh

set -e

PVC_NAME="${1}"
NAMESPACE="${2:-default}"
NEW_SIZE="${3}"

if [ -z "$PVC_NAME" ] || [ -z "$NEW_SIZE" ]; then
    echo "Usage: $0 <pvc-name> [namespace] <new-size>"
    echo "Example: $0 mysql-data default 50Gi"
    exit 1
fi

echo "Expanding PVC $PVC_NAME in namespace $NAMESPACE to $NEW_SIZE"

# Get current size
CURRENT_SIZE=$(kubectl get pvc -n "$NAMESPACE" "$PVC_NAME" \
  -o jsonpath='{.spec.resources.requests.storage}')

echo "Current size: $CURRENT_SIZE"
echo "New size: $NEW_SIZE"

# Verify StorageClass supports expansion
SC=$(kubectl get pvc -n "$NAMESPACE" "$PVC_NAME" \
  -o jsonpath='{.spec.storageClassName}')

EXPANDABLE=$(kubectl get storageclass "$SC" \
  -o jsonpath='{.allowVolumeExpansion}')

if [ "$EXPANDABLE" != "true" ]; then
    echo "ERROR: StorageClass $SC does not allow volume expansion"
    exit 1
fi

# Perform expansion
echo "Patching PVC..."
kubectl patch pvc -n "$NAMESPACE" "$PVC_NAME" \
  -p "{\"spec\":{\"resources\":{\"requests\":{\"storage\":\"$NEW_SIZE\"}}}}"

# Wait for expansion to complete
echo "Waiting for expansion to complete..."
while true; do
    STATUS=$(kubectl get pvc -n "$NAMESPACE" "$PVC_NAME" \
      -o jsonpath='{.status.capacity.storage}')

    echo "Current capacity: $STATUS"

    if [ "$STATUS" == "$NEW_SIZE" ]; then
        echo "Volume expansion successful!"
        break
    fi

    sleep 5
done

# Check if pod restart is needed
FS_PENDING=$(kubectl get pvc -n "$NAMESPACE" "$PVC_NAME" \
  -o jsonpath='{.status.conditions[?(@.type=="FileSystemResizePending")].status}')

if [ "$FS_PENDING" == "True" ]; then
    echo "WARNING: FileSystemResizePending is true"
    echo "You need to restart pods using this PVC"

    # Find pods using this PVC
    kubectl get pods -n "$NAMESPACE" -o json | \
      jq -r ".items[] |
        select(.spec.volumes[]?.persistentVolumeClaim?.claimName == \"$PVC_NAME\") |
        .metadata.name"
else
    echo "Filesystem resize completed automatically"
fi
```

Make it executable:

```bash
chmod +x expand-volume.sh
./expand-volume.sh mysql-data default 50Gi
```

## Expanding StatefulSet Volumes

For StatefulSets, expand each PVC individually:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-cluster
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: expandable-storage
      resources:
        requests:
          storage: 50Gi
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
```

Expand each PVC:

```bash
# List all PVCs created by StatefulSet
kubectl get pvc -l app=postgres

# Expand each one
for i in 0 1 2; do
  kubectl patch pvc data-postgres-cluster-$i \
    -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'
done

# Monitor expansion
kubectl get pvc -l app=postgres -w

# If restart needed, delete pods one by one
kubectl delete pod postgres-cluster-0
kubectl wait --for=condition=ready pod postgres-cluster-0 --timeout=120s

kubectl delete pod postgres-cluster-1
kubectl wait --for=condition=ready pod postgres-cluster-1 --timeout=120s

kubectl delete pod postgres-cluster-2
kubectl wait --for=condition=ready pod postgres-cluster-2 --timeout=120s
```

## Provider-Specific Considerations

### AWS EBS

AWS EBS supports online expansion for most volume types:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: aws-ebs-expandable
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  # Expansion happens automatically
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

Note: You can expand gp3 volumes up to 16TB and increase IOPS/throughput.

### GCP Persistent Disk

GCP supports online expansion:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gcp-pd-expandable
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  replication-type: regional-pd
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

Limitations: Can expand every 6 hours, maximum size depends on disk type.

### Azure Disk

Azure requires pod restart for filesystem resize:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-disk-expandable
provisioner: disk.csi.azure.com
parameters:
  storageaccounttype: Premium_LRS
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

Always restart pods after expanding Azure disks.

## Monitoring Volume Expansion

Track expansion operations:

```bash
# Watch PVC events during expansion
kubectl get events --field-selector involvedObject.name=mysql-data -w

# Check for expansion errors
kubectl get pvc -A -o json | jq -r '.items[] |
  select(.status.conditions[]?.type == "Resizing") |
  "\(.metadata.namespace)/\(.metadata.name): Resizing"'

# Find PVCs pending filesystem resize
kubectl get pvc -A -o json | jq -r '.items[] |
  select(.status.conditions[]? |
    select(.type == "FileSystemResizePending" and .status == "True")) |
  "\(.metadata.namespace)/\(.metadata.name): Needs pod restart"'
```

## Handling Expansion Failures

Common issues and solutions:

```bash
# 1. Insufficient quota
kubectl describe pvc mysql-data
# Look for: "exceeded quota" in events

# Solution: Increase resource quota
kubectl get resourcequota

# 2. Maximum volume size reached
# Error: "requested size exceeds maximum volume size"

# Solution: Check provider limits
# AWS EBS gp3: 16TB max
# GCP PD SSD: 64TB max
# Azure Premium SSD: 32TB max

# 3. Expansion not supported
# Error: "volume expansion is not supported"

# Solution: Enable in StorageClass
kubectl patch storageclass <name> -p '{"allowVolumeExpansion": true}'

# 4. Filesystem resize failed
# PVC stuck with FileSystemResizePending

# Solution: Delete and recreate pod
kubectl delete pod <pod-name>
```

## Best Practices

1. **Always enable allowVolumeExpansion** in StorageClasses
2. **Test expansion** in non-production environments first
3. **Monitor expansion progress** to catch issues early
4. **Plan for growth** by sizing volumes appropriately
5. **Document CSI driver capabilities** for your team
6. **Automate expansion monitoring** with alerts
7. **Keep backups** before major expansions
8. **Understand provider limits** for maximum sizes

Volume expansion eliminates the need for complex data migration when you run out of space, allowing applications to grow seamlessly as storage requirements increase.
