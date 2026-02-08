# How to Migrate from Docker Swarm to Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, docker swarm, kubernetes, migration, orchestration, k8s, containers

Description: Migrate your workloads from Docker Swarm to Kubernetes with a practical step-by-step approach covering services, networks, volumes, and secrets.

---

Docker Swarm served many teams well as a simple container orchestration platform. But the ecosystem has consolidated around Kubernetes, and the gap in tooling, community support, and cloud provider integration keeps widening. If you are running Docker Swarm in production, migrating to Kubernetes is a matter of when, not if.

This guide walks through the practical steps of moving workloads from Docker Swarm to Kubernetes. We will map Swarm concepts to their Kubernetes equivalents and convert real configurations.

## Concept Mapping: Swarm to Kubernetes

Before converting any files, understand how Swarm concepts map to Kubernetes:

| Docker Swarm | Kubernetes | Notes |
|-------------|-----------|-------|
| Service | Deployment + Service | Swarm combines both into one concept |
| Stack | Namespace or Helm Chart | Grouping of related resources |
| Replica | ReplicaSet (via Deployment) | Pod scaling |
| Overlay network | ClusterIP Service / NetworkPolicy | Service discovery changes |
| Config | ConfigMap | Configuration data |
| Secret | Secret | Sensitive data |
| Volume | PersistentVolumeClaim | Persistent storage |
| docker-compose.yml | Kubernetes manifests or Helm chart | Configuration format |

## Starting Point: A Docker Swarm Stack

Here is a typical Docker Swarm stack file we will migrate:

```yaml
# docker-stack.yml (Docker Swarm)
version: "3.8"

services:
  web:
    image: registry.example.com/myapp:v1.2.0
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://app:secret@db:5432/myapp
      - REDIS_URL=redis://cache:6379
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        max_attempts: 3
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 128M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - app-network
    secrets:
      - db_password
    configs:
      - source: app_config
        target: /app/config.yml

  db:
    image: postgres:16
    volumes:
      - pg_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=app
    secrets:
      - db_password
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
    networks:
      - app-network

  cache:
    image: redis:7-alpine
    deploy:
      replicas: 1
    networks:
      - app-network

networks:
  app-network:
    driver: overlay

volumes:
  pg_data:

secrets:
  db_password:
    external: true

configs:
  app_config:
    file: ./config.yml
```

## Step 1: Create the Kubernetes Namespace

```yaml
# namespace.yaml
# Creates an isolated namespace for the application
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
  labels:
    app: myapp
```

```bash
kubectl apply -f namespace.yaml
```

## Step 2: Migrate Secrets

Convert Swarm secrets to Kubernetes secrets:

```bash
# Get the secret value from Docker Swarm
SWARM_SECRET=$(docker secret inspect db_password --format '{{.Spec.Data}}' | base64 -d)

# Create the equivalent Kubernetes secret
kubectl create secret generic db-password \
    --from-literal=password="$SWARM_SECRET" \
    --namespace myapp
```

Or as a YAML manifest:

```yaml
# secrets.yaml
# Database password secret (values must be base64-encoded)
apiVersion: v1
kind: Secret
metadata:
  name: db-password
  namespace: myapp
type: Opaque
data:
  password: c2VjcmV0cGFzc3dvcmQ=  # base64-encoded value
```

## Step 3: Migrate Configs to ConfigMaps

```yaml
# configmap.yaml
# Application configuration (equivalent to Swarm configs)
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: myapp
data:
  config.yml: |
    server:
      port: 8080
    database:
      pool_size: 10
    cache:
      ttl: 300
```

## Step 4: Create PersistentVolumeClaims

Replace Docker volumes with Kubernetes PVCs:

```yaml
# pvc.yaml
# Persistent storage for PostgreSQL (replaces Docker named volume)
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pg-data
  namespace: myapp
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: standard  # Adjust for your cluster's storage class
```

## Step 5: Convert Services to Deployments

Convert each Swarm service to a Kubernetes Deployment and Service pair.

### Web Application

```yaml
# web-deployment.yaml
# Main application deployment (equivalent to Swarm web service)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: myapp
  labels:
    app: myapp
    component: web
spec:
  replicas: 3  # Matches Swarm deploy.replicas
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Maps to Swarm parallelism: 1
    type: RollingUpdate
  selector:
    matchLabels:
      app: myapp
      component: web
  template:
    metadata:
      labels:
        app: myapp
        component: web
    spec:
      containers:
        - name: web
          image: registry.example.com/myapp:v1.2.0
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              value: "postgres://app:secret@db:5432/myapp"
            - name: REDIS_URL
              value: "redis://cache:6379"
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-password
                  key: password
          # Resource limits matching the Swarm configuration
          resources:
            limits:
              cpu: "1.0"
              memory: 512Mi
            requests:
              cpu: "250m"
              memory: 128Mi
          # Health check matching the Swarm healthcheck
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 30
            timeoutSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          volumeMounts:
            - name: app-config
              mountPath: /app/config.yml
              subPath: config.yml
      volumes:
        - name: app-config
          configMap:
            name: app-config
---
# web-service.yaml
# Exposes the web deployment to external traffic
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: myapp
spec:
  selector:
    app: myapp
    component: web
  ports:
    - port: 8080
      targetPort: 8080
  type: LoadBalancer  # Or NodePort, depending on your setup
```

### Database

```yaml
# db-deployment.yaml
# PostgreSQL database (single replica, stateful)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: db
  namespace: myapp
spec:
  replicas: 1
  strategy:
    type: Recreate  # Do not run two database instances simultaneously
  selector:
    matchLabels:
      app: myapp
      component: db
  template:
    metadata:
      labels:
        app: myapp
        component: db
    spec:
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: myapp
            - name: POSTGRES_USER
              value: app
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-password
                  key: password
          volumeMounts:
            - name: pg-data
              mountPath: /var/lib/postgresql/data
          resources:
            limits:
              memory: 1Gi
            requests:
              memory: 256Mi
      volumes:
        - name: pg-data
          persistentVolumeClaim:
            claimName: pg-data
---
apiVersion: v1
kind: Service
metadata:
  name: db
  namespace: myapp
spec:
  selector:
    app: myapp
    component: db
  ports:
    - port: 5432
      targetPort: 5432
  clusterIP: None  # Headless service for stable DNS name
```

### Cache

```yaml
# cache-deployment.yaml
# Redis cache service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache
  namespace: myapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
      component: cache
  template:
    metadata:
      labels:
        app: myapp
        component: cache
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          resources:
            limits:
              memory: 256Mi
            requests:
              memory: 64Mi
---
apiVersion: v1
kind: Service
metadata:
  name: cache
  namespace: myapp
spec:
  selector:
    app: myapp
    component: cache
  ports:
    - port: 6379
      targetPort: 6379
```

## Step 6: Using Kompose for Automated Conversion

Kompose can automatically convert Docker Compose files to Kubernetes manifests:

```bash
# Install kompose
curl -L https://github.com/kubernetes/kompose/releases/latest/download/kompose-linux-amd64 -o kompose
chmod +x kompose && sudo mv kompose /usr/local/bin/

# Convert a Docker Compose file to Kubernetes manifests
kompose convert -f docker-stack.yml --out k8s-manifests/

# Review the generated files
ls k8s-manifests/
```

Kompose generates a starting point, but you will almost always need to adjust the output. It does not handle Swarm-specific features like placement constraints or update policies perfectly.

## Step 7: Data Migration

Migrate your data from Swarm volumes to Kubernetes PVCs:

```bash
#!/bin/bash
# migrate-data.sh
# Copies data from a Docker Swarm volume to a Kubernetes PVC

SWARM_VOLUME="pg_data"
K8S_PVC="pg-data"
NAMESPACE="myapp"

# Step 1: Archive the Swarm volume
echo "Archiving Swarm volume..."
docker run --rm \
    -v "${SWARM_VOLUME}:/source:ro" \
    -v /tmp:/backup \
    alpine tar czf /backup/volume-data.tar.gz -C /source .

# Step 2: Copy the archive into a temporary pod that has the PVC mounted
echo "Creating data transfer pod..."
kubectl run data-transfer \
    --image=alpine \
    --namespace="$NAMESPACE" \
    --overrides='{
        "spec": {
            "containers": [{
                "name": "transfer",
                "image": "alpine",
                "command": ["sleep", "3600"],
                "volumeMounts": [{
                    "name": "data",
                    "mountPath": "/target"
                }]
            }],
            "volumes": [{
                "name": "data",
                "persistentVolumeClaim": {
                    "claimName": "'$K8S_PVC'"
                }
            }]
        }
    }' \
    --restart=Never

# Wait for the pod to be ready
kubectl wait --for=condition=Ready pod/data-transfer -n "$NAMESPACE" --timeout=60s

# Step 3: Copy the archive into the pod and extract it
kubectl cp /tmp/volume-data.tar.gz "$NAMESPACE/data-transfer:/tmp/volume-data.tar.gz"
kubectl exec data-transfer -n "$NAMESPACE" -- tar xzf /tmp/volume-data.tar.gz -C /target

# Step 4: Clean up
kubectl delete pod data-transfer -n "$NAMESPACE"
rm /tmp/volume-data.tar.gz

echo "Data migration complete"
```

## Step 8: Deploy and Verify

```bash
# Apply all Kubernetes manifests
kubectl apply -f namespace.yaml
kubectl apply -f secrets.yaml
kubectl apply -f configmap.yaml
kubectl apply -f pvc.yaml
kubectl apply -f db-deployment.yaml
kubectl apply -f cache-deployment.yaml
kubectl apply -f web-deployment.yaml

# Verify everything is running
kubectl get all -n myapp

# Check pod logs
kubectl logs -l app=myapp,component=web -n myapp --tail=20

# Verify services can communicate
kubectl exec -it deploy/web -n myapp -- curl -s http://cache:6379/ping
```

## Summary

Migrating from Docker Swarm to Kubernetes requires translating every Swarm concept to its Kubernetes equivalent: services become Deployments plus Services, Swarm secrets become Kubernetes Secrets, configs become ConfigMaps, and volumes become PVCs. Use Kompose for an initial conversion, then refine the output manually. Migrate data carefully with temporary transfer pods. Test thoroughly in a staging environment before cutting over production traffic. The migration takes effort, but the result is a platform with stronger ecosystem support, better scaling, and more operational tooling.
