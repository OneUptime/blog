# How to Configure Authorization for TCP Traffic in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, TCP, Security, Kubernetes, Network Policy

Description: How to set up authorization policies for TCP-based services like databases, message queues, and custom protocols running in your Istio service mesh.

---

Not everything in your mesh speaks HTTP. Databases, message queues, cache servers, and custom binary protocols all use raw TCP connections. Istio's authorization policies still work for these services, but the available matching criteria are different. You can't match on HTTP methods or URL paths for a PostgreSQL connection, but you can control access based on source identity, namespace, IP address, and port number.

This post covers how to configure authorization for TCP traffic with practical examples for common services.

## What's Different About TCP Authorization

For HTTP traffic, Istio can inspect the request at layer 7 - it sees methods, paths, headers, and other HTTP-specific attributes. For TCP traffic, Istio only sees layer 4 information:

- Source IP address
- Destination port
- Source identity (from mTLS certificate)
- Source namespace
- Source service account

You cannot use these HTTP-specific fields in TCP authorization policies:
- `methods`
- `paths`
- `hosts`
- `request.auth.claims` (JWT claims)
- `request.headers`

If you accidentally include HTTP fields in a policy targeting a TCP service, Istio ignores those fields for TCP connections.

## Basic TCP Authorization

Allow only specific services to connect to a database:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: postgres-access
  namespace: database
spec:
  selector:
    matchLabels:
      app: postgres
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/backend/sa/order-service"
              - "cluster.local/ns/backend/sa/user-service"
              - "cluster.local/ns/backend/sa/inventory-service"
```

Only these three service accounts can establish TCP connections to the PostgreSQL pods. Everything else is dropped.

## Port-Based TCP Authorization

Restrict access to specific ports:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: redis-access
  namespace: cache
spec:
  selector:
    matchLabels:
      app: redis
  action: ALLOW
  rules:
    # Application port - backend services only
    - from:
        - source:
            namespaces: ["backend"]
      to:
        - operation:
            ports: ["6379"]
    # Sentinel port - only Redis peers
    - from:
        - source:
            principals: ["cluster.local/ns/cache/sa/redis"]
      to:
        - operation:
            ports: ["26379"]
    # Metrics port - monitoring
    - from:
        - source:
            namespaces: ["monitoring"]
      to:
        - operation:
            ports: ["9121"]
```

Each port gets its own access rules. The application data port is accessible to backend services, the Sentinel port is only for Redis cluster communication, and the metrics port is for the monitoring namespace.

## Kafka Authorization

Kafka brokers use TCP connections on multiple ports. Here's a comprehensive policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: kafka-access
  namespace: messaging
spec:
  selector:
    matchLabels:
      app: kafka
  action: ALLOW
  rules:
    # Client connections from producers and consumers
    - from:
        - source:
            namespaces: ["backend", "analytics"]
      to:
        - operation:
            ports: ["9092"]
    # Inter-broker communication
    - from:
        - source:
            principals: ["cluster.local/ns/messaging/sa/kafka"]
      to:
        - operation:
            ports: ["9093"]
    # ZooKeeper connections (from Kafka brokers only)
    - from:
        - source:
            principals: ["cluster.local/ns/messaging/sa/kafka"]
      to:
        - operation:
            ports: ["2181"]
```

## MySQL Authorization

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: mysql-access
  namespace: database
spec:
  selector:
    matchLabels:
      app: mysql
  action: ALLOW
  rules:
    # Main database port
    - from:
        - source:
            principals:
              - "cluster.local/ns/backend/sa/api-service"
              - "cluster.local/ns/backend/sa/migration-job"
      to:
        - operation:
            ports: ["3306"]
    # MySQL Group Replication port
    - from:
        - source:
            principals: ["cluster.local/ns/database/sa/mysql"]
      to:
        - operation:
            ports: ["33061"]
```

## Namespace-Based TCP Isolation

Lock down an entire database namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: database-ns-isolation
  namespace: database
spec:
  # No selector - applies to all workloads in the namespace
  action: ALLOW
  rules:
    # Internal database communication
    - from:
        - source:
            namespaces: ["database"]
    # Backend service access
    - from:
        - source:
            namespaces: ["backend"]
      to:
        - operation:
            ports: ["3306", "5432", "6379"]
    # Monitoring access to metrics ports only
    - from:
        - source:
            namespaces: ["monitoring"]
      to:
        - operation:
            ports: ["9090", "9121", "9187"]
```

## Denying TCP Access

Block specific sources from connecting:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-dev-to-prod-db
  namespace: database
spec:
  action: DENY
  rules:
    - from:
        - source:
            namespaces:
              - "development"
              - "staging"
              - "sandbox"
```

This prevents any development or staging service from reaching anything in the database namespace.

## Mixed HTTP and TCP Services

Some services expose both HTTP and TCP ports. For example, a service might have an HTTP API on port 8080 and a gRPC stream on port 9090:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: mixed-protocol-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: data-service
  action: ALLOW
  rules:
    # HTTP API - with method and path restrictions
    - from:
        - source:
            namespaces: ["frontend"]
      to:
        - operation:
            ports: ["8080"]
            methods: ["GET"]
            paths: ["/api/*"]
    # TCP port - identity-based only
    - from:
        - source:
            principals: ["cluster.local/ns/my-app/sa/stream-processor"]
      to:
        - operation:
            ports: ["9090"]
```

For the HTTP port, you can use full HTTP matching. For the TCP port, you're limited to identity and port-based rules.

## IP-Based TCP Authorization

For services that receive traffic from outside the mesh:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: external-db-access
  namespace: database
spec:
  selector:
    matchLabels:
      app: postgres
  action: ALLOW
  rules:
    # Mesh services by identity
    - from:
        - source:
            principals:
              - "cluster.local/ns/backend/sa/api-service"
    # External access by IP
    - from:
        - source:
            ipBlocks:
              - "10.0.0.0/8"
      to:
        - operation:
            ports: ["5432"]
```

## Handling Services Without Sidecars

If a TCP service doesn't have an Istio sidecar (common for third-party databases), authorization policies don't apply to it directly. In that case, apply policies to the calling services instead:

```yaml
# This won't work if the external DB has no sidecar
# Instead, use a ServiceEntry + egress policy approach

apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-postgres
  namespace: backend
spec:
  hosts:
    - external-db.example.com
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
```

Then control which of your services can reach the external database using Sidecar resources or egress policies.

## Testing TCP Authorization

Testing TCP policies requires connecting to TCP ports:

```bash
# Test TCP connectivity (should succeed if allowed)
kubectl exec -n backend deploy/api-service -- nc -zv postgres.database 5432

# Test from a blocked namespace (should fail)
kubectl exec -n sandbox deploy/test-pod -- nc -zv postgres.database 5432

# Check connection status with timeout
kubectl exec -n backend deploy/api-service -- timeout 5 bash -c 'echo > /dev/tcp/postgres.database/5432 && echo "Connected" || echo "Blocked"'

# Check Envoy RBAC stats for TCP
kubectl exec -n database deploy/postgres -c istio-proxy -- curl -s localhost:15000/stats | grep rbac
```

## Monitoring TCP Authorization

Track TCP authorization decisions:

```bash
# Check allowed and denied TCP connections
kubectl exec -n database deploy/postgres -c istio-proxy -- curl -s localhost:15000/stats | grep -E "rbac.*(allowed|denied)"
```

Use Prometheus to monitor:

```promql
# TCP connection denial rate
sum(rate(istio_tcp_connections_closed_total{
  destination_service_name="postgres",
  response_flags=~".*UAEX.*"
}[5m]))
```

## Important Notes

1. **mTLS is essential.** Identity-based TCP policies (principals, namespaces) only work with mTLS enabled. Without mTLS, Istio can't verify who is connecting.

2. **Protocol detection.** Istio needs to detect that traffic is TCP (not HTTP). If you use standard ports (like 3306 for MySQL), Istio auto-detects the protocol. For non-standard ports, name your service ports with the `tcp-` prefix:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-tcp-service
spec:
  ports:
    - name: tcp-data
      port: 9999
      targetPort: 9999
```

3. **Connection-level enforcement.** TCP authorization is checked when the connection is established, not per-message. Once a TCP connection is allowed, all data on that connection flows freely.

TCP authorization in Istio gives you network-policy-like controls with the added benefit of cryptographic identity verification. It's especially valuable for protecting data stores and message brokers that are the most sensitive components in any architecture.
