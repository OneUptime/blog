# How to Configure StorageClass reclaimPolicy for Retain, Delete, and Recycle

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, StorageClass, ReclaimPolicy

Description: Learn how to configure and manage reclaim policies in Kubernetes StorageClasses including Retain, Delete, and the deprecated Recycle policy, with strategies for data lifecycle management and disaster recovery.

---

The reclaim policy determines what happens to a persistent volume when its corresponding PersistentVolumeClaim is deleted. Choosing the right policy is critical for data safety, compliance, and cost management.

## Understanding Reclaim Policies

Kubernetes supports three reclaim policies:

1. **Delete** - Automatically deletes the PV and underlying storage when PVC is deleted
2. **Retain** - Keeps the PV and data when PVC is deleted, requiring manual cleanup
3. **Recycle** - Deprecated, performs basic scrub (rm -rf) before reuse

The policy is set in the StorageClass and inherited by dynamically provisioned PersistentVolumes.

## Delete Reclaim Policy

The Delete policy automatically removes storage resources when you delete the PVC:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: delete-policy-storage
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
# Delete is the default for most provisioners
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

Use Delete when:

- Running development or test environments
- Storage costs need tight control
- Data is temporary or easily reproducible
- Using automated backup systems

Example usage:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dev-database-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: delete-policy-storage
  resources:
    requests:
      storage: 10Gi
```

Deploy and test the delete behavior:

```bash
kubectl apply -f pvc.yaml

# Create a pod using the PVC
kubectl run test-pod --image=busybox --command sleep 3600 \
  --overrides='
{
  "spec": {
    "volumes": [{
      "name": "data",
      "persistentVolumeClaim": {
        "claimName": "dev-database-pvc"
      }
    }],
    "containers": [{
      "name": "busybox",
      "image": "busybox",
      "command": ["sleep", "3600"],
      "volumeMounts": [{
        "name": "data",
        "mountPath": "/data"
      }]
    }]
  }
}'

# Write some data
kubectl exec test-pod -- sh -c "echo 'test data' > /data/file.txt"

# Note the PV name
PV_NAME=$(kubectl get pvc dev-database-pvc -o jsonpath='{.spec.volumeName}')
echo "PV Name: $PV_NAME"

# Delete the pod and PVC
kubectl delete pod test-pod
kubectl delete pvc dev-database-pvc

# Verify PV and underlying storage are deleted
kubectl get pv $PV_NAME
# Should return: "NotFound"

# Check cloud provider (for AWS)
aws ec2 describe-volumes --volume-ids vol-xxxxx
# Should return: "InvalidVolume.NotFound"
```

## Retain Reclaim Policy

The Retain policy preserves data when PVCs are deleted:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: retain-policy-storage
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
  # Tag for easy identification
  tagSpecification_1: "Name=ReclaimPolicy|Value=Retain"
  tagSpecification_2: "Name=Environment|Value=Production"
# Retain for production data
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

Use Retain when:

- Storing production data
- Compliance requires data retention
- Need time to verify backups before deletion
- Preventing accidental data loss

Example with production database:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: prod-database-pvc
  labels:
    app: database
    environment: production
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: retain-policy-storage
  resources:
    requests:
      storage: 100Gi
```

Test retain behavior:

```bash
kubectl apply -f prod-pvc.yaml

# Get the PV name
PV_NAME=$(kubectl get pvc prod-database-pvc -o jsonpath='{.spec.volumeName}')

# Delete the PVC
kubectl delete pvc prod-database-pvc

# PV still exists but is Released
kubectl get pv $PV_NAME

# Output shows:
# NAME         CAPACITY   STATUS     CLAIM                    RECLAIM POLICY
# pvc-xxxxx    100Gi      Released   default/prod-database    Retain

# Underlying storage still exists
aws ec2 describe-volumes --volume-ids vol-xxxxx
# Volume is still present
```

## Recovering Data from Retained Volumes

Manually reclaim a retained PV:

```bash
# Get the retained PV details
kubectl get pv $PV_NAME -o yaml > retained-pv.yaml

# Option 1: Create new PVC from existing PV
# Remove claimRef to make it available
kubectl patch pv $PV_NAME -p '{"spec":{"claimRef": null}}'

# Create a new PVC that binds to the existing PV
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: recovered-database-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: retain-policy-storage
  resources:
    requests:
      storage: 100Gi
  # Specify the PV to bind to
  volumeName: $PV_NAME
EOF

# Verify binding
kubectl get pvc recovered-database-pvc
# STATUS should be "Bound"

# Option 2: Delete PV and clean up manually
kubectl delete pv $PV_NAME

# Then manually delete the underlying storage
aws ec2 delete-volume --volume-id vol-xxxxx
```

## Changing Reclaim Policy

You can change the reclaim policy of existing PVs:

```bash
# Change from Delete to Retain (protect important data)
kubectl patch pv $PV_NAME -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'

# Verify the change
kubectl get pv $PV_NAME -o jsonpath='{.spec.persistentVolumeReclaimPolicy}'

# Change from Retain to Delete (cleanup old data)
kubectl patch pv $PV_NAME -p '{"spec":{"persistentVolumeReclaimPolicy":"Delete"}}'
```

## Environment-Specific Reclaim Policies

Create StorageClasses for different environments:

```yaml
# Development: Delete for automatic cleanup
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: dev-storage
  labels:
    environment: dev
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  tagSpecification_1: "Name=Environment|Value=Development"
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
---
# Staging: Retain for investigation
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: staging-storage
  labels:
    environment: staging
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  tagSpecification_1: "Name=Environment|Value=Staging"
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# Production: Retain for compliance
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: prod-storage
  labels:
    environment: production
provisioner: ebs.csi.aws.com
parameters:
  type: io2
  iops: "10000"
  encrypted: "true"
  tagSpecification_1: "Name=Environment|Value=Production"
  tagSpecification_2: "Name=Compliance|Value=Required"
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

## Automated Cleanup for Retained Volumes

Create a cleanup job for old retained volumes:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-retained-volumes
spec:
  # Run weekly
  schedule: "0 3 * * 0"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: volume-cleanup
          restartPolicy: OnFailure
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Find Released PVs older than 30 days
              CUTOFF_DATE=$(date -d '30 days ago' +%s)

              kubectl get pv -o json | jq -r '.items[] |
                select(.status.phase == "Released") |
                select(.metadata.creationTimestamp != null) |
                select(((.metadata.creationTimestamp | fromdateiso8601) < '$CUTOFF_DATE')) |
                .metadata.name' | while read pv; do

                echo "Processing retained PV: $pv"

                # Check if tagged for retention
                RETAIN_TAG=$(kubectl get pv $pv -o jsonpath='{.metadata.labels.retain}')

                if [ "$RETAIN_TAG" != "true" ]; then
                  echo "Deleting PV: $pv"
                  kubectl delete pv $pv
                else
                  echo "Skipping PV $pv (marked for retention)"
                fi
              done
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: volume-cleanup
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: volume-cleanup-role
rules:
- apiGroups: [""]
  resources: ["persistentvolumes"]
  verbs: ["get", "list", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: volume-cleanup-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: volume-cleanup-role
subjects:
- kind: ServiceAccount
  name: volume-cleanup
  namespace: default
```

## Monitoring Reclaim Policy Status

Track PVs by reclaim policy and status:

```bash
# List all PVs with their reclaim policies
kubectl get pv -o custom-columns=\
NAME:.metadata.name,\
CAPACITY:.spec.capacity.storage,\
RECLAIM:.spec.persistentVolumeReclaimPolicy,\
STATUS:.status.phase,\
CLAIM:.spec.claimRef.name

# Count PVs by reclaim policy
kubectl get pv -o json | jq -r '.items[] | .spec.persistentVolumeReclaimPolicy' | sort | uniq -c

# Find Released PVs (retained after PVC deletion)
kubectl get pv -o json | jq -r '.items[] |
  select(.status.phase == "Released") |
  "\(.metadata.name): \(.spec.persistentVolumeReclaimPolicy)"'

# Calculate storage cost of retained volumes
kubectl get pv -o json | jq -r '[.items[] |
  select(.status.phase == "Released") |
  .spec.capacity.storage | gsub("[^0-9]";"") | tonumber] | add'
```

## Best Practices

1. **Use Retain for production** data to prevent accidental loss
2. **Use Delete for development** to control costs
3. **Tag volumes** for easy identification and cleanup
4. **Implement backup strategies** before relying on Delete
5. **Monitor Released volumes** to prevent cost accumulation
6. **Document policies** clearly for team members
7. **Test recovery procedures** from retained volumes
8. **Automate cleanup** of old retained volumes

## Common Pitfalls

Avoid these mistakes:

```yaml
# WRONG: Using Delete for production databases
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: prod-db-storage
provisioner: ebs.csi.aws.com
reclaimPolicy: Delete  # BAD: Accidental deletion loses data!
```

```yaml
# RIGHT: Use Retain for production
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: prod-db-storage
provisioner: ebs.csi.aws.com
reclaimPolicy: Retain  # GOOD: Data preserved
```

## Troubleshooting

Common issues:

```bash
# 1. PV stuck in Released state
kubectl get pv | grep Released

# Clear the claim reference to make it Available again
kubectl patch pv <pv-name> -p '{"spec":{"claimRef": null}}'

# 2. Cannot delete PV with Retain policy
# Remove finalizers if stuck
kubectl patch pv <pv-name> -p '{"metadata":{"finalizers":null}}'

# 3. Underlying storage not deleted with Delete policy
# Check CSI driver logs
kubectl logs -n kube-system -l app=ebs-csi-controller

# Manually delete the volume
aws ec2 delete-volume --volume-id vol-xxxxx
```

Understanding and correctly configuring reclaim policies is essential for balancing data safety, compliance requirements, and storage costs in Kubernetes environments.
