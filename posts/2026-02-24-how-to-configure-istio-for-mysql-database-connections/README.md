# How to Configure Istio for MySQL Database Connections

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MySQL, Service Mesh, Kubernetes, Database, TCP Traffic

Description: Step-by-step instructions for configuring Istio to handle MySQL database traffic in Kubernetes with proper TCP routing, mTLS, and connection management.

---

MySQL is one of the most widely deployed databases, and running it in Kubernetes behind an Istio service mesh adds security and observability benefits. But MySQL uses its own binary protocol over TCP, so you need specific Istio configuration to make everything work correctly.

This post covers the practical steps for getting MySQL traffic flowing through Istio, including in-cluster and external database scenarios.

## Port Naming Is Everything

The single most important thing when running MySQL behind Istio is getting the port name right. Istio relies on port name prefixes to detect the protocol. For MySQL, you need the `tcp-` or `mysql` prefix.

Istio actually recognizes the `mysql` protocol natively for some metrics purposes, but the traffic handling is still TCP-level. Here is a MySQL Service definition:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: database
spec:
  selector:
    app: mysql
  ports:
    - name: tcp-mysql
      port: 3306
      targetPort: 3306
      protocol: TCP
```

And the corresponding Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
  namespace: database
  labels:
    app: mysql
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
              name: tcp-mysql
          env:
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-credentials
                  key: root-password
            - name: MYSQL_DATABASE
              value: myapp
```

## DestinationRule for MySQL

Connection pool management is important for MySQL. Too many connections will exhaust the MySQL `max_connections` limit, and too few will bottleneck your application. Here is a DestinationRule that handles this:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mysql
  namespace: database
spec:
  host: mysql.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 5s
        idleTimeout: 1800s
    tls:
      mode: ISTIO_MUTUAL
```

The `maxConnections: 50` should be lower than your MySQL `max_connections` setting (which defaults to 151 in MySQL 8.0). This gives Istio a hard cap before connections even reach MySQL. The `idleTimeout` of 1800 seconds should be less than MySQL's `wait_timeout` (which defaults to 28800 seconds) to avoid Istio holding connections that MySQL has already closed.

## Read/Write Splitting with Multiple MySQL Instances

A common MySQL setup has a primary for writes and one or more replicas for reads. You can use Istio to route traffic to different backends:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: mysql-routing
  namespace: database
spec:
  hosts:
    - mysql.database.svc.cluster.local
  tcp:
    - match:
        - port: 3306
      route:
        - destination:
            host: mysql-primary.database.svc.cluster.local
            port:
              number: 3306
          weight: 100
```

For read replicas, you would typically use a separate service name like `mysql-readonly` and configure a separate VirtualService. Since Istio cannot inspect the MySQL protocol to determine if a query is a read or write, the application needs to use different connection strings for reads and writes.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mysql-readonly
  namespace: database
spec:
  host: mysql-readonly.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
    loadBalancer:
      simple: ROUND_ROBIN
    tls:
      mode: ISTIO_MUTUAL
```

Using `ROUND_ROBIN` load balancing across read replicas distributes queries evenly.

## Connecting to External MySQL

When your MySQL database runs outside Kubernetes, you need a ServiceEntry to register it with Istio:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-mysql
  namespace: database
spec:
  hosts:
    - mysql.external.example.com
  ports:
    - number: 3306
      name: tcp-mysql
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
```

If the external MySQL requires TLS, add a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-mysql-tls
  namespace: database
spec:
  host: mysql.external.example.com
  trafficPolicy:
    tls:
      mode: SIMPLE
```

The `SIMPLE` TLS mode tells the Istio proxy to initiate a TLS handshake with the external MySQL server. If you need to provide client certificates for mutual TLS authentication with the external database, use `MUTUAL` mode instead and reference your certificates.

## Securing MySQL Access with Authorization Policies

One of the biggest advantages of running MySQL behind Istio is controlling which services can access it:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: mysql-access-policy
  namespace: database
spec:
  selector:
    matchLabels:
      app: mysql
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/app/sa/backend-api
              - cluster.local/ns/app/sa/migration-job
      to:
        - operation:
            ports: ["3306"]
```

This restricts MySQL access to only the `backend-api` and `migration-job` service accounts. If any other workload tries to connect, Istio rejects the connection at the proxy level - the traffic never reaches MySQL.

## Handling MySQL Protocol Quirks

MySQL has a somewhat unusual connection handshake. When a client connects, the MySQL server sends an initial greeting packet before the client sends anything. This server-first protocol can sometimes confuse Istio's protocol detection if you haven't named your ports correctly.

If you see intermittent connection failures or timeouts during the MySQL handshake, double-check that:

1. The Service port name starts with `tcp-` or is literally `mysql`
2. The DestinationRule has an adequate `connectTimeout`
3. You have not set the port protocol to HTTP or gRPC anywhere

You can check what Istio thinks the protocol is:

```bash
istioctl proxy-config listener <pod-name> -n database --port 3306 -o json
```

Look for the `filterChainMatch` section. For MySQL, you should see a TCP proxy filter, not an HTTP connection manager.

## Monitoring MySQL Connections Through Istio

Istio provides TCP-level metrics for MySQL connections even though it cannot parse the MySQL protocol itself. You can see connection counts, bytes sent/received, and connection duration:

```bash
istioctl dashboard prometheus
```

Then query for metrics like:

```
istio_tcp_connections_opened_total{destination_service="mysql.database.svc.cluster.local"}
istio_tcp_connections_closed_total{destination_service="mysql.database.svc.cluster.local"}
istio_tcp_sent_bytes_total{destination_service="mysql.database.svc.cluster.local"}
istio_tcp_received_bytes_total{destination_service="mysql.database.svc.cluster.local"}
```

These metrics help you understand connection patterns, detect connection leaks, and track data transfer volumes.

## Sidecar Resource Limits

For database-heavy workloads, the Istio sidecar proxy handles a lot of throughput. Consider setting resource limits on the sidecar for your MySQL pods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
  namespace: database
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "500m"
        sidecar.istio.io/proxyMemory: "256Mi"
        sidecar.istio.io/proxyCPULimit: "1000m"
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
```

These annotations control the CPU and memory requests and limits for the Istio sidecar container. For heavy database traffic, you may need to bump these higher than the defaults.

## Summary

Configuring Istio for MySQL requires attention to port naming, connection pool limits, and timeout alignment between Istio and MySQL settings. The key steps are naming your ports with the `tcp-` prefix, setting up DestinationRules with appropriate connection limits, and using AuthorizationPolicies to lock down database access. For external MySQL instances, ServiceEntries and TLS DestinationRules handle the connectivity. Once everything is in place, you get encrypted connections, access control, and telemetry for all your MySQL traffic.
