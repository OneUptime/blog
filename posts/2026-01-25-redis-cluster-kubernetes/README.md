# How to Deploy Redis Cluster on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kubernetes, Redis Cluster, StatefulSet, High Availability, DevOps, Helm

Description: A step-by-step guide to deploying a production-ready Redis Cluster on Kubernetes. Covers StatefulSets, persistent storage, cluster initialization, and operational best practices.

---

> Redis Cluster provides automatic sharding and high availability across multiple nodes. Running it on Kubernetes combines the power of Redis clustering with container orchestration, giving you a resilient, scalable caching and data layer.

Deploying Redis Cluster on Kubernetes requires careful consideration of networking, storage, and pod scheduling. This guide walks through both manual deployment with YAML manifests and automated deployment using Helm charts.

---

## Redis Cluster Architecture

A Redis Cluster distributes data across multiple master nodes, each with optional replicas for failover:

```
+-------------------+     +-------------------+     +-------------------+
|  Master 0         |     |  Master 1         |     |  Master 2         |
|  Slots: 0-5460    |     |  Slots: 5461-10922|     |  Slots: 10923-16383|
+-------------------+     +-------------------+     +-------------------+
        |                         |                         |
        v                         v                         v
+-------------------+     +-------------------+     +-------------------+
|  Replica 0        |     |  Replica 1        |     |  Replica 2        |
+-------------------+     +-------------------+     +-------------------+
```

Each master is responsible for a subset of the 16384 hash slots. Replicas automatically promote to master if their primary fails.

---

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.24 or later)
- kubectl configured
- A storage class that supports dynamic provisioning
- Sufficient resources (at least 6 pods for a minimal cluster)

```bash
# Verify cluster access
kubectl cluster-info

# Check available storage classes
kubectl get storageclass
```

---

## Creating the Namespace and ConfigMap

Start by setting up the namespace and Redis configuration:

```yaml
# redis-cluster-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: redis-cluster
  labels:
    app: redis-cluster
---
# redis-cluster-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-cluster-config
  namespace: redis-cluster
data:
  redis.conf: |
    # Cluster configuration
    cluster-enabled yes
    cluster-config-file nodes.conf
    cluster-node-timeout 5000

    # Persistence settings
    appendonly yes
    appendfsync everysec

    # Memory management
    maxmemory 1gb
    maxmemory-policy volatile-lru

    # Network settings
    bind 0.0.0.0
    protected-mode no

    # Cluster announce settings will be set by the startup script
    # to handle Kubernetes networking
```

Apply the configuration:

```bash
kubectl apply -f redis-cluster-namespace.yaml
kubectl apply -f redis-cluster-config.yaml
```

---

## Creating the Headless Service

Redis Cluster needs a headless service for pod discovery:

```yaml
# redis-cluster-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster
  namespace: redis-cluster
  labels:
    app: redis-cluster
spec:
  clusterIP: None
  ports:
    - port: 6379
      targetPort: 6379
      name: client
    - port: 16379
      targetPort: 16379
      name: gossip
  selector:
    app: redis-cluster
---
# Client service for external access
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster-client
  namespace: redis-cluster
  labels:
    app: redis-cluster
spec:
  type: ClusterIP
  ports:
    - port: 6379
      targetPort: 6379
      name: client
  selector:
    app: redis-cluster
```

---

## Deploying the StatefulSet

The StatefulSet ensures stable network identities and persistent storage:

```yaml
# redis-cluster-statefulset.yaml
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
      # Prevent multiple Redis pods on the same node
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: redis-cluster
                topologyKey: kubernetes.io/hostname

      containers:
        - name: redis
          image: redis:7.2-alpine
          ports:
            - containerPort: 6379
              name: client
            - containerPort: 16379
              name: gossip

          command:
            - /bin/sh
            - -c
            - |
              # Get the pod IP for cluster announcements
              POD_IP=$(hostname -i)

              # Start Redis with cluster configuration
              redis-server /etc/redis/redis.conf \
                --cluster-announce-ip ${POD_IP} \
                --cluster-announce-port 6379 \
                --cluster-announce-bus-port 16379

          resources:
            requests:
              cpu: 200m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 2Gi

          volumeMounts:
            - name: data
              mountPath: /data
            - name: config
              mountPath: /etc/redis

          # Readiness probe ensures pod is ready before receiving traffic
          readinessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 5
            periodSeconds: 5

          # Liveness probe restarts unhealthy pods
          livenessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 30
            periodSeconds: 10

      volumes:
        - name: config
          configMap:
            name: redis-cluster-config

  # Persistent volume claim template for each pod
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 10Gi
        # Uncomment and modify for your storage class
        # storageClassName: standard
```

Apply the StatefulSet:

```bash
kubectl apply -f redis-cluster-statefulset.yaml

# Wait for all pods to be ready
kubectl wait --for=condition=Ready pod -l app=redis-cluster \
  -n redis-cluster --timeout=300s

# Verify pods are running
kubectl get pods -n redis-cluster -o wide
```

---

## Initializing the Cluster

Once all pods are running, initialize the Redis Cluster:

```bash
#!/bin/bash
# init-redis-cluster.sh

NAMESPACE="redis-cluster"

# Get the IP addresses of all Redis pods
PODS=$(kubectl get pods -n $NAMESPACE -l app=redis-cluster \
  -o jsonpath='{range.items[*]}{.status.podIP}:6379 {end}')

echo "Redis pod IPs: $PODS"

# Create the cluster using redis-cli from one of the pods
# The --cluster-replicas 1 option creates one replica per master
kubectl exec -it redis-cluster-0 -n $NAMESPACE -- \
  redis-cli --cluster create $PODS \
  --cluster-replicas 1 \
  --cluster-yes

# Verify cluster status
kubectl exec -it redis-cluster-0 -n $NAMESPACE -- \
  redis-cli cluster info

# Check cluster nodes
kubectl exec -it redis-cluster-0 -n $NAMESPACE -- \
  redis-cli cluster nodes
```

---

## Cluster Health Monitoring Script

Create a script to monitor cluster health:

```yaml
# redis-cluster-monitor.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-monitor-script
  namespace: redis-cluster
data:
  monitor.sh: |
    #!/bin/sh

    echo "=== Redis Cluster Health Check ==="
    echo ""

    # Check cluster state
    STATE=$(redis-cli cluster info | grep cluster_state | cut -d: -f2 | tr -d '\r')
    echo "Cluster State: $STATE"

    # Check slots coverage
    SLOTS=$(redis-cli cluster info | grep cluster_slots_ok | cut -d: -f2 | tr -d '\r')
    echo "Slots Assigned: $SLOTS"

    # Count nodes
    NODES=$(redis-cli cluster nodes | wc -l)
    echo "Total Nodes: $NODES"

    # List masters and replicas
    echo ""
    echo "=== Node Roles ==="
    redis-cli cluster nodes | while read line; do
      ID=$(echo $line | awk '{print $1}' | cut -c1-8)
      ADDR=$(echo $line | awk '{print $2}' | cut -d@ -f1)
      FLAGS=$(echo $line | awk '{print $3}')
      echo "$ID - $ADDR - $FLAGS"
    done

    # Check for failed nodes
    FAILED=$(redis-cli cluster nodes | grep -c fail)
    if [ "$FAILED" -gt 0 ]; then
      echo ""
      echo "WARNING: $FAILED failed nodes detected!"
      redis-cli cluster nodes | grep fail
    fi
```

---

## Using Helm for Deployment

For a simpler deployment, use the Bitnami Redis Cluster Helm chart:

```bash
# Add the Bitnami repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Create values file
cat > redis-cluster-values.yaml << 'EOF'
# Cluster configuration
cluster:
  nodes: 6
  replicas: 1

# Redis configuration
redis:
  configmap: |-
    maxmemory 2gb
    maxmemory-policy volatile-lru
    appendonly yes

# Resource allocation
resources:
  requests:
    memory: 512Mi
    cpu: 200m
  limits:
    memory: 2Gi
    cpu: 1000m

# Persistence settings
persistence:
  enabled: true
  size: 10Gi
  # storageClass: standard

# Security context
podSecurityContext:
  fsGroup: 1001

containerSecurityContext:
  runAsUser: 1001

# Metrics for monitoring
metrics:
  enabled: true
  serviceMonitor:
    enabled: true
EOF

# Install the chart
helm install redis-cluster bitnami/redis-cluster \
  --namespace redis-cluster \
  --create-namespace \
  -f redis-cluster-values.yaml
```

---

## Connecting from Applications

Here is how to connect to Redis Cluster from your applications:

```python
# Python example using redis-py-cluster
from rediscluster import RedisCluster

def create_cluster_client():
    """
    Create a Redis Cluster client for Kubernetes deployment.
    """
    # Use the headless service for discovery
    startup_nodes = [
        {"host": "redis-cluster-0.redis-cluster.redis-cluster.svc.cluster.local", "port": 6379},
        {"host": "redis-cluster-1.redis-cluster.redis-cluster.svc.cluster.local", "port": 6379},
        {"host": "redis-cluster-2.redis-cluster.redis-cluster.svc.cluster.local", "port": 6379},
    ]

    client = RedisCluster(
        startup_nodes=startup_nodes,
        decode_responses=True,
        skip_full_coverage_check=True,
        # Retry configuration for resilience
        cluster_error_retry_attempts=3,
    )

    return client


# Usage
client = create_cluster_client()
client.set("key", "value")
print(client.get("key"))
```

```javascript
// Node.js example using ioredis
const Redis = require('ioredis');

const cluster = new Redis.Cluster([
  { host: 'redis-cluster-0.redis-cluster.redis-cluster.svc.cluster.local', port: 6379 },
  { host: 'redis-cluster-1.redis-cluster.redis-cluster.svc.cluster.local', port: 6379 },
  { host: 'redis-cluster-2.redis-cluster.redis-cluster.svc.cluster.local', port: 6379 },
], {
  // Automatically discover other nodes
  scaleReads: 'slave',

  // Retry strategy
  clusterRetryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  }
});

cluster.set('key', 'value').then(() => {
  return cluster.get('key');
}).then((value) => {
  console.log(value);
});
```

---

## Scaling the Cluster

To add more nodes to the cluster:

```bash
# Scale up the StatefulSet
kubectl scale statefulset redis-cluster -n redis-cluster --replicas=9

# Wait for new pods
kubectl wait --for=condition=Ready pod/redis-cluster-6 \
  -n redis-cluster --timeout=120s

# Add new nodes to the cluster
NEW_NODE_IP=$(kubectl get pod redis-cluster-6 -n redis-cluster \
  -o jsonpath='{.status.podIP}')
EXISTING_NODE_IP=$(kubectl get pod redis-cluster-0 -n redis-cluster \
  -o jsonpath='{.status.podIP}')

# Add as master
kubectl exec -it redis-cluster-0 -n redis-cluster -- \
  redis-cli --cluster add-node ${NEW_NODE_IP}:6379 ${EXISTING_NODE_IP}:6379

# Rebalance slots
kubectl exec -it redis-cluster-0 -n redis-cluster -- \
  redis-cli --cluster rebalance ${EXISTING_NODE_IP}:6379 --cluster-use-empty-masters
```

---

## Backup and Recovery

Create a CronJob for regular backups:

```yaml
# redis-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: redis-cluster-backup
  namespace: redis-cluster
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: redis:7.2-alpine
              command:
                - /bin/sh
                - -c
                - |
                  # Trigger BGSAVE on all masters
                  for i in 0 1 2; do
                    redis-cli -h redis-cluster-$i.redis-cluster BGSAVE
                  done

                  # Wait for saves to complete
                  sleep 30

                  # Copy RDB files to backup location
                  # Add your backup logic here (S3, GCS, etc.)
          restartPolicy: OnFailure
```

---

## Best Practices

1. **Use pod anti-affinity**: Spread Redis pods across nodes to prevent single points of failure

2. **Size your persistent volumes appropriately**: Account for Redis memory usage plus overhead

3. **Monitor cluster health**: Set up alerts for cluster state changes and failed nodes

4. **Plan for maintenance**: Use PodDisruptionBudgets to ensure quorum during updates

5. **Test failover regularly**: Verify automatic failover works by killing pods

Redis Cluster on Kubernetes provides a scalable, highly available data layer for your applications. With proper configuration and monitoring, it can handle demanding production workloads while providing automatic failover and horizontal scaling capabilities.
