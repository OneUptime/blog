# How to Set Up Cross-Cluster Database Replication Between Kubernetes Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Database Replication, Multi-Cluster

Description: Implement cross-cluster database replication between Kubernetes environments for disaster recovery, geographic distribution, and read scaling using streaming replication and federation.

---

Cross-cluster database replication provides disaster recovery capabilities and enables geographically distributed applications. Replicating databases between Kubernetes clusters in different regions or cloud providers protects against cluster failures and reduces latency for global users. This guide covers implementing replication for PostgreSQL, MySQL, and MongoDB across Kubernetes clusters.

## Understanding Cross-Cluster Replication

Replication sends database changes from a primary cluster to one or more replica clusters. Streaming replication continuously transfers transaction logs. Logical replication replicates specific tables or databases using logical decoding. Async replication prioritizes performance over consistency, while sync replication ensures replicas are up-to-date before confirming transactions.

Cross-cluster replication requires network connectivity between clusters. Service mesh, VPN, or direct peering provides secure connections. DNS or service discovery helps applications connect to the appropriate cluster based on location or failover status.

## Setting Up PostgreSQL Streaming Replication

Deploy PostgreSQL in two clusters with streaming replication:

```yaml
# cluster-a/postgres-primary.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-primary
  namespace: database
spec:
  serviceName: postgres-primary
  replicas: 1
  selector:
    matchLabels:
      app: postgres
      role: primary
  template:
    metadata:
      labels:
        app: postgres
        role: primary
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-password
              key: password
        - name: POSTGRES_REPLICATION_USER
          value: replicator
        - name: POSTGRES_REPLICATION_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-password
              key: replication-password
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        - name: config
          mountPath: /docker-entrypoint-initdb.d
        command:
        - postgres
        - -c
        - wal_level=replica
        - -c
        - max_wal_senders=10
        - -c
        - wal_keep_size=1GB
        - -c
        - hot_standby=on
        - -c
        - listen_addresses=*
      volumes:
      - name: config
        configMap:
          name: postgres-replication-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-primary-external
  namespace: database
spec:
  type: LoadBalancer
  selector:
    app: postgres
    role: primary
  ports:
  - port: 5432
    targetPort: 5432
```

Configure replication user:

```yaml
# postgres-replication-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-replication-config
  namespace: database
data:
  01-replication.sh: |
    #!/bin/bash
    set -e

    # Create replication user
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
      CREATE ROLE replicator WITH REPLICATION PASSWORD '$POSTGRES_REPLICATION_PASSWORD' LOGIN;
    EOSQL

    # Configure pg_hba.conf for replication
    echo "host replication replicator 0.0.0.0/0 md5" >> /var/lib/postgresql/data/pg_hba.conf
```

Deploy standby cluster in Cluster B:

```yaml
# cluster-b/postgres-standby.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-standby
  namespace: database
spec:
  serviceName: postgres-standby
  replicas: 1
  selector:
    matchLabels:
      app: postgres
      role: standby
  template:
    metadata:
      labels:
        app: postgres
        role: standby
    spec:
      initContainers:
      - name: setup-standby
        image: postgres:15
        command:
        - sh
        - -c
        - |
          # Base backup from primary
          rm -rf /var/lib/postgresql/data/*

          PGPASSWORD=$POSTGRES_REPLICATION_PASSWORD \
          pg_basebackup -h $PRIMARY_HOST -U replicator \
            -D /var/lib/postgresql/data -P -Xs -R

          # Configure standby
          echo "standby_mode = 'on'" >> /var/lib/postgresql/data/postgresql.auto.conf
          echo "primary_conninfo = 'host=$PRIMARY_HOST port=5432 user=replicator password=$POSTGRES_REPLICATION_PASSWORD'" >> /var/lib/postgresql/data/postgresql.auto.conf

        env:
        - name: PRIMARY_HOST
          value: "a1b2c3d4.us-east-1.elb.amazonaws.com"  # Primary LoadBalancer
        - name: POSTGRES_REPLICATION_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-password
              key: replication-password
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data

      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-password
              key: password
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        command:
        - postgres
        - -c
        - hot_standby=on

  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

Deploy both clusters:

```bash
# In Cluster A
kubectl apply -f cluster-a/postgres-primary.yaml

# Wait for primary to be ready
kubectl wait --for=condition=ready pod/postgres-primary-0 -n database

# Get LoadBalancer address
kubectl get svc postgres-primary-external -n database

# In Cluster B (update PRIMARY_HOST with actual LoadBalancer address)
kubectl apply -f cluster-b/postgres-standby.yaml
```

Verify replication:

```bash
# On primary
kubectl exec -it postgres-primary-0 -n database -- \
  psql -U postgres -c "SELECT * FROM pg_stat_replication;"

# On standby
kubectl exec -it postgres-standby-0 -n database -- \
  psql -U postgres -c "SELECT * FROM pg_stat_wal_receiver;"
```

## Setting Up MySQL Replication

Configure MySQL primary-replica replication:

```yaml
# cluster-a/mysql-primary.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql-primary
  namespace: database
spec:
  serviceName: mysql-primary
  replicas: 1
  selector:
    matchLabels:
      app: mysql
      role: primary
  template:
    metadata:
      labels:
        app: mysql
        role: primary
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        ports:
        - containerPort: 3306
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-password
              key: root-password
        - name: MYSQL_REPLICATION_USER
          value: repl_user
        - name: MYSQL_REPLICATION_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-password
              key: replication-password
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
        - name: config
          mountPath: /etc/mysql/conf.d
        - name: init
          mountPath: /docker-entrypoint-initdb.d
      volumes:
      - name: config
        configMap:
          name: mysql-primary-config
      - name: init
        configMap:
          name: mysql-replication-init
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-primary-config
data:
  replication.cnf: |
    [mysqld]
    server-id=1
    log-bin=mysql-bin
    binlog-format=ROW
    gtid-mode=ON
    enforce-gtid-consistency=ON
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-replication-init
data:
  01-replication.sql: |
    CREATE USER IF NOT EXISTS 'repl_user'@'%' IDENTIFIED BY 'replication_password';
    GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'%';
    FLUSH PRIVILEGES;
```

Configure MySQL replica in Cluster B:

```yaml
# cluster-b/mysql-replica.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql-replica
  namespace: database
spec:
  serviceName: mysql-replica
  replicas: 1
  selector:
    matchLabels:
      app: mysql
      role: replica
  template:
    metadata:
      labels:
        app: mysql
        role: replica
    spec:
      initContainers:
      - name: setup-replica
        image: mysql:8.0
        command:
        - sh
        - -c
        - |
          # Wait for primary
          until mysqladmin ping -h"$PRIMARY_HOST" -uroot -p"$MYSQL_ROOT_PASSWORD" --silent; do
            echo "Waiting for primary..."
            sleep 5
          done

          # Configure replication
          mysql -h"$PRIMARY_HOST" -uroot -p"$MYSQL_ROOT_PASSWORD" <<EOF
          STOP SLAVE;
          CHANGE MASTER TO
            MASTER_HOST='$PRIMARY_HOST',
            MASTER_USER='repl_user',
            MASTER_PASSWORD='$MYSQL_REPLICATION_PASSWORD',
            MASTER_AUTO_POSITION=1;
          START SLAVE;
          EOF
        env:
        - name: PRIMARY_HOST
          value: "mysql-primary-lb.example.com"
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-password
              key: root-password
        - name: MYSQL_REPLICATION_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-password
              key: replication-password

      containers:
      - name: mysql
        image: mysql:8.0
        ports:
        - containerPort: 3306
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-password
              key: root-password
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
        - name: config
          mountPath: /etc/mysql/conf.d
      volumes:
      - name: config
        configMap:
          name: mysql-replica-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-replica-config
data:
  replication.cnf: |
    [mysqld]
    server-id=2
    relay-log=mysql-relay-bin
    read-only=1
    gtid-mode=ON
    enforce-gtid-consistency=ON
```

## Setting Up MongoDB Replica Set Across Clusters

Deploy MongoDB with cross-cluster replica set:

```yaml
# mongodb-cross-cluster.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: mongodb-global
  namespace: database
spec:
  members: 5
  type: ReplicaSet
  version: "7.0.4"

  security:
    authentication:
      modes: ["SCRAM"]

  users:
    - name: admin
      db: admin
      passwordSecretRef:
        name: mongodb-password
      roles:
        - name: clusterAdmin
          db: admin
        - name: userAdminAnyDatabase
          db: admin

  # Explicitly define member hosts across clusters
  statefulSet:
    spec:
      template:
        spec:
          initContainers:
          - name: configure-replica-set
            image: mongo:7.0.4
            command:
            - bash
            - -c
            - |
              # Configure replica set with external endpoints
              cat > /tmp/rs-init.js <<EOF
              rs.initiate({
                _id: "mongodb-global",
                members: [
                  { _id: 0, host: "mongodb-global-0.cluster-a.example.com:27017", priority: 2 },
                  { _id: 1, host: "mongodb-global-1.cluster-a.example.com:27017", priority: 2 },
                  { _id: 2, host: "mongodb-global-2.cluster-a.example.com:27017", priority: 1 },
                  { _id: 3, host: "mongodb-global-0.cluster-b.example.com:27017", priority: 1 },
                  { _id: 4, host: "mongodb-global-1.cluster-b.example.com:27017", priority: 0, arbiterOnly: true }
                ]
              })
              EOF

  additionalMongodConfig:
    net:
      bindIpAll: true
    replication:
      replSetName: mongodb-global
```

## Implementing Failover Automation

Create a failover controller:

```python
# failover_controller.py
import psycopg2
import time
import os

PRIMARY_HOST = os.getenv("PRIMARY_HOST")
STANDBY_HOST = os.getenv("STANDBY_HOST")
CHECK_INTERVAL = 30  # seconds

def check_primary_health():
    """Check if primary is healthy"""
    try:
        conn = psycopg2.connect(
            host=PRIMARY_HOST,
            port=5432,
            user="postgres",
            password=os.getenv("POSTGRES_PASSWORD"),
            connect_timeout=5
        )
        conn.close()
        return True
    except Exception as e:
        print(f"Primary unhealthy: {e}")
        return False

def promote_standby():
    """Promote standby to primary"""
    try:
        conn = psycopg2.connect(
            host=STANDBY_HOST,
            port=5432,
            user="postgres",
            password=os.getenv("POSTGRES_PASSWORD")
        )
        cursor = conn.cursor()

        # Promote to primary
        cursor.execute("SELECT pg_promote();")
        conn.commit()

        print("Standby promoted to primary")
        return True
    except Exception as e:
        print(f"Failed to promote standby: {e}")
        return False

def main():
    """Main failover loop"""
    consecutive_failures = 0
    failure_threshold = 3

    while True:
        if check_primary_health():
            consecutive_failures = 0
        else:
            consecutive_failures += 1

        if consecutive_failures >= failure_threshold:
            print(f"Primary failed {consecutive_failures} times, initiating failover")
            if promote_standby():
                # Update DNS or service discovery
                print("Failover complete")
                break

        time.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    main()
```

Deploy as a Job:

```yaml
# failover-controller.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: failover-controller
  namespace: database
spec:
  template:
    spec:
      containers:
      - name: controller
        image: python:3.11
        command: ["python", "/app/failover_controller.py"]
        env:
        - name: PRIMARY_HOST
          value: "postgres-primary-lb.us-east-1.example.com"
        - name: STANDBY_HOST
          value: "postgres-standby.us-west-2.example.com"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-password
              key: password
        volumeMounts:
        - name: script
          mountPath: /app
      volumes:
      - name: script
        configMap:
          name: failover-script
      restartPolicy: OnFailure
```

## Monitoring Replication Lag

Create monitoring for replication lag:

```yaml
# replication-monitoring.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: replication-monitor
data:
  monitor.sh: |
    #!/bin/bash

    while true; do
      # PostgreSQL replication lag
      LAG=$(kubectl exec postgres-standby-0 -n database -- \
        psql -U postgres -t -c \
        "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));" | tr -d ' ')

      echo "Replication lag: ${LAG} seconds"

      # Send to monitoring system
      curl -X POST http://prometheus-pushgateway:9091/metrics/job/replication_lag \
        --data-binary @- <<EOF
# TYPE replication_lag_seconds gauge
replication_lag_seconds ${LAG}
EOF

      sleep 30
    done
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: replication-monitor
  namespace: database
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
        image: bitnami/kubectl:latest
        command: ["/bin/bash", "/scripts/monitor.sh"]
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: scripts
        configMap:
          name: replication-monitor
```

## Best Practices

Follow these guidelines:

1. **Use dedicated networks** - VPN or private peering for replication traffic
2. **Monitor replication lag** - Alert when lag exceeds thresholds
3. **Test failover regularly** - Validate procedures work correctly
4. **Configure appropriate timeouts** - Balance between false positives and detection speed
5. **Use load balancers** - Simplify endpoint management during failover
6. **Document runbooks** - Clear procedures for manual intervention
7. **Implement circuit breakers** - Prevent cascading failures
8. **Regular backup testing** - Verify backups work across clusters

## Conclusion

Cross-cluster database replication provides disaster recovery and geographic distribution for Kubernetes applications. By properly configuring streaming replication, monitoring lag, and implementing failover automation, you build resilient database infrastructure that survives cluster failures. Regular testing of failover procedures ensures your system behaves correctly during actual incidents. Monitor replication health continuously and maintain documentation for operational procedures to minimize recovery time when disasters occur.
