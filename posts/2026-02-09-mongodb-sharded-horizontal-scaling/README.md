# How to Configure MongoDB Sharded Clusters for Horizontal Scaling on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kubernetes, Sharding, Scaling, Database

Description: Learn how to deploy and configure MongoDB sharded clusters on Kubernetes for horizontal scaling, handling massive datasets with distributed architecture and automated chunk management.

---

As your data grows beyond what a single server can handle, horizontal scaling becomes necessary. MongoDB sharding distributes data across multiple servers, allowing you to scale storage and throughput linearly. Running sharded clusters on Kubernetes combines MongoDB's distributed architecture with container orchestration for truly scalable database infrastructure.

In this guide, we'll build a production-ready MongoDB sharded cluster on Kubernetes. We'll cover shard deployment, config servers, mongos routers, and strategies for choosing effective shard keys.

## Understanding MongoDB Sharding Architecture

A MongoDB sharded cluster consists of three components:

- **Shards**: Store subset of data, each shard is a replica set
- **Config Servers**: Store cluster metadata and configuration
- **Mongos Routers**: Query routers that direct operations to appropriate shards

Data is partitioned into chunks based on a shard key. MongoDB automatically balances chunks across shards to distribute load evenly.

## Deploying Config Server Replica Set

Config servers must be deployed as a replica set for high availability:

```yaml
# config-servers.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: mongodb-config
  namespace: mongodb
spec:
  members: 3
  type: ReplicaSet
  version: "6.0.5"

  security:
    authentication:
      modes: ["SCRAM"]

  users:
    - name: admin-user
      db: admin
      passwordSecretRef:
        name: mongodb-admin-password
      roles:
        - name: clusterAdmin
          db: admin
        - name: userAdminAnyDatabase
          db: admin
      scramCredentialsSecretName: mongodb-config-admin-scram

  additionalMongodConfig:
    sharding:
      clusterRole: configsvr
    replication:
      oplogSizeMB: 2048
    storage:
      wiredTiger:
        engineConfig:
          cacheSizeGB: 1

  statefulSet:
    spec:
      template:
        spec:
          affinity:
            podAntiAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                - labelSelector:
                    matchExpressions:
                      - key: app
                        operator: In
                        values:
                          - mongodb-config-svc
                  topologyKey: kubernetes.io/hostname

          containers:
            - name: mongod
              resources:
                requests:
                  cpu: "1000m"
                  memory: "2Gi"
                limits:
                  cpu: "2000m"
                  memory: "4Gi"

      volumeClaimTemplates:
        - metadata:
            name: data-volume
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: fast-ssd
            resources:
              requests:
                storage: 50Gi
```

Deploy config servers:

```bash
kubectl apply -f config-servers.yaml

# Wait for config servers to be ready
kubectl wait --for=condition=ready pod -l app=mongodb-config-svc -n mongodb --timeout=300s
```

## Deploying Shard Replica Sets

Deploy multiple shard replica sets. Each shard is a standalone replica set:

```yaml
# shard-1.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: mongodb-shard-1
  namespace: mongodb
spec:
  members: 3
  type: ReplicaSet
  version: "6.0.5"

  security:
    authentication:
      modes: ["SCRAM"]

  users:
    - name: admin-user
      db: admin
      passwordSecretRef:
        name: mongodb-admin-password
      roles:
        - name: clusterAdmin
          db: admin
        - name: userAdminAnyDatabase
          db: admin
      scramCredentialsSecretName: mongodb-shard-1-admin-scram

  additionalMongodConfig:
    sharding:
      clusterRole: shardsvr
    replication:
      oplogSizeMB: 10240
    storage:
      wiredTiger:
        engineConfig:
          cacheSizeGB: 4

  statefulSet:
    spec:
      template:
        spec:
          affinity:
            podAntiAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                - labelSelector:
                    matchExpressions:
                      - key: app
                        operator: In
                        values:
                          - mongodb-shard-1-svc
                  topologyKey: kubernetes.io/hostname

          containers:
            - name: mongod
              resources:
                requests:
                  cpu: "4000m"
                  memory: "8Gi"
                limits:
                  cpu: "8000m"
                  memory: "16Gi"

      volumeClaimTemplates:
        - metadata:
            name: data-volume
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: fast-ssd
            resources:
              requests:
                storage: 500Gi
---
# shard-2.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: mongodb-shard-2
  namespace: mongodb
spec:
  members: 3
  type: ReplicaSet
  version: "6.0.5"

  security:
    authentication:
      modes: ["SCRAM"]

  users:
    - name: admin-user
      db: admin
      passwordSecretRef:
        name: mongodb-admin-password
      roles:
        - name: clusterAdmin
          db: admin
        - name: userAdminAnyDatabase
          db: admin
      scramCredentialsSecretName: mongodb-shard-2-admin-scram

  additionalMongodConfig:
    sharding:
      clusterRole: shardsvr
    replication:
      oplogSizeMB: 10240
    storage:
      wiredTiger:
        engineConfig:
          cacheSizeGB: 4

  statefulSet:
    spec:
      template:
        spec:
          affinity:
            podAntiAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                - labelSelector:
                    matchExpressions:
                      - key: app
                        operator: In
                        values:
                          - mongodb-shard-2-svc
                  topologyKey: kubernetes.io/hostname

          containers:
            - name: mongod
              resources:
                requests:
                  cpu: "4000m"
                  memory: "8Gi"
                limits:
                  cpu: "8000m"
                  memory: "16Gi"

      volumeClaimTemplates:
        - metadata:
            name: data-volume
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: fast-ssd
            resources:
              requests:
                storage: 500Gi
```

Deploy the shards:

```bash
kubectl apply -f shard-1.yaml
kubectl apply -f shard-2.yaml

# Wait for shards to be ready
kubectl wait --for=condition=ready pod -l app=mongodb-shard-1-svc -n mongodb --timeout=300s
kubectl wait --for=condition=ready pod -l app=mongodb-shard-2-svc -n mongodb --timeout=300s
```

## Deploying Mongos Query Routers

Mongos routers are stateless and can be deployed as a standard Deployment:

```yaml
# mongos-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mongos-config
  namespace: mongodb
data:
  mongos.conf: |
    sharding:
      configDB: mongodb-config/mongodb-config-0.mongodb-config-svc.mongodb.svc.cluster.local:27017,mongodb-config-1.mongodb-config-svc.mongodb.svc.cluster.local:27017,mongodb-config-2.mongodb-config-svc.mongodb.svc.cluster.local:27017
    net:
      port: 27017
      maxIncomingConnections: 50000
    security:
      authorization: enabled
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongos
  namespace: mongodb
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mongos
  template:
    metadata:
      labels:
        app: mongos
    spec:
      containers:
      - name: mongos
        image: mongo:6.0
        command:
          - mongos
          - --config
          - /etc/mongos/mongos.conf
        ports:
        - containerPort: 27017
          name: mongos
        volumeMounts:
        - name: mongos-config
          mountPath: /etc/mongos
        resources:
          requests:
            cpu: "2000m"
            memory: "2Gi"
          limits:
            cpu: "4000m"
            memory: "4Gi"
        livenessProbe:
          exec:
            command:
              - mongo
              - --eval
              - "db.adminCommand('ping')"
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
              - mongo
              - --eval
              - "db.adminCommand('ping')"
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: mongos-config
        configMap:
          name: mongos-config
---
apiVersion: v1
kind: Service
metadata:
  name: mongos
  namespace: mongodb
spec:
  selector:
    app: mongos
  ports:
  - port: 27017
    targetPort: 27017
  type: ClusterIP
```

Deploy mongos routers:

```bash
kubectl apply -f mongos-deployment.yaml

# Verify mongos pods are running
kubectl get pods -l app=mongos -n mongodb
```

## Initializing the Sharded Cluster

Connect to a mongos router and add shards:

```bash
# Connect to mongos
kubectl exec -it $(kubectl get pod -l app=mongos -n mongodb -o jsonpath='{.items[0].metadata.name}') -n mongodb -- mongo -u admin-user -p SecureAdminPassword123! admin

# Add shards to the cluster
sh.addShard("mongodb-shard-1/mongodb-shard-1-0.mongodb-shard-1-svc.mongodb.svc.cluster.local:27017,mongodb-shard-1-1.mongodb-shard-1-svc.mongodb.svc.cluster.local:27017,mongodb-shard-1-2.mongodb-shard-1-svc.mongodb.svc.cluster.local:27017")

sh.addShard("mongodb-shard-2/mongodb-shard-2-0.mongodb-shard-2-svc.mongodb.svc.cluster.local:27017,mongodb-shard-2-1.mongodb-shard-2-svc.mongodb.svc.cluster.local:27017,mongodb-shard-2-2.mongodb-shard-2-svc.mongodb.svc.cluster.local:27017")

# Verify shards
sh.status()
```

## Enabling Sharding and Choosing Shard Keys

Enable sharding on a database and collection:

```javascript
// Connect to mongos
use admin
db.auth("admin-user", "SecureAdminPassword123!")

// Enable sharding on database
sh.enableSharding("myapp")

// Create index on shard key
use myapp
db.users.createIndex({ "user_id": 1 })

// Shard the collection
sh.shardCollection("myapp.users", { "user_id": 1 })

// For compound shard keys
db.events.createIndex({ "tenant_id": 1, "timestamp": 1 })
sh.shardCollection("myapp.events", { "tenant_id": 1, "timestamp": 1 })

// For hashed sharding (better distribution)
db.logs.createIndex({ "log_id": "hashed" })
sh.shardCollection("myapp.logs", { "log_id": "hashed" })
```

## Managing Chunk Distribution

Monitor and manage chunk distribution:

```javascript
// Check chunk distribution
use config
db.chunks.aggregate([
  { $group: { _id: "$shard", count: { $sum: 1 } } }
])

// View balancer status
sh.getBalancerState()

// Stop balancer (for maintenance)
sh.stopBalancer()

// Start balancer
sh.startBalancer()

// Set balancing window
use config
db.settings.update(
  { _id: "balancer" },
  {
    $set: {
      activeWindow: {
        start: "23:00",
        stop: "06:00"
      }
    }
  },
  { upsert: true }
)

// Move chunks manually if needed
sh.moveChunk(
  "myapp.users",
  { user_id: 1000 },
  "mongodb-shard-2"
)
```

## Creating a Connection Helper Script

Create a script to generate connection strings:

```bash
#!/bin/bash
# get-connection-string.sh

NAMESPACE="mongodb"
USERNAME="app-user"
PASSWORD="SecureAppPassword123!"
DATABASE="myapp"

# Get mongos pod IPs
MONGOS_PODS=$(kubectl get pods -l app=mongos -n $NAMESPACE -o jsonpath='{.items[*].status.podIP}')

# Build connection string
HOSTS=""
for IP in $MONGOS_PODS; do
  if [ -z "$HOSTS" ]; then
    HOSTS="$IP:27017"
  else
    HOSTS="$HOSTS,$IP:27017"
  fi
done

CONNECTION_STRING="mongodb://${USERNAME}:${PASSWORD}@${HOSTS}/${DATABASE}?authSource=admin"

echo "Connection String:"
echo "$CONNECTION_STRING"

# For service-based connection
SERVICE_CONNECTION="mongodb://${USERNAME}:${PASSWORD}@mongos.${NAMESPACE}.svc.cluster.local:27017/${DATABASE}?authSource=admin"
echo ""
echo "Service Connection String (recommended):"
echo "$SERVICE_CONNECTION"
```

## Adding Additional Shards

Scale horizontally by adding more shards:

```bash
# Deploy shard-3
kubectl apply -f shard-3.yaml

# Wait for it to be ready
kubectl wait --for=condition=ready pod -l app=mongodb-shard-3-svc -n mongodb --timeout=300s

# Add to cluster via mongos
kubectl exec -it $(kubectl get pod -l app=mongos -n mongodb -o jsonpath='{.items[0].metadata.name}') -n mongodb -- mongo -u admin-user -p SecureAdminPassword123! admin --eval '
sh.addShard("mongodb-shard-3/mongodb-shard-3-0.mongodb-shard-3-svc.mongodb.svc.cluster.local:27017,mongodb-shard-3-1.mongodb-shard-3-svc.mongodb.svc.cluster.local:27017,mongodb-shard-3-2.mongodb-shard-3-svc.mongodb.svc.cluster.local:27017")
'

# Verify the new shard
kubectl exec -it $(kubectl get pod -l app=mongos -n mongodb -o jsonpath='{.items[0].metadata.name}') -n mongodb -- mongo -u admin-user -p SecureAdminPassword123! admin --eval 'sh.status()'
```

## Monitoring Sharded Cluster Performance

Create monitoring queries:

```javascript
// Check shard data distribution
use myapp
db.users.getShardDistribution()

// View query routing
db.setProfilingLevel(2)
db.system.profile.find({ ns: "myapp.users" }).sort({ ts: -1 }).limit(10)

// Check for jumbo chunks
use config
db.chunks.find({ jumbo: true })

// Monitor active operations
db.currentOp()

// Check connection pool stats
db.serverStatus().connections
```

## Conclusion

MongoDB sharded clusters on Kubernetes provide the foundation for scaling databases to petabyte-scale workloads. The combination of Kubernetes orchestration with MongoDB's distributed architecture enables automatic failover, elastic scaling, and operational simplicity.

Key considerations for production:

- Choose shard keys carefully based on query patterns
- Monitor chunk distribution and balancing
- Use compound shard keys for better query targeting
- Plan capacity for config servers and mongos routers
- Test failover scenarios for all components

With proper planning and monitoring, sharded MongoDB clusters on Kubernetes can handle massive datasets while maintaining high performance and availability.
