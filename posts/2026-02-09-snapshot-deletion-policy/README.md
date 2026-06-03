# How to Configure Snapshot Deletion Policy for Lifecycle Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, VolumeSnapshot, Lifecycle Management

Description: Learn how to configure snapshot deletion policies in Kubernetes to manage the lifecycle of volume snapshots, control storage costs, and prevent accidental data loss.

---

Snapshot deletion policies determine what happens to the underlying storage snapshot when you delete a VolumeSnapshot resource in Kubernetes. Proper configuration prevents accidental data loss while avoiding unnecessary storage costs from orphaned snapshots.

## Understanding Deletion Policies

VolumeSnapshotClass supports two deletion policies:

1. **Delete** - Removes both the VolumeSnapshot resource and the underlying storage snapshot
2. **Retain** - Keeps the storage snapshot even after deleting the VolumeSnapshot resource

The policy you choose depends on your data criticality, compliance requirements, and cost management strategy.

## Delete Policy Configuration

The Delete policy automatically removes the underlying snapshot when you delete the VolumeSnapshot resource.

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: snapshot-delete-policy
driver: ebs.csi.aws.com
deletionPolicy: Delete
parameters:
  encrypted: "true"
```

This policy is suitable for:

- Temporary snapshots used during testing
- Automated backups with retention management
- Development environments where cost optimization matters

Create a snapshot using this class:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: dev-snapshot
  labels:
    environment: development
    retention: temporary
spec:
  volumeSnapshotClassName: snapshot-delete-policy
  source:
    persistentVolumeClaimName: dev-database-pvc
```

When you delete this snapshot, the underlying storage snapshot is removed:

```bash
# Create the snapshot

kubectl apply -f dev-snapshot.yaml

# Check snapshot status
kubectl get volumesnapshot dev-snapshot

# Get the storage snapshot ID before deleting
CONTENT_NAME=$(kubectl get volumesnapshot dev-snapshot \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')
SNAPSHOT_ID=$(kubectl get volumesnapshotcontent $CONTENT_NAME \
  -o jsonpath='{.status.snapshotHandle}')

# Delete the snapshot - removes both K8s resource and storage snapshot
kubectl delete volumesnapshot dev-snapshot

# Verify snapshot is gone from storage backend
# For AWS EBS:
aws ec2 describe-snapshots --owner-ids self \
  --query "Snapshots[?SnapshotId=='$SNAPSHOT_ID']"
```

## Retain Policy Configuration

The Retain policy preserves the underlying snapshot even after deleting the VolumeSnapshot resource.

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: snapshot-retain-policy
driver: ebs.csi.aws.com
deletionPolicy: Retain
parameters:
  encrypted: "true"
  # Tag snapshots for tracking
  tagSpecification_1: "Environment=Production"
  tagSpecification_2: "Retention=Long-term"
```

This policy is critical for:

- Production snapshots requiring audit trails
- Compliance requirements mandating data retention
- Disaster recovery snapshots
- Long-term archival backups

Create a production snapshot:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: prod-snapshot-20260209
  labels:
    environment: production
    compliance: required
    retention: 7-years
spec:
  volumeSnapshotClassName: snapshot-retain-policy
  source:
    persistentVolumeClaimName: prod-database-pvc
```

When you delete the VolumeSnapshot, the underlying storage remains:

```bash
# Create production snapshot
kubectl apply -f prod-snapshot.yaml

# Get the VolumeSnapshotContent name
CONTENT_NAME=$(kubectl get volumesnapshot prod-snapshot-20260209 \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')
SNAPSHOT_ID=$(kubectl get volumesnapshotcontent $CONTENT_NAME \
  -o jsonpath='{.status.snapshotHandle}')

echo "Snapshot content: $CONTENT_NAME"

# Delete the VolumeSnapshot resource
kubectl delete volumesnapshot prod-snapshot-20260209

# The VolumeSnapshotContent remains with deletionPolicy Retain
kubectl get volumesnapshotcontent $CONTENT_NAME

# The underlying storage snapshot still exists
# For AWS EBS:
aws ec2 describe-snapshots --snapshot-ids "$SNAPSHOT_ID"
```

## Managing Retained Snapshots

When using Retain policy, you must manually clean up VolumeSnapshotContent and storage snapshots.

Create a cleanup script:

```bash
#!/bin/bash
# cleanup-retained-snapshots.sh

set -e

# Find VolumeSnapshotContent resources that are retained
echo "Finding retained snapshot contents..."

kubectl get volumesnapshotcontent -o json | \
  jq -r '.items[] |
    select(.spec.deletionPolicy == "Retain") |
    [.metadata.name, .spec.volumeSnapshotRef.namespace, .spec.volumeSnapshotRef.name] |
    @tsv' | while IFS=$'\t' read -r content_name snapshot_namespace snapshot_name; do

  if kubectl get volumesnapshot "$snapshot_name" -n "$snapshot_namespace" >/dev/null 2>&1; then
    echo "Skipping active snapshot content: $content_name"
    continue
  fi

  echo "Processing: $content_name"

  # Get snapshot handle (cloud provider snapshot ID)
  SNAPSHOT_HANDLE=$(kubectl get volumesnapshotcontent $content_name \
    -o jsonpath='{.status.snapshotHandle}')

  # Get creation time
  CREATED=$(kubectl get volumesnapshotcontent $content_name \
    -o jsonpath='{.metadata.creationTimestamp}')

  echo "  Snapshot ID: $SNAPSHOT_HANDLE"
  echo "  Created: $CREATED"

  # Check age (delete if older than 90 days)
  CREATED_TS=$(date -d "$CREATED" +%s)
  NOW_TS=$(date +%s)
  AGE_DAYS=$(( ($NOW_TS - $CREATED_TS) / 86400 ))

  if [ $AGE_DAYS -gt 90 ]; then
    echo "  Age: $AGE_DAYS days - DELETING"

    # Delete VolumeSnapshotContent
    kubectl delete volumesnapshotcontent $content_name

    # Delete cloud snapshot (AWS EBS example)
    aws ec2 delete-snapshot --snapshot-id $SNAPSHOT_HANDLE
  else
    echo "  Age: $AGE_DAYS days - KEEPING"
  fi
done
```

## Multi-Tier Deletion Strategy

Implement different policies for different tiers:

```yaml
# Tier 1: Development - Delete immediately
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: dev-snapshots
  labels:
    tier: development
driver: ebs.csi.aws.com
deletionPolicy: Delete
parameters:
  encrypted: "false"
  tagSpecification_1: "Tier=Development"
---
# Tier 2: Staging - Retain for 30 days
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: staging-snapshots
  labels:
    tier: staging
driver: ebs.csi.aws.com
deletionPolicy: Retain
parameters:
  encrypted: "true"
  tagSpecification_1: "Tier=Staging"
  tagSpecification_2: "RetentionDays=30"
---
# Tier 3: Production - Retain for 7 years
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: production-snapshots
  labels:
    tier: production
driver: ebs.csi.aws.com
deletionPolicy: Retain
parameters:
  encrypted: "true"
  tagSpecification_1: "Tier=Production"
  tagSpecification_2: "RetentionYears=7"
  tagSpecification_3: "Compliance=Required"
```

## Automated Retention Management

Create a CronJob to manage snapshot lifecycle:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: snapshot-lifecycle-manager
spec:
  schedule: "0 2 * * *"  # Run daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-manager
          restartPolicy: OnFailure
          containers:
          - name: manager
            image: alpine:3.20
            command:
            - /bin/sh
            - -c
            - |
              set -e

              echo "Starting snapshot lifecycle management"

              # Install kubectl, AWS CLI, and jq
              apk add --no-cache aws-cli curl jq
              curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
              chmod +x kubectl
              mv kubectl /usr/local/bin/

              # Process staging snapshots (30-day retention)
              kubectl get volumesnapshotcontent -o json | \
                jq -c '.items[] |
                  select(.spec.deletionPolicy == "Retain") |
                  select(.spec.volumeSnapshotClassName == "staging-snapshots") |
                  {name: .metadata.name,
                   created: .metadata.creationTimestamp,
                   handle: .status.snapshotHandle,
                   snapshotNamespace: .spec.volumeSnapshotRef.namespace,
                   snapshotName: .spec.volumeSnapshotRef.name}' | \
                while read -r item; do

                NAME=$(echo "$item" | jq -r '.name')
                CREATED=$(echo "$item" | jq -r '.created')
                HANDLE=$(echo "$item" | jq -r '.handle')
                SNAPSHOT_NAMESPACE=$(echo "$item" | jq -r '.snapshotNamespace')
                SNAPSHOT_NAME=$(echo "$item" | jq -r '.snapshotName')

                if kubectl get volumesnapshot "$SNAPSHOT_NAME" -n "$SNAPSHOT_NAMESPACE" >/dev/null 2>&1; then
                  echo "Skipping active snapshot content: $NAME"
                  continue
                fi

                AGE_DAYS=$(( ($(date +%s) - $(date -d "$CREATED" +%s)) / 86400 ))

                if [ $AGE_DAYS -gt 30 ]; then
                  echo "Deleting staging snapshot: $NAME (age: $AGE_DAYS days)"
                  kubectl delete volumesnapshotcontent $NAME
                  aws ec2 delete-snapshot --snapshot-id $HANDLE
                fi
              done

              echo "Lifecycle management complete"
```

Create the required RBAC:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: snapshot-manager
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: snapshot-manager-role
rules:
- apiGroups: ["snapshot.storage.k8s.io"]
  resources: ["volumesnapshotcontents", "volumesnapshots"]
  verbs: ["get", "list", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: snapshot-manager-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: snapshot-manager-role
subjects:
- kind: ServiceAccount
  name: snapshot-manager
  namespace: default
```

## Policy Change Impact

Changing deletion policy does not affect existing snapshots:

```bash
# Check current policy
kubectl get volumesnapshotclass snapshot-delete-policy -o yaml

# Update to Retain
kubectl patch volumesnapshotclass snapshot-delete-policy \
  --type='json' -p='[{"op": "replace", "path": "/deletionPolicy", "value":"Retain"}]'

# Existing snapshots keep their original policy
# New snapshots will use the updated policy
kubectl get volumesnapshotcontent -o custom-columns=\
NAME:.metadata.name,\
DELETION_POLICY:.spec.deletionPolicy,\
AGE:.metadata.creationTimestamp
```

## Monitoring Deletion Policy Compliance

Create a monitoring dashboard:

```bash
#!/bin/bash
# snapshot-policy-report.sh

echo "=== Snapshot Deletion Policy Report ==="
echo

# Count by deletion policy
echo "Snapshots by Deletion Policy:"
kubectl get volumesnapshotcontent -o json | \
  jq -r '.items | group_by(.spec.deletionPolicy) |
    .[] | "\(.[0].spec.deletionPolicy): \(length)"'

echo

# List retained snapshots whose referenced VolumeSnapshot no longer exists
echo "Orphaned Retained Snapshots:"
kubectl get volumesnapshotcontent -o json | \
  jq -r '.items[] |
    select(.spec.deletionPolicy == "Retain") |
    [.metadata.name, .metadata.creationTimestamp, .spec.volumeSnapshotRef.namespace, .spec.volumeSnapshotRef.name] |
    @tsv' | while IFS=$'\t' read -r content_name created snapshot_namespace snapshot_name; do
    if ! kubectl get volumesnapshot "$snapshot_name" -n "$snapshot_namespace" >/dev/null 2>&1; then
      printf "%s\t%s\t%s/%s\n" "$content_name" "$created" "$snapshot_namespace" "$snapshot_name"
    fi
  done | column -t

echo

# Calculate storage cost (AWS EBS example)
echo "Estimated Monthly Cost (AWS EBS at $0.05/GB-month):"
TOTAL_GB=$(kubectl get volumesnapshotcontent -o json | \
  jq '[.items[].status.restoreSize |
    rtrimstr("Gi") | tonumber] | add // 0')

COST=$(echo "scale=2; $TOTAL_GB * 0.05" | bc)
echo "$TOTAL_GB GB = \$$COST/month"
```

## Best Practices

1. **Use Delete for temporary snapshots** to avoid storage costs
2. **Use Retain for production snapshots** to prevent accidental data loss
3. **Tag retained snapshots** with retention policies
4. **Implement automated cleanup** for retained snapshots
5. **Monitor orphaned VolumeSnapshotContent** resources
6. **Document deletion policies** for compliance
7. **Test restore before cleanup** of retained snapshots
8. **Set up alerts** for unexpected snapshot deletions

## Emergency Recovery from Deleted Snapshots

If you accidentally delete a VolumeSnapshot with Delete policy, recovery depends on cloud provider features:

```bash
# AWS EBS: Check Recycle Bin (if a retention rule matched the snapshot)
aws ec2 list-snapshots-in-recycle-bin \
  --snapshot-ids <snapshot-id>

# GCP: Deleted Compute Engine snapshots cannot be recovered
gcloud compute snapshots list --filter="creationTimestamp>='2026-02-09'"

# Azure: Check for existing snapshots created after the incident date
az snapshot list --query "[?timeCreated>='2026-02-09']"
```

Proper deletion policy configuration ensures your snapshot lifecycle aligns with business requirements while managing storage costs effectively. Always test your cleanup procedures in non-production environments before deploying to production.
