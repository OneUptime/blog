# How to Configure Istio for MySQL Protocol Detection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MySQL, Protocol Detection, Service Mesh, Kubernetes, Database

Description: How to properly configure Istio to detect and handle MySQL protocol traffic, including port naming, mTLS settings, and connection troubleshooting.

---

Running MySQL behind an Istio service mesh is a common scenario. Most Kubernetes applications talk to a database, and when an application runs in the mesh, its traffic passes through Istio's sidecar proxy whether the database is running inside the cluster or externally. Getting the MySQL protocol configuration right prevents connection failures, authentication errors, and performance issues.

MySQL uses a server-first protocol, meaning the server sends the initial handshake packet before the client sends anything. This is the opposite of HTTP, where the client sends the request first. This distinction matters a lot for Istio's protocol detection.

## Why MySQL Needs Special Handling

Istio's default protocol detection works by sniffing the first bytes that the client sends. For HTTP traffic, the client sends a request, and Istio can identify it easily. But MySQL works differently:

1. The client opens a TCP connection
2. The MySQL server sends a greeting packet (the handshake)
3. The client responds with authentication credentials
4. The server confirms or denies access

Since the server speaks first, Istio's protocol sniffer can sit there waiting for the client to send data. The client is also waiting - for the server's greeting. You end up with both sides waiting, and the connection times out. Istio automatically treats some well-known server-first ports, including 3306, as TCP, but explicit configuration is still the clearer and safer option, especially if MySQL runs on a non-standard port.

This is why explicit protocol configuration is important for MySQL.

## Configuring the Service Port

The first and most important step is naming your Service port correctly. For the normal sidecar data plane, use an explicit TCP port name for MySQL:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: default
spec:
  selector:
    app: mysql
  ports:
    - name: tcp-mysql
      port: 3306
      targetPort: 3306
```

Or using `tcp` as the port name:

```yaml
ports:
  - name: tcp
    port: 3306
    targetPort: 3306
```

Both `tcp` and `tcp-mysql` tell Istio to treat the port as an opaque TCP stream. This avoids HTTP protocol sniffing and is the safest default for server-first protocols like MySQL. Istio also has an experimental `mysql` protocol parser, but it must be explicitly enabled in Istio and otherwise falls back to opaque TCP handling.

You can also use `appProtocol`:

```yaml
ports:
  - name: database
    port: 3306
    targetPort: 3306
    appProtocol: tcp
```

## MySQL Running Inside the Cluster

If MySQL is deployed as a pod in your cluster and sidecar injection is enabled for both workloads, both the MySQL server and the client application will have Istio sidecars. Here is a typical MySQL deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
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
                  name: mysql-secret
                  key: password
```

With the service defined above, traffic from application pods to MySQL flows through both sidecars with mTLS encryption.

## Handling mTLS with MySQL

mTLS can cause issues with MySQL connections if not configured properly. The MySQL client doesn't know about Istio's mTLS layer, and the MySQL server doesn't either. Istio handles the TLS between the sidecars transparently.

But if you have a MySQL client outside the mesh connecting to MySQL inside the mesh, or vice versa, you need to handle the mTLS boundary. For permissive mode:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: mysql-mtls
  namespace: default
spec:
  selector:
    matchLabels:
      app: mysql
  mtls:
    mode: PERMISSIVE
  portLevelMtls:
    3306:
      mode: PERMISSIVE
```

This allows both mTLS and plain TCP connections on port 3306. If all your MySQL clients are inside the mesh, you can use `STRICT` mode.

## Connecting to External MySQL

For MySQL databases running outside the cluster (like RDS, Cloud SQL, or a self-hosted instance), create a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-mysql
  namespace: default
spec:
  hosts:
    - mysql.example.rds.amazonaws.com
  location: MESH_EXTERNAL
  ports:
    - number: 3306
      name: tcp-mysql
      protocol: TCP
  resolution: DNS
```

If the external MySQL server requires TLS, configure TLS in the MySQL client or driver, for example with `ssl-mode=REQUIRED`, `VERIFY_CA`, or `VERIFY_IDENTITY`. Standard MySQL TLS is negotiated inside the MySQL connection after the server's initial handshake packet, so Istio's `SIMPLE` TLS origination, which starts TLS immediately on connect, is not a drop-in replacement for normal MySQL TLS.

## Connection Pool Settings

MySQL connections are long-lived. Applications typically use connection pools that maintain persistent connections. You should tune Istio's connection pool settings to accommodate this:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mysql-connection-pool
  namespace: default
spec:
  host: mysql.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 10s
        tcpKeepalive:
          time: 7200s
          interval: 75s
          probes: 9
```

The TCP keepalive settings are important for MySQL. Without them, idle connections might be closed by network infrastructure (load balancers, firewalls) without either side knowing. The keepalive probes detect dead connections.

`maxConnections: 200` limits the number of TCP connections from a single client sidecar to the MySQL service. Set this based on the connection pool size used by each application instance. If your app pool is configured for 50 connections and you have 4 replicas, each client sidecar needs a limit of at least 50, while the MySQL server must be able to accept at least 200 aggregate application connections.

## Circuit Breaking for MySQL

You can configure circuit breaking to protect your MySQL server from being overwhelmed:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mysql-circuit-breaker
  namespace: default
spec:
  host: mysql.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 50
```

Note that for TCP services like MySQL, outlier detection works based on connection failures rather than HTTP error codes. A "5xx error" for TCP means a connection error or timeout.

## Troubleshooting MySQL Connections Through Istio

When MySQL connections fail through the mesh, follow these steps.

Check if Istio recognizes the protocol:

```bash
istioctl x describe service mysql -n default
```

Verify the listener configuration:

```bash
istioctl proxy-config listener <client-pod> -n default --port 3306
```

You should see a TCP filter chain, not an HTTP one. If you see `envoy.filters.network.http_connection_manager`, the protocol is misconfigured.

Check connectivity from a client pod that has a MySQL client installed:

```bash
kubectl exec -it <client-pod> -n default -- \
  mysqladmin ping -h mysql.default.svc.cluster.local -P 3306
```

Look at the proxy logs for connection errors:

```bash
kubectl logs <client-pod> -c istio-proxy -n default --tail=100 | grep 3306
```

Common error patterns:

- **Connection timeout**: On non-standard MySQL ports, this can mean protocol sniffing is happening when it shouldn't be. Fix the port name.
- **Connection reset**: Could be mTLS mismatch. Check PeerAuthentication settings.
- **Authentication failure**: If you have STRICT mTLS and the client is outside the mesh, the connection is rejected before a normal MySQL authentication exchange can complete.

## MySQL with Istio Ambient Mode

If you're using Istio's ambient mode (ztunnel), MySQL handling is simpler because ztunnel operates at L4 only. There's no protocol detection to worry about. The ztunnel proxy handles mTLS at the TCP level and passes the MySQL traffic through transparently.

```bash
kubectl label namespace default istio.io/dataplane-mode=ambient
```

With ambient mode using ztunnel only, you don't need special port naming for MySQL because ztunnel handles traffic at L4. However, you also do not get MySQL-specific protocol parsing from ztunnel.

MySQL in Istio works well once you tell Istio to treat it as TCP traffic. Name your ports, set appropriate connection pool sizes, and configure mTLS according to your topology. The most common mistakes all come down to protocol detection, so getting that right is the first thing to verify when connections fail.
