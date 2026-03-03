# How to Configure Timeout for Database Queries Through Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Database, Timeout, Kubernetes, Service Mesh, Performance

Description: How to configure and align timeout settings for database queries when traffic flows through Istio proxies, including TCP timeouts, idle timeouts, and connection timeouts.

---

Database query timeouts are already tricky to configure correctly. When you add Istio to the equation, there are additional timeout layers that interact with your application and database settings. If these layers are not aligned, you will see queries failing with confusing error messages or connections hanging for longer than expected.

This post breaks down every timeout layer between your application and database, and shows you how to configure them so they work together instead of against each other.

## The Timeout Stack

When a query goes from your application to a database through Istio, it passes through multiple timeout checkpoints:

```text
Application Query Timeout
  -> Application Connection Pool Timeout
    -> Client Sidecar Connect Timeout
      -> Client Sidecar Idle Timeout
        -> Server Sidecar Connect Timeout
          -> Server Sidecar Idle Timeout
            -> Database Statement Timeout
              -> Database Connection Timeout
```

Each layer can terminate the connection independently. The challenge is making sure the outer layers (closer to the application) time out before the inner layers so your application gets a clean error instead of a broken pipe.

## Istio TCP Connect Timeout

The `connectTimeout` in a DestinationRule controls how long the Envoy proxy waits when establishing a new TCP connection to the upstream:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: database
  namespace: database
spec:
  host: postgres.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 10s
        maxConnections: 100
```

If the database is slow to accept connections (maybe it is under heavy load), the proxy will wait up to 10 seconds. After that, the connection attempt fails and the application gets an error.

For databases within the same cluster, 5-10 seconds is reasonable. For external databases (cross-region or cloud-hosted), increase it to 15-30 seconds.

## Istio TCP Idle Timeout

The `idleTimeout` controls how long a connection can sit with no data flowing before the proxy closes it:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: database
  namespace: database
spec:
  host: postgres.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 10s
        idleTimeout: 3600s
        maxConnections: 100
```

This is the timeout that catches most people off guard. If your application holds database connections in a pool and a connection is idle for longer than this value, Istio closes it. The next time the application tries to use that connection, it gets a reset error.

Set this to at least 30 minutes (1800s) for database connections. For long-running analytics or reporting connections, you might need hours.

## Application-Side Timeouts

Your application's database driver and connection pool have their own timeout settings. Here is an example with a JDBC connection string for PostgreSQL:

```text
jdbc:postgresql://postgres.database.svc.cluster.local:5432/mydb?
  connectTimeout=5&
  socketTimeout=300&
  loginTimeout=10
```

- `connectTimeout`: How long to wait for a TCP connection (5 seconds)
- `socketTimeout`: How long to wait for data on an established connection (300 seconds / 5 minutes)
- `loginTimeout`: How long to wait for authentication to complete (10 seconds)

For Python with psycopg2:

```python
conn = psycopg2.connect(
    host="postgres.database.svc.cluster.local",
    port=5432,
    dbname="mydb",
    connect_timeout=5,
    options="-c statement_timeout=300000"  # 300 seconds in milliseconds
)
```

For Node.js with pg:

```javascript
const pool = new Pool({
  host: 'postgres.database.svc.cluster.local',
  port: 5432,
  database: 'mydb',
  connectionTimeoutMillis: 5000,
  query_timeout: 300000,
  idle_in_transaction_session_timeout: 60000
});
```

## Database-Side Timeouts

PostgreSQL has several relevant timeout settings:

```sql
-- Maximum time for any single statement
SET statement_timeout = '300s';

-- Timeout for idle connections in a transaction
SET idle_in_transaction_session_timeout = '60s';

-- TCP keepalive settings
SET tcp_keepalives_idle = 600;
SET tcp_keepalives_interval = 30;
SET tcp_keepalives_count = 5;
```

MySQL equivalent:

```sql
SET GLOBAL wait_timeout = 3600;
SET GLOBAL interactive_timeout = 3600;
SET GLOBAL net_read_timeout = 300;
SET GLOBAL net_write_timeout = 300;
```

## Aligning All the Timeouts

The key principle: timeouts should increase as you move from the application toward the database. Here is a recommended configuration:

```text
Application socket timeout:    300s
Istio connect timeout:         10s
Istio idle timeout:          1800s
Database statement timeout:    600s
Database idle timeout:        3600s
```

Why this order? If the application times out first (300s), it can cleanly handle the error and retry or report to the user. If the database times out first (600s), it cancels the query on the server side, freeing resources. The Istio idle timeout (1800s) is longer than the application socket timeout, so Istio does not unexpectedly close connections that the application thinks are still valid.

The DestinationRule that implements this:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: database-timeouts
  namespace: database
spec:
  host: postgres.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 10s
        idleTimeout: 1800s
        maxConnections: 100
```

## Handling Long-Running Queries

Some queries legitimately take a long time - data migrations, report generation, ETL jobs. For these, you need longer timeouts. Instead of increasing timeouts globally, create a separate DestinationRule subset:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: database
  namespace: database
spec:
  host: postgres.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 10s
        idleTimeout: 1800s
        maxConnections: 100
  subsets:
    - name: long-running
      labels:
        workload: analytics
      trafficPolicy:
        connectionPool:
          tcp:
            connectTimeout: 30s
            idleTimeout: 7200s
            maxConnections: 20
```

Then route the analytics workload through the subset:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: database-routing
  namespace: database
spec:
  hosts:
    - postgres.database.svc.cluster.local
  tcp:
    - match:
        - sourceLabels:
            app: analytics-worker
      route:
        - destination:
            host: postgres.database.svc.cluster.local
            subset: long-running
            port:
              number: 5432
    - route:
        - destination:
            host: postgres.database.svc.cluster.local
            port:
              number: 5432
```

## TCP Keepalive Through Istio

TCP keepalives prevent idle connections from being silently dropped by intermediate network devices (load balancers, firewalls). Envoy supports TCP keepalive through Istio's EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: tcp-keepalive
  namespace: database
spec:
  workloadSelector:
    labels:
      app: api-server
  configPatches:
    - applyTo: CLUSTER
      match:
        context: SIDECAR_OUTBOUND
        cluster:
          service: postgres.database.svc.cluster.local
      patch:
        operation: MERGE
        value:
          upstream_connection_options:
            tcp_keepalive:
              keepalive_time: 300
              keepalive_interval: 30
              keepalive_probes: 5
```

This sends a keepalive probe after 300 seconds of inactivity, then every 30 seconds, and gives up after 5 failed probes.

## Diagnosing Timeout Issues

When queries are timing out and you are not sure which layer is causing it:

1. Check the application logs for the specific error message. Connection timeout vs. read timeout vs. write timeout tells you which layer failed.

2. Check Istio proxy metrics:

```bash
kubectl exec <app-pod> -c istio-proxy -- pilot-agent request GET stats | grep -E "cx_connect_timeout|cx_destroy_local|cx_destroy_remote"
```

3. Check the database server logs for canceled queries or connection resets.

4. Use `istioctl proxy-config` to verify the actual timeout values applied:

```bash
istioctl proxy-config cluster <app-pod> -n app --fqdn postgres.database.svc.cluster.local -o json
```

Look for the `connectTimeout` and `idleTimeout` values in the output.

Timeout configuration through Istio is not complicated once you understand the layering. The principle is straightforward: align your timeouts from short (application) to long (database), and make sure Istio's timeouts sit between those two extremes. This way, the application always gets a clean error before the underlying layers give up.
