# How to Configure Linkerd Opaque Ports for Non-HTTP TCP Protocol Handling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linkerd, Kubernetes, TCP, Service Mesh, Protocol

Description: Learn how to configure Linkerd opaque ports to handle non-HTTP TCP protocols like databases, message queues, and custom protocols while maintaining mTLS encryption and connection-level metrics.

---

Linkerd excels at HTTP traffic with per-request metrics and advanced routing, but many applications use raw TCP protocols. Databases, message queues, and custom protocols don't speak HTTP. Linkerd's opaque ports feature handles these TCP protocols with mTLS encryption and byte-level observability without requiring HTTP.

## Understanding Opaque Ports

By default, Linkerd uses protocol detection to determine whether traffic is HTTP, HTTP/2, or gRPC. If Linkerd cannot detect HTTP, it proxies the connection as plain TCP without HTTP metrics or routing. Some server-first or idle TCP protocols can wait up to the protocol detection timeout before Linkerd falls back to TCP. Opaque ports tell Linkerd to treat traffic as raw TCP without waiting for protocol detection.

Opaque port traffic still gets mTLS encryption and transport-level metrics like open connections and bytes transferred. You lose per-request metrics but gain compatibility with any TCP protocol. This is essential for database connections, server-first protocols, and proprietary protocols.

Linkerd automatically marks some ports as opaque based on well-known conventions, but you can configure additional ports explicitly.

## Prerequisites

You need a Kubernetes cluster with Linkerd installed:

```bash
linkerd version
linkerd check
linkerd viz check
```

Deploy a sample TCP service like MySQL:

```yaml
# mysql-deployment.yaml

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
      annotations:
        linkerd.io/inject: enabled
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        ports:
        - containerPort: 3306
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "password"
---
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: default
spec:
  selector:
    app: mysql
  ports:
  - port: 3306
    targetPort: 3306
    appProtocol: linkerd.io/opaque
```

```bash
kubectl apply -f mysql-deployment.yaml
```

## Configuring Opaque Ports via Annotations

Mark ports as opaque using annotations on the destination Service and workload. In many Kubernetes Service-based cases, setting `appProtocol: linkerd.io/opaque` on the Service port is the preferred way to skip protocol detection; annotations are required for cases such as unmeshed clients, direct pod traffic, headless Services, and egress configuration.

```yaml
# mysql-opaque.yaml
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
      annotations:
        linkerd.io/inject: enabled
        # Mark port 3306 as opaque
        config.linkerd.io/opaque-ports: "3306"
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        ports:
        - containerPort: 3306
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "password"
---
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: default
  annotations:
    config.linkerd.io/opaque-ports: "3306"
spec:
  selector:
    app: mysql
  ports:
  - port: 3306
    targetPort: 3306
    appProtocol: linkerd.io/opaque
```

```bash
kubectl apply -f mysql-opaque.yaml
```

Linkerd now treats traffic to port 3306 as raw TCP without protocol detection.

## Verifying Opaque Port Configuration

Check that the opaque port annotation is applied:

```bash
kubectl get pod -l app=mysql -o jsonpath='{.items[0].metadata.annotations.config\.linkerd\.io/opaque-ports}'
```

Test connectivity:

```bash
kubectl run mysql-client --image=mysql:8.0 --rm -it -- mysql -h mysql -u root -ppassword
```

The connection should work without errors. This quick client pod is unmeshed; use an injected client workload when you want Linkerd mTLS on the client-to-server connection. Check Linkerd metrics:

```bash
linkerd viz stat deploy/mysql
```

For opaque TCP traffic, use the Linkerd proxy metrics for TCP-level details such as open connections and bytes transferred. You won't get per-request latency since Linkerd treats this as opaque TCP.

## Configuring Multiple Opaque Ports

Mark multiple ports as opaque with a comma-separated list:

```yaml
annotations:
  linkerd.io/inject: enabled
  config.linkerd.io/opaque-ports: "3306,5432,6379"
```

This marks MySQL (3306), PostgreSQL (5432), and Redis (6379) as opaque. When you provide this annotation, the values replace Linkerd's default opaque port list rather than adding to it, so include every default opaque port you still need.

## Handling gRPC on Opaque Ports

gRPC uses HTTP/2 by default and works with Linkerd's standard protocol detection. However, application-level TLS or nonstandard TCP framing around an RPC protocol may need opaque ports:

```yaml
# grpc-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grpc-service
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: grpc-service
  template:
    metadata:
      labels:
        app: grpc-service
      annotations:
        linkerd.io/inject: enabled
        # Mark as opaque if using application-level TLS or nonstandard framing
        config.linkerd.io/opaque-ports: "50051"
    spec:
      containers:
      - name: grpc-service
        image: your-registry/grpc-service:latest
        ports:
        - containerPort: 50051
```

Standard unencrypted gRPC usually doesn't need opaque ports, but some edge cases require it.

## Configuring Opaque Ports for Redis

Redis uses the RESP protocol over TCP and is in Linkerd's default opaque port list when it runs on port 6379. Explicitly mark it as opaque when you want to make the configuration visible or when Redis runs on a non-standard port:

```yaml
# redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
      annotations:
        linkerd.io/inject: enabled
        config.linkerd.io/opaque-ports: "6379"
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: default
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
    appProtocol: linkerd.io/opaque
```

```bash
kubectl apply -f redis-deployment.yaml
```

Test Redis connectivity:

```bash
kubectl run redis-client --image=redis:7-alpine --rm -it -- redis-cli -h redis ping
```

## Handling Custom TCP Protocols

For proprietary TCP protocols, opaque ports are essential:

```yaml
# custom-protocol.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: custom-tcp-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: custom-tcp-service
  template:
    metadata:
      labels:
        app: custom-tcp-service
      annotations:
        linkerd.io/inject: enabled
        # Custom protocol on port 8888
        config.linkerd.io/opaque-ports: "8888"
    spec:
      containers:
      - name: custom-tcp-service
        image: your-registry/custom-tcp-service:latest
        ports:
        - containerPort: 8888
```

Linkerd encrypts traffic with mTLS without trying to parse it as HTTP.

## Monitoring Opaque Port Traffic

Query TCP-level metrics for opaque ports:

```bash
linkerd viz stat deploy/mysql
```

For opaque TCP traffic, Prometheus metrics provide the detailed transport-level view:

- Open connections
- Connection open and close counts
- Bytes sent and received

Query Prometheus for detailed metrics:

```promql
# Currently open TCP connections to MySQL
sum(tcp_open_connections{deployment="mysql"})

# TCP connections opened per second
sum(rate(tcp_open_total{deployment="mysql"}[5m]))

# TCP bytes sent
sum(rate(tcp_write_bytes_total{deployment="mysql"}[5m]))

# TCP bytes received
sum(rate(tcp_read_bytes_total{deployment="mysql"}[5m]))
```

## Troubleshooting Opaque Port Issues

If connections fail after marking ports as opaque, check these areas:

Verify the annotation is applied:

```bash
kubectl describe pod -l app=mysql | grep opaque-ports
```

Check Linkerd proxy logs:

```bash
kubectl logs deploy/mysql -c linkerd-proxy | grep -i error
```

Common issues:

- Port mismatch: Ensure annotation matches the destination Service and workload port
- Protocol detection: If Linkerd still tries HTTP parsing, the annotation may not be applied
- mTLS issues: Verify both client and server pods have Linkerd injection

## Combining HTTP and Opaque Ports

Services can expose both HTTP and opaque ports:

```yaml
# mixed-protocol.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-server
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: app-server
  template:
    metadata:
      labels:
        app: app-server
      annotations:
        linkerd.io/inject: enabled
        # Port 8080 is detected as HTTP, 3306 is opaque
        config.linkerd.io/opaque-ports: "3306"
    spec:
      containers:
      - name: app-server
        image: your-registry/app-server:latest
        ports:
        - containerPort: 8080  # HTTP API
        - containerPort: 3306  # Internal database
---
apiVersion: v1
kind: Service
metadata:
  name: app-server
  namespace: default
spec:
  selector:
    app: app-server
  ports:
  - name: http
    port: 8080
    targetPort: 8080
  - name: mysql
    port: 3306
    targetPort: 3306
    appProtocol: linkerd.io/opaque
```

Linkerd provides HTTP metrics for port 8080 and transport-level TCP metrics for port 3306.

## Configuring Skip Ports

For local-only traffic that doesn't need Linkerd, use skip-inbound-ports or skip-outbound-ports:

```yaml
annotations:
  linkerd.io/inject: enabled
  config.linkerd.io/skip-inbound-ports: "9091"  # Prometheus metrics
  config.linkerd.io/skip-outbound-ports: "3306"  # Direct database access
```

Skip ports bypass Linkerd entirely, while opaque ports use Linkerd with TCP handling. Use skip only when traffic should bypass the proxy; skip-outbound-ports is set on the source workload, while opaque-ports is set on the destination.

## Performance Considerations

Opaque ports avoid protocol detection and HTTP parsing:

- No HTTP parsing overhead
- No per-request metrics collection
- Simpler proxy logic

For high-throughput TCP connections like database queries, opaque ports can reduce proxy processing.

Monitor proxy resource usage:

```bash
kubectl top pods -l app=mysql --containers | grep linkerd-proxy
```

## Default Opaque Ports

Linkerd automatically treats these ports as opaque:

- 25 (SMTP)
- 587 (SMTP submission)
- 3306 (MySQL)
- 4444 (Galera)
- 5432 (PostgreSQL)
- 6379 (Redis)
- 9300 (Elasticsearch)
- 11211 (Memcached)

You don't need to configure these explicitly unless you're using non-standard ports.

## Conclusion

Linkerd opaque ports enable service mesh features for non-HTTP TCP protocols. Mark database ports, message queue ports, and custom protocol ports as opaque using the Service port's `appProtocol: linkerd.io/opaque` field or the `config.linkerd.io/opaque-ports` annotation when an annotation is required.

Opaque traffic maintains mTLS encryption and transport-level observability without HTTP parsing overhead. This gives you secure, observable TCP connections for databases, message queues, and proprietary protocols.

Configure opaque ports explicitly for custom ports or non-standard protocol ports. Monitor TCP-level metrics and verify mTLS is active. This extends Linkerd's benefits beyond HTTP to your entire application stack.
