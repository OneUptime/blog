# How to Fix MySQL Connection Issues Through Istio Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MySQL, Database, TCP Routing, Troubleshooting

Description: How to resolve MySQL database connection failures when traffic flows through the Istio Envoy sidecar proxy.

---

Connecting to MySQL through an Istio sidecar should be transparent, but in practice you can run into connection timeouts, authentication failures, and dropped connections. MySQL uses its own binary protocol over TCP, and the interaction between this protocol and the Envoy proxy requires some specific configuration.

## MySQL Protocol and Istio

MySQL connections start with a TCP handshake, followed by the MySQL protocol handshake (server greeting, authentication, etc.). Unlike HTTP traffic, Istio can't inspect the content of MySQL packets at the application layer. It treats MySQL as opaque TCP traffic.

For Istio to handle MySQL correctly, the service port must be named with the `mysql` or `tcp` prefix:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: database
spec:
  ports:
  - name: mysql
    port: 3306
    targetPort: 3306
  selector:
    app: mysql
```

Or explicitly:

```yaml
ports:
- name: tcp-mysql
  port: 3306
  targetPort: 3306
```

If the port is named with an `http` prefix, Istio tries to parse MySQL traffic as HTTP, which breaks everything.

## Connection Timeouts During Startup

The classic problem: your application starts before the sidecar is ready and can't connect to MySQL. The connection attempt either hangs or gets a "connection refused" error.

Fix with the hold annotation:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      holdApplicationUntilProxyStarts: true
```

Or add retry logic in your application's database connection setup. Most MySQL drivers support connection retries:

```python
import mysql.connector
from mysql.connector import Error
import time

def connect_with_retry(config, max_retries=10, delay=3):
    for attempt in range(max_retries):
        try:
            conn = mysql.connector.connect(**config)
            return conn
        except Error as e:
            if attempt < max_retries - 1:
                time.sleep(delay)
            else:
                raise e
```

## mTLS Issues with MySQL

When STRICT mTLS is enabled in the destination namespace, MySQL connections from pods without sidecars fail. The sidecar expects mTLS, but the MySQL client sends the plain MySQL protocol.

If both the client pod and the MySQL pod have sidecars, mTLS works transparently. Istio handles the encryption.

If the MySQL server is outside the mesh (no sidecar), create a DestinationRule to disable mTLS for that destination:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: mysql-no-mtls
  namespace: my-namespace
spec:
  host: mysql.database.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
```

## Connection Pool Exhaustion

Envoy has connection pool limits for TCP connections. If your application opens many MySQL connections, it might hit these limits:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: mysql-pool
  namespace: my-namespace
spec:
  host: mysql.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
        connectTimeout: 10s
```

The default `maxConnections` might be too low for database workloads. Set it higher than your application's connection pool size.

Check current connections:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s localhost:15000/stats | grep "cx_active.*mysql"
```

## Idle Connection Drops

MySQL connections that sit idle for too long can get dropped by the Envoy proxy. This causes "MySQL server has gone away" errors.

Configure the TCP idle timeout:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: mysql-dr
  namespace: my-namespace
spec:
  host: mysql.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
        idleTimeout: 3600s
```

Set this longer than your MySQL connection pool's idle timeout and longer than MySQL's `wait_timeout` server variable.

Also make sure your application's connection pool has keep-alive or validation queries enabled. Most connection pools support a "test on borrow" or "validation interval" setting that sends a query periodically to keep the connection alive.

## External MySQL (Outside the Cluster)

If your MySQL server is outside the Kubernetes cluster (RDS, Cloud SQL, or a bare-metal server), you need a ServiceEntry to tell Istio about it:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-mysql
  namespace: my-namespace
spec:
  hosts:
  - my-mysql-server.example.com
  ports:
  - number: 3306
    name: tcp-mysql
    protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
```

Without the ServiceEntry, Istio might block outbound connections to the external MySQL server if outbound traffic policy is set to `REGISTRY_ONLY`:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep outboundTrafficPolicy
```

If it says `REGISTRY_ONLY`, you must create ServiceEntries for all external services. If it says `ALLOW_ANY`, external connections work without ServiceEntries.

## MySQL SSL/TLS with Istio mTLS

If MySQL itself uses SSL/TLS (not Istio mTLS), and the client pod has an Istio sidecar, you end up with double encryption: the application encrypts with MySQL SSL, and the sidecar wraps it in mTLS.

This works but adds overhead. If both the client and server are in the mesh, you can skip MySQL's own SSL and rely on Istio's mTLS:

Configure your MySQL client to not use SSL:

```text
mysql -h mysql-host -u user -p --ssl-mode=DISABLED
```

Istio's mTLS provides encryption in transit, so you don't need both layers.

## Bypassing the Proxy for MySQL

If the Istio proxy is causing too many issues with MySQL and you want to bypass it entirely for database traffic:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.1.100/32"
```

Replace with the MySQL server's IP address. This tells the sidecar to not intercept traffic to that IP.

Or exclude by port:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "3306"
```

This excludes all outbound traffic on port 3306 from sidecar interception. Use this as a last resort because it bypasses all Istio features (mTLS, observability, policy) for that traffic.

## Debugging MySQL Connection Issues

Check the Envoy access logs for MySQL traffic:

```bash
kubectl logs <pod-name> -c istio-proxy -n my-namespace | grep "3306"
```

Look at the response flags:
- `UH`: No healthy upstream (MySQL pod is down or not ready)
- `UF`: Upstream connection failure (can't establish TCP connection)
- `URX`: Upstream retry limit exceeded

Check the upstream cluster status:

```bash
istioctl proxy-config clusters <pod-name> -n my-namespace | grep mysql
```

And endpoints:

```bash
istioctl proxy-config endpoints <pod-name> -n my-namespace | grep mysql
```

Make sure the MySQL endpoint shows as HEALTHY.

## Summary

MySQL connection issues through Istio are usually caused by incorrect port naming (must be `mysql` or `tcp-*`), mTLS mismatches, connection pool limits, or idle connection timeouts. Name your ports correctly, configure adequate connection pool sizes and idle timeouts, and create ServiceEntries for external MySQL servers. If the proxy causes persistent problems, you can exclude MySQL traffic from sidecar interception as a workaround.
