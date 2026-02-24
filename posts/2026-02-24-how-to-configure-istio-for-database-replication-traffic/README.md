# How to Configure Istio for Database Replication Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Database, Replication, TCP Traffic

Description: Configure Istio to properly handle database replication traffic between primary and replica instances running in Kubernetes with correct protocol detection and mTLS settings.

---

Running databases in Kubernetes is becoming more common, and when you add Istio to the picture, database replication traffic needs special attention. Replication traffic between a primary database and its replicas uses custom wire protocols, long-lived connections, and sometimes high bandwidth. Getting the Istio configuration wrong can cause replication lag, broken replication, or data inconsistency.

This guide covers how to configure Istio for common database replication scenarios including PostgreSQL, MySQL, and MongoDB.

## Why Replication Traffic Needs Special Config

Database replication protocols are proprietary binary protocols running over TCP. They are not HTTP, not gRPC, and Istio can't inspect them at L7. If Istio tries to parse replication traffic as HTTP (which it does by default for ports without explicit protocol hints), things break.

Replication traffic also has these characteristics:
- Long-lived TCP connections (sometimes kept open for days)
- Bidirectional data flow
- Latency-sensitive (high latency causes replication lag)
- High throughput (full table reloads can push gigabytes)

## Setting Up Services with Correct Port Naming

The most important thing is naming your ports correctly. Istio uses port names to determine the protocol:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-primary
  namespace: database
spec:
  clusterIP: None
  ports:
  - port: 5432
    name: tcp-postgres
    targetPort: 5432
  selector:
    app: postgres
    role: primary
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-replicas
  namespace: database
spec:
  clusterIP: None
  ports:
  - port: 5432
    name: tcp-postgres
    targetPort: 5432
  selector:
    app: postgres
    role: replica
```

The `tcp-` prefix tells Istio to treat this as opaque TCP traffic. Without it, Istio might try to parse the traffic as HTTP and corrupt the replication stream.

## Configuring the StatefulSet

Database replicas typically run as a StatefulSet. Here's a PostgreSQL example with the right Istio annotations:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
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
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
          drainDuration: 120s
    spec:
      terminationGracePeriodSeconds: 130
      containers:
      - name: postgres
        image: postgres:16
        ports:
        - containerPort: 5432
          name: tcp-postgres
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

Key annotations:
- `holdApplicationUntilProxyStarts: true` prevents the database from trying to connect to the primary before the sidecar is ready
- `drainDuration: 120s` gives replication streams time to gracefully close during rolling updates

## DestinationRule for Replication Connections

Configure connection pooling specifically for replication traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: postgres-replication
  namespace: database
spec:
  host: postgres-primary.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 10s
        tcpKeepalive:
          time: 300s
          interval: 60s
          probes: 5
    tls:
      mode: ISTIO_MUTUAL
```

The keepalive settings are important. Replication connections can be idle during periods of low write activity, and without keepalives, network infrastructure might drop the connection, causing the replica to disconnect and need to re-establish replication.

## Scoping the Sidecar Configuration

Database pods don't need to know about every service in the mesh. Scope their sidecar configuration to reduce resource usage:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: postgres-sidecar
  namespace: database
spec:
  workloadSelector:
    labels:
      app: postgres
  egress:
  - hosts:
    - "./postgres-primary.database.svc.cluster.local"
    - "./postgres.database.svc.cluster.local"
    - "istio-system/*"
  ingress:
  - port:
      number: 5432
      protocol: TCP
      name: tcp-postgres
    defaultEndpoint: 127.0.0.1:5432
```

## MySQL Replication Configuration

MySQL replication uses port 3306 by default. The same principles apply:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: database
spec:
  clusterIP: None
  ports:
  - port: 3306
    name: tcp-mysql
  selector:
    app: mysql
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mysql-replication
  namespace: database
spec:
  host: mysql.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 10s
        tcpKeepalive:
          time: 300s
          interval: 60s
          probes: 5
```

For MySQL Group Replication, which uses an additional port for inter-node communication:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql-group
  namespace: database
spec:
  clusterIP: None
  ports:
  - port: 3306
    name: tcp-mysql
  - port: 33061
    name: tcp-mysql-gr
  selector:
    app: mysql
```

Both ports need the `tcp-` prefix so Istio doesn't try to parse either as HTTP.

## MongoDB Replica Set Configuration

MongoDB replica sets are particularly interesting because members discover each other through the `rs.conf()` configuration and use the `mongodb+srv://` connection string protocol:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: database
spec:
  clusterIP: None
  ports:
  - port: 27017
    name: tcp-mongodb
  selector:
    app: mongodb
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mongodb-replication
  namespace: database
spec:
  host: mongodb.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 10s
        tcpKeepalive:
          time: 120s
          interval: 30s
          probes: 5
    tls:
      mode: ISTIO_MUTUAL
```

MongoDB uses shorter keepalive intervals because replica set members need to detect primary failures quickly for election purposes.

## Handling mTLS for Replication

Databases often have their own TLS configuration for replication. When Istio adds mTLS on top, you end up with double encryption: the database's TLS inside Istio's mTLS. This wastes CPU but is usually fine.

If you want to avoid double encryption, you can disable TLS in the database configuration and rely solely on Istio mTLS. However, this means replication traffic is unencrypted if the sidecar is bypassed for any reason.

For strict environments, use STRICT mTLS:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: database-mtls
  namespace: database
spec:
  selector:
    matchLabels:
      app: postgres
  mtls:
    mode: STRICT
```

## Monitoring Replication Traffic

Track replication health through Istio's TCP metrics:

```promql
# Bytes sent from replicas to primary (replication ACKs)
istio_tcp_sent_bytes_total{
  source_workload="postgres",
  destination_workload="postgres"
}

# Bytes received by replicas from primary (WAL data)
istio_tcp_received_bytes_total{
  source_workload="postgres",
  destination_workload="postgres"
}

# Connection duration (long-lived connections expected)
istio_tcp_connections_opened_total{
  destination_workload="postgres"
}
```

If you see frequent connection resets (`istio_tcp_connections_closed_total` with high rates), something is killing the replication connections. Check sidecar logs and connection pool settings.

```bash
# Check sidecar logs for connection issues
kubectl logs postgres-0 -c istio-proxy -n database | grep -i "connection\|reset\|timeout"
```

Database replication in a service mesh requires careful protocol configuration, generous connection timeouts, and proper keepalive settings. Get these right and replication runs transparently through Istio with the added benefit of mTLS encryption and observability.
