# How to Monitor MySQL on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Kubernetes, Monitoring, Prometheus, Exporter

Description: Monitor MySQL on Kubernetes using the MySQL Exporter for Prometheus and Grafana to track query performance, connections, and replication lag.

---

Monitoring MySQL in Kubernetes requires exposing metrics from within pods and scraping them with a monitoring stack. The MySQL Exporter for Prometheus is the standard tool for this, collecting over 300 metrics from MySQL's Performance Schema and information schema.

## Deploying the MySQL Exporter

Create a secret with the MySQL exporter user credentials:

```bash
kubectl create secret generic mysql-exporter-credentials \
  --namespace mysql-cluster \
  --from-literal=DATA_SOURCE_NAME="exporter:ExporterPass123!@tcp(mysql-0.mysql-headless.mysql-cluster.svc.cluster.local:3306)/"
```

Create the MySQL exporter user in MySQL:

```sql
CREATE USER 'exporter'@'%' IDENTIFIED BY 'ExporterPass123!';
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'%';
FLUSH PRIVILEGES;
```

Deploy the exporter as a sidecar or standalone deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql-exporter
  namespace: mysql-cluster
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql-exporter
  template:
    metadata:
      labels:
        app: mysql-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9104"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: mysql-exporter
        image: prom/mysqld-exporter:v0.15.1
        args:
        - --collect.info_schema.processlist
        - --collect.info_schema.innodb_metrics
        - --collect.global_status
        - --collect.global_variables
        - --collect.slave_status
        - --collect.perf_schema.tableiowaits
        env:
        - name: DATA_SOURCE_NAME
          valueFrom:
            secretKeyRef:
              name: mysql-exporter-credentials
              key: DATA_SOURCE_NAME
        ports:
        - containerPort: 9104
```

## Creating a Service for the Exporter

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql-exporter
  namespace: mysql-cluster
  labels:
    app: mysql-exporter
spec:
  selector:
    app: mysql-exporter
  ports:
  - name: metrics
    port: 9104
    targetPort: 9104
```

## Prometheus ServiceMonitor

If you are running the Prometheus Operator (kube-prometheus-stack), create a ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: mysql-exporter
  namespace: mysql-cluster
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: mysql-exporter
  endpoints:
  - port: metrics
    interval: 30s
    scrapeTimeout: 10s
```

## Key Metrics to Watch

Query these Prometheus metrics in Grafana to monitor MySQL health:

```text
# Active connections
mysql_global_status_threads_connected

# Queries per second
rate(mysql_global_status_queries[5m])

# Slow queries
rate(mysql_global_status_slow_queries[5m])

# InnoDB buffer pool hit ratio
1 - (mysql_global_status_innodb_buffer_pool_reads / mysql_global_status_innodb_buffer_pool_read_requests)

# Replication lag (seconds behind primary)
mysql_slave_status_seconds_behind_master
```

## Adding Liveness and Readiness Probes

Add health probes to MySQL pods so Kubernetes can detect unhealthy instances:

```yaml
livenessProbe:
  exec:
    command: ["mysqladmin", "ping", "-h", "localhost"]
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  exec:
    command: ["mysql", "-h", "localhost", "-e", "SELECT 1"]
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Summary

Monitoring MySQL on Kubernetes requires deploying the MySQL Exporter to expose Prometheus metrics, creating a Service and ServiceMonitor for scraping, and building Grafana dashboards around key metrics like connection count, query rate, InnoDB buffer pool efficiency, and replication lag. Combine this with Kubernetes liveness and readiness probes to ensure unhealthy MySQL pods are automatically detected and restarted or removed from service rotation.
