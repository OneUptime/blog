# How to Handle Orphaned Persistent Volumes After Namespace Deletion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Operations

Description: Learn how to identify, recover, and prevent orphaned persistent volumes after Kubernetes namespace deletion to avoid storage leaks and unnecessary costs.

---

Deleting a Kubernetes namespace removes all resources within it, but persistent volumes often survive the deletion due to their reclaim policy configuration. These orphaned volumes consume storage and incur costs without serving any active workload. Understanding how to manage them prevents storage waste and budget overruns.

## Understanding Volume Lifecycle and Reclaim Policies

Persistent volumes have a reclaim policy that controls their fate when the associated PVC is deleted. Three reclaim policies exist:

**Retain**: The volume persists after PVC deletion, preserving data for manual recovery or migration. **Delete**: The volume and its underlying storage get deleted automatically when the PVC is deleted. **Recycle**: Deprecated and no longer supported in modern Kubernetes versions.

When you delete a namespace, Kubernetes deletes all PVCs in that namespace. What happens next depends on the reclaim policy of the bound persistent volumes.

## How Namespace Deletion Creates Orphaned Volumes

Consider this scenario:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dev-project
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: dev-project
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: standard
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
reclaimPolicy: Retain
```

When you delete the dev-project namespace:

```bash
kubectl delete namespace dev-project
```

The PVC gets deleted, but the persistent volume and its underlying EBS volume remain because the reclaim policy is Retain. The PV enters a Released state, still bound to the deleted PVC, but no longer usable by new PVCs.

Check for released volumes:

```bash
# Find volumes in Released state
kubectl get pv --field-selector status.phase=Released

# Show details
kubectl get pv -o custom-columns=\
NAME:.metadata.name,\
STATUS:.status.phase,\
CLAIM:.spec.claimRef.name,\
NAMESPACE:.spec.claimRef.namespace,\
CAPACITY:.spec.capacity.storage
```

## Identifying Orphaned Volumes

Create a script to find orphaned volumes across your cluster:

```bash
#!/bin/bash
# find-orphaned-volumes.sh

echo "Checking for orphaned persistent volumes..."
echo "==========================================="

# Get all PVs in Released state
kubectl get pv -o json | jq -r '
  .items[] |
  select(.status.phase == "Released") |
  {
    name: .metadata.name,
    capacity: .spec.capacity.storage,
    claimNamespace: .spec.claimRef.namespace,
    claimName: .spec.claimRef.name,
    storageClass: .spec.storageClassName,
    volumeHandle: .spec.csi.volumeHandle
  } |
  "\(.name)\t\(.capacity)\t\(.claimNamespace)/\(.claimName)\t\(.storageClass)\t\(.volumeHandle)"
' | column -t -s $'\t'

echo ""
echo "Cloud provider volumes that may be orphaned:"
echo "============================================="

# For AWS EBS volumes
aws ec2 describe-volumes \
  --filters "Name=tag:kubernetes.io/created-for/pv/name,Values=*" \
  --query 'Volumes[?State==`available`].[VolumeId,Size,Tags[?Key==`kubernetes.io/created-for/pv/name`].Value|[0]]' \
  --output table
```

This script identifies both Kubernetes PVs in Released state and unattached cloud volumes that might be orphaned.

## Recovering Data from Orphaned Volumes

Before deleting orphaned volumes, you may need to recover data:

```bash
# Get volume handle (cloud provider volume ID)
VOLUME_ID=$(kubectl get pv pvc-abc123 -o jsonpath='{.spec.csi.volumeHandle}')

# For AWS EBS, create snapshot
aws ec2 create-snapshot \
  --volume-id $VOLUME_ID \
  --description "Backup before cleanup - namespace: dev-project" \
  --tag-specifications 'ResourceType=snapshot,Tags=[{Key=Purpose,Value=OrphanedVolumeBackup},{Key=OriginalNamespace,Value=dev-project}]'

# Wait for snapshot completion
aws ec2 wait snapshot-completed --snapshot-ids $SNAPSHOT_ID
```

Alternatively, reclaim the volume by removing the claim reference:

```yaml
# Edit the PV to remove claimRef
kubectl patch pv pvc-abc123 -p '{"spec":{"claimRef":null}}'
```

This changes the volume status from Released to Available, allowing it to be bound to a new PVC.

## Creating a New PVC to Reclaim Data

After clearing the claim reference, create a new PVC that matches the volume:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: recovered-data
  namespace: recovery
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: standard
  # Explicitly reference the existing PV
  volumeName: pvc-abc123
```

This PVC binds to the existing PV, giving you access to the data:

```bash
kubectl apply -f recovered-pvc.yaml

# Verify binding
kubectl get pvc recovered-data -n recovery

# Mount in a pod to access data
kubectl run data-recovery \
  --image=busybox \
  --restart=Never \
  --namespace=recovery \
  --overrides='
  {
    "spec": {
      "containers": [{
        "name": "busybox",
        "image": "busybox",
        "command": ["sleep", "3600"],
        "volumeMounts": [{
          "name": "data",
          "mountPath": "/data"
        }]
      }],
      "volumes": [{
        "name": "data",
        "persistentVolumeClaim": {
          "claimName": "recovered-data"
        }
      }]
    }
  }'

# Access data
kubectl exec -it data-recovery -n recovery -- ls -la /data
```

## Automated Cleanup Script

Create an automated cleanup process for orphaned volumes:

```bash
#!/bin/bash
# cleanup-orphaned-volumes.sh

RETENTION_DAYS=30
DRY_RUN=${DRY_RUN:-true}

echo "Finding orphaned volumes older than $RETENTION_DAYS days..."

kubectl get pv -o json | jq -r --arg days "$RETENTION_DAYS" '
  .items[] |
  select(.status.phase == "Released") |
  select(
    (now - (.metadata.creationTimestamp | fromdateiso8601)) / 86400 > ($days | tonumber)
  ) |
  .metadata.name
' | while read pv_name; do
  echo "Processing PV: $pv_name"

  # Get volume details
  VOLUME_ID=$(kubectl get pv $pv_name -o jsonpath='{.spec.csi.volumeHandle}')
  NAMESPACE=$(kubectl get pv $pv_name -o jsonpath='{.spec.claimRef.namespace}')
  CLAIM_NAME=$(kubectl get pv $pv_name -o jsonpath='{.spec.claimRef.name}')

  if [ "$DRY_RUN" = "true" ]; then
    echo "  [DRY RUN] Would delete PV: $pv_name"
    echo "  [DRY RUN] Would delete volume: $VOLUME_ID"
    echo "  [DRY RUN] Original claim: $NAMESPACE/$CLAIM_NAME"
  else
    # Create snapshot before deletion
    echo "  Creating snapshot..."
    SNAPSHOT_ID=$(aws ec2 create-snapshot \
      --volume-id $VOLUME_ID \
      --description "Auto-backup before deletion - $NAMESPACE/$CLAIM_NAME" \
      --output text --query 'SnapshotId')

    echo "  Snapshot created: $SNAPSHOT_ID"

    # Delete PV (this will trigger volume deletion if reclaim policy allows)
    echo "  Deleting PV: $pv_name"
    kubectl delete pv $pv_name

    # If volume still exists, delete it
    if aws ec2 describe-volumes --volume-ids $VOLUME_ID &>/dev/null; then
      echo "  Deleting volume: $VOLUME_ID"
      aws ec2 delete-volume --volume-id $VOLUME_ID
    fi
  fi

  echo ""
done

# Run in dry-run mode first
# DRY_RUN=true ./cleanup-orphaned-volumes.sh

# Then run for real
# DRY_RUN=false ./cleanup-orphaned-volumes.sh
```

## Preventing Orphaned Volumes

Use Delete reclaim policy for development and testing environments:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: dev-storage
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

For production, use Retain with proper documentation:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: prod-storage
  annotations:
    description: "Production storage with Retain policy - requires manual cleanup"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
```

## Implementing Finalizers for Controlled Deletion

Add finalizers to namespaces to prevent accidental deletion:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  finalizers:
  - kubernetes.io/pvc-protection
  annotations:
    delete-protection: "enabled"
    contact: "ops-team@example.com"
```

Create an admission webhook that prevents namespace deletion without approval:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"

    admissionv1 "k8s.io/api/admission/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

type NamespaceDeletionWebhook struct {
    client kubernetes.Interface
}

func (w *NamespaceDeletionWebhook) validateNamespaceDeletion(ar *admissionv1.AdmissionReview) *admissionv1.AdmissionResponse {
    ns := &corev1.Namespace{}
    if err := json.Unmarshal(ar.Request.OldObject.Raw, ns); err != nil {
        return &admissionv1.AdmissionResponse{
            Result: &metav1.Status{Message: err.Error()},
        }
    }

    // Check if namespace has PVCs
    pvcs, err := w.client.CoreV1().PersistentVolumeClaims(ns.Name).List(
        context.Background(),
        metav1.ListOptions{},
    )
    if err != nil {
        return &admissionv1.AdmissionResponse{
            Allowed: false,
            Result:  &metav1.Status{Message: fmt.Sprintf("Failed to check PVCs: %v", err)},
        }
    }

    if len(pvcs.Items) > 0 {
        // Check if deletion is approved
        if ns.Annotations["deletion-approved"] != "true" {
            return &admissionv1.AdmissionResponse{
                Allowed: false,
                Result: &metav1.Status{
                    Message: fmt.Sprintf(
                        "Namespace %s contains %d PVCs. Add annotation 'deletion-approved: true' to confirm deletion",
                        ns.Name,
                        len(pvcs.Items),
                    ),
                },
            }
        }

        // List PVCs with their reclaim policies
        var retainedPVCs []string
        for _, pvc := range pvcs.Items {
            pvName := pvc.Spec.VolumeName
            if pvName == "" {
                continue
            }

            pv, err := w.client.CoreV1().PersistentVolumes().Get(
                context.Background(),
                pvName,
                metav1.GetOptions{},
            )
            if err != nil {
                continue
            }

            if pv.Spec.PersistentVolumeReclaimPolicy == corev1.PersistentVolumeReclaimRetain {
                retainedPVCs = append(retainedPVCs, pvc.Name)
            }
        }

        if len(retainedPVCs) > 0 {
            return &admissionv1.AdmissionResponse{
                Allowed: true,
                Result: &metav1.Status{
                    Message: fmt.Sprintf(
                        "Warning: %d PVCs have Retain policy and will become orphaned: %v",
                        len(retainedPVCs),
                        retainedPVCs,
                    ),
                },
            }
        }
    }

    return &admissionv1.AdmissionResponse{Allowed: true}
}
```

## Monitoring Orphaned Volume Costs

Track storage costs from orphaned volumes:

```bash
#!/bin/bash
# calculate-orphaned-volume-costs.sh

# AWS pricing (adjust for your region)
COST_PER_GB_MONTH=0.10

total_gb=0

kubectl get pv --field-selector status.phase=Released -o json | jq -r '
  .items[] |
  .spec.capacity.storage
' | while read size; do
  # Convert to GB (assuming Gi units)
  gb=$(echo $size | sed 's/Gi//')
  total_gb=$((total_gb + gb))
done

monthly_cost=$(echo "$total_gb * $COST_PER_GB_MONTH" | bc)

echo "Orphaned Volume Cost Summary"
echo "============================"
echo "Total orphaned storage: ${total_gb}GB"
echo "Monthly cost: \$${monthly_cost}"
echo "Annual cost: \$$(echo "$monthly_cost * 12" | bc)"
```

Set up cost alerts in Prometheus:

```promql
# Cost of orphaned volumes
sum(
  kube_persistentvolume_capacity_bytes{phase="Released"}
  * on() group_left() vector(0.0000000001)  # $0.10/GB/month in $/byte/month
)
```

## Best Practices

Document your reclaim policy choices clearly. Team members need to understand when volumes persist after deletion.

Implement a regular audit process for orphaned volumes. Schedule monthly reviews to identify and clean up released volumes.

Use Delete reclaim policy for non-production environments where data persistence after namespace deletion is not required.

Tag cloud volumes with metadata including namespace, application, and owner. This makes it easier to trace orphaned volumes back to their source.

Set up automated alerts when volumes remain in Released state for more than a defined period (e.g., 7 days).

Create backup snapshots before deleting orphaned volumes, providing a safety net for accidental deletions.

## Conclusion

Orphaned persistent volumes are a common source of wasted storage and unnecessary cloud costs. By understanding reclaim policies, implementing proper monitoring and cleanup processes, and preventing accidental namespace deletions, you maintain control over your storage resources. Regular audits and automation help keep orphaned volumes from accumulating over time.
