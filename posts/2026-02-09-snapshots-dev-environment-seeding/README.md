# How to Use Volume Snapshots for Development Environment Seeding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Development, VolumeSnapshot, Environment Management

Description: Learn how to use volume snapshots to seed development and testing environments with production-like data, enabling realistic testing while maintaining data privacy and security.

---

Development teams need realistic data for testing, but copying production data manually is slow and risky. Volume snapshots enable rapid environment seeding with production-like data while maintaining security and privacy controls.

## Understanding Environment Seeding

Environment seeding involves:

1. Creating snapshots of production data
2. Sanitizing sensitive information
3. Cloning to development namespaces
4. Automating the refresh process
5. Managing data lifecycle
6. Ensuring compliance with privacy regulations

This provides developers with realistic test data without compromising security.

## Basic Development Environment Seeding

Create a development environment from production:

```bash
#!/bin/bash
# seed-dev-environment.sh

set -e

PROD_NAMESPACE="production"
DEV_NAMESPACE="development"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "=== Seeding Development Environment ==="

# Step 1: Create production snapshot
echo "Creating production snapshot..."

kubectl apply -n $PROD_NAMESPACE -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: prod-seed-$TIMESTAMP
  labels:
    purpose: dev-seeding
spec:
  volumeSnapshotClassName: csi-snapshot-class
  source:
    persistentVolumeClaimName: postgres-pvc
EOF

# Wait for snapshot
kubectl wait -n $PROD_NAMESPACE \
  --for=jsonpath='{.status.readyToUse}'=true \
  volumesnapshot/prod-seed-$TIMESTAMP --timeout=300s

# Get VolumeSnapshotContent for cross-namespace restore
CONTENT_NAME=$(kubectl get volumesnapshot prod-seed-$TIMESTAMP -n $PROD_NAMESPACE \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')

echo "✓ Snapshot created: $CONTENT_NAME"

# Step 2: Create dev PVC from snapshot
echo "Creating development PVC..."

RESTORE_SIZE=$(kubectl get volumesnapshot prod-seed-$TIMESTAMP -n $PROD_NAMESPACE \
  -o jsonpath='{.status.restoreSize}')

kubectl apply -n $DEV_NAMESPACE -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  labels:
    seeded-from: production
    seed-timestamp: $TIMESTAMP
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

kubectl wait -n $DEV_NAMESPACE \
  --for=jsonpath='{.status.phase}'=Bound \
  pvc/postgres-pvc --timeout=600s

echo "✓ Development environment seeded"
```

## Automated Data Sanitization

Sanitize sensitive data after seeding:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: sanitize-dev-data
  namespace: development
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: sanitizer
        image: postgres:15
        env:
        - name: PGHOST
          value: "postgres-service"
        - name: PGUSER
          value: "postgres"
        - name: PGPASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        command:
        - /bin/bash
        - -c
        - |
          set -e

          echo "=== Sanitizing Development Data ==="

          # Wait for database to be ready
          until psql -c "SELECT 1" > /dev/null 2>&1; do
            echo "Waiting for database..."
            sleep 2
          done

          echo "Database ready, starting sanitization..."

          # Anonymize customer data
          psql <<EOF
          -- Anonymize emails
          UPDATE users
          SET email = 'user' || id || '@example.com'
          WHERE email NOT LIKE '%@example.com';

          -- Anonymize names
          UPDATE users
          SET
            first_name = 'User',
            last_name = id::text,
            phone = NULL
          WHERE id > 0;

          -- Anonymize addresses
          UPDATE addresses
          SET
            street = 'Test Street',
            city = 'Test City',
            postal_code = '00000',
            country = 'US';

          -- Remove payment information
          DELETE FROM payment_methods;

          -- Anonymize sensitive logs
          TRUNCATE TABLE audit_logs;

          -- Reset passwords to dev default
          UPDATE users
          SET password_hash = crypt('devpassword', gen_salt('bf'));
          EOF

          echo "✓ Data sanitization complete"

          # Verify sanitization
          echo "Verifying sanitization..."

          PROD_EMAILS=$(psql -t -c "SELECT COUNT(*) FROM users WHERE email NOT LIKE '%@example.com';")

          if [ "$PROD_EMAILS" -gt 0 ]; then
            echo "WARNING: $PROD_EMAILS production emails still exist"
            exit 1
          fi

          echo "✓ Verification passed"
```

## Scheduled Environment Refresh

Automate weekly environment refresh:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: refresh-dev-environment
  namespace: development
spec:
  schedule: "0 2 * * 1"  # Every Monday at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: env-seeder
          restartPolicy: OnFailure
          containers:
          - name: refresh
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              set -e

              echo "=== Refreshing Development Environment ==="

              TIMESTAMP=$(date +%Y%m%d-%H%M%S)

              # Step 1: Scale down dev applications
              echo "Scaling down development..."
              kubectl scale deployment --all --replicas=0 -n development

              # Step 2: Create fresh prod snapshot
              echo "Creating production snapshot..."
              kubectl apply -n production -f - <<EOF
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: weekly-refresh-$TIMESTAMP
                labels:
                  purpose: dev-refresh
              spec:
                volumeSnapshotClassName: csi-snapshot-class
                source:
                  persistentVolumeClaimName: postgres-pvc
              EOF

              kubectl wait -n production \
                --for=jsonpath='{.status.readyToUse}'=true \
                volumesnapshot/weekly-refresh-$TIMESTAMP --timeout=300s

              # Step 3: Delete old dev PVC
              echo "Removing old development data..."
              kubectl delete pvc postgres-pvc -n development

              # Step 4: Create new dev PVC from snapshot
              CONTENT_NAME=$(kubectl get volumesnapshot weekly-refresh-$TIMESTAMP -n production \
                -o jsonpath='{.status.boundVolumeSnapshotContentName}')

              RESTORE_SIZE=$(kubectl get volumesnapshot weekly-refresh-$TIMESTAMP -n production \
                -o jsonpath='{.status.restoreSize}')

              kubectl apply -n development -f - <<EOF
              apiVersion: v1
              kind: PersistentVolumeClaim
              metadata:
                name: postgres-pvc
                labels:
                  refreshed: $TIMESTAMP
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

              kubectl wait -n development \
                --for=jsonpath='{.status.phase}'=Bound \
                pvc/postgres-pvc --timeout=600s

              # Step 5: Run sanitization
              echo "Running data sanitization..."
              kubectl apply -n development -f /config/sanitize-job.yaml

              kubectl wait -n development \
                --for=condition=complete \
                job/sanitize-dev-data --timeout=300s

              # Step 6: Scale applications back up
              echo "Scaling development back up..."
              kubectl scale deployment --all --replicas=1 -n development

              echo "✓ Development environment refreshed"
```

## Multi-Developer Environment Seeding

Create individual environments for each developer:

```bash
#!/bin/bash
# create-developer-environment.sh

DEVELOPER="${1}"
SOURCE_SNAPSHOT="${2:-latest}"

if [ -z "$DEVELOPER" ]; then
  echo "Usage: $0 <developer-name> [snapshot-name]"
  exit 1
fi

DEV_NAMESPACE="dev-${DEVELOPER}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "=== Creating Environment for $DEVELOPER ==="

# Create namespace
kubectl create namespace $DEV_NAMESPACE

# Label namespace
kubectl label namespace $DEV_NAMESPACE \
  owner=$DEVELOPER \
  environment=development \
  auto-cleanup=true \
  ttl=7d

# Get source snapshot
if [ "$SOURCE_SNAPSHOT" = "latest" ]; then
  SOURCE_SNAPSHOT=$(kubectl get volumesnapshot -n production \
    --sort-by=.metadata.creationTimestamp \
    -o jsonpath='{.items[-1].metadata.name}')
fi

CONTENT_NAME=$(kubectl get volumesnapshot $SOURCE_SNAPSHOT -n production \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')

# Create PVC for developer
echo "Creating data volume..."

RESTORE_SIZE=$(kubectl get volumesnapshot $SOURCE_SNAPSHOT -n production \
  -o jsonpath='{.status.restoreSize}')

kubectl apply -n $DEV_NAMESPACE -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-pvc
  labels:
    owner: $DEVELOPER
    seeded-from: $SOURCE_SNAPSHOT
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

kubectl wait -n $DEV_NAMESPACE \
  --for=jsonpath='{.status.phase}'=Bound \
  pvc/database-pvc --timeout=600s

# Deploy application stack
echo "Deploying application stack..."

kubectl apply -n $DEV_NAMESPACE -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
spec:
  replicas: 1
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          value: devpassword
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: database-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: database-service
spec:
  selector:
    app: database
  ports:
  - port: 5432
EOF

echo "✓ Environment created for $DEVELOPER"
echo "Namespace: $DEV_NAMESPACE"
echo "Database: postgres://database-service:5432"
```

## Cleanup Old Development Environments

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-dev-environments
spec:
  schedule: "0 0 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: env-cleaner
          restartPolicy: OnFailure
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              set -e

              echo "=== Cleaning Up Old Development Environments ==="

              # Find namespaces with ttl label
              kubectl get namespace -l auto-cleanup=true -o json | \
                jq -r '.items[] |
                  {
                    name: .metadata.name,
                    created: .metadata.creationTimestamp,
                    ttl: .metadata.labels.ttl
                  }' | \
                while read -r ns; do

                NAME=$(echo $ns | jq -r '.name')
                CREATED=$(echo $ns | jq -r '.created')
                TTL=$(echo $ns | jq -r '.ttl' | sed 's/d//')

                CREATED_TS=$(date -d "$CREATED" +%s)
                NOW_TS=$(date +%s)
                AGE_DAYS=$(( ($NOW_TS - $CREATED_TS) / 86400 ))

                if [ $AGE_DAYS -gt $TTL ]; then
                  echo "Deleting namespace $NAME (age: $AGE_DAYS days, ttl: $TTL days)"
                  kubectl delete namespace $NAME
                fi
              done

              echo "✓ Cleanup complete"
```

## Best Practices

1. **Always sanitize production data** before dev use
2. **Automate environment refresh** regularly
3. **Set TTLs** on development environments
4. **Use resource quotas** to limit dev environment size
5. **Track data lineage** with labels
6. **Implement RBAC** to control who can seed environments
7. **Monitor storage costs** for dev environments
8. **Document sanitization procedures** for compliance

Volume snapshots enable rapid development environment seeding with realistic data while maintaining security and cost control. Proper implementation accelerates development cycles and improves testing quality.
