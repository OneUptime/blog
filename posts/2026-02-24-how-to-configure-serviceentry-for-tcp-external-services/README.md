# How to Configure ServiceEntry for TCP External Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, TCP, Kubernetes, Service Mesh, Networking

Description: Configure Istio ServiceEntry for TCP-based external services including databases, message queues, and custom protocol services with proper connection handling.

---

Not everything speaks HTTP. Databases, message queues, cache servers, SMTP services, and plenty of custom applications use raw TCP connections. When these services live outside your Kubernetes cluster, you need TCP-specific ServiceEntry configurations to let your mesh workloads reach them.

TCP ServiceEntries work differently from HTTP ones. Envoy treats them as opaque byte streams - it can see connection metadata (source IP, destination IP, ports, bytes transferred) but cannot inspect the payload. This means you get connection-level metrics but not request-level details.

## Basic TCP ServiceEntry

Here is a TCP ServiceEntry for a PostgreSQL database running outside the cluster:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-postgres
spec:
  hosts:
    - postgres.external.company.com
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  resolution: DNS
```

The important details:
- **protocol: TCP** tells Envoy this is opaque TCP traffic
- **name: tcp-postgres** uses the `tcp-` prefix which Istio uses for protocol detection
- **resolution: DNS** works fine for TCP services with DNS hostnames

## Port Naming for TCP

Istio uses port naming conventions to detect protocols. For TCP services, always prefix the port name with `tcp-`:

```yaml
ports:
  - number: 5432
    name: tcp-postgres     # Correct
    protocol: TCP

  - number: 3306
    name: tcp-mysql        # Correct
    protocol: TCP

  - number: 6379
    name: tcp-redis        # Correct
    protocol: TCP
```

If you name the port something like `database` without the `tcp-` prefix and without the `protocol` field, Istio might try to detect the protocol automatically and get it wrong.

## Multiple TCP Services

Register several TCP services at once if they share the same configuration pattern:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-databases
spec:
  hosts:
    - postgres-primary.external.com
    - postgres-replica.external.com
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-redis
spec:
  hosts:
    - redis.external.com
  location: MESH_EXTERNAL
  ports:
    - number: 6379
      name: tcp-redis
      protocol: TCP
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-rabbitmq
spec:
  hosts:
    - rabbitmq.external.com
  location: MESH_EXTERNAL
  ports:
    - number: 5672
      name: tcp-amqp
      protocol: TCP
  resolution: DNS
```

## TCP ServiceEntry with Static IPs

For services with fixed IP addresses:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: on-prem-database
spec:
  hosts:
    - db-primary.datacenter.internal
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  resolution: STATIC
  endpoints:
    - address: 10.100.1.50
      ports:
        tcp-postgres: 5432
    - address: 10.100.1.51
      ports:
        tcp-postgres: 5432
```

## TCP ServiceEntry with IP Addresses Only

Sometimes you connect to an external service by IP address directly, without a hostname. Use the `addresses` field:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-by-ip
spec:
  hosts:
    - external-database.svc
  addresses:
    - 192.168.100.50/32
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  resolution: STATIC
  endpoints:
    - address: 192.168.100.50
```

The `hosts` field is still required (Istio needs it internally), but the `addresses` field tells Envoy to intercept traffic to that specific IP. The hostname in `hosts` can be any synthetic name.

## Connection Pool Settings for TCP

TCP connection pooling is critical for database connections. Long-lived connections, connection limits, and idle timeouts all need tuning:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: postgres-connection-pool
spec:
  host: postgres.external.company.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 10s
        idleTimeout: 3600s
        maxConnectionDuration: 0s
```

Breaking this down:

- **maxConnections: 100** - Limits concurrent connections. When this limit is hit, new connection attempts queue up. Tune this based on your database's max_connections setting.
- **connectTimeout: 10s** - How long to wait for the TCP handshake. Increase this for services across high-latency networks.
- **idleTimeout: 3600s** - Close idle connections after 1 hour. Match this to your database server's connection timeout.
- **maxConnectionDuration: 0s** - No limit on how long a connection lives. Set a value if you want to force connection recycling.

## TCP with TLS

For TCP services that require TLS (encrypted database connections, for example):

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: encrypted-database
spec:
  hosts:
    - encrypted-db.external.com
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tls-postgres
      protocol: TLS
  resolution: DNS
```

Using `protocol: TLS` instead of `TCP` tells Envoy this is TLS-encrypted traffic. Envoy can extract the SNI header for routing without decrypting the payload.

For Envoy to originate TLS (your app sends plaintext, Envoy encrypts):

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: db-tls-origination
spec:
  host: encrypted-db.external.com
  trafficPolicy:
    tls:
      mode: SIMPLE
      sni: encrypted-db.external.com
```

## Outlier Detection for TCP

Circuit breaking works for TCP services too. Envoy detects failures based on connection errors:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: tcp-circuit-breaker
spec:
  host: postgres.external.company.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
```

For TCP, "5xx errors" means connection failures (refused connections, timeouts). When an endpoint accumulates 5 connection failures in 30 seconds, it gets ejected for 60 seconds.

## Monitoring TCP External Services

TCP metrics are connection-level rather than request-level:

```bash
# Active TCP connections
istio_tcp_connections_opened_total{
  destination_service="postgres.external.company.com"
}

# Closed connections
istio_tcp_connections_closed_total{
  destination_service="postgres.external.company.com"
}

# Bytes transferred
istio_tcp_sent_bytes_total{
  destination_service="postgres.external.company.com"
}
istio_tcp_received_bytes_total{
  destination_service="postgres.external.company.com"
}
```

Useful PromQL queries for TCP monitoring:

```promql
# Active connections over time
sum(istio_tcp_connections_opened_total{
  destination_service="postgres.external.company.com"
})
-
sum(istio_tcp_connections_closed_total{
  destination_service="postgres.external.company.com"
})

# Connection rate
rate(istio_tcp_connections_opened_total{
  destination_service="postgres.external.company.com"
}[5m])

# Data transfer rate (bytes/second)
rate(istio_tcp_sent_bytes_total{
  destination_service="postgres.external.company.com"
}[5m])
```

## Debugging TCP ServiceEntry Issues

TCP debugging is harder than HTTP because you cannot just curl the endpoint:

```bash
# Check if Envoy has the cluster
istioctl proxy-config cluster deploy/my-app | grep postgres

# Check endpoints
istioctl proxy-config endpoints deploy/my-app | grep postgres

# Check listeners for the port
istioctl proxy-config listener deploy/my-app | grep 5432

# Test TCP connectivity
kubectl exec deploy/my-app -c my-app -- \
  nc -zv postgres.external.company.com 5432
```

If `nc` works but your application cannot connect, the issue is likely protocol detection. Make sure the port name starts with `tcp-`.

## Common TCP Services Reference

| Service | Default Port | Protocol | Port Name |
|---------|-------------|----------|-----------|
| PostgreSQL | 5432 | TCP | tcp-postgres |
| MySQL | 3306 | TCP | tcp-mysql |
| MongoDB | 27017 | TCP | tcp-mongodb |
| Redis | 6379 | TCP | tcp-redis |
| RabbitMQ | 5672 | TCP | tcp-amqp |
| Kafka | 9092 | TCP | tcp-kafka |
| Elasticsearch | 9300 | TCP | tcp-elasticsearch |
| Cassandra | 9042 | TCP | tcp-cassandra |
| SMTP | 587 | TCP | tcp-smtp |
| LDAP | 389 | TCP | tcp-ldap |

TCP ServiceEntries are straightforward once you know the conventions. Use the `tcp-` port naming prefix, set `protocol: TCP`, and tune your connection pool settings to match the external service's capabilities. The connection-level metrics alone make it worth the effort.
