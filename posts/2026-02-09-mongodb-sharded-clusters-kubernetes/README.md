# How to Set Up MongoDB Sharded Clusters on Kubernetes Using the Community Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, MongoDB, Database Sharding

Description: Deploy and manage MongoDB sharded clusters on Kubernetes using the Community Operator for horizontal scaling of large datasets across multiple shard servers.

---

MongoDB sharding distributes data across multiple servers to handle datasets that exceed single-server capacity. When deployed on Kubernetes, sharded clusters gain orchestration benefits while maintaining MongoDB's horizontal scaling capabilities. The MongoDB Community Operator simplifies deploying and managing complex sharded topologies. This guide walks you through creating a production-ready sharded cluster.

## Understanding MongoDB Sharding Architecture

A sharded cluster consists of three components working together. Shard servers store the actual data, with each shard being a replica set for high availability. Config servers maintain metadata about data distribution and cluster configuration. Mongos routers direct client queries to the appropriate shards based on the shard key.

Each component has different scaling characteristics and resource requirements. Shards need storage capacity proportional to your data volume. Config servers need minimal resources but require high availability since they're critical for cluster operation. Mongos routers are stateless and scale horizontally based on client connection load.

## Installing the MongoDB Community Operator

Deploy the operator and custom resource definitions:

```bash
# Clone operator repository
git clone https://github.com/mongodb/mongodb-kubernetes-operator.git
cd mongodb-kubernetes-operator

# Install CRDs and operator
kubectl apply -f config/crd/bases/mongodbcommunity.mongodb.com_mongodbcommunity.yaml
kubectl apply -k config/rbac/ --namespace mongodb
kubectl create -f config/manager/manager.yaml --namespace mongodb

# Verify installation
kubectl get pods -n mongodb
```

The operator watches for MongoDBCommunity resources and manages the underlying StatefulSets, Services, and configuration.

## Deploying Config Server Replica Set

Start with config servers since they're required for sharding:

```yaml
# mongodb-config-servers.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: config-servers
  namespace: mongodb
spec:
  members: 3
  type: ReplicaSet
  version: "7.0.4"

  security:
    authentication:
      modes: ["SCRAM"]

  users:
    - name: admin
      db: admin
      passwordSecretRef:
        name: admin-password
      roles:
        - name: clusterAdmin
          db: admin
        - name: userAdminAnyDatabase
          db: admin
      scramCredentialsSecretName: admin-scram

  additionalMongodConfig:
    storage.wiredTiger.engineConfig.cacheSizeGB: 0.5
    net.maxIncomingConnections: 1000

  statefulSet:
    spec:
      template:
        spec:
          containers:
            - name: mongod
              resources:
                requests:
                  cpu: 500m
                  memory: 1Gi
                limits:
                  cpu: 1
                  memory: 2Gi
              command:
                - mongod
                - --configsvr
                - --replSet=config-servers
                - --bind_ip_all

      volumeClaimTemplates:
        - metadata:
            name: data-volume
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: fast-ssd
            resources:
              requests:
                storage: 10Gi
```

Create the admin password secret first:

```bash
kubectl create namespace mongodb
kubectl create secret generic admin-password -n mongodb \
  --from-literal="password=SecurePassword123!"

kubectl apply -f mongodb-config-servers.yaml
```

## Deploying Shard Replica Sets

Create multiple shard replica sets for data distribution:

```yaml
# mongodb-shard-1.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: shard-1
  namespace: mongodb
spec:
  members: 3
  type: ReplicaSet
  version: "7.0.4"

  security:
    authentication:
      modes: ["SCRAM"]

  users:
    - name: admin
      db: admin
      passwordSecretRef:
        name: admin-password
      roles:
        - name: clusterAdmin
          db: admin
        - name: dbAdminAnyDatabase
          db: admin
      scramCredentialsSecretName: admin-scram

  additionalMongodConfig:
    storage.wiredTiger.engineConfig.cacheSizeGB: 2
    net.maxIncomingConnections: 5000

  statefulSet:
    spec:
      template:
        spec:
          affinity:
            podAntiAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                - labelSelector:
                    matchLabels:
                      app: shard-1
                  topologyKey: kubernetes.io/hostname

          containers:
            - name: mongod
              resources:
                requests:
                  cpu: 2
                  memory: 4Gi
                limits:
                  cpu: 4
                  memory: 8Gi
              command:
                - mongod
                - --shardsvr
                - --replSet=shard-1

      volumeClaimTemplates:
        - metadata:
            name: data-volume
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: fast-ssd
            resources:
              requests:
                storage: 100Gi
---
# mongodb-shard-2.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: shard-2
  namespace: mongodb
spec:
  members: 3
  type: ReplicaSet
  version: "7.0.4"

  security:
    authentication:
      modes: ["SCRAM"]

  users:
    - name: admin
      db: admin
      passwordSecretRef:
        name: admin-password
      roles:
        - name: clusterAdmin
          db: admin
      scramCredentialsSecretName: admin-scram

  additionalMongodConfig:
    storage.wiredTiger.engineConfig.cacheSizeGB: 2

  statefulSet:
    spec:
      template:
        spec:
          containers:
            - name: mongod
              resources:
                requests:
                  cpu: 2
                  memory: 4Gi
                limits:
                  cpu: 4
                  memory: 8Gi
              command:
                - mongod
                - --shardsvr
                - --replSet=shard-2

      volumeClaimTemplates:
        - metadata:
            name: data-volume
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: fast-ssd
            resources:
              requests:
                storage: 100Gi
```

Deploy both shards:

```bash
kubectl apply -f mongodb-shard-1.yaml
kubectl apply -f mongodb-shard-2.yaml

# Wait for shards to be ready
kubectl get mongodb -n mongodb -w
```

## Deploying Mongos Routers

Create mongos deployment for client connections:

```yaml
# mongodb-mongos.yaml
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
        image: mongo:7.0.4
        command:
          - mongos
          - --configdb
          - config-servers/config-servers-0.config-servers-svc.mongodb.svc.cluster.local:27017,config-servers-1.config-servers-svc.mongodb.svc.cluster.local:27017,config-servers-2.config-servers-svc.mongodb.svc.cluster.local:27017
          - --bind_ip_all
        ports:
        - containerPort: 27017
          name: mongos
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1
            memory: 1Gi
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          value: admin
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: admin-password
              key: password
---
apiVersion: v1
kind: Service
metadata:
  name: mongos
  namespace: mongodb
spec:
  type: LoadBalancer
  selector:
    app: mongos
  ports:
  - port: 27017
    targetPort: 27017
```

Deploy the routers:

```bash
kubectl apply -f mongodb-mongos.yaml
```

## Initializing the Sharded Cluster

Connect to a mongos router and add shards:

```bash
# Get mongos service endpoint
MONGOS_HOST=$(kubectl get svc mongos -n mongodb -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Connect to mongos
kubectl run -it --rm mongo-client --image=mongo:7.0.4 --restart=Never -n mongodb -- \
  mongosh "mongodb://admin:SecurePassword123!@mongos.mongodb.svc.cluster.local:27017/admin"
```

Inside the MongoDB shell, add shards:

```javascript
// Add first shard
sh.addShard("shard-1/shard-1-0.shard-1-svc.mongodb.svc.cluster.local:27017,shard-1-1.shard-1-svc.mongodb.svc.cluster.local:27017,shard-1-2.shard-1-svc.mongodb.svc.cluster.local:27017")

// Add second shard
sh.addShard("shard-2/shard-2-0.shard-2-svc.mongodb.svc.cluster.local:27017,shard-2-1.shard-2-svc.mongodb.svc.cluster.local:27017,shard-2-2.shard-2-svc.mongodb.svc.cluster.local:27017")

// Verify shards
sh.status()
```

## Enabling Sharding for Databases and Collections

Enable sharding on your database and choose appropriate shard keys:

```javascript
// Enable sharding on database
sh.enableSharding("myapp")

// Shard a collection by user_id with hashed sharding
sh.shardCollection("myapp.users", { user_id: "hashed" })

// Shard by compound key for range-based sharding
sh.shardCollection("myapp.events", { tenant_id: 1, timestamp: 1 })

// Check distribution
db.users.getShardDistribution()
```

Choose shard keys carefully based on your query patterns. Hashed sharding provides even distribution but range queries span multiple shards. Range-based sharding allows efficient range queries but requires careful key selection to avoid hotspots.

## Monitoring Shard Distribution

Check how data distributes across shards:

```javascript
// Get chunk distribution
use config
db.chunks.aggregate([
  { $group: { _id: "$shard", count: { $sum: 1 } } }
])

// Check balancer status
sh.getBalancerState()

// View recent migrations
db.changelog.find().sort({ time: -1 }).limit(10).pretty()
```

Enable the balancer if it's stopped:

```javascript
sh.startBalancer()
```

## Implementing Application Connection Logic

Connect to mongos routers from your application:

```python
# app.py
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# Connection string with multiple mongos routers
connection_string = "mongodb://admin:SecurePassword123!@mongos-0.mongos.mongodb.svc.cluster.local:27017,mongos-1.mongos.mongodb.svc.cluster.local:27017,mongos-2.mongos.mongodb.svc.cluster.local:27017/myapp?authSource=admin&replicaSet=false"

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

Scale horizontally by adding more shards:

```yaml
# mongodb-shard-3.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: shard-3
  namespace: mongodb
spec:
  members: 3
  type: ReplicaSet
  version: "7.0.4"
  # ... same configuration as other shards
```

Deploy and add to cluster:

```bash
kubectl apply -f mongodb-shard-3.yaml

# Connect to mongos and add shard
sh.addShard("shard-3/shard-3-0.shard-3-svc.mongodb.svc.cluster.local:27017,shard-3-1.shard-3-svc.mongodb.svc.cluster.local:27017,shard-3-2.shard-3-svc.mongodb.svc.cluster.local:27017")
```

The balancer automatically migrates chunks to the new shard to achieve even distribution.

## Backup Strategy for Sharded Clusters

Back up the entire cluster including config servers:

```bash
# Backup config servers first
kubectl exec -n mongodb config-servers-0 -- \
  mongodump --host localhost --port 27017 \
  --username admin --password SecurePassword123! \
  --authenticationDatabase admin \
  --out /tmp/config-backup

# Backup each shard
for shard in shard-1 shard-2 shard-3; do
  kubectl exec -n mongodb ${shard}-0 -- \
    mongodump --host localhost --port 27017 \
    --username admin --password SecurePassword123! \
    --authenticationDatabase admin \
    --out /tmp/${shard}-backup
done
```

For production, use MongoDB Ops Manager or Percona Backup for MongoDB for automated, consistent backups.

## Monitoring and Alerts

Deploy monitoring for your sharded cluster:

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
        image: percona/mongodb_exporter:0.40
        args:
          - --mongodb.uri=mongodb://admin:SecurePassword123!@mongos:27017
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

MongoDB sharded clusters on Kubernetes provide horizontal scaling for massive datasets. The Community Operator simplifies the complex topology of config servers, shards, and routers. By carefully selecting shard keys, monitoring chunk distribution, and scaling shards as data grows, you can build a system that handles petabytes of data. The combination of MongoDB's sharding capabilities with Kubernetes orchestration creates a scalable database platform that grows with your application's needs.
