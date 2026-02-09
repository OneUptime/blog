# How to Configure Redis Sentinel for High Availability Failover on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kubernetes, Sentinel, High-Availability, Failover

Description: Learn how to deploy Redis with Sentinel for automatic failover and high availability on Kubernetes with monitoring, quorum configuration, and client integration strategies.

---

Redis Sentinel provides high availability for Redis deployments through automatic monitoring, notification, and failover capabilities. When running Redis on Kubernetes, properly configured Sentinel ensures your applications maintain connectivity even when the Redis master fails.

In this guide, we'll deploy Redis with Sentinel on Kubernetes for production-grade high availability. We'll cover Sentinel architecture, quorum configuration, client setup, and failover testing procedures.

## Understanding Redis Sentinel Architecture

Redis Sentinel is a distributed system that monitors Redis master and replica instances. When a master fails, Sentinel automatically promotes a replica to master and reconfigures other replicas to follow the new master.

Key components:

- **Sentinels**: Independent processes that monitor Redis instances
- **Quorum**: Number of Sentinels needed to agree on master failure
- **Automatic Failover**: Promotion of replica to master when failure detected
- **Configuration Provider**: Clients discover current master from Sentinel

A typical deployment uses at least 3 Sentinel instances to achieve quorum and avoid split-brain scenarios.

## Deploying Redis with Replicas

First, deploy a Redis master with replicas using StatefulSets:

```yaml
# redis-master-replica.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: redis
data:
  master.conf: |
    bind 0.0.0.0
    protected-mode no
    port 6379
    tcp-backlog 511
    timeout 0
    tcp-keepalive 300
    daemonize no
    supervised no
    loglevel notice
    databases 16
    save 900 1
    save 300 10
    save 60 10000
    stop-writes-on-bgsave-error yes
    rdbcompression yes
    rdbchecksum yes
    dir /data
    maxmemory 2gb
    maxmemory-policy allkeys-lru
    appendonly yes
    appendfsync everysec
    no-appendfsync-on-rewrite no
    auto-aof-rewrite-percentage 100
    auto-aof-rewrite-min-size 64mb

  replica.conf: |
    bind 0.0.0.0
    protected-mode no
    port 6379
    replicaof redis-master-0.redis-master.redis.svc.cluster.local 6379
    masterauth ${REDIS_PASSWORD}
    replica-serve-stale-data yes
    replica-read-only yes
    repl-diskless-sync no
    repl-diskless-sync-delay 5
    repl-disable-tcp-nodelay no
    replica-priority 100
    maxmemory 2gb
    maxmemory-policy allkeys-lru
    appendonly yes
    appendfsync everysec
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-master
  namespace: redis
spec:
  serviceName: redis-master
  replicas: 1
  selector:
    matchLabels:
      app: redis
      role: master
  template:
    metadata:
      labels:
        app: redis
        role: master
    spec:
      containers:
      - name: redis
        image: redis:7.0-alpine
        ports:
        - containerPort: 6379
          name: redis
        command:
          - redis-server
          - /etc/redis/redis.conf
          - --requirepass
          - $(REDIS_PASSWORD)
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-password
              key: password
        volumeMounts:
        - name: data
          mountPath: /data
        - name: config
          mountPath: /etc/redis
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        livenessProbe:
          tcpSocket:
            port: 6379
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - -a
            - $(REDIS_PASSWORD)
            - ping
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: redis-config
          items:
          - key: master.conf
            path: redis.conf
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 50Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-replica
  namespace: redis
spec:
  serviceName: redis-replica
  replicas: 2
  selector:
    matchLabels:
      app: redis
      role: replica
  template:
    metadata:
      labels:
        app: redis
        role: replica
    spec:
      containers:
      - name: redis
        image: redis:7.0-alpine
        ports:
        - containerPort: 6379
          name: redis
        command:
          - redis-server
          - /etc/redis/redis.conf
          - --requirepass
          - $(REDIS_PASSWORD)
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-password
              key: password
        volumeMounts:
        - name: data
          mountPath: /data
        - name: config
          mountPath: /etc/redis
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        livenessProbe:
          tcpSocket:
            port: 6379
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - -a
            - $(REDIS_PASSWORD)
            - ping
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: redis-config
          items:
          - key: replica.conf
            path: redis.conf
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: redis-master
  namespace: redis
spec:
  selector:
    app: redis
    role: master
  ports:
  - port: 6379
    targetPort: 6379
  clusterIP: None
---
apiVersion: v1
kind: Service
metadata:
  name: redis-replica
  namespace: redis
spec:
  selector:
    app: redis
    role: replica
  ports:
  - port: 6379
    targetPort: 6379
  clusterIP: None
```

Create the password secret and deploy:

```bash
# Create password
REDIS_PASSWORD=$(openssl rand -base64 32)
kubectl create secret generic redis-password \
  --from-literal=password="$REDIS_PASSWORD" \
  -n redis

# Deploy Redis
kubectl apply -f redis-master-replica.yaml
```

## Deploying Redis Sentinel

Deploy Sentinel instances to monitor Redis:

```yaml
# sentinel-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sentinel-config
  namespace: redis
data:
  sentinel.conf: |
    port 26379
    dir /data
    sentinel monitor mymaster redis-master-0.redis-master.redis.svc.cluster.local 6379 2
    sentinel auth-pass mymaster ${REDIS_PASSWORD}
    sentinel down-after-milliseconds mymaster 5000
    sentinel parallel-syncs mymaster 1
    sentinel failover-timeout mymaster 10000
    sentinel deny-scripts-reconfig yes

  init.sh: |
    #!/bin/sh
    set -e

    # Replace password in config
    sed "s/\${REDIS_PASSWORD}/$REDIS_PASSWORD/g" /etc/sentinel/sentinel.conf > /tmp/sentinel.conf

    # Start sentinel
    exec redis-sentinel /tmp/sentinel.conf
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-sentinel
  namespace: redis
spec:
  replicas: 3
  selector:
    matchLabels:
      app: redis-sentinel
  template:
    metadata:
      labels:
        app: redis-sentinel
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - redis-sentinel
            topologyKey: kubernetes.io/hostname
      containers:
      - name: sentinel
        image: redis:7.0-alpine
        ports:
        - containerPort: 26379
          name: sentinel
        command:
          - sh
          - /etc/sentinel/init.sh
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-password
              key: password
        volumeMounts:
        - name: data
          mountPath: /data
        - name: config
          mountPath: /etc/sentinel
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        livenessProbe:
          tcpSocket:
            port: 26379
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - -p
            - "26379"
            - sentinel
            - ckquorum
            - mymaster
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: data
        emptyDir: {}
      - name: config
        configMap:
          name: sentinel-config
          defaultMode: 0755
---
apiVersion: v1
kind: Service
metadata:
  name: redis-sentinel
  namespace: redis
spec:
  selector:
    app: redis-sentinel
  ports:
  - port: 26379
    targetPort: 26379
    name: sentinel
  type: ClusterIP
```

Deploy Sentinel:

```bash
kubectl apply -f sentinel-deployment.yaml

# Verify Sentinel is monitoring
kubectl exec -it $(kubectl get pod -l app=redis-sentinel -n redis -o jsonpath='{.items[0].metadata.name}') -n redis -- redis-cli -p 26379 sentinel master mymaster
```

## Configuring Production Sentinel Setup

For production, enhance the Sentinel configuration:

```yaml
# sentinel-production.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sentinel-config-prod
  namespace: redis
data:
  sentinel.conf: |
    port 26379
    dir /data

    # Monitor master
    sentinel monitor mymaster redis-master-0.redis-master.redis.svc.cluster.local 6379 2
    sentinel auth-pass mymaster ${REDIS_PASSWORD}

    # Timing configuration
    sentinel down-after-milliseconds mymaster 5000
    sentinel parallel-syncs mymaster 1
    sentinel failover-timeout mymaster 30000

    # Advanced settings
    sentinel deny-scripts-reconfig yes
    sentinel resolve-hostnames yes
    sentinel announce-hostnames yes

    # Connection limits
    maxclients 10000

    # Logging
    loglevel notice
    logfile ""

    # Notification scripts (optional)
    # sentinel notification-script mymaster /etc/sentinel/notify.sh
    # sentinel client-reconfig-script mymaster /etc/sentinel/reconfig.sh

  notify.sh: |
    #!/bin/sh
    # Notification script for Sentinel events
    EVENT_TYPE=$1
    EVENT_DESCRIPTION=$2

    echo "Sentinel Event: $EVENT_TYPE - $EVENT_DESCRIPTION"

    # Send alert (integrate with your alerting system)
    # curl -X POST https://your-webhook-url \
    #   -H 'Content-Type: application/json' \
    #   -d "{\"event\": \"$EVENT_TYPE\", \"description\": \"$EVENT_DESCRIPTION\"}"

  reconfig.sh: |
    #!/bin/sh
    # Called when master changes
    MASTER_NAME=$1
    ROLE=$2
    STATE=$3
    FROM_IP=$4
    FROM_PORT=$5
    TO_IP=$6
    TO_PORT=$7

    echo "Master reconfiguration: $MASTER_NAME $FROM_IP:$FROM_PORT -> $TO_IP:$TO_PORT"
```

## Connecting Applications with Sentinel

Applications should connect through Sentinel to automatically discover the current master:

### Node.js Example

```javascript
// sentinel-client.js
const Redis = require('ioredis');

// Configure Sentinel connection
const redis = new Redis({
  sentinels: [
    { host: 'redis-sentinel.redis.svc.cluster.local', port: 26379 },
    { host: 'redis-sentinel.redis.svc.cluster.local', port: 26379 },
    { host: 'redis-sentinel.redis.svc.cluster.local', port: 26379 }
  ],
  name: 'mymaster',
  password: process.env.REDIS_PASSWORD,
  sentinelPassword: process.env.REDIS_PASSWORD,

  // Retry strategy
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },

  // Sentinel retry strategy
  sentinelRetryStrategy: (times) => {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },

  // Connection settings
  enableOfflineQueue: true,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,

  // Sentinel options
  sentinelMaxConnections: 10,
  updateSentinels: true,
  failoverDetector: true
});

// Event handlers
redis.on('connect', () => {
  console.log('Connected to Redis via Sentinel');
});

redis.on('ready', () => {
  console.log('Redis client ready');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

redis.on('+switch-master', (data) => {
  console.log('Master switched:', data);
});

// Example usage
async function testConnection() {
  try {
    await redis.set('test-key', 'test-value');
    const value = await redis.get('test-key');
    console.log('Test value:', value);
  } catch (err) {
    console.error('Operation failed:', err);
  }
}

module.exports = redis;
```

### Python Example

```python
# sentinel_client.py
from redis.sentinel import Sentinel
import os

# Configure Sentinel
sentinel = Sentinel([
    ('redis-sentinel.redis.svc.cluster.local', 26379),
    ('redis-sentinel.redis.svc.cluster.local', 26379),
    ('redis-sentinel.redis.svc.cluster.local', 26379)
], socket_timeout=5, password=os.environ['REDIS_PASSWORD'])

# Get master and replica connections
master = sentinel.master_for(
    'mymaster',
    socket_timeout=5,
    password=os.environ['REDIS_PASSWORD'],
    db=0,
    decode_responses=True
)

slave = sentinel.slave_for(
    'mymaster',
    socket_timeout=5,
    password=os.environ['REDIS_PASSWORD'],
    db=0,
    decode_responses=True
)

# Write to master
def write_data(key, value):
    master.set(key, value)
    print(f'Written {key}={value} to master')

# Read from replica
def read_data(key):
    value = slave.get(key)
    print(f'Read {key}={value} from replica')
    return value

# Example usage
if __name__ == '__main__':
    write_data('test-key', 'test-value')
    read_data('test-key')

    # Discover current master
    master_address = sentinel.discover_master('mymaster')
    print(f'Current master: {master_address}')
```

## Testing Automatic Failover

Simulate master failure to test failover:

```bash
# Check current master
kubectl exec -it $(kubectl get pod -l app=redis-sentinel -n redis -o jsonpath='{.items[0].metadata.name}') -n redis -- redis-cli -p 26379 sentinel get-master-addr-by-name mymaster

# Delete master pod
kubectl delete pod redis-master-0 -n redis

# Watch Sentinel detect failure and trigger failover
kubectl logs -f $(kubectl get pod -l app=redis-sentinel -n redis -o jsonpath='{.items[0].metadata.name}') -n redis

# Verify new master (should be one of the replicas)
kubectl exec -it $(kubectl get pod -l app=redis-sentinel -n redis -o jsonpath='{.items[0].metadata.name}') -n redis -- redis-cli -p 26379 sentinel get-master-addr-by-name mymaster

# Check replication info on new master
NEW_MASTER=$(kubectl exec -it $(kubectl get pod -l app=redis-sentinel -n redis -o jsonpath='{.items[0].metadata.name}') -n redis -- redis-cli -p 26379 sentinel get-master-addr-by-name mymaster | head -1)

kubectl exec -it redis-replica-0 -n redis -- redis-cli -a $REDIS_PASSWORD info replication
```

## Monitoring Sentinel Health

Create monitoring script:

```bash
#!/bin/bash
# monitor-sentinel.sh

NAMESPACE="redis"
MASTER_NAME="mymaster"

# Get Sentinel pods
SENTINEL_PODS=$(kubectl get pods -n $NAMESPACE -l app=redis-sentinel -o name)

echo "=== Sentinel Health Check ==="
for POD in $SENTINEL_PODS; do
    POD_NAME=$(basename $POD)
    echo ""
    echo "Checking $POD_NAME:"

    # Check Sentinel status
    kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli -p 26379 sentinel master $MASTER_NAME 2>/dev/null || echo "Failed to get master info"

    # Check known Sentinels
    SENTINELS=$(kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli -p 26379 sentinel sentinels $MASTER_NAME 2>/dev/null | grep -c "name")
    echo "Known Sentinels: $SENTINELS"

    # Check known replicas
    REPLICAS=$(kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli -p 26379 sentinel replicas $MASTER_NAME 2>/dev/null | grep -c "name")
    echo "Known Replicas: $REPLICAS"
done

# Check current master
echo ""
echo "=== Current Master ==="
kubectl exec -it $(kubectl get pod -l app=redis-sentinel -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}') -n $NAMESPACE -- redis-cli -p 26379 sentinel get-master-addr-by-name $MASTER_NAME
```

Deploy as CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: sentinel-monitor
  namespace: redis
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: redis-monitor
          containers:
          - name: monitor
            image: redis:7.0-alpine
            command: ["/bin/sh", "-c"]
            args:
              - |
                # Monitoring commands here
                redis-cli -h redis-sentinel -p 26379 sentinel masters
          restartPolicy: OnFailure
```

## Conclusion

Redis Sentinel provides robust automatic failover capabilities for Redis deployments on Kubernetes. By properly configuring quorum, monitoring intervals, and client connections, you can achieve high availability with minimal downtime during master failures.

Key best practices:

- Deploy odd number of Sentinels (3 or 5) for proper quorum
- Use Sentinel-aware clients for automatic master discovery
- Test failover procedures regularly
- Monitor Sentinel health and connectivity
- Configure appropriate timeouts for your workload
- Keep Sentinels on separate nodes for fault isolation

With Sentinel managing your Redis deployment, applications can maintain connectivity and performance even when infrastructure failures occur, providing the reliability required for production workloads.
