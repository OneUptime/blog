# How to Use Volume Cloning for StatefulSet Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, StatefulSet, VolumeCloning, Scaling

Description: Learn how to leverage volume cloning to rapidly scale StatefulSets with pre-populated data, enabling faster replica creation and consistent data initialization across pods.

---

StatefulSets typically provision empty volumes for each new replica, requiring time-consuming data initialization. Volume cloning enables rapid scaling by duplicating existing volumes with pre-populated data to new replicas.

## Understanding StatefulSet Volume Cloning

Volume cloning for StatefulSets enables:

1. Rapid replica scaling with pre-populated data
2. Consistent initialization across all replicas
3. Reduced startup time for new pods
4. Database replication setup automation
5. Testing with production-like data

This approach works best for read replicas and cache layers.

## Basic StatefulSet with Volume Cloning

Create a StatefulSet that clones volumes:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-master-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: fast-ssd
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-master
spec:
  serviceName: postgres-master
  replicas: 1
  selector:
    matchLabels:
      app: postgres
      role: master
  template:
    metadata:
      labels:
        app: postgres
        role: master
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          value: "password123"
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: postgres-master-pvc
```

Create replicas with cloned volumes:

```bash
#!/bin/bash
# create-postgres-replica.sh

set -e

REPLICA_NUM="${1}"

if [ -z "$REPLICA_NUM" ]; then
  echo "Usage: $0 <replica-number>"
  exit 1
fi

PVC_NAME="postgres-replica-${REPLICA_NUM}-pvc"

echo "=== Creating PostgreSQL Replica $REPLICA_NUM ==="

# Clone master volume
echo "Cloning master volume..."

kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: $PVC_NAME
  labels:
    app: postgres
    role: replica
    replica-number: "$REPLICA_NUM"
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: fast-ssd
  dataSource:
    kind: PersistentVolumeClaim
    name: postgres-master-pvc
EOF

# Wait for clone
kubectl wait --for=jsonpath='{.status.phase}'=Bound pvc/$PVC_NAME --timeout=600s

echo "✓ Volume cloned"

# Create replica pod
echo "Creating replica pod..."

kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: postgres-replica-$REPLICA_NUM
  labels:
    app: postgres
    role: replica
spec:
  containers:
  - name: postgres
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      value: "password123"
    - name: PGDATA
      value: /var/lib/postgresql/data/pgdata
    ports:
    - containerPort: 5432
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: $PVC_NAME
EOF

kubectl wait --for=condition=ready pod/postgres-replica-$REPLICA_NUM --timeout=120s

echo "✓ Replica $REPLICA_NUM created"
```

## Automated Read Replica Scaling

Create a Job to scale read replicas:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: scale-postgres-replicas
spec:
  template:
    spec:
      serviceAccountName: replica-scaler
      restartPolicy: OnFailure
      containers:
      - name: scaler
        image: bitnami/kubectl:latest
        env:
        - name: TARGET_REPLICAS
          value: "3"
        - name: MASTER_PVC
          value: "postgres-master-pvc"
        command:
        - /bin/bash
        - -c
        - |
          set -e

          echo "=== Scaling PostgreSQL Read Replicas ==="
          echo "Target replicas: $TARGET_REPLICAS"

          # Get current replica count
          CURRENT=$(kubectl get pod -l app=postgres,role=replica --no-headers | wc -l)
          echo "Current replicas: $CURRENT"

          if [ $CURRENT -ge $TARGET_REPLICAS ]; then
            echo "Already at or above target replica count"
            exit 0
          fi

          # Create additional replicas
          for i in $(seq $((CURRENT + 1)) $TARGET_REPLICAS); do
            echo "Creating replica $i..."

            PVC_NAME="postgres-replica-${i}-pvc"

            # Clone master volume
            kubectl apply -f - <<EOF
            apiVersion: v1
            kind: PersistentVolumeClaim
            metadata:
              name: $PVC_NAME
              labels:
                app: postgres
                role: replica
            spec:
              accessModes:
                - ReadWriteOnce
              resources:
                requests:
                  storage: 20Gi
              storageClassName: fast-ssd
              dataSource:
                kind: PersistentVolumeClaim
                name: $MASTER_PVC
          EOF

            # Wait for PVC
            kubectl wait --for=jsonpath='{.status.phase}'=Bound \
              pvc/$PVC_NAME --timeout=600s

            # Create pod
            kubectl apply -f - <<EOF
            apiVersion: v1
            kind: Pod
            metadata:
              name: postgres-replica-$i
              labels:
                app: postgres
                role: replica
            spec:
              containers:
              - name: postgres
                image: postgres:15
                env:
                - name: POSTGRES_PASSWORD
                  value: "password123"
                - name: PGDATA
                  value: /var/lib/postgresql/data/pgdata
                command:
                - /bin/bash
                - -c
                - |
                  # Configure as read replica
                  touch /var/lib/postgresql/data/pgdata/standby.signal
                  cat > /var/lib/postgresql/data/pgdata/postgresql.auto.conf <<PGCONF
                  primary_conninfo = 'host=postgres-master-0 port=5432 user=postgres'
                  PGCONF
                  exec postgres
                ports:
                - containerPort: 5432
                volumeMounts:
                - name: data
                  mountPath: /var/lib/postgresql/data
              volumes:
              - name: data
                persistentVolumeClaim:
                  claimName: $PVC_NAME
          EOF

            echo "✓ Replica $i created"
          done

          # Create read replica service
          kubectl apply -f - <<EOF
          apiVersion: v1
          kind: Service
          metadata:
            name: postgres-read-replicas
          spec:
            selector:
              app: postgres
              role: replica
            ports:
            - port: 5432
              targetPort: 5432
            type: ClusterIP
          EOF

          echo "✓ Scaling complete"
```

## Redis Cluster Scaling with Cloning

Scale Redis cluster with cloned data:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: scale-redis-cluster
spec:
  template:
    spec:
      serviceAccountName: redis-scaler
      restartPolicy: OnFailure
      containers:
      - name: scaler
        image: bitnami/kubectl:latest
        env:
        - name: TARGET_NODES
          value: "6"
        command:
        - /bin/bash
        - -c
        - |
          set -e

          echo "=== Scaling Redis Cluster ==="

          # Get master nodes
          MASTERS=$(kubectl get pod -l app=redis,role=master \
            -o jsonpath='{.items[*].metadata.name}')

          for MASTER in $MASTERS; do
            MASTER_PVC="${MASTER}-pvc"

            echo "Creating replica for master: $MASTER"

            # Clone master volume
            REPLICA_PVC="${MASTER}-replica-pvc"

            kubectl apply -f - <<EOF
            apiVersion: v1
            kind: PersistentVolumeClaim
            metadata:
              name: $REPLICA_PVC
              labels:
                app: redis
                role: replica
                master: $MASTER
            spec:
              accessModes:
                - ReadWriteOnce
              resources:
                requests:
                  storage: 10Gi
              storageClassName: fast-ssd
              dataSource:
                kind: PersistentVolumeClaim
                name: $MASTER_PVC
          EOF

            kubectl wait --for=jsonpath='{.status.phase}'=Bound \
              pvc/$REPLICA_PVC --timeout=600s

            # Create replica pod
            kubectl apply -f - <<EOF
            apiVersion: v1
            kind: Pod
            metadata:
              name: ${MASTER}-replica
              labels:
                app: redis
                role: replica
                master: $MASTER
            spec:
              containers:
              - name: redis
                image: redis:7.0
                command:
                - redis-server
                - --replicaof
                - $MASTER
                - 6379
                ports:
                - containerPort: 6379
                volumeMounts:
                - name: data
                  mountPath: /data
              volumes:
              - name: data
                persistentVolumeClaim:
                  claimName: $REPLICA_PVC
          EOF

            echo "✓ Replica created for $MASTER"
          done

          echo "✓ Redis cluster scaled"
```

## Monitoring Cloned Replica Performance

Monitor replica creation and sync:

```bash
#!/bin/bash
# monitor-replicas.sh

echo "=== Replica Status ==="
echo

# Get all replicas
kubectl get pod -l role=replica -o custom-columns=\
NAME:.metadata.name,\
STATUS:.status.phase,\
READY:.status.conditions[?(@.type==\"Ready\")].status,\
AGE:.metadata.creationTimestamp

echo
echo "=== Replica Volume Status ==="

kubectl get pvc -l role=replica -o custom-columns=\
NAME:.metadata.name,\
STATUS:.status.phase,\
SIZE:.spec.resources.requests.storage,\
CLONED-FROM:.spec.dataSource.name

echo
echo "=== Replication Lag (PostgreSQL) ==="

for REPLICA in $(kubectl get pod -l app=postgres,role=replica \
  -o jsonpath='{.items[*].metadata.name}'); do

  LAG=$(kubectl exec $REPLICA -- psql -U postgres -t -c \
    "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));" \
    2>/dev/null || echo "N/A")

  echo "$REPLICA: ${LAG}s lag"
done
```

## Best Practices

1. **Clone from consistent snapshots** for clean initialization
2. **Configure replication** immediately after cloning
3. **Monitor clone performance** during scaling operations
4. **Test failover** from replicas to masters
5. **Set resource limits** on replica pods
6. **Use labels** to track master-replica relationships
7. **Automate scaling** based on metrics
8. **Clean up** unused cloned volumes

Volume cloning enables rapid StatefulSet scaling with pre-populated data, significantly reducing initialization time for new replicas. This approach works well for read-heavy workloads and testing scenarios.
