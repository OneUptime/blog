# How to Create Linkerd Opaque Ports

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Linkerd, Kubernetes, ServiceMesh, TCP

Description: Learn how to configure Linkerd opaque ports to handle non-HTTP traffic like databases, custom protocols, and TLS passthrough in your Kubernetes cluster.

---

Linkerd is a lightweight service mesh that provides observability, reliability, and security for Kubernetes applications. By default, Linkerd's proxy interprets traffic as HTTP or HTTP/2 to provide advanced features like request-level metrics and load balancing. However, not all traffic in your cluster is HTTP. Databases, message queues, and custom protocols require a different approach. This is where opaque ports come in.

## What Are Opaque Ports?

Opaque ports tell Linkerd to treat traffic on specific ports as raw TCP instead of attempting HTTP protocol detection. When a port is marked as opaque, Linkerd:

- Skips HTTP protocol detection
- Forwards traffic as raw TCP bytes
- Still provides mTLS encryption
- Reduces latency by avoiding protocol parsing

## How Opaque vs Transparent Proxy Works

The following diagram illustrates the difference between how Linkerd handles regular HTTP traffic versus opaque TCP traffic:

```mermaid
flowchart TB
    subgraph "Standard HTTP Traffic"
        A[Client Pod] --> B[Linkerd Proxy]
        B --> C{Protocol Detection}
        C -->|HTTP Detected| D[HTTP Parsing]
        D --> E[Load Balancing]
        E --> F[Metrics Collection]
        F --> G[Target Pod]
    end

    subgraph "Opaque Port Traffic"
        H[Client Pod] --> I[Linkerd Proxy]
        I --> J{Port Check}
        J -->|Opaque Port| K[Skip Detection]
        K --> L[Raw TCP Forward]
        L --> M[mTLS Only]
        M --> N[Target Pod]
    end
```

## When to Use Opaque Ports

Opaque ports are essential for several use cases:

### 1. Database Connections

Databases like PostgreSQL, MySQL, and MongoDB use their own wire protocols that are not HTTP compatible. Without opaque ports, Linkerd may misinterpret database traffic and cause connection failures.

### 2. Custom Protocols

Applications using custom TCP protocols, gRPC with custom codecs, or proprietary messaging formats need opaque ports to function correctly.

### 3. TLS Passthrough

When your application handles its own TLS termination, you need opaque ports to prevent Linkerd from interfering with the TLS handshake.

### 4. Message Queues

Systems like Redis, RabbitMQ, and Kafka use binary protocols that should be treated as opaque TCP traffic.

## Configuring Opaque Ports

Linkerd provides multiple ways to configure opaque ports, from cluster-wide defaults to pod-level annotations.

### Pod-Level Configuration

The most common approach is to annotate individual pods or deployments. This configuration tells Linkerd to treat ports 5432 and 6379 as opaque for a specific deployment.

```yaml
# Deployment with opaque port annotations for database connections
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-application
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-application
  template:
    metadata:
      labels:
        app: my-application
      annotations:
        # Configure opaque ports for non-HTTP traffic
        # Multiple ports are separated by commas
        config.linkerd.io/opaque-ports: "5432,6379"
    spec:
      containers:
        - name: app
          image: my-application:latest
          ports:
            - containerPort: 8080  # HTTP traffic - normal proxy behavior
            - containerPort: 5432  # PostgreSQL - opaque
            - containerPort: 6379  # Redis - opaque
```

### Service-Level Configuration

You can also configure opaque ports at the Service level. This is useful when you want all traffic to a service to be treated as opaque, regardless of which pods are sending the traffic.

```yaml
# Service configuration for a PostgreSQL database
apiVersion: v1
kind: Service
metadata:
  name: postgres-db
  namespace: database
  annotations:
    # Mark port 5432 as opaque at the service level
    # All traffic to this service will skip HTTP detection
    config.linkerd.io/opaque-ports: "5432"
spec:
  selector:
    app: postgres
  ports:
    - name: postgres
      protocol: TCP
      port: 5432        # Service port
      targetPort: 5432  # Container port
  type: ClusterIP
```

### Namespace-Level Configuration

For namespaces that contain mostly non-HTTP workloads, you can set opaque ports at the namespace level. All pods in the namespace will inherit this configuration.

```yaml
# Namespace configuration for database workloads
apiVersion: v1
kind: Namespace
metadata:
  name: databases
  annotations:
    # All pods in this namespace will treat these ports as opaque
    config.linkerd.io/opaque-ports: "5432,3306,27017,6379"
```

### Server Resource Configuration

Linkerd also supports a Server resource that provides fine-grained control over how traffic is handled. This is part of the policy API and offers more advanced configuration options.

```yaml
# Server resource for fine-grained traffic control
apiVersion: policy.linkerd.io/v1beta2
kind: Server
metadata:
  name: postgres-server
  namespace: database
spec:
  podSelector:
    matchLabels:
      app: postgres
  port: 5432
  proxyProtocol: opaque  # Explicitly set protocol handling to opaque
```

## Complete Example: Database Service with Opaque Ports

Here is a complete example showing how to deploy a PostgreSQL database with proper opaque port configuration:

```yaml
# PostgreSQL StatefulSet with Linkerd opaque ports
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
      annotations:
        # Enable Linkerd proxy injection
        linkerd.io/inject: enabled
        # Mark PostgreSQL port as opaque to prevent HTTP detection
        config.linkerd.io/opaque-ports: "5432"
    spec:
      containers:
        - name: postgres
          image: postgres:15
          ports:
            - containerPort: 5432
              name: postgres
          env:
            - name: POSTGRES_USER
              value: "appuser"
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
            - name: POSTGRES_DB
              value: "application"
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
---
# Service exposing PostgreSQL with opaque port annotation
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: database
  annotations:
    # Service-level opaque port configuration
    config.linkerd.io/opaque-ports: "5432"
spec:
  selector:
    app: postgres
  ports:
    - name: postgres
      port: 5432
      targetPort: 5432
  clusterIP: None  # Headless service for StatefulSet
```

## Application Connecting to the Database

When your application connects to the database, ensure the client-side also has proper opaque port configuration:

```yaml
# Application deployment connecting to PostgreSQL
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
      annotations:
        linkerd.io/inject: enabled
        # Configure opaque ports for outbound database connections
        config.linkerd.io/opaque-ports: "5432"
    spec:
      containers:
        - name: api
          image: backend-api:latest
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              value: "postgres://appuser:password@postgres.database.svc.cluster.local:5432/application"
```

## Performance Implications

Opaque ports affect performance in several ways:

### Benefits

- **Lower latency**: Skipping HTTP protocol detection reduces processing overhead
- **Reduced CPU usage**: No HTTP parsing means less work for the proxy
- **Connection stability**: Binary protocols work correctly without interference
- **Predictable behavior**: Raw TCP forwarding has fewer edge cases

### Trade-offs

- **No request-level metrics**: Linkerd cannot provide per-request metrics for opaque traffic
- **Connection-level only**: Load balancing operates at the connection level, not request level
- **Limited observability**: You lose HTTP-specific dashboards and insights

### Latency Comparison

The following diagram shows the latency difference between HTTP and opaque port handling:

```mermaid
sequenceDiagram
    participant Client
    participant Proxy as Linkerd Proxy
    participant Server

    Note over Client,Server: HTTP Traffic Path
    Client->>Proxy: TCP Connection
    Proxy->>Proxy: Protocol Detection (5-10ms)
    Proxy->>Proxy: HTTP Parsing
    Proxy->>Proxy: Header Inspection
    Proxy->>Server: Forward Request
    Server->>Proxy: Response
    Proxy->>Proxy: Response Parsing
    Proxy->>Client: Forward Response

    Note over Client,Server: Opaque Port Path
    Client->>Proxy: TCP Connection
    Proxy->>Proxy: Port Check (< 1ms)
    Proxy->>Server: Raw TCP Forward
    Server->>Proxy: Raw TCP Response
    Proxy->>Client: Forward Response
```

## Verifying Opaque Port Configuration

After deploying your configuration, verify that opaque ports are working correctly:

```bash
# Check the Linkerd proxy configuration for a specific pod
# This shows which ports are configured as opaque
linkerd diagnostics proxy-metrics -n database deploy/postgres | grep opaque

# Verify the pod annotations
kubectl get pod -n database -l app=postgres -o jsonpath='{.items[0].metadata.annotations}'

# Check Linkerd tap for traffic flow (will show TCP instead of HTTP)
linkerd tap -n database deploy/postgres --to deploy/backend-api
```

## Common Issues and Solutions

### Issue: Connection Timeouts

If you experience connection timeouts after adding Linkerd to your database:

```yaml
# Solution: Add opaque port annotation
metadata:
  annotations:
    config.linkerd.io/opaque-ports: "5432"
```

### Issue: Protocol Detection Errors

If you see protocol detection errors in Linkerd proxy logs:

```bash
# Check proxy logs for errors
kubectl logs -n database deploy/postgres -c linkerd-proxy | grep -i error

# Solution: Ensure both client and server have opaque port annotations
```

### Issue: Missing Annotations After Injection

If annotations are not being applied correctly:

```bash
# Restart the pods to pick up new annotations
kubectl rollout restart -n database deployment/postgres

# Verify annotations are present
kubectl describe pod -n database -l app=postgres | grep opaque
```

## Best Practices

1. **Always annotate both sides**: Configure opaque ports on both the client and server pods for consistent behavior

2. **Use namespace defaults for database namespaces**: If a namespace contains only database workloads, set opaque ports at the namespace level

3. **Document your opaque ports**: Keep a record of which ports are opaque and why, to help with troubleshooting

4. **Monitor connection metrics**: Even though request-level metrics are unavailable, monitor TCP connection counts and error rates

5. **Test before production**: Verify opaque port configuration in a staging environment before deploying to production

## Conclusion

Linkerd opaque ports provide a simple but powerful way to handle non-HTTP traffic in your service mesh. By marking specific ports as opaque, you can safely run databases, message queues, and custom protocols alongside HTTP services while still benefiting from Linkerd's mTLS encryption and connection-level observability.

Remember to configure opaque ports on both client and server sides, and always verify your configuration is working as expected before deploying to production.

**Related Reading:**

- [How to configure MetalLB with Kubernetes (Microk8s)](https://oneuptime.com/blog/post/2023-11-06-configure-metallb-with-kubernetes-microk8s/view)
- [How moving from AWS to Bare-Metal saved us $230,000 /yr.](https://oneuptime.com/blog/post/2023-10-30-moving-from-aws-to-bare-metal/view)
- [Why build open-source DataDog?](https://oneuptime.com/blog/post/2024-08-14-why-build-open-source-datadog/view)
