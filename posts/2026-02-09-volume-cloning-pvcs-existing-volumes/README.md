# How to Use Volume Cloning to Create PVCs from Existing Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, VolumeCloning, PersistentVolume

Description: Learn how to clone persistent volumes in Kubernetes to quickly create copies of existing data for testing, development, and disaster recovery scenarios using CSI volume cloning features.

---

Volume cloning allows you to create new PersistentVolumeClaims that are exact copies of existing volumes. This feature is faster than restoring from snapshots and perfect for quickly spinning up test environments, database replicas, or development instances.

## Understanding Volume Cloning

Volume cloning creates a duplicate of an existing PVC:

1. **Source PVC** - The original volume to clone
2. **Clone PVC** - The new volume with copied data
3. **CSI driver** - Handles the actual cloning operation

Cloning differs from snapshots:

- **Cloning** creates a new PVC directly from another PVC
- **Snapshots** create an intermediate snapshot resource first

Benefits of cloning:

- Faster than snapshot-restore workflow
- Simpler for same-namespace copies
- Efficient storage-level copy operations

## Prerequisites

Verify your CSI driver supports cloning:

```bash
# Check CSI driver capabilities
kubectl get csidriver

# For AWS EBS
kubectl get csidriver ebs.csi.aws.com -o yaml | grep -A 5 volumeLifecycleModes

# Should include: "Persistent"
```

Ensure you have a StorageClass that supports cloning:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cloneable-storage
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Creating Your First Volume Clone

Start with a source PVC containing data:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: source-database-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: cloneable-storage
  resources:
    requests:
      storage: 20Gi
```

Create a database with sample data:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: source-database
spec:
  containers:
  - name: postgres
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      value: "password123"
    - name: PGDATA
      value: /var/lib/postgresql/data/pgdata
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: source-database-pvc
```

Deploy and populate with data:

```bash
kubectl apply -f source-pvc.yaml
kubectl apply -f source-database.yaml

# Wait for pod to be ready
kubectl wait --for=condition=ready pod source-database --timeout=120s

# Create test data
kubectl exec source-database -- psql -U postgres -c "
CREATE DATABASE testdb;
\c testdb
CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(100), email VARCHAR(100));
INSERT INTO users (name, email) VALUES
  ('Alice', 'alice@example.com'),
  ('Bob', 'bob@example.com'),
  ('Charlie', 'charlie@example.com');
"

# Verify data
kubectl exec source-database -- psql -U postgres -d testdb -c "SELECT * FROM users;"
```

Now clone the volume:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cloned-database-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: cloneable-storage
  resources:
    requests:
      storage: 20Gi  # Must be >= source size
  # Specify the source PVC to clone
  dataSource:
    kind: PersistentVolumeClaim
    name: source-database-pvc
```

Apply the clone:

```bash
kubectl apply -f cloned-pvc.yaml

# Watch the cloning process
kubectl get pvc cloned-database-pvc -w

# When STATUS shows "Bound", cloning is complete
```

Verify the cloned data:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cloned-database
spec:
  containers:
  - name: postgres
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      value: "password123"
    - name: PGDATA
      value: /var/lib/postgresql/data/pgdata
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: cloned-database-pvc
```

Deploy and verify:

```bash
kubectl apply -f cloned-database.yaml
kubectl wait --for=condition=ready pod cloned-database --timeout=120s

# Verify data was cloned
kubectl exec cloned-database -- psql -U postgres -d testdb -c "SELECT * FROM users;"

# Should show the same data as source database
```

## Cloning to a Larger Size

Clone a volume and expand it simultaneously:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: expanded-clone-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: cloneable-storage
  resources:
    requests:
      # Clone 20Gi source to 50Gi destination
      storage: 50Gi
  dataSource:
    kind: PersistentVolumeClaim
    name: source-database-pvc
```

The clone will have 50Gi capacity with all data from the 20Gi source.

## Cloning for Development Environments

Create multiple clones for parallel development:

```yaml
# Clone 1: Feature branch testing
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dev-feature-a-pvc
  labels:
    environment: dev
    feature: feature-a
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: cloneable-storage
  resources:
    requests:
      storage: 20Gi
  dataSource:
    kind: PersistentVolumeClaim
    name: source-database-pvc
---
# Clone 2: Different feature testing
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dev-feature-b-pvc
  labels:
    environment: dev
    feature: feature-b
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: cloneable-storage
  resources:
    requests:
      storage: 20Gi
  dataSource:
    kind: PersistentVolumeClaim
    name: source-database-pvc
---
# Clone 3: Bug fix testing
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dev-bugfix-pvc
  labels:
    environment: dev
    purpose: bugfix
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: cloneable-storage
  resources:
    requests:
      storage: 20Gi
  dataSource:
    kind: PersistentVolumeClaim
    name: source-database-pvc
```

## Automated Clone Creation

Create a script to automate cloning:

```bash
#!/bin/bash
# clone-pvc.sh

set -e

SOURCE_PVC="${1}"
CLONE_NAME="${2}"
NAMESPACE="${3:-default}"

if [ -z "$SOURCE_PVC" ] || [ -z "$CLONE_NAME" ]; then
    echo "Usage: $0 <source-pvc> <clone-name> [namespace]"
    exit 1
fi

echo "Cloning PVC $SOURCE_PVC to $CLONE_NAME in namespace $NAMESPACE"

# Get source PVC details
SOURCE_SIZE=$(kubectl get pvc -n "$NAMESPACE" "$SOURCE_PVC" \
  -o jsonpath='{.spec.resources.requests.storage}')
SOURCE_SC=$(kubectl get pvc -n "$NAMESPACE" "$SOURCE_PVC" \
  -o jsonpath='{.spec.storageClassName}')
ACCESS_MODES=$(kubectl get pvc -n "$NAMESPACE" "$SOURCE_PVC" \
  -o jsonpath='{.spec.accessModes[0]}')

echo "Source size: $SOURCE_SIZE"
echo "StorageClass: $SOURCE_SC"
echo "Access mode: $ACCESS_MODES"

# Create the clone
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: $CLONE_NAME
  namespace: $NAMESPACE
  labels:
    cloned-from: $SOURCE_PVC
    clone-date: $(date +%Y-%m-%d)
spec:
  accessModes:
    - $ACCESS_MODES
  storageClassName: $SOURCE_SC
  resources:
    requests:
      storage: $SOURCE_SIZE
  dataSource:
    kind: PersistentVolumeClaim
    name: $SOURCE_PVC
EOF

# Wait for clone to be bound
echo "Waiting for clone to be ready..."
kubectl wait --for=jsonpath='{.status.phase}'=Bound \
  pvc/$CLONE_NAME -n "$NAMESPACE" --timeout=600s

echo "Clone created successfully!"
kubectl get pvc -n "$NAMESPACE" "$CLONE_NAME"
```

Use the script:

```bash
chmod +x clone-pvc.sh
./clone-pvc.sh source-database-pvc test-clone-1 default
```

## Cloning Across Namespaces

Note: Direct PVC cloning only works within the same namespace. For cross-namespace cloning, use snapshots:

```bash
# Step 1: Create snapshot of source PVC
kubectl apply -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: cross-ns-snapshot
  namespace: production
spec:
  volumeSnapshotClassName: csi-snapshot-class
  source:
    persistentVolumeClaimName: source-database-pvc
EOF

# Step 2: Get the VolumeSnapshotContent name
SNAPSHOT_CONTENT=$(kubectl get volumesnapshot cross-ns-snapshot -n production \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')

# Step 3: Create PVC in different namespace using VolumeSnapshotContent
kubectl apply -n development -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cloned-from-prod
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: cloneable-storage
  resources:
    requests:
      storage: 20Gi
  dataSource:
    kind: VolumeSnapshotContent
    apiGroup: snapshot.storage.k8s.io
    name: $SNAPSHOT_CONTENT
EOF
```

## Cloning Performance Considerations

Monitor cloning operations:

```bash
# Check clone creation time
kubectl get events --field-selector involvedObject.name=cloned-database-pvc

# Watch PVC status during cloning
kubectl get pvc cloned-database-pvc -o yaml -w

# Check CSI driver logs
kubectl logs -n kube-system -l app=ebs-csi-controller --tail=100 | grep -i clone
```

## Cleanup Strategy for Clones

Implement automatic cleanup for old clones:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-old-clones
spec:
  schedule: "0 4 * * *"  # Daily at 4 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: clone-cleanup
          restartPolicy: OnFailure
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Delete clones older than 7 days
              CUTOFF_DATE=$(date -d '7 days ago' +%s)

              kubectl get pvc -o json | jq -r '.items[] |
                select(.metadata.labels."cloned-from" != null) |
                select(.metadata.labels."clone-date" != null) |
                select(((.metadata.labels."clone-date" + "T00:00:00Z" | fromdateiso8601) < '$CUTOFF_DATE')) |
                .metadata.name' | while read pvc; do

                echo "Deleting old clone: $pvc"
                kubectl delete pvc $pvc
              done
```

## Troubleshooting Clone Operations

Common issues:

```bash
# 1. Clone stuck in Pending
kubectl describe pvc cloned-database-pvc

# Look for errors like:
# - "source PVC must be bound"
# - "cloning not supported by provisioner"

# Solution: Verify source PVC is bound
kubectl get pvc source-database-pvc

# 2. Clone size mismatch
# Error: "requested size must be >= source size"

# Solution: Check source size and increase clone size
SOURCE_SIZE=$(kubectl get pvc source-database-pvc -o jsonpath='{.spec.resources.requests.storage}')
echo "Source size: $SOURCE_SIZE"

# 3. CSI driver doesn't support cloning
kubectl get csidriver -o yaml | grep -A 10 volumeLifecycleModes

# If cloning not supported, use snapshot-restore instead
```

## Best Practices

1. **Use cloning for same-namespace copies** for speed
2. **Use snapshots for cross-namespace** copying
3. **Label clones** with source and creation date
4. **Automate cleanup** of old clones
5. **Monitor clone creation time** for large volumes
6. **Test clone integrity** before using in production workflows
7. **Set appropriate resource quotas** to prevent excessive cloning
8. **Document cloning procedures** for team members

Volume cloning provides a fast, efficient way to duplicate data for testing, development, and disaster recovery scenarios, making it an essential tool for managing stateful applications in Kubernetes.
