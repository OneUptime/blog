# How to Configure Linkerd Opaque Ports for Non-HTTP TCP Protocol Handling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linkerd, Kubernetes, TCP, Service Mesh, Protocols

Description: Learn how to configure Linkerd opaque ports to handle non-HTTP TCP protocols like databases, message queues, and custom protocols while maintaining mTLS encryption and connection-level metrics.

---

Linkerd excels at HTTP traffic with per-request metrics and advanced routing, but many applications use raw TCP protocols. Databases, message queues, and custom protocols don't speak HTTP. Linkerd's opaque ports feature handles these TCP protocols with mTLS encryption and connection-level observability without requiring HTTP.

## Understanding Opaque Ports

By default, Linkerd assumes traffic is HTTP and tries to parse it for per-request metrics. When non-HTTP protocols flow through HTTP-configured ports, Linkerd logs errors and metrics become inaccurate. Opaque ports tell Linkerd to treat traffic as raw TCP without HTTP parsing.

Opaque port traffic still gets mTLS encryption and connection-level metrics like bytes transferred and connection duration. You lose per-request metrics but gain compatibility with any TCP protocol. This is essential for database connections, gRPC with custom framing, and proprietary protocols.

Linkerd automatically marks some ports as opaque based on well-known conventions, but you can configure additional ports explicitly.

## Prerequisites

You need a Kubernetes cluster with Linkerd installed:

```bash
linkerd version
linkerd check
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
```

```bash
kubectl apply -f mysql-deployment.yaml
```

## Configuring Opaque Ports via Annotations

Mark ports as opaque using pod annotations:

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
```

```bash
kubectl apply -f mysql-opaque.yaml
```

Linkerd now treats traffic on port 3306 as raw TCP without HTTP parsing.

## Verifying Opaque Port Configuration

Check that the opaque port annotation is applied:

```bash
kubectl get pod -l app=mysql -o jsonpath='{.items[0].metadata.annotations.config\.linkerd\.io/opaque-ports}'
```

Test connectivity:

```bash
kubectl run mysql-client --image=mysql:8.0 --rm -it -- mysql -h mysql -u root -ppassword
```

The connection should work without errors. Check Linkerd metrics:

```bash
linkerd stat deploy/mysql
```

You'll see TCP-level metrics like success rate and connection count, but not per-request latency since Linkerd treats this as opaque TCP.

## Configuring Multiple Opaque Ports

Mark multiple ports as opaque with a comma-separated list:

```yaml
annotations:
  linkerd.io/inject: enabled
  config.linkerd.io/opaque-ports: "3306,5432,6379"
```

This marks MySQL (3306), PostgreSQL (5432), and Redis (6379) as opaque. Use this for deployments running multiple database services.

## Handling gRPC on Opaque Ports

gRPC uses HTTP/2 by default and works with Linkerd's standard protocol detection. However, custom gRPC implementations or gRPC-Web may need opaque ports:

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
        # Mark as opaque if using custom framing
        config.linkerd.io/opaque-ports: "50051"
    spec:
      containers:
      - name: grpc-service
        image: your-registry/grpc-service:latest
        ports:
        - containerPort: 50051
```

Standard gRPC usually doesn't need opaque ports, but some edge cases require it.

## Configuring Opaque Ports for Redis

Redis uses the RESP protocol over TCP. While Linkerd usually detects Redis automatically, explicitly mark it as opaque for consistency:

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
linkerd stat deploy/mysql --to deploy/mysql-client
```

You'll see:

- Success rate (connection establishment success)
- RPS (connections per second)
- Latency (connection establishment time)

Query Prometheus for detailed metrics:

```promql
# TCP connections to MySQL
sum(rate(tcp_open_connections{deployment="mysql"}[5m]))

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

- Port mismatch: Ensure annotation matches actual container port
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
        # Port 8080 is HTTP (default), 3306 is opaque
        config.linkerd.io/opaque-ports: "3306"
    spec:
      containers:
      - name: app-server
        image: your-registry/app-server:latest
        ports:
        - containerPort: 8080  # HTTP API
        - containerPort: 3306  # Internal database
```

Linkerd provides HTTP metrics for port 8080 and TCP metrics for port 3306.

## Configuring Skip Ports

For local-only traffic that doesn't need Linkerd, use skip-inbound-ports or skip-outbound-ports:

```yaml
annotations:
  linkerd.io/inject: enabled
  config.linkerd.io/skip-inbound-ports: "9091"  # Prometheus metrics
  config.linkerd.io/skip-outbound-ports: "3306"  # Direct database access
```

Skip ports bypass Linkerd entirely, while opaque ports use Linkerd with TCP handling. Use skip for local communication and opaque for remote TCP services.

## Performance Considerations

Opaque ports have lower overhead than HTTP protocol detection:

- No HTTP parsing overhead
- No per-request metrics collection
- Simpler proxy logic

For high-throughput TCP connections like database queries, opaque ports can improve performance by reducing proxy processing.

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

Linkerd opaque ports enable service mesh features for non-HTTP TCP protocols. Mark database ports, message queue ports, and custom protocol ports as opaque using the config.linkerd.io/opaque-ports annotation.

Opaque traffic maintains mTLS encryption and connection-level observability without HTTP parsing overhead. This gives you secure, observable TCP connections for databases, message queues, and proprietary protocols.

Configure opaque ports explicitly for custom ports or non-standard protocol ports. Monitor TCP-level metrics and verify mTLS is active. This extends Linkerd's benefits beyond HTTP to your entire application stack.
