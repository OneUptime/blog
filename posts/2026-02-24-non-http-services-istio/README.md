# How to Handle Non-HTTP Services in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TCP, Non-HTTP, Database, Service Mesh, Protocol

Description: Configure Istio to properly handle non-HTTP services like databases, message queues, and custom TCP protocols with correct routing and mTLS support.

---

Istio shines with HTTP and gRPC traffic, but not every service speaks HTTP. Databases, message brokers, custom binary protocols, and legacy services all use raw TCP or specialized protocols. Istio can still manage this traffic, but the configuration is different and you lose some of the Layer 7 features.

Here is how to make non-HTTP services work properly in an Istio mesh.

## What You Get (and What You Lose) with Non-HTTP Services

For HTTP services, Istio gives you:
- Path-based routing
- Header-based routing
- Per-request retries
- Request-level metrics (status codes, latency per path)
- JWT authentication
- Header-based authorization

For non-HTTP (TCP) services, you still get:
- mTLS encryption
- TCP-level connection metrics
- Network-level authorization (by source IP, namespace, service account)
- Connection pool limits
- TCP-level load balancing
- Outlier detection (based on connection failures)

What you lose is the per-request visibility. Istio sees TCP connections as opaque byte streams and cannot inspect or route based on the protocol content.

## Configuring TCP Services

The first step is declaring the correct protocol in your Service definition. Use the `tcp-` prefix:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
  - name: tcp-postgres
    port: 5432
    targetPort: 5432
```

For well-known protocols, Istio has dedicated prefixes:

```yaml
# MySQL
- name: mysql
  port: 3306
  targetPort: 3306

# MongoDB
- name: mongo
  port: 27017
  targetPort: 27017

# Redis
- name: redis
  port: 6379
  targetPort: 6379
```

These protocol-specific prefixes tell Istio to use the appropriate protocol filter, which gives slightly better metrics and connection handling than generic TCP.

## Database Services

Databases are the most common non-HTTP services in a mesh. Here is a complete setup for PostgreSQL:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
  - name: tcp-postgres
    port: 5432
    targetPort: 5432
```

Traffic policy for the database:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: postgres-policy
spec:
  host: postgres
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 10s
        tcpKeepalive:
          time: 7200s
          interval: 75s
    outlierDetection:
      consecutiveGatewayErrors: 3
      interval: 30s
      baseEjectionTime: 60s
```

The `tcpKeepalive` settings are important for database connections. Without keepalives, long-lived idle connections might get silently dropped by intermediate network devices.

## Message Broker Services

RabbitMQ, Kafka, and NATS all use custom protocols over TCP. Here is a RabbitMQ setup:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq
spec:
  selector:
    app: rabbitmq
  ports:
  - name: tcp-amqp
    port: 5672
    targetPort: 5672
  - name: http-management
    port: 15672
    targetPort: 15672
```

Notice that RabbitMQ exposes both a TCP port (AMQP) and an HTTP port (management UI). Name them with the correct prefixes so Istio treats each appropriately.

For Kafka:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kafka
spec:
  selector:
    app: kafka
  ports:
  - name: tcp-kafka
    port: 9092
    targetPort: 9092
  - name: tcp-kafka-internal
    port: 9093
    targetPort: 9093
```

## TCP Routing with VirtualService

While you cannot do path-based or header-based routing for TCP services, you can still route based on port and destination:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: postgres-routing
spec:
  hosts:
  - postgres
  tcp:
  - match:
    - port: 5432
    route:
    - destination:
        host: postgres
        port:
          number: 5432
        subset: primary
      weight: 100
```

For read replicas, route different subsets:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: postgres-subsets
spec:
  host: postgres
  subsets:
  - name: primary
    labels:
      role: primary
  - name: replica
    labels:
      role: replica
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: postgres-read-write-split
spec:
  hosts:
  - postgres-primary
  tcp:
  - match:
    - port: 5432
    route:
    - destination:
        host: postgres
        port:
          number: 5432
        subset: primary
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: postgres-read
spec:
  hosts:
  - postgres-readonly
  tcp:
  - match:
    - port: 5432
    route:
    - destination:
        host: postgres
        port:
          number: 5432
        subset: replica
```

## Authorization for Non-HTTP Services

You can still control who accesses non-HTTP services using AuthorizationPolicy. The difference is you match on source identity instead of HTTP attributes:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: postgres-access
spec:
  selector:
    matchLabels:
      app: postgres
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/my-app/sa/backend-service"
        - "cluster.local/ns/my-app/sa/migration-job"
    to:
    - operation:
        ports:
        - "5432"
```

Only the `backend-service` and `migration-job` service accounts can connect to PostgreSQL. Everything else gets denied.

## mTLS with Non-HTTP Services

mTLS works transparently with TCP services. Istio wraps the TCP connection in TLS at the sidecar level. The application connects to the database on plain TCP, the sidecar encrypts it, and the receiving sidecar decrypts it before passing it to the database.

Make sure mTLS is enabled:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: my-app
spec:
  mtls:
    mode: STRICT
```

One common issue is that some database clients send a TLS negotiation as part of the connection setup. If the client tries to negotiate TLS and the sidecar is already doing mTLS, you get a double-encryption conflict. Tell your database client to use plain TCP (no SSL) and let Istio handle encryption:

```bash
# PostgreSQL connection string without SSL (Istio handles encryption)
postgresql://user:pass@postgres:5432/mydb?sslmode=disable
```

## Handling External Non-HTTP Services

For databases and services running outside the mesh, use ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-postgres
spec:
  hosts:
  - external-db.example.com
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-postgres-tls
spec:
  host: external-db.example.com
  trafficPolicy:
    tls:
      mode: SIMPLE
    connectionPool:
      tcp:
        maxConnections: 20
        connectTimeout: 5s
```

The `tls.mode: SIMPLE` tells Istio to originate TLS when connecting to the external database. This is different from mTLS (which is for mesh-internal traffic).

## Monitoring Non-HTTP Services

TCP metrics are less detailed than HTTP metrics, but you still get useful data:

```promql
# TCP connections opened per service
sum(rate(istio_tcp_connections_opened_total{
  destination_service="postgres.my-app.svc.cluster.local"
}[5m])) by (source_workload)

# TCP bytes sent
sum(rate(istio_tcp_sent_bytes_total{
  destination_service="postgres.my-app.svc.cluster.local"
}[5m])) by (source_workload)

# TCP bytes received
sum(rate(istio_tcp_received_bytes_total{
  destination_service="postgres.my-app.svc.cluster.local"
}[5m])) by (source_workload)
```

These tell you which workloads are connecting to the database, how much data they are sending and receiving, and the connection rate.

## When to Bypass the Sidecar for Non-HTTP Traffic

In some cases, the sidecar adds overhead that is not worth it for TCP services. High-throughput, latency-sensitive database connections are a common example. If mTLS is not required and you do not need authorization policies, you can exclude the port:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "5432"
```

This makes database connections bypass the sidecar entirely, eliminating the proxy overhead. But you lose encryption, access control, and metrics for that traffic.

## Summary

Non-HTTP services in Istio get less functionality than HTTP services, but you still get mTLS, authorization, connection pool management, and basic metrics. Name your ports correctly, configure TCP-specific VirtualService and DestinationRule resources, and use service account-based authorization to control access. For database connections, disable application-level TLS and let Istio handle encryption. And consider excluding high-throughput TCP ports from the sidecar if the proxy overhead is not acceptable for your use case.
