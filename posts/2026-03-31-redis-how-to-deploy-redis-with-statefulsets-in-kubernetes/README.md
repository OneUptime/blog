# How to Deploy Redis with StatefulSets in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kubernetes, StatefulSet, Deployment, Persistent Storage

Description: Learn how to deploy Redis with Kubernetes StatefulSets for stable network identities, persistent storage, and ordered pod management.

---

## Why StatefulSets for Redis

Redis requires stable network identities and persistent storage that survive pod restarts. StatefulSets provide:
- Predictable pod names (redis-0, redis-1, redis-2)
- Stable DNS names (redis-0.redis-headless.namespace.svc.cluster.local)
- Ordered startup and shutdown
- Persistent volume claims that are not deleted when pods are rescheduled

## Namespace and ConfigMap

Create a namespace and Redis configuration:

```yaml
# redis-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: redis
```

```yaml
# redis-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: redis
data:
  redis.conf: |
    appendonly yes
    appendfsync everysec
    maxmemory 1gb
    maxmemory-policy allkeys-lru
    save 900 1
    save 300 10
    loglevel notice
    protected-mode no
```

## Secret for Redis Password

```yaml
# redis-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: redis-secret
  namespace: redis
type: Opaque
stringData:
  password: "your-strong-redis-password"
```

## Headless Service

A headless service provides stable DNS names for each pod:

```yaml
# redis-headless-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-headless
  namespace: redis
spec:
  clusterIP: None
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
      name: redis
```

## Client-Facing Service

A regular service for application connections:

```yaml
# redis-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: redis
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
  type: ClusterIP
```

## StatefulSet Definition

```yaml
# redis-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: redis
spec:
  serviceName: redis-headless
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      initContainers:
        - name: config-setup
          image: redis:7-alpine
          command: ["/bin/sh", "-c"]
          args:
            - |
              cp /tmp/redis/redis.conf /etc/redis/redis.conf
              echo "requirepass $REDIS_PASSWORD" >> /etc/redis/redis.conf
              echo "masterauth $REDIS_PASSWORD" >> /etc/redis/redis.conf
              if [ "$(hostname)" != "redis-0" ]; then
                echo "replicaof redis-0.redis-headless.redis.svc.cluster.local 6379" >> /etc/redis/redis.conf
              fi
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-secret
                  key: password
          volumeMounts:
            - name: redis-config
              mountPath: /tmp/redis
            - name: redis-config-volume
              mountPath: /etc/redis
      containers:
        - name: redis
          image: redis:7-alpine
          command: ["redis-server", "/etc/redis/redis.conf"]
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-secret
                  key: password
            - name: REDISCLI_AUTH
              valueFrom:
                secretKeyRef:
                  name: redis-secret
                  key: password
          ports:
            - containerPort: 6379
              name: redis
          volumeMounts:
            - name: redis-data
              mountPath: /data
            - name: redis-config-volume
              mountPath: /etc/redis
          readinessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 30
            periodSeconds: 15
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
      volumes:
        - name: redis-config
          configMap:
            name: redis-config
        - name: redis-config-volume
          emptyDir: {}
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: standard
        resources:
          requests:
            storage: 10Gi
```

## Deploying Redis

```bash
# Apply all manifests
kubectl apply -f redis-namespace.yaml
kubectl apply -f redis-config.yaml
kubectl apply -f redis-secret.yaml
kubectl apply -f redis-headless-service.yaml
kubectl apply -f redis-service.yaml
kubectl apply -f redis-statefulset.yaml

# Watch pod creation (pods are created in order: redis-0, redis-1, redis-2)
kubectl -n redis get pods -w

# Check StatefulSet status
kubectl -n redis get statefulset redis
```

Expected pod names:

```text
NAME      READY   STATUS    RESTARTS   AGE
redis-0   1/1     Running   0          2m
redis-1   1/1     Running   0          90s
redis-2   1/1     Running   0          60s
```

## Verifying Replication

```bash
# Check replication on primary (redis-0)
kubectl -n redis exec redis-0 -- redis-cli INFO replication

# Check replica status on redis-1
kubectl -n redis exec redis-1 -- redis-cli INFO replication | grep role
# role:slave
```

## Connecting from an Application Pod

```yaml
# Application deployment example
env:
  - name: REDIS_URL
    value: "redis://redis.redis.svc.cluster.local:6379"
  # Or with password:
  - name: REDIS_URL
    value: "redis://:your-strong-redis-password@redis.redis.svc.cluster.local:6379"
```

Access individual pods by stable DNS:

```text
redis-0.redis-headless.redis.svc.cluster.local:6379
redis-1.redis-headless.redis.svc.cluster.local:6379
redis-2.redis-headless.redis.svc.cluster.local:6379
```

## Scaling the StatefulSet

```bash
# Scale up (new pods added at the end)
kubectl -n redis scale statefulset redis --replicas=5

# Scale down (pods removed from the end)
kubectl -n redis scale statefulset redis --replicas=3
```

## Persistent Volume Management

```bash
# List PVCs
kubectl -n redis get pvc

# View PVC details
kubectl -n redis describe pvc redis-data-redis-0
```

Note: Scaling down does NOT delete PVCs. You must manually delete them if needed:

```bash
kubectl -n redis delete pvc redis-data-redis-3
```

## Summary

Deploying Redis with Kubernetes StatefulSets gives each pod a stable identity (redis-0, redis-1, redis-2) and a persistent volume that survives rescheduling. Use a headless service for stable DNS-based pod addressing and an initContainer to configure replication for non-primary pods. Always add readiness and liveness probes, set resource requests and limits, and use volumeClaimTemplates to provision dedicated persistent storage for each Redis pod. Connect applications via the ClusterIP service for load balancing, or to individual pods via headless DNS for primary-specific operations.
