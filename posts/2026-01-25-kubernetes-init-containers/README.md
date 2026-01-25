# How to Use Init Containers for Pod Initialization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Init Containers, DevOps, Pod Lifecycle, Troubleshooting

Description: A practical guide to using Kubernetes init containers for pre-flight checks, dependency waiting, configuration setup, and data preparation before your main application containers start.

---

Init containers run before your main application containers start. They are perfect for setup tasks that must complete successfully before your app can function, like waiting for a database or downloading configuration files.

## How Init Containers Work

Init containers run sequentially, one at a time. Each must complete successfully before the next one starts. Only after all init containers finish does Kubernetes start the main containers.

```mermaid
graph LR
    A[Pod Created] --> B[Init Container 1]
    B --> C[Init Container 2]
    C --> D[Main Container]
    D --> E[Pod Running]
```

```yaml
# Basic init container example
apiVersion: v1
kind: Pod
metadata:
  name: app-with-init
spec:
  initContainers:
    - name: wait-for-db
      image: busybox:1.36
      command: ['sh', '-c', 'until nc -z postgres 5432; do echo waiting for db; sleep 2; done']
  containers:
    - name: app
      image: myapp:v1
```

## Common Use Cases

### 1. Wait for Dependencies

Wait for a service to be available before starting:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app
spec:
  initContainers:
    - name: wait-for-api
      image: busybox:1.36
      command:
        - sh
        - -c
        - |
          echo "Waiting for API service..."
          until wget -q --spider http://api-service:8080/health; do
            echo "API not ready, sleeping 5s"
            sleep 5
          done
          echo "API is ready"
  containers:
    - name: web
      image: nginx:1.24
```

### 2. Database Migration

Run migrations before the app starts:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-migration
spec:
  initContainers:
    - name: run-migrations
      image: myapp:v1
      command: ['./migrate', '--database', '$(DATABASE_URL)']
      env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
  containers:
    - name: app
      image: myapp:v1
```

### 3. Download Configuration

Fetch configuration from external source:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-config
spec:
  initContainers:
    - name: fetch-config
      image: curlimages/curl:8.1.0
      command:
        - sh
        - -c
        - |
          # Download config from config server
          curl -o /config/app.yaml http://config-server:8080/config/production
          echo "Config downloaded successfully"
      volumeMounts:
        - name: config-volume
          mountPath: /config
  containers:
    - name: app
      image: myapp:v1
      volumeMounts:
        - name: config-volume
          mountPath: /etc/app
  volumes:
    - name: config-volume
      emptyDir: {}
```

### 4. Set File Permissions

Fix permissions on mounted volumes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-permissions
spec:
  initContainers:
    - name: fix-permissions
      image: busybox:1.36
      command:
        - sh
        - -c
        - |
          # Set correct ownership and permissions
          chown -R 1000:1000 /data
          chmod -R 755 /data
      securityContext:
        runAsUser: 0   # Run as root to change permissions
      volumeMounts:
        - name: data-volume
          mountPath: /data
  containers:
    - name: app
      image: myapp:v1
      securityContext:
        runAsUser: 1000
      volumeMounts:
        - name: data-volume
          mountPath: /data
  volumes:
    - name: data-volume
      persistentVolumeClaim:
        claimName: app-data
```

### 5. Clone Git Repository

Download code or assets from Git:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-git
spec:
  initContainers:
    - name: git-clone
      image: alpine/git:2.40.1
      command:
        - sh
        - -c
        - |
          git clone --depth 1 https://github.com/org/config-repo.git /repo
          cp -r /repo/configs/* /config/
      volumeMounts:
        - name: config-volume
          mountPath: /config
  containers:
    - name: app
      image: nginx:1.24
      volumeMounts:
        - name: config-volume
          mountPath: /etc/nginx/conf.d
  volumes:
    - name: config-volume
      emptyDir: {}
```

## Multiple Init Containers

Init containers run in order. Use this for multi-step initialization:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-init
spec:
  initContainers:
    # Step 1: Wait for database
    - name: wait-for-db
      image: busybox:1.36
      command: ['sh', '-c', 'until nc -z postgres 5432; do sleep 2; done']

    # Step 2: Run migrations
    - name: run-migrations
      image: myapp:v1
      command: ['./migrate']
      env:
        - name: DATABASE_URL
          value: "postgres://postgres:5432/mydb"

    # Step 3: Seed initial data
    - name: seed-data
      image: myapp:v1
      command: ['./seed', '--if-empty']
      env:
        - name: DATABASE_URL
          value: "postgres://postgres:5432/mydb"

  containers:
    - name: app
      image: myapp:v1
```

## Init Containers vs Sidecar Containers

| Feature | Init Containers | Sidecar Containers |
|---------|----------------|-------------------|
| Runs when | Before main containers | Alongside main containers |
| Lifecycle | Runs once, then exits | Runs continuously |
| Use case | Setup, waiting, migration | Logging, proxying, monitoring |
| Failure behavior | Pod cannot start | Pod may continue |

## Checking Init Container Status

```bash
# View init container status
kubectl get pod app-with-init -o jsonpath='{.status.initContainerStatuses}'

# Describe pod for detailed status
kubectl describe pod app-with-init

# Output shows init container status:
# Init Containers:
#   wait-for-db:
#     State:          Terminated
#       Reason:       Completed
#       Exit Code:    0

# View init container logs
kubectl logs app-with-init -c wait-for-db
```

## Debugging Init Container Issues

### Init Container Stuck

```bash
# Check what init container is doing
kubectl describe pod app-with-init

# Look for:
# Init Containers:
#   wait-for-db:
#     State:          Running
#     Started:        10 minutes ago

# View logs to see what it is waiting for
kubectl logs app-with-init -c wait-for-db -f
```

### Init Container Failed

```bash
# Check exit code and reason
kubectl describe pod app-with-init

# Look for:
# Init Containers:
#   run-migrations:
#     State:          Terminated
#       Reason:       Error
#       Exit Code:    1

# View logs to see error
kubectl logs app-with-init -c run-migrations

# Check previous attempt if restarted
kubectl logs app-with-init -c run-migrations --previous
```

### Pod Stuck in Init State

```bash
# Get current state
kubectl get pod app-with-init

# Output:
# NAME            READY   STATUS     RESTARTS   AGE
# app-with-init   0/1     Init:0/2   0          5m

# This means 0 of 2 init containers completed
```

## Resource Management for Init Containers

Init containers can have their own resource limits:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-init
spec:
  initContainers:
    - name: heavy-init
      image: myapp:v1
      command: ['./expensive-init-task']
      resources:
        requests:
          memory: "1Gi"
          cpu: "500m"
        limits:
          memory: "2Gi"
          cpu: "1000m"
  containers:
    - name: app
      image: myapp:v1
      resources:
        requests:
          memory: "256Mi"
          cpu: "100m"
        limits:
          memory: "512Mi"
          cpu: "200m"
```

Kubernetes calculates effective pod resources as the maximum of:
- Highest init container request/limit
- Sum of all main container requests/limits

## Init Containers with Secrets and ConfigMaps

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-secrets
spec:
  initContainers:
    - name: setup-certs
      image: busybox:1.36
      command:
        - sh
        - -c
        - |
          # Copy certificates to correct location
          cp /secrets/tls.crt /certs/server.crt
          cp /secrets/tls.key /certs/server.key
          chmod 600 /certs/server.key
      volumeMounts:
        - name: tls-secrets
          mountPath: /secrets
          readOnly: true
        - name: certs
          mountPath: /certs
  containers:
    - name: app
      image: myapp:v1
      volumeMounts:
        - name: certs
          mountPath: /etc/certs
  volumes:
    - name: tls-secrets
      secret:
        secretName: app-tls
    - name: certs
      emptyDir: {}
```

## Best Practices

### 1. Use Lightweight Images

```yaml
initContainers:
  # Good - small image
  - name: wait
    image: busybox:1.36

  # Avoid - large image just for simple check
  - name: wait
    image: ubuntu:22.04
```

### 2. Set Timeouts in Wait Logic

```yaml
initContainers:
  - name: wait-for-service
    image: busybox:1.36
    command:
      - sh
      - -c
      - |
        TIMEOUT=300
        ELAPSED=0
        until wget -q --spider http://service:8080/health; do
          if [ $ELAPSED -ge $TIMEOUT ]; then
            echo "Timeout waiting for service"
            exit 1
          fi
          echo "Waiting... ($ELAPSED/$TIMEOUT seconds)"
          sleep 5
          ELAPSED=$((ELAPSED + 5))
        done
```

### 3. Make Init Containers Idempotent

```yaml
initContainers:
  - name: run-migrations
    image: myapp:v1
    command:
      - sh
      - -c
      - |
        # Check if migrations already ran
        if ./check-migrations-complete; then
          echo "Migrations already complete"
          exit 0
        fi
        # Run migrations
        ./migrate
```

### 4. Log Progress

```yaml
initContainers:
  - name: setup
    image: busybox:1.36
    command:
      - sh
      - -c
      - |
        echo "[$(date)] Starting setup..."
        echo "[$(date)] Step 1: Checking dependencies"
        # ... do work
        echo "[$(date)] Step 2: Downloading config"
        # ... do work
        echo "[$(date)] Setup complete"
```

## Complete Example: Web Application

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      initContainers:
        # Wait for database
        - name: wait-for-db
          image: busybox:1.36
          command:
            - sh
            - -c
            - |
              until nc -z postgres-service 5432; do
                echo "Waiting for PostgreSQL..."
                sleep 2
              done
              echo "PostgreSQL is ready"

        # Wait for Redis
        - name: wait-for-redis
          image: busybox:1.36
          command:
            - sh
            - -c
            - |
              until nc -z redis-service 6379; do
                echo "Waiting for Redis..."
                sleep 2
              done
              echo "Redis is ready"

        # Run database migrations
        - name: run-migrations
          image: myapp:v1
          command: ['./migrate']
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url

      containers:
        - name: app
          image: myapp:v1
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

---

Init containers provide a clean separation between setup logic and application logic. Use them for dependency checks, migrations, and configuration tasks. Keep them lightweight, idempotent, and well-logged for easier debugging when things go wrong.
