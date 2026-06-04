# How to Implement Database Read Replicas for Load Distribution on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Database, Read Replica, Scalability, PostgreSQL

Description: Scale database read capacity on Kubernetes using read replicas, including PostgreSQL streaming replication setup, connection pooling, read-write splitting, and monitoring replication lag.

---

Read replicas distribute query load across multiple database instances, improving application performance and scalability. On Kubernetes, implementing read replicas requires careful configuration of replication, smart routing of queries, and monitoring to ensure data consistency.

## Understanding Read Replica Architecture

A primary database handles all write operations while replicas asynchronously receive changes and serve read queries. This architecture works well for read-heavy workloads where most operations query existing data rather than modifying it.

Asynchronous replication introduces replication lag, the delay between a write on the primary and its appearance on replicas. Applications must tolerate eventual consistency for read queries. Critical reads that require up-to-date data should query the primary directly.

Kubernetes StatefulSets provide stable network identities essential for replication. The primary database gets a predictable hostname that replicas use for connecting. When scaling replicas, each new pod automatically configures itself by streaming data from the primary.

## Deploying PostgreSQL with Read Replicas

Create a StatefulSet with primary and replica configuration:

```yaml
# postgres-with-replicas.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: databases
data:
  primary.conf: |
    listen_addresses = '*'
    max_connections = 200
    wal_level = replica
    max_wal_senders = 10
    wal_keep_size = 1024
    hot_standby = on
    hot_standby_feedback = on

  replica.conf: |
    listen_addresses = '*'
    max_connections = 200
    hot_standby = on
    hot_standby_feedback = on
    wal_retrieve_retry_interval = 1000

  pg_hba.conf: |
    local all all trust
    host replication replicator 0.0.0.0/0 md5
    host all all 0.0.0.0/0 md5
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: databases
  labels:
    app: postgres
spec:
  ports:
    - port: 5432
      name: postgres
  clusterIP: None
  selector:
    app: postgres
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-primary
  namespace: databases
  labels:
    app: postgres
    role: primary
spec:
  ports:
    - port: 5432
      name: postgres
  clusterIP: None
  selector:
    app: postgres
    role: primary
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-replicas
  namespace: databases
  labels:
    app: postgres
    role: replica
spec:
  ports:
    - port: 5432
      name: postgres
  selector:
    app: postgres
    role: replica
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: databases
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      securityContext:
        fsGroup: 999
      initContainers:
        - name: init-postgres
          image: postgres:15
          securityContext:
            runAsUser: 999
            runAsGroup: 999
          command:
            - sh
            - -c
            - |
              set -e
              if [ "$HOSTNAME" = "postgres-0" ]; then
                echo "Initializing primary database"
                if [ ! -f "$PGDATA/PG_VERSION" ]; then
                  initdb -D "$PGDATA" -U "$POSTGRES_USER" --pwfile=/credentials/password
                  cp /config/primary.conf "$PGDATA/postgresql.conf"
                  cp /config/pg_hba.conf "$PGDATA/pg_hba.conf"
                fi
                mkdir -p /var/lib/postgresql/data/role
                touch /var/lib/postgresql/data/role/primary
              else
                echo "Initializing replica database"
                if [ ! -f "$PGDATA/PG_VERSION" ]; then
                  until pg_isready -h postgres-0.postgres.databases.svc.cluster.local -p 5432; do
                    echo "Waiting for primary..."
                    sleep 2
                  done

                  until PGPASSWORD=$REPLICATION_PASSWORD pg_basebackup \
                      -h postgres-0.postgres.databases.svc.cluster.local \
                      -D "$PGDATA" \
                      -U replicator \
                      -Fp -Xs -P -R; do
                    echo "Waiting for replication role..."
                    rm -rf "$PGDATA"/* "$PGDATA"/.[!.]* "$PGDATA"/..?* 2>/dev/null || true
                    sleep 2
                  done

                  cp /config/replica.conf "$PGDATA/postgresql.conf"
                fi
                mkdir -p /var/lib/postgresql/data/role
                touch /var/lib/postgresql/data/role/replica
              fi
          env:
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
            - name: POSTGRES_DB
              value: appdb
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: username
            - name: REPLICATION_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: replication-password
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
            - name: config
              mountPath: /config
            - name: credentials
              mountPath: /credentials
              readOnly: true
      containers:
        - name: postgres
          image: postgres:15
          securityContext:
            runAsUser: 999
            runAsGroup: 999
          ports:
            - containerPort: 5432
              name: postgres
          env:
            - name: POSTGRES_DB
              value: appdb
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            - name: REPLICATION_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: replication-password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
          lifecycle:
            postStart:
              exec:
                command:
                  - sh
                  - -c
                  - |
                    if [ -f /var/lib/postgresql/data/role/primary ]; then
                      until pg_isready; do sleep 1; done
                      if ! psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$POSTGRES_DB'" | grep -q 1; then
                        createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
                      fi
                      if ! psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname = 'replicator'" | grep -q 1; then
                        psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres \
                          -c "CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '$REPLICATION_PASSWORD'"
                      fi
                    fi
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
          livenessProbe:
            exec:
              command:
                - pg_isready
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - pg_isready
            initialDelaySeconds: 5
            periodSeconds: 5
      volumes:
        - name: config
          configMap:
            name: postgres-config
        - name: credentials
          secret:
            secretName: postgres-credentials
  volumeClaimTemplates:
    - metadata:
        name: postgres-storage
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi
```

Create credentials:

```bash
kubectl create namespace databases

kubectl create secret generic postgres-credentials \
  --from-literal=username=appuser \
  --from-literal=password=secure-pass-123 \
  --from-literal=replication-password=replication-pass-456 \
  -n databases

kubectl apply -f postgres-with-replicas.yaml
```

## Labeling Primary and Replica Pods

Add role labels after pods start:

```bash
# Label primary
kubectl label pod postgres-0 -n databases role=primary --overwrite

# Label replicas
kubectl label pod postgres-1 -n databases role=replica --overwrite
kubectl label pod postgres-2 -n databases role=replica --overwrite
```

## Implementing Connection Pooling with PgBouncer

Deploy PgBouncer for connection pooling. PgBouncer does not inspect SQL and split reads from writes automatically, so expose separate database aliases and route to the correct alias from the application:

```yaml
# pgbouncer.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pgbouncer-config
  namespace: databases
data:
  pgbouncer.ini: |
    [databases]
    appdb_primary = host=postgres-0.postgres.databases.svc.cluster.local port=5432 dbname=appdb
    appdb_replica = host=postgres-replicas.databases.svc.cluster.local port=5432 dbname=appdb

    [pgbouncer]
    listen_addr = 0.0.0.0
    listen_port = 5432
    auth_type = md5
    auth_file = /etc/pgbouncer/userlist.txt
    pool_mode = transaction
    max_client_conn = 1000
    default_pool_size = 25
    reserve_pool_size = 5
    reserve_pool_timeout = 3
    max_db_connections = 50
    ignore_startup_parameters = extra_float_digits

  userlist.txt: |
    "appuser" "md5<md5-of-password-plus-username>"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
  namespace: databases
spec:
  replicas: 2
  selector:
    matchLabels:
      app: pgbouncer
  template:
    metadata:
      labels:
        app: pgbouncer
    spec:
      containers:
        - name: pgbouncer
          image: pgbouncer/pgbouncer:1.21.0
          ports:
            - containerPort: 5432
              name: postgres
          volumeMounts:
            - name: config
              mountPath: /etc/pgbouncer
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
      volumes:
        - name: config
          configMap:
            name: pgbouncer-config
---
apiVersion: v1
kind: Service
metadata:
  name: pgbouncer
  namespace: databases
spec:
  type: ClusterIP
  ports:
    - port: 5432
      targetPort: 5432
  selector:
    app: pgbouncer
```

## Implementing Smart Query Routing

Create separate connection strings for read and write operations:

```python
# Python application example
import psycopg2
from contextlib import contextmanager

PRIMARY_DSN = "postgresql://appuser:password@pgbouncer.databases.svc.cluster.local:5432/appdb_primary"
REPLICA_DSN = "postgresql://appuser:password@pgbouncer.databases.svc.cluster.local:5432/appdb_replica"

@contextmanager
def get_write_connection():
    """Get connection to primary for writes"""
    conn = psycopg2.connect(PRIMARY_DSN)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

@contextmanager
def get_read_connection():
    """Get connection to replica for reads"""
    conn = psycopg2.connect(REPLICA_DSN)
    conn.set_session(readonly=True)
    try:
        yield conn
    finally:
        conn.close()

# Usage
def create_user(username, email):
    with get_write_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (username, email) VALUES (%s, %s)",
                (username, email)
            )

def get_users():
    with get_read_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT username, email FROM users")
            return cur.fetchall()
```

## Monitoring Replication Lag

Deploy a replication lag monitor:

```yaml
# replication-monitor.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: replication-monitor-script
  namespace: databases
data:
  monitor.sh: |
    #!/bin/bash
    LAG=$(psql -h postgres-replicas.databases.svc.cluster.local -U appuser -d appdb -t -c "
      SELECT COALESCE(
        CASE
          WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn() THEN 0
          ELSE EXTRACT(EPOCH FROM NOW() - pg_last_xact_replay_timestamp())
        END,
        0
      ) AS lag_seconds;
    " | tr -d '[:space:]')

    echo "# TYPE replication_lag_seconds gauge"
    echo "replication_lag_seconds{replica=\"selected\"} $LAG"
---
apiVersion: v1
kind: Service
metadata:
  name: replication-monitor
  namespace: databases
  labels:
    app: replication-monitor
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
spec:
  ports:
    - port: 9090
      name: metrics
  selector:
    app: replication-monitor
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: replication-monitor
  namespace: databases
spec:
  replicas: 1
  selector:
    matchLabels:
      app: replication-monitor
  template:
    metadata:
      labels:
        app: replication-monitor
    spec:
      containers:
        - name: monitor
          image: postgres:15
          ports:
            - containerPort: 9090
              name: metrics
          command:
            - /bin/bash
            - -c
            - |
              set -e
              apt-get update
              apt-get install -y --no-install-recommends netcat-openbsd
              rm -rf /var/lib/apt/lists/*

              while true; do
                {
                  printf 'HTTP/1.1 200 OK\r\nContent-Type: text/plain; version=0.0.4\r\n\r\n'
                  /scripts/monitor.sh
                } | nc -l -p 9090 -q 1
              done
          env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
          volumeMounts:
            - name: script
              mountPath: /scripts
      volumes:
        - name: script
          configMap:
            name: replication-monitor-script
            defaultMode: 0755
```

## Setting Up Alerting

Create Prometheus alerts for replication issues:

```yaml
# replication-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: postgres-replication-alerts
  namespace: databases
spec:
  groups:
    - name: replication
      rules:
        - alert: HighReplicationLag
          expr: replication_lag_seconds > 30
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "PostgreSQL replication lag is high"
            description: "Replication lag is {{ $value }} seconds"

        - alert: ReplicaDown
          expr: up{job="replication-monitor"} == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "PostgreSQL replication monitor is down"
            description: "Replication monitor {{ $labels.instance }} is not responding"
```

## Handling Replica Promotion

When the primary fails, promote a replica to primary:

```bash
# Promote replica to primary
kubectl exec -it postgres-1 -n databases -- \
  su - postgres -c "pg_ctl promote -D /var/lib/postgresql/data/pgdata"

# Update labels
kubectl label pod postgres-1 -n databases role=primary --overwrite
kubectl label pod postgres-0 -n databases role=replica --overwrite

# Recreate or reconfigure the remaining replicas so they follow postgres-1
# before sending read traffic back to them.
```

## Scaling Read Replicas

Add more replicas to handle increased read load:

```bash
# Scale up
kubectl scale statefulset postgres -n databases --replicas=5

# Label new replicas
kubectl label pod postgres-3 -n databases role=replica
kubectl label pod postgres-4 -n databases role=replica
```

New replicas automatically configure themselves using pg_basebackup from the primary.

Read replicas on Kubernetes provide cost-effective read scaling without complex infrastructure. Combined with connection pooling and smart query routing, read replicas dramatically improve application performance for read-heavy workloads while maintaining data consistency through streaming replication.
