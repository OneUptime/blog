# How to Create Kubernetes Ambassador Patterns

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Design Patterns, Microservices, Containers

Description: Implement the ambassador pattern in Kubernetes with sidecar containers that proxy connections to external services for simplified application networking.

---

## Introduction

The ambassador pattern is a structural design pattern where a helper container handles network connections on behalf of your main application container. Think of it as a diplomatic envoy that manages all external communications, letting your application focus on its core responsibilities.

In Kubernetes, the ambassador pattern is implemented using sidecar containers that run alongside your main application in the same Pod. These containers share the same network namespace, allowing them to communicate over localhost while the ambassador handles the complexity of external connections.

## Why Use the Ambassador Pattern?

Before diving into implementation details, let's understand when and why you would use this pattern.

| Use Case | Problem Solved |
|----------|----------------|
| Database Connection Pooling | Manage connection pools without modifying application code |
| TLS Termination | Offload SSL/TLS handling from the main application |
| Protocol Translation | Convert between different protocols (HTTP to gRPC, etc.) |
| Service Discovery | Abstract away service discovery mechanisms |
| Circuit Breaking | Add resilience patterns without application changes |
| Authentication | Handle auth tokens and credential management externally |

The key benefit is separation of concerns. Your application connects to localhost on a known port, while the ambassador container handles all the complexity of connecting to external services.

## Understanding Pod Networking for Ambassador Patterns

Before implementing the ambassador pattern, you need to understand how Pod networking works in Kubernetes.

All containers in a Pod share:
- The same network namespace (same IP address)
- The same localhost interface
- The same port space

This means:
- Containers can communicate via localhost (127.0.0.1)
- Port conflicts between containers will cause failures
- Network policies apply to the entire Pod, not individual containers

Here is a diagram showing how containers communicate within a Pod:

```
+--------------------------------------------------+
|                      POD                          |
|  +------------------+    +--------------------+   |
|  |  Main Container  |    | Ambassador         |   |
|  |                  |    | Container          |   |
|  |  App connects to |--->|                    |   |
|  |  localhost:5432  |    | Listens on :5432   |   |
|  |                  |    | Connects to        |   |
|  +------------------+    | external DB        |   |
|                          +--------------------+   |
|                                  |                |
+----------------------------------|----------------+
                                   |
                                   v
                          +----------------+
                          | External       |
                          | Database       |
                          | Service        |
                          +----------------+
```

## Basic Ambassador Pattern Implementation

Let's start with a simple example. We will create a Pod with an application container and an ambassador container that proxies database connections.

### Example 1: Database Connection Proxy with PgBouncer

PgBouncer is a lightweight connection pooler for PostgreSQL. Instead of your application managing database connections directly, the ambassador container handles connection pooling.

First, create a ConfigMap for PgBouncer configuration.

```yaml
# pgbouncer-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pgbouncer-config
  namespace: default
data:
  pgbouncer.ini: |
    [databases]
    # Application connects to localhost, PgBouncer forwards to actual database
    myapp = host=postgres-primary.database.svc.cluster.local port=5432 dbname=myapp

    [pgbouncer]
    listen_addr = 127.0.0.1
    listen_port = 5432
    auth_type = md5
    auth_file = /etc/pgbouncer/userlist.txt
    pool_mode = transaction
    max_client_conn = 100
    default_pool_size = 20
    min_pool_size = 5
    reserve_pool_size = 5
    server_lifetime = 3600
    server_idle_timeout = 600
    log_connections = 1
    log_disconnections = 1

  userlist.txt: |
    "myapp_user" "md5password_hash_here"
```

Now create the Pod with both application and ambassador containers.

```yaml
# app-with-pgbouncer-ambassador.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-with-ambassador
  namespace: default
  labels:
    app: myapp
spec:
  containers:
    # Main application container
    - name: myapp
      image: myregistry/myapp:v1.0.0
      ports:
        - containerPort: 8080
          name: http
      env:
        # Application connects to localhost - ambassador handles the rest
        - name: DATABASE_HOST
          value: "127.0.0.1"
        - name: DATABASE_PORT
          value: "5432"
        - name: DATABASE_NAME
          value: "myapp"
        - name: DATABASE_USER
          valueFrom:
            secretKeyRef:
              name: myapp-db-credentials
              key: username
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: myapp-db-credentials
              key: password
      resources:
        requests:
          memory: "256Mi"
          cpu: "250m"
        limits:
          memory: "512Mi"
          cpu: "500m"
      # Health check for the main application
      livenessProbe:
        httpGet:
          path: /health
          port: 8080
        initialDelaySeconds: 30
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /ready
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 5

    # Ambassador container - PgBouncer connection pooler
    - name: pgbouncer-ambassador
      image: edoburu/pgbouncer:1.21.0
      ports:
        - containerPort: 5432
          name: postgres
          protocol: TCP
      volumeMounts:
        - name: pgbouncer-config
          mountPath: /etc/pgbouncer
          readOnly: true
      resources:
        # Ambassador containers typically need fewer resources
        requests:
          memory: "64Mi"
          cpu: "50m"
        limits:
          memory: "128Mi"
          cpu: "100m"
      # Health check for PgBouncer
      livenessProbe:
        tcpSocket:
          port: 5432
        initialDelaySeconds: 10
        periodSeconds: 10
      readinessProbe:
        tcpSocket:
          port: 5432
        initialDelaySeconds: 5
        periodSeconds: 5

  volumes:
    - name: pgbouncer-config
      configMap:
        name: pgbouncer-config

  # Ensure containers start in order if needed
  restartPolicy: Always
```

## TLS Termination Ambassador Pattern

Another common use case is TLS termination. Your application serves plain HTTP on localhost, while the ambassador container handles TLS certificates and encryption.

### Example 2: Nginx TLS Termination Sidecar

This example shows how to use Nginx as an ambassador to handle TLS termination.

Create the Nginx configuration first.

```yaml
# nginx-tls-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-tls-config
  namespace: default
data:
  nginx.conf: |
    worker_processes auto;
    error_log /var/log/nginx/error.log warn;
    pid /tmp/nginx.pid;

    events {
        worker_connections 1024;
        use epoll;
        multi_accept on;
    }

    http {
        # Upstream pointing to main application on localhost
        upstream app_backend {
            server 127.0.0.1:8080;
            keepalive 32;
        }

        # HTTPS server - externally facing
        server {
            listen 443 ssl http2;
            server_name _;

            # TLS configuration
            ssl_certificate /etc/nginx/certs/tls.crt;
            ssl_certificate_key /etc/nginx/certs/tls.key;
            ssl_protocols TLSv1.2 TLSv1.3;
            ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
            ssl_prefer_server_ciphers off;
            ssl_session_cache shared:SSL:10m;
            ssl_session_timeout 1d;

            # Security headers
            add_header Strict-Transport-Security "max-age=31536000" always;
            add_header X-Content-Type-Options nosniff;
            add_header X-Frame-Options DENY;

            location / {
                proxy_pass http://app_backend;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
                proxy_set_header Connection "";

                # Timeouts
                proxy_connect_timeout 30s;
                proxy_send_timeout 60s;
                proxy_read_timeout 60s;
            }

            # Health check endpoint
            location /nginx-health {
                access_log off;
                return 200 "healthy\n";
                add_header Content-Type text/plain;
            }
        }

        # HTTP redirect to HTTPS
        server {
            listen 80;
            server_name _;
            return 301 https://$host$request_uri;
        }
    }
```

Now create the Pod with TLS termination ambassador.

```yaml
# app-with-tls-ambassador.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-with-tls
  namespace: default
  labels:
    app: myapp
    version: v1
spec:
  containers:
    # Main application container - serves plain HTTP
    - name: myapp
      image: myregistry/myapp:v1.0.0
      ports:
        - containerPort: 8080
          name: http
      env:
        - name: SERVER_PORT
          value: "8080"
        # Application does not need to know about TLS
        - name: TLS_ENABLED
          value: "false"
      resources:
        requests:
          memory: "256Mi"
          cpu: "250m"
        limits:
          memory: "512Mi"
          cpu: "500m"
      livenessProbe:
        httpGet:
          path: /health
          port: 8080
        initialDelaySeconds: 15
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /ready
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 5

    # Ambassador container - Nginx TLS termination
    - name: nginx-tls-ambassador
      image: nginx:1.25-alpine
      ports:
        - containerPort: 443
          name: https
        - containerPort: 80
          name: http-redirect
      volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
          readOnly: true
        - name: tls-certs
          mountPath: /etc/nginx/certs
          readOnly: true
      resources:
        requests:
          memory: "64Mi"
          cpu: "50m"
        limits:
          memory: "128Mi"
          cpu: "100m"
      livenessProbe:
        httpGet:
          path: /nginx-health
          port: 443
          scheme: HTTPS
        initialDelaySeconds: 10
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /nginx-health
          port: 443
          scheme: HTTPS
        initialDelaySeconds: 5
        periodSeconds: 5

  volumes:
    - name: nginx-config
      configMap:
        name: nginx-tls-config
    - name: tls-certs
      secret:
        secretName: myapp-tls-cert

  restartPolicy: Always
```

Create the corresponding Service to expose the TLS port.

```yaml
# app-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
  namespace: default
spec:
  selector:
    app: myapp
  ports:
    - name: https
      port: 443
      targetPort: 443
      protocol: TCP
  type: ClusterIP
```

## Using Shared Volumes Between Containers

The ambassador pattern often requires sharing data between containers. Kubernetes provides several ways to share volumes within a Pod.

### Example 3: Log Aggregation Ambassador with Shared Volume

This example shows a logging ambassador that reads application logs from a shared volume.

```yaml
# app-with-logging-ambassador.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-with-logging
  namespace: default
  labels:
    app: myapp
spec:
  containers:
    # Main application container
    - name: myapp
      image: myregistry/myapp:v1.0.0
      ports:
        - containerPort: 8080
      env:
        - name: LOG_FILE
          value: "/var/log/app/application.log"
        - name: LOG_FORMAT
          value: "json"
      volumeMounts:
        # Shared volume for logs
        - name: app-logs
          mountPath: /var/log/app
      resources:
        requests:
          memory: "256Mi"
          cpu: "250m"
        limits:
          memory: "512Mi"
          cpu: "500m"

    # Ambassador container - Fluent Bit log forwarder
    - name: fluentbit-ambassador
      image: fluent/fluent-bit:2.2
      volumeMounts:
        # Same shared volume - read logs written by main app
        - name: app-logs
          mountPath: /var/log/app
          readOnly: true
        - name: fluentbit-config
          mountPath: /fluent-bit/etc/
          readOnly: true
      resources:
        requests:
          memory: "64Mi"
          cpu: "50m"
        limits:
          memory: "128Mi"
          cpu: "100m"

  volumes:
    # emptyDir volume shared between containers
    - name: app-logs
      emptyDir:
        sizeLimit: 500Mi
    - name: fluentbit-config
      configMap:
        name: fluentbit-config

  restartPolicy: Always
---
# Fluent Bit configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentbit-config
  namespace: default
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Daemon        Off
        Log_Level     info
        Parsers_File  parsers.conf

    [INPUT]
        Name              tail
        Path              /var/log/app/*.log
        Parser            json
        Tag               app.logs
        Refresh_Interval  5
        Mem_Buf_Limit     5MB
        Skip_Long_Lines   On

    [FILTER]
        Name          record_modifier
        Match         *
        Record        hostname ${HOSTNAME}
        Record        namespace ${POD_NAMESPACE}

    [OUTPUT]
        Name          forward
        Match         *
        Host          fluentd-aggregator.logging.svc.cluster.local
        Port          24224

  parsers.conf: |
    [PARSER]
        Name        json
        Format      json
        Time_Key    timestamp
        Time_Format %Y-%m-%dT%H:%M:%S.%L
```

## Volume Types for Ambassador Patterns

Different volume types serve different purposes in ambassador pattern implementations.

| Volume Type | Use Case | Persistence | Shared State |
|-------------|----------|-------------|--------------|
| emptyDir | Temporary shared storage | Pod lifetime only | Yes, between containers |
| emptyDir (memory) | High-speed IPC | Pod lifetime only | Yes, RAM-backed |
| configMap | Configuration files | Cluster lifetime | Read-only config |
| secret | Sensitive data | Cluster lifetime | Credentials, certs |
| persistentVolumeClaim | Durable storage | Beyond Pod lifetime | Persistent data |

### Example 4: Memory-Backed Shared Volume for High-Speed IPC

When performance is critical, use a memory-backed emptyDir volume.

```yaml
# high-performance-ambassador.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-high-perf
  namespace: default
spec:
  containers:
    - name: myapp
      image: myregistry/myapp:v1.0.0
      volumeMounts:
        - name: shared-memory
          mountPath: /dev/shm/app
      resources:
        requests:
          memory: "512Mi"
          cpu: "500m"
        limits:
          memory: "1Gi"
          cpu: "1000m"

    - name: cache-ambassador
      image: myregistry/cache-proxy:v1.0.0
      volumeMounts:
        - name: shared-memory
          mountPath: /dev/shm/app
      resources:
        requests:
          memory: "256Mi"
          cpu: "250m"
        limits:
          memory: "512Mi"
          cpu: "500m"

  volumes:
    # Memory-backed volume for high-speed data sharing
    - name: shared-memory
      emptyDir:
        medium: Memory
        sizeLimit: 256Mi

  restartPolicy: Always
```

## Localhost Communication Patterns

All containers in a Pod share the same network namespace. This enables several communication patterns.

### Pattern 1: Direct TCP/UDP Communication

The simplest approach is direct socket communication over localhost.

```yaml
# localhost-tcp-example.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-redis-ambassador
spec:
  containers:
    - name: myapp
      image: myregistry/myapp:v1.0.0
      env:
        # Connect to Redis via localhost
        - name: REDIS_HOST
          value: "127.0.0.1"
        - name: REDIS_PORT
          value: "6379"

    # Redis ambassador that connects to external Redis cluster
    - name: redis-ambassador
      image: myregistry/redis-proxy:v1.0.0
      ports:
        - containerPort: 6379
      env:
        - name: UPSTREAM_REDIS_HOSTS
          value: "redis-cluster.cache.svc.cluster.local:6379"
        - name: LISTEN_PORT
          value: "6379"
```

### Pattern 2: Unix Domain Sockets

For even lower latency, use Unix domain sockets via shared volumes.

```yaml
# unix-socket-example.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-unix-socket
spec:
  containers:
    - name: myapp
      image: myregistry/myapp:v1.0.0
      env:
        # Connect via Unix socket
        - name: DATABASE_SOCKET
          value: "/var/run/db/postgres.sock"
      volumeMounts:
        - name: socket-dir
          mountPath: /var/run/db

    - name: postgres-ambassador
      image: myregistry/pg-proxy:v1.0.0
      env:
        - name: LISTEN_SOCKET
          value: "/var/run/db/postgres.sock"
        - name: UPSTREAM_HOST
          value: "postgres.database.svc.cluster.local"
      volumeMounts:
        - name: socket-dir
          mountPath: /var/run/db

  volumes:
    - name: socket-dir
      emptyDir: {}
```

## Real-World Example: Multi-Database Ambassador

Here is a complete example showing an ambassador that proxies connections to multiple databases.

```yaml
# multi-db-ambassador-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-deployment
  namespace: default
  labels:
    app: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      serviceAccountName: myapp-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000

      containers:
        # Main application
        - name: myapp
          image: myregistry/myapp:v1.0.0
          ports:
            - containerPort: 8080
              name: http
          env:
            # All database connections go through localhost ambassadors
            - name: POSTGRES_HOST
              value: "127.0.0.1"
            - name: POSTGRES_PORT
              value: "5432"
            - name: MYSQL_HOST
              value: "127.0.0.1"
            - name: MYSQL_PORT
              value: "3306"
            - name: MONGODB_HOST
              value: "127.0.0.1"
            - name: MONGODB_PORT
              value: "27017"
          envFrom:
            - secretRef:
                name: myapp-db-credentials
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          volumeMounts:
            - name: tmp
              mountPath: /tmp
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3

        # PostgreSQL Ambassador - PgBouncer
        - name: postgres-ambassador
          image: edoburu/pgbouncer:1.21.0
          ports:
            - containerPort: 5432
              name: postgres
          volumeMounts:
            - name: pgbouncer-config
              mountPath: /etc/pgbouncer
              readOnly: true
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          livenessProbe:
            tcpSocket:
              port: 5432
            initialDelaySeconds: 10
            periodSeconds: 10

        # MySQL Ambassador - ProxySQL
        - name: mysql-ambassador
          image: proxysql/proxysql:2.5.5
          ports:
            - containerPort: 3306
              name: mysql
          volumeMounts:
            - name: proxysql-config
              mountPath: /etc/proxysql.cnf
              subPath: proxysql.cnf
              readOnly: true
            - name: proxysql-data
              mountPath: /var/lib/proxysql
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "200m"
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
          livenessProbe:
            tcpSocket:
              port: 3306
            initialDelaySeconds: 10
            periodSeconds: 10

        # MongoDB Ambassador - mongos router
        - name: mongodb-ambassador
          image: mongo:7.0
          command: ["mongos"]
          args:
            - "--configdb"
            - "configReplSet/mongo-config-0.mongo-config.database.svc.cluster.local:27019"
            - "--bind_ip"
            - "127.0.0.1"
            - "--port"
            - "27017"
          ports:
            - containerPort: 27017
              name: mongodb
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "200m"
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
          livenessProbe:
            tcpSocket:
              port: 27017
            initialDelaySeconds: 15
            periodSeconds: 10

        # Metrics exporter sidecar
        - name: metrics-exporter
          image: myregistry/db-metrics-exporter:v1.0.0
          ports:
            - containerPort: 9090
              name: metrics
          env:
            - name: POSTGRES_DSN
              value: "postgres://127.0.0.1:5432/myapp"
            - name: MYSQL_DSN
              value: "mysql://127.0.0.1:3306/myapp"
            - name: MONGODB_URI
              value: "mongodb://127.0.0.1:27017/myapp"
          resources:
            requests:
              memory: "32Mi"
              cpu: "25m"
            limits:
              memory: "64Mi"
              cpu: "50m"
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL

      volumes:
        - name: tmp
          emptyDir: {}
        - name: pgbouncer-config
          configMap:
            name: pgbouncer-config
        - name: proxysql-config
          configMap:
            name: proxysql-config
        - name: proxysql-data
          emptyDir: {}

      # Pod scheduling preferences
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: myapp
                topologyKey: kubernetes.io/hostname

      # Graceful termination
      terminationGracePeriodSeconds: 60
```

## Ambassador Pattern vs Other Patterns

Understanding when to use the ambassador pattern versus alternatives.

| Pattern | Use Case | Container Location | Communication |
|---------|----------|-------------------|---------------|
| Ambassador | Proxy external services | Same Pod | localhost |
| Sidecar | Extend/enhance main app | Same Pod | localhost or shared volume |
| Adapter | Transform interfaces | Same Pod | localhost |
| Init Container | One-time setup | Same Pod, runs first | Shared volumes |
| Service Mesh | Cluster-wide networking | Injected sidecar | Intercepted traffic |

The ambassador pattern is specifically for proxying connections to external services. If you need general-purpose service mesh capabilities, consider Istio or Linkerd instead.

## Health Checks and Lifecycle Management

Proper health checks are essential for ambassador pattern implementations.

```yaml
# health-check-example.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-health-checks
spec:
  containers:
    - name: myapp
      image: myregistry/myapp:v1.0.0
      ports:
        - containerPort: 8080
      # Application health checks
      livenessProbe:
        httpGet:
          path: /health
          port: 8080
        initialDelaySeconds: 30
        periodSeconds: 10
        timeoutSeconds: 5
        failureThreshold: 3
      readinessProbe:
        httpGet:
          path: /ready
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 5
        timeoutSeconds: 3
        failureThreshold: 3
      # Startup probe for slow-starting applications
      startupProbe:
        httpGet:
          path: /health
          port: 8080
        initialDelaySeconds: 10
        periodSeconds: 5
        failureThreshold: 30

    - name: db-ambassador
      image: myregistry/db-proxy:v1.0.0
      ports:
        - containerPort: 5432
      # Ambassador health checks
      livenessProbe:
        tcpSocket:
          port: 5432
        initialDelaySeconds: 10
        periodSeconds: 10
        failureThreshold: 3
      readinessProbe:
        exec:
          command:
            - /bin/sh
            - -c
            - "pg_isready -h 127.0.0.1 -p 5432"
        initialDelaySeconds: 5
        periodSeconds: 5
        failureThreshold: 3
      # Lifecycle hooks for graceful shutdown
      lifecycle:
        preStop:
          exec:
            command:
              - /bin/sh
              - -c
              - "sleep 5 && kill -SIGTERM 1"
```

## Resource Management Best Practices

Ambassador containers should be lightweight. Here are recommended resource allocations.

| Ambassador Type | Memory Request | Memory Limit | CPU Request | CPU Limit |
|----------------|----------------|--------------|-------------|-----------|
| PgBouncer | 64Mi | 128Mi | 50m | 100m |
| Nginx (TLS) | 64Mi | 128Mi | 50m | 100m |
| Envoy Proxy | 128Mi | 256Mi | 100m | 200m |
| HAProxy | 64Mi | 128Mi | 50m | 100m |
| Fluent Bit | 64Mi | 128Mi | 50m | 100m |

Always set both requests and limits to ensure predictable resource allocation.

## Debugging Ambassador Patterns

When troubleshooting ambassador pattern issues, use these commands.

Check if all containers are running in the Pod.

```bash
kubectl get pod myapp-with-ambassador -o jsonpath='{.status.containerStatuses[*].name}'
kubectl get pod myapp-with-ambassador -o jsonpath='{.status.containerStatuses[*].ready}'
```

View logs from specific containers.

```bash
# Main application logs
kubectl logs myapp-with-ambassador -c myapp

# Ambassador container logs
kubectl logs myapp-with-ambassador -c pgbouncer-ambassador

# Follow logs from all containers
kubectl logs myapp-with-ambassador --all-containers -f
```

Execute commands in specific containers for debugging.

```bash
# Test localhost connectivity from main app
kubectl exec myapp-with-ambassador -c myapp -- nc -zv 127.0.0.1 5432

# Check ambassador container networking
kubectl exec myapp-with-ambassador -c pgbouncer-ambassador -- netstat -tlnp
```

## Security Considerations

When implementing the ambassador pattern, follow these security practices.

1. Run containers as non-root users
2. Use read-only root filesystems where possible
3. Drop all capabilities and add only what is needed
4. Use network policies to restrict Pod-to-Pod communication
5. Store credentials in Kubernetes Secrets, not ConfigMaps
6. Use Pod Security Standards (restricted profile when possible)

Example security context configuration.

```yaml
# secure-ambassador-example.yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app-with-ambassador
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault

  containers:
    - name: myapp
      image: myregistry/myapp:v1.0.0
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
      volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /var/cache/app

    - name: ambassador
      image: myregistry/ambassador:v1.0.0
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
          add:
            - NET_BIND_SERVICE

  volumes:
    - name: tmp
      emptyDir: {}
    - name: cache
      emptyDir: {}
```

## Conclusion

The ambassador pattern is a practical approach to handling external service connections in Kubernetes. By using sidecar containers that proxy network traffic, you can add connection pooling, TLS termination, and protocol translation without modifying your application code.

Key takeaways:

- Ambassador containers share the same network namespace as your main application
- Use localhost communication for low-latency, high-performance connections
- Shared volumes enable data exchange between containers
- Always implement proper health checks for both main and ambassador containers
- Keep ambassador containers lightweight with appropriate resource limits
- Follow security best practices including non-root users and read-only filesystems

The pattern works well for database connection pooling, TLS termination, and protocol translation. For more complex service mesh requirements, consider dedicated solutions like Istio or Linkerd that provide these capabilities at scale.

## References

- Kubernetes Pod Documentation: https://kubernetes.io/docs/concepts/workloads/pods/
- Multi-Container Pods: https://kubernetes.io/docs/concepts/workloads/pods/#how-pods-manage-multiple-containers
- PgBouncer Documentation: https://www.pgbouncer.org/config.html
- Nginx SSL Termination: https://nginx.org/en/docs/http/configuring_https_servers.html
