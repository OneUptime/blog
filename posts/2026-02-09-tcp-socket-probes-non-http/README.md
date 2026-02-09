# How to Implement TCP Socket Probes for Non-HTTP Service Health Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Health Checks, TCP Probes

Description: Configure Kubernetes TCP socket probes to monitor non-HTTP services like databases, message queues, and TCP-based applications without implementing HTTP endpoints.

---

TCP socket probes verify that a container accepts TCP connections on a specified port. Unlike HTTP probes that check response content, TCP probes only confirm that the port is open and accepting connections. This makes them perfect for databases, message queues, and other services that don't speak HTTP.

This guide shows you when to use TCP probes, how to configure them effectively, and how to combine them with application-specific health checks.

## Understanding TCP Socket Probes

A TCP socket probe attempts to establish a TCP connection to the container on a specified port. If the connection succeeds, the probe passes. If the connection fails or times out, the probe fails.

TCP probes are simpler than HTTP probes but provide less information. They can't verify that the service is actually working correctly, only that it's listening on the port.

## Basic TCP Probe Configuration

Configure a TCP liveness probe for Redis:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: redis
spec:
  containers:
  - name: redis
    image: redis:7
    ports:
    - containerPort: 6379
      name: redis

    livenessProbe:
      tcpSocket:
        port: 6379
      initialDelaySeconds: 15
      periodSeconds: 10
      timeoutSeconds: 3
      failureThreshold: 3

    readinessProbe:
      tcpSocket:
        port: 6379
      initialDelaySeconds: 5
      periodSeconds: 5
      timeoutSeconds: 2
      failureThreshold: 2
```

This configuration checks if Redis accepts connections every 10 seconds.

## TCP Probes for Database Servers

Monitor database connectivity with TCP probes:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
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
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        ports:
        - containerPort: 5432
          name: postgres

        livenessProbe:
          tcpSocket:
            port: 5432
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        readinessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pg_isready -U postgres
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2

        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data

  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

Notice we use TCP for liveness (is the port accepting connections?) and exec for readiness (is Postgres actually ready?).

## TCP Probes for Message Queues

Monitor RabbitMQ with TCP probes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rabbitmq
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
      - name: rabbitmq
        image: rabbitmq:3.12-management
        ports:
        - containerPort: 5672
          name: amqp
        - containerPort: 15672
          name: management

        livenessProbe:
          tcpSocket:
            port: 5672
          initialDelaySeconds: 30
          periodSeconds: 20
          timeoutSeconds: 5
          failureThreshold: 3

        readinessProbe:
          tcpSocket:
            port: 5672
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
```

For better health checking, combine TCP liveness with HTTP readiness on the management port:

```yaml
readinessProbe:
  httpGet:
    path: /api/health/checks/alarms
    port: 15672
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Using Named Ports with TCP Probes

Reference ports by name for clarity:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mysql
spec:
  containers:
  - name: mysql
    image: mysql:8
    env:
    - name: MYSQL_ROOT_PASSWORD
      valueFrom:
        secretKeyRef:
          name: mysql-secret
          key: password
    ports:
    - name: mysql
      containerPort: 3306
      protocol: TCP

    livenessProbe:
      tcpSocket:
        port: mysql  # Use port name instead of number
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5

    readinessProbe:
      exec:
        command:
        - mysqladmin
        - ping
        - -h
        - localhost
      initialDelaySeconds: 10
      periodSeconds: 5
```

## TCP Probes for Multiple Ports

Check multiple ports if your service exposes several:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-port-app
spec:
  containers:
  - name: app
    image: my-app:latest
    ports:
    - name: main
      containerPort: 8080
    - name: admin
      containerPort: 8081
    - name: metrics
      containerPort: 9090

    # Main service port liveness
    livenessProbe:
      tcpSocket:
        port: main
      periodSeconds: 10

    # Check admin port separately
    readinessProbe:
      tcpSocket:
        port: main
      periodSeconds: 5
```

You can only configure one liveness and one readiness probe per container, so choose the most critical port.

## Combining TCP Probes with Sidecar Health Checks

Use a sidecar container to perform advanced health checks:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: database-with-health-checker
spec:
  containers:
  - name: database
    image: postgres:15
    ports:
    - containerPort: 5432

  - name: health-checker
    image: alpine:latest
    command:
    - /bin/sh
    - -c
    - |
      while true; do
        nc -z localhost 5432
        if [ $? -eq 0 ]; then
          # Port is open, now check if database responds
          # (in real scenario, use proper database client)
          touch /health/ready
        else
          rm -f /health/ready
        fi
        sleep 5
      done
    volumeMounts:
    - name: health
      mountPath: /health

  volumes:
  - name: health
    emptyDir: {}
```

Then use exec probes to check the health marker file.

## When to Use TCP Probes vs Other Types

Choose TCP probes when:

```yaml
# YES: Database servers
kind: StatefulSet
metadata:
  name: mongodb
spec:
  template:
    spec:
      containers:
      - name: mongo
        livenessProbe:
          tcpSocket:
            port: 27017

# YES: Message brokers
kind: Deployment
metadata:
  name: kafka
spec:
  template:
    spec:
      containers:
      - name: kafka
        livenessProbe:
          tcpSocket:
            port: 9092

# NO: HTTP APIs (use HTTP probe instead)
# BAD
livenessProbe:
  tcpSocket:
    port: 8080

# GOOD
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080

# NO: Services with custom protocols (use exec probe)
# BAD
livenessProbe:
  tcpSocket:
    port: 6379

# GOOD (Redis-specific check)
livenessProbe:
  exec:
    command:
    - redis-cli
    - ping
```

## TCP Probe Timing Configuration

Configure appropriate timing for TCP probes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: slow-starting-db
spec:
  containers:
  - name: db
    image: postgres:15
    ports:
    - containerPort: 5432

    # Startup probe for slow-starting databases
    startupProbe:
      tcpSocket:
        port: 5432
      initialDelaySeconds: 10
      periodSeconds: 5
      failureThreshold: 30  # 2.5 minutes

    # Quick liveness check after startup
    livenessProbe:
      tcpSocket:
        port: 5432
      periodSeconds: 10
      timeoutSeconds: 3
      failureThreshold: 3

    # Frequent readiness check
    readinessProbe:
      tcpSocket:
        port: 5432
      periodSeconds: 5
      timeoutSeconds: 2
      failureThreshold: 2
```

TCP probes should have short timeouts since they only check connectivity.

## Monitoring TCP Probe Performance

Track TCP probe success and failures:

```promql
# TCP probe success rate
sum by (namespace, pod) (
  rate(prober_probe_total{probe_type="TCP",result="success"}[5m])
) / sum by (namespace, pod) (
  rate(prober_probe_total{probe_type="TCP"}[5m])
)

# TCP probe latency
histogram_quantile(0.95,
  rate(prober_probe_duration_seconds_bucket{probe_type="TCP"}[5m])
)

# Pods with failing TCP probes
count by (namespace, pod) (
  prober_probe_total{probe_type="TCP",result="failed"}
) > 0
```

## Debugging TCP Probe Failures

Troubleshoot TCP connectivity issues:

```bash
# Check if port is listening inside container
kubectl exec -it my-pod -- netstat -tlnp
kubectl exec -it my-pod -- ss -tlnp

# Test TCP connection manually
kubectl exec -it my-pod -- nc -zv localhost 5432
kubectl exec -it my-pod -- telnet localhost 5432

# Check from another pod (network perspective)
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  nc -zv my-pod 5432

# View probe events
kubectl describe pod my-pod

# Check if service is actually running
kubectl exec -it my-pod -- ps aux | grep postgres

# Check container logs
kubectl logs my-pod

# Port forward and test from local machine
kubectl port-forward my-pod 5432:5432
nc -zv localhost 5432
```

## TCP Probes with Custom Network Policies

Ensure network policies allow probe traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-health-checks
spec:
  podSelector:
    matchLabels:
      app: database
  policyTypes:
  - Ingress
  ingress:
  # Allow kubelet to perform health checks
  - from:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: TCP
      port: 5432
  # Allow application traffic
  - from:
    - podSelector:
        matchLabels:
          app: api-server
    ports:
    - protocol: TCP
      port: 5432
```

Health check probes originate from the kubelet on each node, not from the control plane.

## Common TCP Probe Issues

**Port not listening:**
```bash
# Check process binding
kubectl exec -it my-pod -- netstat -tlnp | grep 5432

# If process isn't listening, check startup
kubectl logs my-pod
```

**Firewall blocking:**
```bash
# Check iptables rules
kubectl exec -it my-pod -- iptables -L -n

# Check if SELinux is blocking
kubectl exec -it my-pod -- getenforce
```

**Wrong port number:**
```yaml
# Verify port configuration matches container
ports:
- containerPort: 5432  # Must match probe port

livenessProbe:
  tcpSocket:
    port: 5432  # Must match containerPort
```

**Service listening on specific interface:**
```bash
# Check if service listens on 0.0.0.0 or 127.0.0.1
kubectl exec -it my-pod -- netstat -tlnp

# If listening on 127.0.0.1, probe works
# If listening on specific IP, may need to configure service
```

## Best Practices for TCP Probes

Follow these guidelines:

```yaml
# DO: Use for services without HTTP interfaces
livenessProbe:
  tcpSocket:
    port: 5432  # Database port

# DO: Combine with exec probes for better checks
livenessProbe:
  tcpSocket:
    port: 5432
readinessProbe:
  exec:
    command:
    - pg_isready

# DO: Set appropriate timeouts
livenessProbe:
  tcpSocket:
    port: 5432
  timeoutSeconds: 3  # Short timeout for TCP

# DON'T: Use for HTTP services
# Use httpGet instead

# DON'T: Assume TCP success means service is healthy
# Port can be open but service degraded

# DO: Consider startup probes for slow-starting services
startupProbe:
  tcpSocket:
    port: 5432
  failureThreshold: 30
```

## Improving TCP Health Checks

Enhance TCP probes with additional validation:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: improved-database
spec:
  containers:
  - name: postgres
    image: postgres:15
    ports:
    - containerPort: 5432

    # Simple TCP liveness
    livenessProbe:
      tcpSocket:
        port: 5432
      periodSeconds: 10

    # Application-aware readiness
    readinessProbe:
      exec:
        command:
        - /bin/sh
        - -c
        - |
          pg_isready -U postgres &&
          psql -U postgres -c "SELECT 1" > /dev/null
      periodSeconds: 5
```

This combines simple liveness checking with thorough readiness validation.

## Conclusion

TCP socket probes provide simple connectivity checking for non-HTTP services. While they're limited to verifying that ports are open, they're perfect for databases, message queues, and other TCP-based services where HTTP endpoints aren't available or practical.

Use TCP probes for liveness checks to verify basic connectivity, and combine them with exec probes for readiness checks that validate actual service functionality. Always configure appropriate timeouts and failure thresholds based on your service's behavior and recovery time.
