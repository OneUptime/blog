# How to Troubleshoot PVC Binding Issues in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, PVC, Storage, Troubleshooting

Description: Diagnose and resolve Kubernetes Persistent Volume Claim binding failures for storage-dependent workloads managed by Portainer.

## Introduction

Pods get stuck in Pending state when their PVCs cannot bind to PersistentVolumes. This happens due to capacity mismatches, storage class issues, access mode incompatibilities, or missing storage provisioners. Portainer's Volumes view surfaces these issues.

## Step 1: Check PVC Status in Portainer

Navigate to: **Kubernetes > Volumes**

PVC States:
- **Bound**: Successfully bound to a PV
- **Pending**: Waiting for a PV to bind
- **Lost**: Was bound, but the underlying PV is no longer available

## Step 2: Diagnose Pending PVCs

```bash
# Check PVC status

kubectl get pvc -n production
# NAME        STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   AGE
# db-data     Pending   <none>   <none>     <none>         fast-ssd       5m

# Get the exact reason it's pending
kubectl describe pvc db-data -n production | grep -A20 "Events:"
# Common messages:
# "no persistent volumes available for this claim"
# "waiting for first consumer to be created"
# 'storageclass.storage.k8s.io "fast-ssd" not found'
```

## Common Causes

### Cause 1: Storage Class Not Found

```bash
# List available storage classes
kubectl get storageclass
# NAME       PROVISIONER         ...

# If "fast-ssd" isn't listed:
# Option A: Update the PVC manifest to use an existing storage class,
# then recreate the Pending claim
kubectl delete pvc db-data -n production
# Re-apply the manifest after setting spec.storageClassName: standard

# Option B: Create the missing storage class
cat << 'EOF' | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com  # Adjust for your provider
volumeBindingMode: WaitForFirstConsumer
parameters:
  type: gp3
  encrypted: "true"
reclaimPolicy: Retain
allowVolumeExpansion: true
EOF
```

### Cause 2: No Available PVs

```bash
# Check existing PVs
kubectl get pv

# Create a manual PV if no dynamic provisioner exists
cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: PersistentVolume
metadata:
  name: manual-pv-001
spec:
  capacity:
    storage: 20Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  hostPath:  # For testing only
    path: /data/pv001
EOF
```

### Cause 3: Access Mode Mismatch

```yaml
# PVC requested ReadWriteMany but PV only supports ReadWriteOnce
# Common with cloud block storage (EBS, GCE PD)

# Check supported access modes for your storage backend/driver:
# ReadWriteOnce (RWO): One node at a time (block storage)
# ReadWriteMany (RWX): Multiple nodes (NFS, EFS)
# ReadOnlyMany (ROX): Multiple nodes, read-only

# Fix: Use correct access mode
spec:
  accessModes:
    - ReadWriteOnce   # For block storage
  # Not: ReadWriteMany (not supported by EBS)
```

### Cause 4: WaitForFirstConsumer Binding Mode

```bash
# Some storage classes use volumeBindingMode: WaitForFirstConsumer
# PVC can stay Pending until a Pod that uses it is created
kubectl describe storageclass fast-ssd | grep VolumeBindingMode
# VolumeBindingMode: WaitForFirstConsumer

# This is normal behavior - binding starts after a Pod using the PVC is created and scheduled
# Deploy the pod that uses the PVC and it should bind
```

## PVC Troubleshooting Checklist

```bash
#!/bin/bash
# check-pvc.sh
PVC_NAME="$1"
NAMESPACE="${2:-default}"

echo "=== PVC Diagnostic: $PVC_NAME ==="
kubectl get pvc $PVC_NAME -n $NAMESPACE

echo ""
echo "Events:"
kubectl describe pvc $PVC_NAME -n $NAMESPACE | grep -A20 "Events:"

echo ""
echo "Available Storage Classes:"
kubectl get storageclass

echo ""
echo "Available Persistent Volumes:"
kubectl get pv
```

## Viewing in Portainer

```bash
# Via Portainer API
curl -s \
  -H "X-API-Key: your-api-key" \
  "https://portainer.example.com/api/endpoints/1/kubernetes/api/v1/namespaces/production/persistentvolumeclaims" \
  | python3 -c "
import sys, json
pvcs = json.load(sys.stdin)
for p in pvcs['items']:
    name = p['metadata']['name']
    phase = p['status']['phase']
    storage_class = p['spec'].get('storageClassName', 'N/A')
    print(f'{name}: {phase} (StorageClass: {storage_class})')
"
```

## Conclusion

PVC binding failures follow predictable patterns. Always check: 1) Does the StorageClass exist? 2) Is there a compatible PV available? 3) Do the access modes match? 4) Is the storage class using WaitForFirstConsumer? Portainer's Volumes view provides a quick overview of PVC states, while kubectl describe reveals the specific binding failure reason.
