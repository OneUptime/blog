# How to Configure Cross-Namespace Volume Snapshot Restore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, VolumeSnapshot, Multi-Tenancy

Description: Learn how to restore volume snapshots across Kubernetes namespaces for data sharing, environment promotion, and disaster recovery scenarios using VolumeSnapshotContent resources.

---

Cross-namespace snapshot restore enables data sharing between isolated environments, promotes data from staging to production, and supports disaster recovery workflows. This capability is essential for multi-tenant clusters and development workflows.

## Understanding Cross-Namespace Snapshot Architecture

VolumeSnapshots are namespace-scoped resources, meaning they exist within a single namespace. However, the underlying VolumeSnapshotContent is cluster-scoped, allowing snapshots to be referenced across namespaces.

The workflow involves:

1. Create snapshot in source namespace
2. Identify the VolumeSnapshotContent (cluster-scoped)
3. Create PVC in target namespace referencing the content
4. Optionally create a VolumeSnapshot reference in target namespace

## Basic Cross-Namespace Restore

Start with a snapshot in the production namespace:

```bash
# Create a production database with data
kubectl create namespace production

kubectl apply -n production -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
---
apiVersion: v1
kind: Pod
metadata:
  name: database
spec:
  containers:
  - name: postgres
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      value: "prod-password"
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: database-pvc
EOF

# Wait for pod to be ready
kubectl wait -n production --for=condition=ready pod database --timeout=120s

# Create test data
kubectl exec -n production database -- psql -U postgres -c "
CREATE DATABASE proddb;
\c proddb
CREATE TABLE customers (id SERIAL PRIMARY KEY, name VARCHAR(100));
INSERT INTO customers (name) VALUES ('Customer A'), ('Customer B');
"
```

Create a snapshot in the production namespace:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: production-snapshot
  namespace: production
spec:
  volumeSnapshotClassName: csi-snapshot-class
  source:
    persistentVolumeClaimName: database-pvc
```

Apply and get the VolumeSnapshotContent:

```bash
kubectl apply -f production-snapshot.yaml

# Wait for snapshot to be ready
kubectl wait -n production \
  --for=jsonpath='{.status.readyToUse}'=true \
  volumesnapshot/production-snapshot --timeout=300s

# Get the cluster-scoped VolumeSnapshotContent name
CONTENT_NAME=$(kubectl get volumesnapshot production-snapshot -n production \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')

echo "VolumeSnapshotContent: $CONTENT_NAME"

# View the content (cluster-scoped, no namespace)
kubectl get volumesnapshotcontent $CONTENT_NAME
```

Now restore to the development namespace:

```bash
# Create development namespace
kubectl create namespace development

# Create PVC in development namespace using the VolumeSnapshotContent
kubectl apply -n development -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dev-database-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
  dataSource:
    name: $CONTENT_NAME
    kind: VolumeSnapshotContent
    apiGroup: snapshot.storage.k8s.io
EOF
```

Verify the restore in development:

```bash
# Deploy database in development
kubectl apply -n development -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: database
spec:
  containers:
  - name: postgres
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      value: "dev-password"
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: dev-database-pvc
EOF

kubectl wait -n development --for=condition=ready pod database --timeout=120s

# Verify data was restored
kubectl exec -n development database -- psql -U postgres -d proddb -c "
SELECT * FROM customers;
"
# Should show Customer A and Customer B
```

## Automated Cross-Namespace Restore Script

Create a script to automate cross-namespace restore:

```bash
#!/bin/bash
# cross-namespace-restore.sh

set -e

SOURCE_NAMESPACE="${1}"
SOURCE_SNAPSHOT="${2}"
TARGET_NAMESPACE="${3}"
TARGET_PVC_NAME="${4}"

if [ -z "$SOURCE_NAMESPACE" ] || [ -z "$SOURCE_SNAPSHOT" ] || \
   [ -z "$TARGET_NAMESPACE" ] || [ -z "$TARGET_PVC_NAME" ]; then
  echo "Usage: $0 <source-namespace> <source-snapshot> <target-namespace> <target-pvc-name>"
  exit 1
fi

echo "=== Cross-Namespace Snapshot Restore ==="
echo "Source: $SOURCE_NAMESPACE/$SOURCE_SNAPSHOT"
echo "Target: $TARGET_NAMESPACE/$TARGET_PVC_NAME"
echo

# Verify source snapshot exists and is ready
echo "Verifying source snapshot..."
READY=$(kubectl get volumesnapshot $SOURCE_SNAPSHOT -n $SOURCE_NAMESPACE \
  -o jsonpath='{.status.readyToUse}' 2>/dev/null || echo "false")

if [ "$READY" != "true" ]; then
  echo "ERROR: Snapshot $SOURCE_SNAPSHOT in namespace $SOURCE_NAMESPACE is not ready"
  exit 1
fi

# Get VolumeSnapshotContent name
CONTENT_NAME=$(kubectl get volumesnapshot $SOURCE_SNAPSHOT -n $SOURCE_NAMESPACE \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')

echo "VolumeSnapshotContent: $CONTENT_NAME"

# Get snapshot details
RESTORE_SIZE=$(kubectl get volumesnapshot $SOURCE_SNAPSHOT -n $SOURCE_NAMESPACE \
  -o jsonpath='{.status.restoreSize}')
STORAGE_CLASS=$(kubectl get pvc -n $SOURCE_NAMESPACE \
  $(kubectl get volumesnapshot $SOURCE_SNAPSHOT -n $SOURCE_NAMESPACE \
    -o jsonpath='{.spec.source.persistentVolumeClaimName}') \
  -o jsonpath='{.spec.storageClassName}')

echo "Restore size: $RESTORE_SIZE"
echo "Storage class: $STORAGE_CLASS"

# Create target namespace if it doesn't exist
if ! kubectl get namespace $TARGET_NAMESPACE &>/dev/null; then
  echo "Creating namespace $TARGET_NAMESPACE..."
  kubectl create namespace $TARGET_NAMESPACE
fi

# Create PVC in target namespace
echo "Creating PVC in target namespace..."
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: $TARGET_PVC_NAME
  namespace: $TARGET_NAMESPACE
  labels:
    restored-from-snapshot: $SOURCE_SNAPSHOT
    source-namespace: $SOURCE_NAMESPACE
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: $RESTORE_SIZE
  storageClassName: $STORAGE_CLASS
  dataSource:
    name: $CONTENT_NAME
    kind: VolumeSnapshotContent
    apiGroup: snapshot.storage.k8s.io
EOF

# Wait for PVC to be bound
echo "Waiting for PVC to be bound..."
kubectl wait -n $TARGET_NAMESPACE \
  --for=jsonpath='{.status.phase}'=Bound \
  pvc/$TARGET_PVC_NAME --timeout=600s

echo "✓ Cross-namespace restore complete"
kubectl get pvc -n $TARGET_NAMESPACE $TARGET_PVC_NAME
```

Make it executable and use it:

```bash
chmod +x cross-namespace-restore.sh
./cross-namespace-restore.sh production production-snapshot development dev-database-pvc
```

## Creating VolumeSnapshot Reference in Target Namespace

For better organization, create a VolumeSnapshot resource in the target namespace:

```bash
# Get the VolumeSnapshotContent
CONTENT_NAME=$(kubectl get volumesnapshot production-snapshot -n production \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')

# Create VolumeSnapshot reference in development namespace
kubectl apply -n development -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: prod-snapshot-reference
  labels:
    source-namespace: production
    source-snapshot: production-snapshot
spec:
  source:
    volumeSnapshotContentName: $CONTENT_NAME
  volumeSnapshotClassName: csi-snapshot-class
EOF

# Now you can use this snapshot reference in the same namespace
kubectl apply -n development -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dev-pvc-from-reference
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
  dataSource:
    name: prod-snapshot-reference
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
EOF
```

## Environment Promotion Workflow

Promote data from staging to production:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: promote-staging-to-prod
  namespace: staging
spec:
  template:
    spec:
      serviceAccountName: snapshot-promoter
      restartPolicy: OnFailure
      containers:
      - name: promoter
        image: bitnami/kubectl:latest
        command:
        - /bin/bash
        - -c
        - |
          set -e

          echo "=== Promoting staging data to production ==="

          TIMESTAMP=$(date +%Y%m%d-%H%M%S)
          SNAPSHOT_NAME="staging-promotion-${TIMESTAMP}"

          # Step 1: Create snapshot in staging
          echo "Creating snapshot in staging..."
          kubectl apply -f - <<EOF
          apiVersion: snapshot.storage.k8s.io/v1
          kind: VolumeSnapshot
          metadata:
            name: $SNAPSHOT_NAME
            namespace: staging
            labels:
              promotion: production
              timestamp: $TIMESTAMP
          spec:
            volumeSnapshotClassName: csi-snapshot-class
            source:
              persistentVolumeClaimName: staging-database-pvc
          EOF

          # Wait for snapshot to be ready
          echo "Waiting for snapshot..."
          kubectl wait -n staging \
            --for=jsonpath='{.status.readyToUse}'=true \
            volumesnapshot/$SNAPSHOT_NAME --timeout=300s

          # Step 2: Get VolumeSnapshotContent
          CONTENT_NAME=$(kubectl get volumesnapshot $SNAPSHOT_NAME -n staging \
            -o jsonpath='{.status.boundVolumeSnapshotContentName}')

          echo "VolumeSnapshotContent: $CONTENT_NAME"

          # Step 3: Scale down production deployment
          echo "Scaling down production..."
          kubectl scale deployment database -n production --replicas=0
          kubectl wait -n production --for=delete pod -l app=database --timeout=60s

          # Step 4: Delete old production PVC
          echo "Removing old production data..."
          kubectl delete pvc database-pvc -n production

          # Step 5: Create new production PVC from staging snapshot
          echo "Creating production PVC from staging snapshot..."
          RESTORE_SIZE=$(kubectl get volumesnapshot $SNAPSHOT_NAME -n staging \
            -o jsonpath='{.status.restoreSize}')

          kubectl apply -f - <<EOF
          apiVersion: v1
          kind: PersistentVolumeClaim
          metadata:
            name: database-pvc
            namespace: production
            labels:
              promoted-from: staging
              promotion-timestamp: $TIMESTAMP
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: $RESTORE_SIZE
            storageClassName: standard
            dataSource:
              name: $CONTENT_NAME
              kind: VolumeSnapshotContent
              apiGroup: snapshot.storage.k8s.io
          EOF

          # Wait for PVC to be bound
          kubectl wait -n production \
            --for=jsonpath='{.status.phase}'=Bound \
            pvc/database-pvc --timeout=600s

          # Step 6: Scale production back up
          echo "Scaling production back up..."
          kubectl scale deployment database -n production --replicas=1

          echo "✓ Promotion complete"
```

Create RBAC for the promotion job:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: snapshot-promoter
  namespace: staging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: snapshot-promoter-role
rules:
- apiGroups: ["snapshot.storage.k8s.io"]
  resources: ["volumesnapshots", "volumesnapshotcontents"]
  verbs: ["create", "get", "list"]
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["create", "get", "list", "delete"]
- apiGroups: ["apps"]
  resources: ["deployments", "deployments/scale"]
  verbs: ["get", "patch", "update"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: snapshot-promoter-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: snapshot-promoter-role
subjects:
- kind: ServiceAccount
  name: snapshot-promoter
  namespace: staging
```

## Disaster Recovery Across Namespaces

Set up a disaster recovery namespace:

```bash
#!/bin/bash
# dr-restore.sh

set -e

echo "=== Disaster Recovery: Restoring to DR namespace ==="

DR_NAMESPACE="disaster-recovery"
PROD_NAMESPACE="production"

# Create DR namespace
kubectl create namespace $DR_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Find latest production snapshot
LATEST_SNAPSHOT=$(kubectl get volumesnapshot -n $PROD_NAMESPACE \
  --sort-by=.metadata.creationTimestamp \
  -o jsonpath='{.items[-1].metadata.name}')

echo "Latest production snapshot: $LATEST_SNAPSHOT"

# Get VolumeSnapshotContent
CONTENT_NAME=$(kubectl get volumesnapshot $LATEST_SNAPSHOT -n $PROD_NAMESPACE \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')

# Get all PVCs from production that have snapshots
kubectl get volumesnapshot -n $PROD_NAMESPACE -o json | \
  jq -r '.items[] | .spec.source.persistentVolumeClaimName' | \
  sort -u | while read PVC; do

  echo "Restoring PVC: $PVC"

  # Find snapshot for this PVC
  SNAPSHOT=$(kubectl get volumesnapshot -n $PROD_NAMESPACE \
    --field-selector spec.source.persistentVolumeClaimName=$PVC \
    --sort-by=.metadata.creationTimestamp \
    -o jsonpath='{.items[-1].metadata.name}')

  if [ -n "$SNAPSHOT" ]; then
    CONTENT=$(kubectl get volumesnapshot $SNAPSHOT -n $PROD_NAMESPACE \
      -o jsonpath='{.status.boundVolumeSnapshotContentName}')

    RESTORE_SIZE=$(kubectl get volumesnapshot $SNAPSHOT -n $PROD_NAMESPACE \
      -o jsonpath='{.status.restoreSize}')

    # Create PVC in DR namespace
    kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: $PVC
  namespace: $DR_NAMESPACE
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: $RESTORE_SIZE
  storageClassName: standard
  dataSource:
    name: $CONTENT
    kind: VolumeSnapshotContent
    apiGroup: snapshot.storage.k8s.io
EOF

    echo "Restored $PVC to DR namespace"
  fi
done

echo "✓ DR restore complete"
```

## Best Practices

1. **Use VolumeSnapshotContent** for cross-namespace references
2. **Document promotion workflows** for team clarity
3. **Test DR procedures** regularly
4. **Label snapshots** with source namespace information
5. **Implement RBAC** to control cross-namespace access
6. **Automate environment promotion** for consistency
7. **Monitor snapshot usage** across namespaces
8. **Plan for storage quotas** in target namespaces

Cross-namespace snapshot restore enables flexible data management strategies in multi-tenant Kubernetes environments. Proper implementation supports development workflows, disaster recovery, and data sharing while maintaining security boundaries.
