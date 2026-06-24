# How to Set Up MongoDB Sharded Clusters on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, MongoDB, Database Sharding

Description: Deploy and manage MongoDB sharded clusters on Kubernetes using the Community Operator for horizontal scaling of large datasets across multiple shard servers.

---

MongoDB sharding distributes data across multiple servers to handle datasets that exceed single-server capacity. When deployed on Kubernetes, sharded clusters gain orchestration benefits while maintaining MongoDB's horizontal scaling capabilities. MongoDB Controllers for Kubernetes simplifies deploying and managing complex sharded topologies when integrated with MongoDB Ops Manager or Cloud Manager. This guide walks you through creating a production-ready sharded cluster.

## Understanding MongoDB Sharding Architecture

A sharded cluster consists of three components working together. Shard servers store the actual data, with each shard being a replica set for high availability. Config servers maintain metadata about data distribution and cluster configuration. Mongos routers direct client queries to the appropriate shards based on the shard key.

Each component has different scaling characteristics and resource requirements. Shards need storage capacity proportional to your data volume. Config servers need minimal resources but require high availability since they're critical for cluster operation. Mongos routers are stateless and scale horizontally based on client connection load.

## Installing the MongoDB Kubernetes Operator

Deploy the operator and custom resource definitions. Sharded clusters are not supported by the legacy MongoDB Community Kubernetes Operator's `MongoDBCommunity` resource; use MongoDB Controllers for Kubernetes with an Ops Manager or Cloud Manager project.

```bash
# Install the operator with Helm
helm repo add mongodb https://mongodb.github.io/helm-charts
helm repo update
helm upgrade --install mongodb-kubernetes-operator mongodb/mongodb-kubernetes \
  --namespace mongodb \
  --create-namespace

# Verify installation
kubectl get pods -n mongodb
kubectl get crd mongodb.mongodb.com
```

The operator watches for `MongoDB` resources and manages the underlying StatefulSets, Services, and configuration through Ops Manager or Cloud Manager.

## Deploying Config Server Replica Set

Config servers are required for sharding, but you should not deploy them as a separate `MongoDBCommunity` replica set. Define the full sharded cluster as one `MongoDB` resource and set `configServerCount` to the desired number of config server members:

```yaml
# mongodb-sharded-cluster.yaml
apiVersion: mongodb.com/v1
kind: MongoDB
metadata:
  name: mongo-sharded
  namespace: mongodb
spec:
  type: ShardedCluster
  version: "8.0.0"
  opsManager:
    configMapRef:
      name: mongodb-project
  credentials: mongodb-ops-manager-credentials
  persistent: true
  shardCount: 2
  mongodsPerShardCount: 3
  mongosCount: 3
  configServerCount: 3
```

Create the Ops Manager or Cloud Manager project ConfigMap and API credentials Secret first. The values depend on your Ops Manager or Cloud Manager project:

```bash
kubectl create namespace mongodb

kubectl create configmap mongodb-project -n mongodb \
  --from-literal="baseUrl=https://cloud.mongodb.com" \
  --from-literal="orgId=<org-id>" \
  --from-literal="projectName=<project-name>"

kubectl create secret generic mongodb-ops-manager-credentials -n mongodb \
  --from-literal="publicKey=<public-api-key>" \
  --from-literal="privateKey=<private-api-key>"

kubectl apply -f mongodb-sharded-cluster.yaml
```

## Deploying Shard Replica Sets

Create multiple shard replica sets for data distribution by changing `shardCount` and `mongodsPerShardCount` on the `MongoDB` resource:

```yaml
# mongodb-sharded-cluster.yaml
apiVersion: mongodb.com/v1
kind: MongoDB
metadata:
  name: mongo-sharded
  namespace: mongodb
spec:
  type: ShardedCluster
  version: "8.0.0"
  opsManager:
    configMapRef:
      name: mongodb-project
  credentials: mongodb-ops-manager-credentials
  persistent: true
  shardCount: 2
  mongodsPerShardCount: 3
  mongosCount: 3
  configServerCount: 3
```

Deploy the cluster:

```bash
kubectl apply -f mongodb-sharded-cluster.yaml

# Wait for the sharded cluster to be ready
kubectl get mongodb mongo-sharded -n mongodb -w
```

The operator creates the config server replica set, shard replica sets, mongos instances, StatefulSets, Services, and automation configuration for the deployment.

## Deploying Mongos Routers

Mongos routers are part of the sharded cluster resource. Set `mongosCount` to scale the number of routers:

```yaml
apiVersion: mongodb.com/v1
kind: MongoDB
metadata:
  name: mongo-sharded
  namespace: mongodb
spec:
  type: ShardedCluster
  version: "8.0.0"
  opsManager:
    configMapRef:
      name: mongodb-project
  credentials: mongodb-ops-manager-credentials
  persistent: true
  shardCount: 2
  mongodsPerShardCount: 3
  mongosCount: 3
  configServerCount: 3
```

Apply the updated resource:

```bash
kubectl apply -f mongodb-sharded-cluster.yaml
kubectl get statefulsets,services -n mongodb
```

## Initializing the Sharded Cluster

The operator initializes the config servers, shards, and mongos routers. Do not run `sh.addShard()` for shards that the operator manages; wait for the `MongoDB` resource to become ready, then connect to a mongos router:

```bash
# Wait for the sharded cluster to be ready
kubectl get mongodb mongo-sharded -n mongodb -w

# Connect from a temporary client pod, using a database user created for the deployment
kubectl run -it --rm mongo-client --image=mongo:8.0 --restart=Never -n mongodb -- \
  mongosh "mongodb://<username>:<password>@<mongos-service>.mongodb.svc.cluster.local:27017/admin"
```

Inside the MongoDB shell, verify the sharded cluster:

```javascript
// Verify shards
sh.status()
```

## Enabling Sharding for Databases and Collections

Choose appropriate shard keys before sharding collections. Starting in MongoDB 6.0, you do not need to run `sh.enableSharding()` before `sh.shardCollection()`:

```javascript
// Shard a collection by user_id with hashed sharding
sh.shardCollection("myapp.users", { user_id: "hashed" })

// Shard by compound key for range-based sharding
sh.shardCollection("myapp.events", { tenant_id: 1, timestamp: 1 })

// Check distribution
use myapp
db.users.getShardDistribution()
```

Choose shard keys carefully based on your query patterns. Hashed sharding provides even distribution but range queries span multiple shards. Range-based sharding allows efficient range queries but requires careful key selection to avoid hotspots. If the collection already contains data, create an index that supports the shard key before running `sh.shardCollection()`.

## Monitoring Shard Distribution

Check how data distributes across shards:

```javascript
// Get chunk distribution
use config
db.chunks.aggregate([
  { $group: { _id: "$shard", count: { $sum: 1 } } }
])

// Check whether the balancer is enabled
sh.getBalancerState()

// View recent migrations
db.changelog.find().sort({ time: -1 }).limit(10).pretty()
```

Enable the balancer if it's stopped:

```javascript
sh.startBalancer()
```

## Implementing Application Connection Logic

Connect to mongos routers from your application. Use the mongos Service that the operator creates for the deployment, and do not include a `replicaSet` option when connecting to mongos:

```python
# app.py
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# Connection string for the mongos Service
connection_string = "mongodb://app-user:SecurePassword123%21@<mongos-service>.mongodb.svc.cluster.local:27017/myapp?authSource=admin"

try:
    # Create client with connection pooling
    client = MongoClient(
        connection_string,
        maxPoolSize=50,
        minPoolSize=10,
        serverSelectionTimeoutMS=5000
    )

    # Get database
    db = client.myapp

    # Insert document (will be routed to correct shard)
    user = {
        "user_id": "user123",
        "name": "John Doe",
        "email": "john@example.com"
    }
    result = db.users.insert_one(user)
    print(f"Inserted user with ID: {result.inserted_id}")

    # Query document (routed based on shard key)
    found_user = db.users.find_one({"user_id": "user123"})
    print(f"Found user: {found_user}")

except ConnectionFailure as e:
    print(f"Could not connect to MongoDB: {e}")
```

## Adding Additional Shards

Scale horizontally by increasing `shardCount` on the `MongoDB` resource:

```yaml
apiVersion: mongodb.com/v1
kind: MongoDB
metadata:
  name: mongo-sharded
  namespace: mongodb
spec:
  type: ShardedCluster
  version: "8.0.0"
  opsManager:
    configMapRef:
      name: mongodb-project
  credentials: mongodb-ops-manager-credentials
  persistent: true
  shardCount: 3
  mongodsPerShardCount: 3
  mongosCount: 3
  configServerCount: 3
```

Deploy the updated resource:

```bash
kubectl apply -f mongodb-sharded-cluster.yaml
kubectl get mongodb mongo-sharded -n mongodb -w
```

The operator updates the deployment, and the balancer migrates chunks to the new shard to achieve even distribution.

## Backup Strategy for Sharded Clusters

For production, use MongoDB Atlas, Cloud Manager, Ops Manager, or another backup system designed for sharded clusters. If you use `mongodump` for a self-managed sharded cluster on MongoDB 7.0.2 or later, connect to mongos and follow MongoDB's documented procedure: stop the balancer, stop writes and schema changes, lock the cluster, run the dump, then unlock the cluster.

```bash
# Connect to mongos and stop the balancer before the backup window
mongosh "mongodb://<username>:<password>@<mongos-service>.mongodb.svc.cluster.local:27017/admin" \
  --eval 'sh.stopBalancer()'

# Run mongodump through mongos during the locked backup window
mongodump \
  --uri="mongodb://<username>:<password>@<mongos-service>.mongodb.svc.cluster.local:27017/admin" \
  --out /tmp/mongodb-sharded-backup
```

For production, use MongoDB Ops Manager or Percona Backup for MongoDB for automated, consistent backups.

## Monitoring and Alerts

Deploy monitoring for your sharded cluster through Ops Manager, Cloud Manager, or your Prometheus stack. If you use Percona's MongoDB exporter, point it at mongos with a valid database user:

```yaml
# mongodb-exporter.yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb-exporter
  namespace: mongodb
spec:
  selector:
    app: mongodb-exporter
  ports:
  - port: 9216
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb-exporter
  namespace: mongodb
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb-exporter
  template:
    metadata:
      labels:
        app: mongodb-exporter
    spec:
      containers:
      - name: exporter
        image: percona/mongodb_exporter:0.51.0
        args:
          - --mongodb.uri=mongodb://app-user:SecurePassword123%21@<mongos-service>.mongodb.svc.cluster.local:27017/admin
          - --collect-all
        ports:
        - containerPort: 9216
```

Monitor key metrics:

- Chunk distribution across shards
- Balancer activity and migration rates
- Query performance per shard
- Connection pool utilization
- Disk space per shard

## Conclusion

MongoDB sharded clusters on Kubernetes provide horizontal scaling for massive datasets. MongoDB Controllers for Kubernetes simplifies the complex topology of config servers, shards, and routers when used with Ops Manager or Cloud Manager. By carefully selecting shard keys, monitoring chunk distribution, and scaling shards as data grows, you can build a system that handles petabytes of data. The combination of MongoDB's sharding capabilities with Kubernetes orchestration creates a scalable database platform that grows with your application's needs.
