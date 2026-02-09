# How to Implement Database Monitoring with Prometheus Exporters on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Prometheus, Database, Monitoring, Observability

Description: Set up comprehensive database monitoring using Prometheus exporters on Kubernetes, including PostgreSQL, MySQL, MongoDB, and Redis metrics collection, alerting rules, and Grafana dashboards.

---

Database monitoring is essential for maintaining performance and reliability in Kubernetes environments. Prometheus exporters collect database metrics and expose them in a format Prometheus can scrape, providing visibility into queries, connections, replication lag, and resource utilization.

## Understanding Prometheus Exporter Architecture

Prometheus exporters act as translators between database-specific metrics and Prometheus's time-series format. Each exporter connects to a database, queries internal statistics, and exposes metrics on an HTTP endpoint that Prometheus scrapes regularly.

Exporters run as separate containers within your database pods or as standalone deployments. Running exporters as sidecars keeps them close to databases and simplifies credential management. Standalone exporters work better when monitoring multiple database instances or when databases run outside Kubernetes.

The exporter scrape interval affects metric freshness and storage requirements. A 15-second interval captures most issues while keeping storage manageable. Critical metrics might need 5-second intervals, while less volatile metrics work fine at 60 seconds.

## Deploying PostgreSQL Exporter

Add the postgres_exporter as a sidecar to your PostgreSQL StatefulSet:

```yaml
# postgres-with-exporter.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: databases
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9187"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: postgres
          image: postgres:15
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
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
        # Prometheus exporter sidecar
        - name: postgres-exporter
          image: prometheuscommunity/postgres-exporter:v0.15.0
          ports:
            - containerPort: 9187
              name: metrics
          env:
            - name: DATA_SOURCE_NAME
              value: postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:5432/appdb?sslmode=disable
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
            - name: PG_EXPORTER_EXTEND_QUERY_PATH
              value: /etc/postgres-exporter/queries.yaml
          volumeMounts:
            - name: exporter-queries
              mountPath: /etc/postgres-exporter
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
          livenessProbe:
            httpGet:
              path: /
              port: 9187
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 9187
            initialDelaySeconds: 5
            periodSeconds: 5
      volumes:
        - name: exporter-queries
          configMap:
            name: postgres-exporter-queries
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

## Creating Custom Query Configuration

Define custom queries for PostgreSQL exporter:

```yaml
# postgres-exporter-queries-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-exporter-queries
  namespace: databases
data:
  queries.yaml: |
    # Query for table sizes
    pg_table_size:
      query: |
        SELECT
          schemaname,
          tablename,
          pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
        FROM pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      metrics:
        - schemaname:
            usage: "LABEL"
            description: "Schema name"
        - tablename:
            usage: "LABEL"
            description: "Table name"
        - size_bytes:
            usage: "GAUGE"
            description: "Table size in bytes"

    # Query for slow queries
    pg_slow_queries:
      query: |
        SELECT
          datname,
          usename,
          COUNT(*) as count
        FROM pg_stat_activity
        WHERE state = 'active'
          AND query_start < NOW() - INTERVAL '30 seconds'
          AND query NOT LIKE '%pg_stat_activity%'
        GROUP BY datname, usename
      metrics:
        - datname:
            usage: "LABEL"
            description: "Database name"
        - usename:
            usage: "LABEL"
            description: "User name"
        - count:
            usage: "GAUGE"
            description: "Number of slow queries"

    # Query for replication lag
    pg_replication_lag:
      query: |
        SELECT
          CASE
            WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn() THEN 0
            ELSE EXTRACT(EPOCH FROM NOW() - pg_last_xact_replay_timestamp())
          END AS lag_seconds
      metrics:
        - lag_seconds:
            usage: "GAUGE"
            description: "Replication lag in seconds"

    # Connection pool stats
    pg_connection_states:
      query: |
        SELECT
          state,
          COUNT(*) as count
        FROM pg_stat_activity
        WHERE datname IS NOT NULL
        GROUP BY state
      metrics:
        - state:
            usage: "LABEL"
            description: "Connection state"
        - count:
            usage: "GAUGE"
            description: "Number of connections in this state"
```

Apply the ConfigMap:

```bash
kubectl apply -f postgres-exporter-queries-configmap.yaml
kubectl apply -f postgres-with-exporter.yaml
```

## Deploying MySQL Exporter

Add mysqld_exporter to a MySQL deployment:

```yaml
# mysql-with-exporter.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: databases
spec:
  serviceName: mysql
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9104"
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          ports:
            - containerPort: 3306
              name: mysql
          env:
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-credentials
                  key: root-password
            - name: MYSQL_DATABASE
              value: appdb
          volumeMounts:
            - name: mysql-storage
              mountPath: /var/lib/mysql
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
        - name: mysql-exporter
          image: prom/mysqld-exporter:v0.15.1
          ports:
            - containerPort: 9104
              name: metrics
          env:
            - name: DATA_SOURCE_NAME
              value: exporter:$(EXPORTER_PASSWORD)@(localhost:3306)/
            - name: EXPORTER_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-exporter-credentials
                  key: password
          args:
            - --collect.info_schema.tables
            - --collect.info_schema.innodb_tablespaces
            - --collect.info_schema.innodb_metrics
            - --collect.global_status
            - --collect.perf_schema.tableiowaits
            - --collect.perf_schema.indexiowaits
            - --collect.perf_schema.tablelocks
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
      initContainers:
        - name: create-exporter-user
          image: mysql:8.0
          command:
            - sh
            - -c
            - |
              mysql -h localhost -u root -p$MYSQL_ROOT_PASSWORD <<EOF
              CREATE USER IF NOT EXISTS 'exporter'@'localhost' IDENTIFIED BY '$EXPORTER_PASSWORD' WITH MAX_USER_CONNECTIONS 3;
              GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'localhost';
              FLUSH PRIVILEGES;
              EOF
          env:
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-credentials
                  key: root-password
            - name: EXPORTER_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-exporter-credentials
                  key: password
  volumeClaimTemplates:
    - metadata:
        name: mysql-storage
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi
```

Create exporter credentials:

```bash
kubectl create secret generic mysql-exporter-credentials \
  --from-literal=password=exporter-secure-pass \
  -n databases
```

## Deploying MongoDB Exporter

Add mongodb_exporter for MongoDB monitoring:

```yaml
# mongodb-with-exporter.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: databases
spec:
  serviceName: mongodb
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9216"
    spec:
      containers:
        - name: mongodb
          image: mongo:7.0
          ports:
            - containerPort: 27017
              name: mongodb
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              valueFrom:
                secretKeyRef:
                  name: mongodb-credentials
                  key: username
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongodb-credentials
                  key: password
          volumeMounts:
            - name: mongodb-storage
              mountPath: /data/db
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
        - name: mongodb-exporter
          image: percona/mongodb_exporter:0.40
          ports:
            - containerPort: 9216
              name: metrics
          env:
            - name: MONGODB_URI
              value: mongodb://$(MONGO_USER):$(MONGO_PASSWORD)@localhost:27017
            - name: MONGO_USER
              valueFrom:
                secretKeyRef:
                  name: mongodb-credentials
                  key: username
            - name: MONGO_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongodb-credentials
                  key: password
          args:
            - --collect-all
            - --compatible-mode
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
  volumeClaimTemplates:
    - metadata:
        name: mongodb-storage
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi
```

## Deploying Redis Exporter

Add redis_exporter for Redis monitoring:

```yaml
# redis-with-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: databases
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9121"
    spec:
      containers:
        - name: redis
          image: redis:7.2
          ports:
            - containerPort: 6379
              name: redis
          command:
            - redis-server
            - --requirepass
            - $(REDIS_PASSWORD)
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-credentials
                  key: password
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
        - name: redis-exporter
          image: oliver006/redis_exporter:v1.55.0
          ports:
            - containerPort: 9121
              name: metrics
          env:
            - name: REDIS_ADDR
              value: localhost:6379
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-credentials
                  key: password
          args:
            - --include-system-metrics
            - --is-tile38=false
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
```

## Configuring Prometheus ServiceMonitor

Create ServiceMonitor resources for automatic discovery:

```yaml
# database-servicemonitors.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: postgres-metrics
  namespace: databases
  labels:
    app: postgres
spec:
  selector:
    matchLabels:
      app: postgres
  endpoints:
    - port: metrics
      interval: 15s
      path: /metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: mysql-metrics
  namespace: databases
  labels:
    app: mysql
spec:
  selector:
    matchLabels:
      app: mysql
  endpoints:
    - port: metrics
      interval: 15s
      path: /metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: mongodb-metrics
  namespace: databases
  labels:
    app: mongodb
spec:
  selector:
    matchLabels:
      app: mongodb
  endpoints:
    - port: metrics
      interval: 15s
      path: /metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: redis-metrics
  namespace: databases
  labels:
    app: redis
spec:
  selector:
    matchLabels:
      app: redis
  endpoints:
    - port: metrics
      interval: 15s
      path: /metrics
```

## Creating Alerting Rules

Define PrometheusRule for database alerts:

```yaml
# database-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: database-alerts
  namespace: databases
spec:
  groups:
    - name: postgresql
      interval: 30s
      rules:
        - alert: PostgreSQLDown
          expr: pg_up == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "PostgreSQL is down"
            description: "PostgreSQL instance {{ $labels.instance }} is down"

        - alert: PostgreSQLTooManyConnections
          expr: sum(pg_stat_activity_count) > 100
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Too many PostgreSQL connections"
            description: "PostgreSQL has {{ $value }} active connections"

        - alert: PostgreSQLReplicationLag
          expr: pg_replication_lag_seconds > 60
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "PostgreSQL replication lag is high"
            description: "Replication lag is {{ $value }} seconds"

    - name: mysql
      interval: 30s
      rules:
        - alert: MySQLDown
          expr: mysql_up == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "MySQL is down"
            description: "MySQL instance {{ $labels.instance }} is down"

        - alert: MySQLSlowQueries
          expr: rate(mysql_global_status_slow_queries[5m]) > 10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High rate of slow queries"
            description: "MySQL has {{ $value }} slow queries per second"

    - name: mongodb
      interval: 30s
      rules:
        - alert: MongoDBDown
          expr: mongodb_up == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "MongoDB is down"
            description: "MongoDB instance {{ $labels.instance }} is down"

        - alert: MongoDBHighConnections
          expr: mongodb_connections{state="current"} > 500
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "MongoDB has too many connections"
            description: "MongoDB has {{ $value }} active connections"

    - name: redis
      interval: 30s
      rules:
        - alert: RedisDown
          expr: redis_up == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Redis is down"
            description: "Redis instance {{ $labels.instance }} is down"

        - alert: RedisHighMemoryUsage
          expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Redis memory usage is high"
            description: "Redis is using {{ $value | humanizePercentage }} of available memory"
```

Apply the alerting rules:

```bash
kubectl apply -f database-alerts.yaml
```

## Verifying Metrics Collection

Check if Prometheus is scraping metrics:

```bash
# Port forward to Prometheus
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090

# Query metrics in browser at http://localhost:9090
# Example queries:
# pg_stat_database_numbackends
# mysql_global_status_threads_connected
# mongodb_connections{state="current"}
# redis_connected_clients
```

Database monitoring with Prometheus exporters provides real-time visibility into database health and performance on Kubernetes. The combination of custom queries, automated alerting, and historical metrics enables proactive database management and rapid troubleshooting.
