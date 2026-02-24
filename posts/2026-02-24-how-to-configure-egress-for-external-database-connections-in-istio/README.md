# How to Configure Egress for External Database Connections in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, Database, ServiceEntry, TCP

Description: How to configure Istio egress rules for external database connections including PostgreSQL, MySQL, MongoDB, and Redis with proper TCP and TLS settings.

---

Connecting to external databases from within an Istio mesh requires careful configuration. Databases use long-lived TCP connections, specific ports, and often their own TLS requirements. Getting the ServiceEntry, port naming, and protocol settings right is essential for reliable database connectivity.

This guide covers the specifics of configuring egress for PostgreSQL, MySQL, MongoDB, Redis, and other common database systems when running in REGISTRY_ONLY mode.

## Database Traffic Is Different from HTTP

Most egress guides focus on HTTP/HTTPS traffic because it is the most common. Database connections are different:

- They use TCP, not HTTP
- Connections are long-lived (connection pools keep them open for minutes or hours)
- They use database-specific ports (5432, 3306, 27017, 6379)
- Some use TLS, others use STARTTLS, and some use no encryption
- Connection timeouts and idle timeouts need tuning

Istio handles TCP traffic through the sidecar proxy, but it cannot inspect the application-layer protocol. This means you get TCP-level metrics (bytes in/out, connection count) but not query-level metrics.

## PostgreSQL (Amazon RDS, Cloud SQL, Azure Database)

### Basic Configuration

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: rds-postgres
  namespace: default
spec:
  hosts:
  - "mydb.cluster-abc123.us-east-1.rds.amazonaws.com"
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

The port name `tcp-postgres` follows Istio's naming convention: `protocol-description`. Using the `tcp-` prefix tells Istio this is raw TCP traffic.

### PostgreSQL with SSL

If your PostgreSQL instance requires SSL (like RDS with `rds.force_ssl=1`), set the protocol to TCP. The sidecar passes through the TLS handshake between the PostgreSQL client and server:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: rds-postgres-ssl
spec:
  hosts:
  - "mydb.cluster-abc123.us-east-1.rds.amazonaws.com"
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

The configuration is the same as non-SSL. PostgreSQL SSL negotiation happens after the TCP connection is established, so Istio treats it the same way.

### RDS with Read Replicas

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: rds-postgres-cluster
spec:
  hosts:
  - "mydb.cluster-abc123.us-east-1.rds.amazonaws.com"
  - "mydb.cluster-ro-abc123.us-east-1.rds.amazonaws.com"
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

Include both the writer endpoint and the reader endpoint.

### Connection Pool Tuning

Database connections are long-lived. Configure the DestinationRule to handle this:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: postgres-connection-pool
spec:
  host: mydb.cluster-abc123.us-east-1.rds.amazonaws.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 10s
        tcpKeepalive:
          time: 300s
          interval: 60s
          probes: 3
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
```

The `tcpKeepalive` settings prevent idle connections from being silently dropped by intermediate firewalls or load balancers. This is important for connection pools that keep connections open.

## MySQL (Amazon RDS, Cloud SQL, Azure Database)

### Basic Configuration

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: cloud-sql-mysql
spec:
  hosts:
  - "10.0.1.100"
  addresses:
  - "10.0.1.100/32"
  ports:
  - number: 3306
    name: tcp-mysql
    protocol: TCP
  resolution: STATIC
  location: MESH_EXTERNAL
  endpoints:
  - address: 10.0.1.100
```

For Cloud SQL private IP connections, use STATIC resolution since you connect by IP address.

### MySQL with DNS-Based Endpoint

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: rds-mysql
spec:
  hosts:
  - "mydb.abc123.us-east-1.rds.amazonaws.com"
  ports:
  - number: 3306
    name: tcp-mysql
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

## MongoDB (MongoDB Atlas, DocumentDB)

MongoDB Atlas uses TLS on port 27017 and connects to multiple shard hosts:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: mongodb-atlas
spec:
  hosts:
  - "*.abc123.mongodb.net"
  ports:
  - number: 27017
    name: tcp-mongo
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

Using `protocol: TLS` because MongoDB Atlas enforces TLS. The sidecar matches on SNI for routing. The wildcard host covers all shard hosts and the mongos router hosts.

For DocumentDB:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: documentdb
spec:
  hosts:
  - "docdb-cluster.cluster-abc123.us-east-1.docdb.amazonaws.com"
  ports:
  - number: 27017
    name: tcp-mongo
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

## Redis (ElastiCache, Memorystore)

### Redis Without TLS

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: redis-cache
spec:
  hosts:
  - "my-redis.abc123.use1.cache.amazonaws.com"
  ports:
  - number: 6379
    name: tcp-redis
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

### Redis with TLS (ElastiCache in-transit encryption)

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: redis-tls
spec:
  hosts:
  - "my-redis.abc123.use1.cache.amazonaws.com"
  ports:
  - number: 6379
    name: tls-redis
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

Note the port name changes to `tls-redis` and the protocol to `TLS`.

### Redis Cluster Mode

Redis cluster mode returns multiple node endpoints. You may need to allow all of them:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: redis-cluster
spec:
  hosts:
  - "*.abc123.use1.cache.amazonaws.com"
  ports:
  - number: 6379
    name: tcp-redis
    protocol: TCP
  resolution: NONE
  location: MESH_EXTERNAL
```

## Elasticsearch (Amazon OpenSearch, Elastic Cloud)

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: opensearch
spec:
  hosts:
  - "my-domain.us-east-1.es.amazonaws.com"
  ports:
  - number: 443
    name: tls-es
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

OpenSearch uses HTTPS on port 443, not the default Elasticsearch port 9200.

## Routing Database Traffic Through an Egress Gateway

For auditing, route database connections through the egress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: db-egress
  namespace: istio-system
spec:
  selector:
    istio: egressgateway
  servers:
  - port:
      number: 5432
      name: tcp-postgres
      protocol: TCP
    hosts:
    - "mydb.cluster-abc123.us-east-1.rds.amazonaws.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: postgres-via-egress
spec:
  hosts:
  - "mydb.cluster-abc123.us-east-1.rds.amazonaws.com"
  gateways:
  - istio-system/db-egress
  - mesh
  tcp:
  - match:
    - gateways:
      - mesh
      port: 5432
    route:
    - destination:
        host: istio-egressgateway.istio-system.svc.cluster.local
        port:
          number: 5432
  - match:
    - gateways:
      - istio-system/db-egress
      port: 5432
    route:
    - destination:
        host: mydb.cluster-abc123.us-east-1.rds.amazonaws.com
        port:
          number: 5432
```

You also need to expose port 5432 on the egress gateway service. Update the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    egressGateways:
    - name: istio-egressgateway
      enabled: true
      k8s:
        service:
          ports:
          - port: 80
            name: http
          - port: 443
            name: https
          - port: 5432
            name: tcp-postgres
          - port: 3306
            name: tcp-mysql
          - port: 27017
            name: tcp-mongo
          - port: 6379
            name: tcp-redis
```

## Monitoring Database Egress

Track TCP metrics for database connections:

```promql
# Active connections to external databases
sum(envoy_cluster_upstream_cx_active{
  cluster_name=~"outbound.*rds.amazonaws.com.*"
}) by (cluster_name)

# Connection rate
sum(rate(istio_tcp_connections_opened_total{
  destination_service=~".*rds.*|.*cache.*|.*mongodb.*"
}[5m])) by (destination_service_name)

# Bytes transferred
sum(rate(istio_tcp_sent_bytes_total{
  destination_service=~".*rds.*"
}[5m])) by (destination_service_name, source_workload)
```

## Troubleshooting Database Connections

**Connection timeouts.** Check that the ServiceEntry host and port are correct. Verify DNS resolution:

```bash
kubectl exec deploy/my-app -- nslookup mydb.cluster-abc123.us-east-1.rds.amazonaws.com
```

**Connection resets after idle time.** Increase TCP keepalive settings in the DestinationRule. Also check if the database has its own idle timeout setting.

**TLS handshake failures.** If the database requires TLS and you set `protocol: TCP`, the sidecar might interfere with the TLS negotiation. Try `protocol: TLS` instead.

**Port not open on egress gateway.** If routing through an egress gateway, make sure the database port is exposed on the egress gateway service.

```bash
kubectl get svc istio-egressgateway -n istio-system -o yaml | grep -A3 ports
```

## Summary

Configuring egress for external databases in Istio requires ServiceEntry resources with TCP or TLS protocol settings and proper port naming. Use `protocol: TCP` for unencrypted connections and `protocol: TLS` for encrypted ones. Add DestinationRules with TCP keepalive settings to prevent idle connection drops. For auditing, route database traffic through the egress gateway, making sure to expose the database ports on the gateway service. Monitor TCP connection counts and bytes transferred to track database usage patterns.
