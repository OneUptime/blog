# How to Deploy Redis Cluster on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Redis, Kubernetes, Caching, In-Memory Database, DevOps

Description: Complete walkthrough for deploying a Redis Cluster on Talos Linux with sharding, replication, and persistent storage for production use.

---

Redis is the go-to in-memory data store for caching, session management, and real-time analytics. Deploying a Redis Cluster on Talos Linux brings together the speed of Redis with the security and immutability of a purpose-built Kubernetes OS. A Redis Cluster provides automatic data sharding across multiple nodes, built-in replication, and fault tolerance, making it the right choice for production workloads.

This guide covers deploying a full Redis Cluster on Talos Linux with six nodes (three primary and three replica), persistent storage, and proper configuration for Kubernetes environments.

## Redis Cluster vs. Standalone Redis

Before diving in, it is worth understanding when you need a Redis Cluster versus a standalone instance. A standalone Redis server is fine for small-scale caching and development. A Redis Cluster, on the other hand, distributes your data across multiple nodes using hash slots. Each primary node owns a subset of the 16384 hash slots, and each primary has a replica for failover. If a primary goes down, its replica takes over automatically.

## Prerequisites

- Talos Linux cluster with at least six worker nodes (or three with enough resources)
- `kubectl` and `talosctl` configured
- A StorageClass configured for persistent volumes
- At least 1GB RAM per Redis node

## Step 1: Create Namespace and ConfigMap

```yaml
# redis-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: redis-cluster
---
# redis-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: redis-cluster
data:
  redis.conf: |
    # Enable Redis Cluster mode
    cluster-enabled yes
    cluster-config-file nodes.conf
    cluster-node-timeout 5000

    # Persistence settings
    appendonly yes
    appendfsync everysec

    # Memory management
    maxmemory 512mb
    maxmemory-policy allkeys-lru

    # Network settings
    bind 0.0.0.0
    protected-mode no
    port 6379

    # Cluster communication port
    cluster-announce-port 6379
    cluster-announce-bus-port 16379
```

```bash
kubectl apply -f redis-namespace.yaml
kubectl apply -f redis-config.yaml
```

## Step 2: Create the Redis Cluster Password Secret

```yaml
# redis-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: redis-password
  namespace: redis-cluster
type: Opaque
stringData:
  REDIS_PASSWORD: "your-redis-cluster-password"
```

```bash
kubectl apply -f redis-secret.yaml
```

## Step 3: Deploy Redis Cluster with StatefulSet

```yaml
# redis-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: redis-cluster
spec:
  serviceName: redis-cluster
  replicas: 6
  selector:
    matchLabels:
      app: redis-cluster
  template:
    metadata:
      labels:
        app: redis-cluster
    spec:
      containers:
        - name: redis
          image: redis:7.2-alpine
          ports:
            - containerPort: 6379
              name: client
            - containerPort: 16379
              name: gossip
          command:
            - redis-server
            - /etc/redis/redis.conf
            - --requirepass
            - $(REDIS_PASSWORD)
            - --masterauth
            - $(REDIS_PASSWORD)
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-password
                  key: REDIS_PASSWORD
          volumeMounts:
            - name: redis-data
              mountPath: /data
            - name: redis-config
              mountPath: /etc/redis
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          # Check if Redis is responsive
          livenessProbe:
            exec:
              command:
                - redis-cli
                - -a
                - $(REDIS_PASSWORD)
                - ping
            initialDelaySeconds: 15
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - redis-cli
                - -a
                - $(REDIS_PASSWORD)
                - ping
            initialDelaySeconds: 5
            periodSeconds: 5
      volumes:
        - name: redis-config
          configMap:
            name: redis-config
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 10Gi
```

## Step 4: Create the Headless Service

```yaml
# redis-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster
  namespace: redis-cluster
spec:
  selector:
    app: redis-cluster
  ports:
    - port: 6379
      targetPort: 6379
      name: client
    - port: 16379
      targetPort: 16379
      name: gossip
  clusterIP: None
```

```bash
kubectl apply -f redis-statefulset.yaml
kubectl apply -f redis-service.yaml

# Wait for all six pods to be ready
kubectl rollout status statefulset/redis-cluster -n redis-cluster
```

## Step 5: Initialize the Redis Cluster

Once all six pods are running, you need to create the cluster. First, gather the pod IP addresses:

```bash
# Get all pod IPs
kubectl get pods -n redis-cluster -o wide

# Store the IPs for cluster creation
REDIS_NODES=$(kubectl get pods -n redis-cluster -o jsonpath='{range .items[*]}{.status.podIP}:6379 {end}')

# Connect to the first pod and create the cluster
kubectl exec -it redis-cluster-0 -n redis-cluster -- \
  redis-cli -a your-redis-cluster-password \
  --cluster create $REDIS_NODES \
  --cluster-replicas 1 --cluster-yes
```

This command creates a cluster with three primary shards and one replica per primary. The `--cluster-replicas 1` flag tells Redis to assign one replica to each primary automatically.

## Step 6: Verify the Cluster

```bash
# Check cluster status
kubectl exec -it redis-cluster-0 -n redis-cluster -- \
  redis-cli -a your-redis-cluster-password cluster info

# Check cluster nodes and their roles
kubectl exec -it redis-cluster-0 -n redis-cluster -- \
  redis-cli -a your-redis-cluster-password cluster nodes

# Test writing data
kubectl exec -it redis-cluster-0 -n redis-cluster -- \
  redis-cli -a your-redis-cluster-password -c set testkey "hello from talos"

# Test reading data
kubectl exec -it redis-cluster-0 -n redis-cluster -- \
  redis-cli -a your-redis-cluster-password -c get testkey
```

## Pod Anti-Affinity for High Availability

Make sure Redis pods are spread across different nodes to survive node failures:

```yaml
# Add this to the StatefulSet spec.template.spec section
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app
                operator: In
                values:
                  - redis-cluster
          topologyKey: kubernetes.io/hostname
```

## Monitoring Redis Cluster

Deploy the Redis exporter for Prometheus metrics:

```yaml
# redis-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-exporter
  namespace: redis-cluster
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-exporter
  template:
    metadata:
      labels:
        app: redis-exporter
    spec:
      containers:
        - name: redis-exporter
          image: oliver006/redis_exporter:latest
          env:
            - name: REDIS_ADDR
              value: "redis://redis-cluster-0.redis-cluster.redis-cluster.svc.cluster.local:6379"
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-password
                  key: REDIS_PASSWORD
          ports:
            - containerPort: 9121
```

## Handling Cluster Scaling

To add more shards to your Redis Cluster, scale the StatefulSet and then add the new nodes:

```bash
# Scale up to 8 nodes (4 primaries + 4 replicas)
kubectl scale statefulset redis-cluster -n redis-cluster --replicas=8

# Wait for new pods, then add them to the cluster
kubectl exec -it redis-cluster-0 -n redis-cluster -- \
  redis-cli -a your-redis-cluster-password \
  --cluster add-node <new-node-ip>:6379 <existing-node-ip>:6379

# Rebalance the hash slots
kubectl exec -it redis-cluster-0 -n redis-cluster -- \
  redis-cli -a your-redis-cluster-password \
  --cluster rebalance <existing-node-ip>:6379
```

## Conclusion

Running a Redis Cluster on Talos Linux is a solid combination for production workloads that need both speed and security. The immutable nature of Talos Linux prevents host-level tampering, while Redis Cluster provides the data sharding and failover your applications need. The key points to remember are to always use a StatefulSet for stable pod identities, initialize the cluster manually or use an operator for automation, spread pods across nodes with anti-affinity rules, and monitor cluster health continuously. With these practices in place, your Redis Cluster on Talos Linux will be both performant and resilient.
