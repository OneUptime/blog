# How to Configure MongoDB Sharded Clusters for Horizontal Scaling on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kubernetes, Sharding, Scaling, Database

Description: Learn how to deploy and configure MongoDB sharded clusters on Kubernetes for horizontal scaling, handling massive datasets with distributed architecture and automated chunk management.

---

As your data grows beyond what a single server can handle, horizontal scaling becomes necessary. MongoDB sharding distributes data across multiple servers, allowing you to scale storage and throughput horizontally. Running sharded clusters on Kubernetes combines MongoDB's distributed architecture with container orchestration for scalable database infrastructure.

In this guide, we'll build an operator-managed MongoDB sharded cluster on Kubernetes. We'll cover shard deployment, config servers, mongos routers, and strategies for choosing effective shard keys.

## Understanding MongoDB Sharding Architecture

A MongoDB sharded cluster consists of three components:

- **Shards**: Store subsets of data, each shard is typically a replica set
- **Config Servers**: Store cluster metadata and configuration
- **Mongos Routers**: Query routers that direct operations to appropriate shards

Data is partitioned into chunks based on a shard key. MongoDB automatically balances chunks across shards to distribute load evenly.

## Deploying Config Server Replica Set

Config servers must be deployed as a replica set for high availability. With MongoDB Controllers for Kubernetes, config servers are part of a single `MongoDB` resource with `type: ShardedCluster`. The operator requires an Ops Manager or Cloud Manager connection configuration and credentials.

```yaml
# sharded-cluster.yaml
apiVersion: mongodb.com/v1
kind: MongoDB
metadata:
  name: mongodb-sharded
  namespace: mongodb
spec:
  type: ShardedCluster
  version: "6.0.5"
  persistent: true

  shardCount: 2
  mongodsPerShardCount: 3
  configServerCount: 3
  mongosCount: 3

  opsManager:
    configMapRef:
      name: mongodb-ops-manager
  credentials: mongodb-ops-manager-credentials
```

Deploy the sharded cluster:

```bash
kubectl apply -f sharded-cluster.yaml

# Watch the MongoDB resource while the operator creates config servers, shards, and mongos routers
kubectl get mongodb mongodb-sharded -n mongodb -w
```

## Deploying Shard Replica Sets

Deploy multiple shard replica sets by setting `shardCount` and `mongodsPerShardCount`. Each shard is deployed as a replica set:

```yaml
# shard settings inside sharded-cluster.yaml
spec:
  type: ShardedCluster
  shardCount: 2
  mongodsPerShardCount: 3
```

Apply the updated cluster resource:

```bash
kubectl apply -f sharded-cluster.yaml

# Verify the operator-created workloads
kubectl get pods -n mongodb
kubectl get statefulsets -n mongodb
```

## Deploying Mongos Query Routers

Mongos routers are stateless. With the Kubernetes operator, configure the number of routers with `mongosCount`:

```yaml
# mongos settings inside sharded-cluster.yaml
spec:
  type: ShardedCluster
  mongosCount: 3
```

Deploy mongos routers:

```bash
kubectl apply -f sharded-cluster.yaml

# Verify mongos pods are running
kubectl get pods -n mongodb | grep mongos
```

## Initializing the Sharded Cluster

The operator initializes the sharded cluster and registers shards. Connect to a mongos router with a database user created in Ops Manager or Cloud Manager to verify the cluster:

```bash
# Connect to a mongos pod
MONGODB_USERNAME="admin-user"
MONGODB_PASSWORD="SecureAdminPassword123!"
kubectl exec -it $(kubectl get pod -n mongodb -o name | grep mongos | head -n 1) -n mongodb -- \
  mongosh -u "$MONGODB_USERNAME" -p "$MONGODB_PASSWORD" --authenticationDatabase admin
```

```javascript
// Verify shards
sh.status()
db.adminCommand({ listShards: 1 })
```

## Enabling Sharding and Choosing Shard Keys

Shard collections from a `mongosh` session connected to a mongos router. Starting in MongoDB 6.0, `sh.enableSharding()` is not required before sharding a collection, though it can still be used to explicitly create the database.

```javascript
// Connect to mongos
use admin
db.auth("admin-user", passwordPrompt())

// Optional in MongoDB 6.0 and later
sh.enableSharding("myapp")

// Create index on shard key for a non-empty collection
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

Monitor and manage chunk distribution from a mongos router:

```javascript
// Check sharded cluster status and balancer state
sh.status()
sh.getBalancerState()
sh.isBalancerRunning()

// Stop balancer (for maintenance)
sh.stopBalancer()

// Start balancer
sh.startBalancer()

// Set balancing window
use config
db.settings.updateOne(
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
  "<target-shard-name-from-sh.status()>"
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
MONGOS_POD_NAMES=$(kubectl get pods -n "$NAMESPACE" --no-headers | awk '/mongos/ {print $1}')
MONGOS_PODS=""
for POD in $MONGOS_POD_NAMES; do
  IP=$(kubectl get pod "$POD" -n "$NAMESPACE" -o jsonpath='{.status.podIP}')
  MONGOS_PODS="$MONGOS_PODS $IP"
done

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

# For service-based connection, use the mongos Service name created by your operator configuration
MONGOS_SERVICE=$(kubectl get svc -n "$NAMESPACE" --no-headers | awk '/mongos/ {print $1; exit}')
SERVICE_CONNECTION="mongodb://${USERNAME}:${PASSWORD}@${MONGOS_SERVICE}.${NAMESPACE}.svc.cluster.local:27017/${DATABASE}?authSource=admin"
echo ""
echo "Service Connection String (recommended):"
echo "$SERVICE_CONNECTION"
```

## Adding Additional Shards

Scale horizontally by increasing `shardCount` in the sharded cluster resource:

```yaml
# sharded-cluster.yaml
apiVersion: mongodb.com/v1
kind: MongoDB
metadata:
  name: mongodb-sharded
  namespace: mongodb
spec:
  type: ShardedCluster
  version: "6.0.5"
  persistent: true

  shardCount: 3
  mongodsPerShardCount: 3
  configServerCount: 3
  mongosCount: 3

  opsManager:
    configMapRef:
      name: mongodb-ops-manager
  credentials: mongodb-ops-manager-credentials
```

Apply the updated resource and verify the new shard:

```bash
kubectl apply -f sharded-cluster.yaml
kubectl get mongodb mongodb-sharded -n mongodb -w

# Verify through mongos
MONGODB_USERNAME="admin-user"
MONGODB_PASSWORD="SecureAdminPassword123!"
kubectl exec -it $(kubectl get pod -n mongodb -o name | grep mongos | head -n 1) -n mongodb -- \
  mongosh -u "$MONGODB_USERNAME" -p "$MONGODB_PASSWORD" --authenticationDatabase admin --eval 'sh.status()'
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

// Check connection stats
db.serverStatus().connections
```

## Conclusion

MongoDB sharded clusters on Kubernetes provide the foundation for scaling databases to very large workloads. The combination of Kubernetes orchestration with MongoDB's distributed architecture enables automatic failover, elastic scaling, and operational simplicity.

Key considerations for production:

- Choose shard keys carefully based on query patterns
- Monitor chunk distribution and balancing
- Use compound shard keys for better query targeting
- Plan capacity for config servers and mongos routers
- Test failover scenarios for all components

With proper planning and monitoring, sharded MongoDB clusters on Kubernetes can handle massive datasets while maintaining high performance and availability.
