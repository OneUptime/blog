# Deploying ProxySQL for MySQL Connection Pooling on Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ProxySQL, MySQL, Connection Pooling, Kubernetes, Database

Description: A practical guide to deploying ProxySQL on Kubernetes for MySQL connection pooling, covering configuration, query routing, health checks, and production tuning for high-performance database access.

---

MySQL connection management becomes a bottleneck in microservices architectures. Each application pod opens its own connections to the database, and with dozens or hundreds of pods, the total connection count can overwhelm MySQL. ProxySQL sits between your applications and MySQL, providing connection pooling, query routing, read/write splitting, and query caching. Deploying ProxySQL on Kubernetes brings these benefits while leveraging the platform's native service discovery, health checking, and scaling capabilities. This guide walks through a production-grade ProxySQL deployment on Kubernetes.

## Why ProxySQL

MySQL has a hard limit on maximum connections, configured via `max_connections`. Each connection consumes memory (roughly 10-20 MB per connection depending on buffers), and context switching between thousands of connections degrades performance. ProxySQL solves this by multiplexing: hundreds of application connections map to a small pool of backend connections to MySQL.

Beyond connection pooling, ProxySQL provides:

- **Read/write splitting**: Route SELECT queries to read replicas and writes to the primary.
- **Query caching**: Cache frequently executed queries in memory.
- **Query rewriting**: Modify queries on the fly without changing application code.
- **Failover handling**: Automatically detect backend failures and reroute traffic.
- **Connection multiplexing**: Reuse backend connections across multiple frontend sessions.

## Architecture Overview

In our deployment, ProxySQL runs as a Kubernetes Deployment with multiple replicas behind a ClusterIP Service. Applications connect to ProxySQL's service address instead of connecting directly to MySQL. ProxySQL maintains persistent connections to MySQL backends and manages the connection lifecycle.

```
[App Pod 1] ──┐
[App Pod 2] ──┤──► [ProxySQL Service] ──► [ProxySQL Pod 1] ──┐
[App Pod 3] ──┤                          [ProxySQL Pod 2] ──┤──► [MySQL Primary]
[App Pod N] ──┘                                              └──► [MySQL Replica]
```

## Step 1: Create the ProxySQL Configuration

ProxySQL is configured through a combination of a configuration file and its admin interface. For Kubernetes, we embed the initial configuration in a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: proxysql-config
  namespace: database
data:
  proxysql.cnf: |
    datadir="/var/lib/proxysql"

    admin_variables=
    {
        admin_credentials="admin:admin_password;radmin:radmin_password"
        mysql_ifaces="0.0.0.0:6032"
        restapi_enabled=true
        restapi_port=6070
    }

    mysql_variables=
    {
        threads=4
        max_connections=2048
        default_query_delay=0
        default_query_timeout=36000000
        have_compress=true
        poll_timeout=2000
        interfaces="0.0.0.0:6033"
        default_schema="information_schema"
        stacksize=1048576
        server_version="8.0.35"
        connect_timeout_server=3000
        monitor_username="proxysql_monitor"
        monitor_password="monitor_password"
        monitor_history=600000
        monitor_connect_interval=60000
        monitor_ping_interval=10000
        monitor_read_only_interval=1500
        monitor_read_only_timeout=500
        ping_interval_server_msec=120000
        ping_timeout_server=500
        commands_stats=true
        sessions_sort=true
        connect_retries_on_failure=10
        connection_max_age_ms=0
        multiplexing=true
    }

    mysql_servers=
    (
        {
            address="mysql-primary.database.svc.cluster.local"
            port=3306
            hostgroup=10
            max_connections=100
            weight=1
        },
        {
            address="mysql-replica-0.database.svc.cluster.local"
            port=3306
            hostgroup=20
            max_connections=100
            weight=1
        },
        {
            address="mysql-replica-1.database.svc.cluster.local"
            port=3306
            hostgroup=20
            max_connections=100
            weight=1
        }
    )

    mysql_users=
    (
        {
            username="app_user"
            password="app_password"
            default_hostgroup=10
            max_connections=500
            transaction_persistent=1
            active=1
        }
    )

    mysql_query_rules=
    (
        {
            rule_id=1
            active=1
            match_digest="^SELECT .* FOR UPDATE$"
            destination_hostgroup=10
            apply=1
        },
        {
            rule_id=2
            active=1
            match_digest="^SELECT"
            destination_hostgroup=20
            apply=1
        }
    )
```

Key configuration elements:

- **Hostgroup 10** is the writer group (MySQL primary).
- **Hostgroup 20** is the reader group (MySQL replicas).
- **Query rules** route SELECT queries to readers and everything else (INSERT, UPDATE, DELETE, SELECT FOR UPDATE) to the writer.
- **`transaction_persistent=1`** ensures all queries within a transaction go to the same backend.
- **`multiplexing=true`** enables connection multiplexing for better backend connection reuse.

## Step 2: Store Credentials in Secrets

Never store passwords in ConfigMaps. Use Kubernetes Secrets for sensitive values:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: proxysql-credentials
  namespace: database
type: Opaque
stringData:
  admin-password: "admin_password"
  monitor-password: "monitor_password"
  app-password: "app_password"
```

In a production setup, you would use an init container or entrypoint script that reads secrets from environment variables and injects them into the ProxySQL configuration before starting the process.

## Step 3: Deploy ProxySQL

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: proxysql
  namespace: database
  labels:
    app: proxysql
spec:
  replicas: 2
  selector:
    matchLabels:
      app: proxysql
  template:
    metadata:
      labels:
        app: proxysql
    spec:
      containers:
        - name: proxysql
          image: proxysql/proxysql:2.6.3
          ports:
            - name: mysql
              containerPort: 6033
            - name: admin
              containerPort: 6032
            - name: restapi
              containerPort: 6070
          volumeMounts:
            - name: config
              mountPath: /etc/proxysql.cnf
              subPath: proxysql.cnf
            - name: data
              mountPath: /var/lib/proxysql
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "2"
              memory: 1Gi
          livenessProbe:
            tcpSocket:
              port: 6033
            initialDelaySeconds: 15
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - bash
                - -c
                - |
                  mysql -h 127.0.0.1 -P 6032 -u radmin -pradmin_password \
                    -e "SELECT 1" 2>/dev/null | grep -q 1
            initialDelaySeconds: 10
            periodSeconds: 5
      volumes:
        - name: config
          configMap:
            name: proxysql-config
        - name: data
          emptyDir: {}
```

The readiness probe queries the ProxySQL admin interface to verify it is operational. The liveness probe checks that the MySQL-facing port is accepting connections.

## Step 4: Create the Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: proxysql
  namespace: database
spec:
  selector:
    app: proxysql
  ports:
    - name: mysql
      port: 3306
      targetPort: 6033
    - name: admin
      port: 6032
      targetPort: 6032
  type: ClusterIP
```

Applications connect to `proxysql.database.svc.cluster.local:3306` using the same MySQL protocol they would use to connect directly to MySQL. No application code changes are needed.

## Step 5: Create the MySQL Monitor User

ProxySQL needs a monitor user on MySQL to check backend health. On your MySQL primary:

```sql
CREATE USER 'proxysql_monitor'@'%' IDENTIFIED BY 'monitor_password';
GRANT USAGE, REPLICATION CLIENT ON *.* TO 'proxysql_monitor'@'%';
FLUSH PRIVILEGES;
```

The monitor user checks connectivity and read-only status of each backend, which is essential for automatic failover detection.

## Step 6: Verify the Deployment

Connect to the ProxySQL admin interface:

```bash
kubectl exec -it deploy/proxysql -n database -- \
  mysql -h 127.0.0.1 -P 6032 -u radmin -pradmin_password --prompt='ProxySQL Admin> '
```

Check backend server status:

```sql
SELECT hostgroup_id, hostname, port, status, ConnUsed, ConnFree, ConnOK, ConnERR
FROM stats_mysql_connection_pool;
```

You should see all backends in ONLINE status with connection counts.

Check query routing:

```sql
SELECT hostgroup, digest_text, count_star, sum_time
FROM stats_mysql_query_digest
ORDER BY count_star DESC
LIMIT 20;
```

This shows which queries are being routed to which hostgroups, confirming that read/write splitting is working correctly.

## Production Tuning

### Connection Pool Sizing

The total backend connections should be sized based on MySQL's `max_connections`. If MySQL allows 500 connections and you have 2 ProxySQL instances, set `max_connections` per server to 200, leaving headroom for direct connections and monitoring.

### Query Cache

Enable query caching for read-heavy workloads:

```sql
INSERT INTO mysql_query_rules (rule_id, active, match_digest, cache_ttl, apply)
VALUES (100, 1, '^SELECT .* FROM product_catalog', 60000, 1);
LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

This caches product catalog queries for 60 seconds.

### Monitoring with Prometheus

ProxySQL exposes metrics through its REST API. Deploy a Prometheus exporter sidecar:

```yaml
- name: exporter
  image: epflsti/proxysql_exporter:latest
  ports:
    - name: metrics
      containerPort: 42004
  env:
    - name: PROXYSQL_CONNECTION
      value: "radmin:radmin_password@tcp(127.0.0.1:6032)/"
```

Create a ServiceMonitor if you are using the Prometheus Operator:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: proxysql
  namespace: database
spec:
  selector:
    matchLabels:
      app: proxysql
  endpoints:
    - port: metrics
      interval: 15s
```

## Handling Failover

When a MySQL primary fails, ProxySQL detects it through the monitor and marks it as SHUNNED. If you have a failover mechanism like Orchestrator or MySQL Group Replication, ProxySQL needs to be informed of the new primary. You can automate this by updating hostgroup assignments through the admin interface or by using ProxySQL's native support for MySQL Group Replication.

For Group Replication, configure the `mysql_group_replication_hostgroups` table:

```sql
INSERT INTO mysql_group_replication_hostgroups
(writer_hostgroup, backup_writer_hostgroup, reader_hostgroup, offline_hostgroup, active, max_writers)
VALUES (10, 30, 20, 40, 1, 1);
LOAD MYSQL SERVERS TO RUNTIME;
```

ProxySQL will automatically detect topology changes and route queries accordingly.

## Conclusion

ProxySQL is an essential component for running MySQL at scale on Kubernetes. It reduces the connection overhead on MySQL, enables transparent read/write splitting, provides query caching, and handles backend failover. By deploying ProxySQL as a Kubernetes Deployment with proper health checks, resource limits, and monitoring, you get a resilient database proxy layer that scales with your application. Start with the basic configuration shown here, then tune connection pool sizes, query rules, and caching policies based on your specific workload patterns.
