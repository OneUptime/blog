# How to Deploy MongoDB Replica Sets Using the MongoDB Community Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kubernetes, Operators, Database, Replication

Description: Learn how to deploy production-ready MongoDB replica sets on Kubernetes using the MongoDB Community Operator with automated failover and scaling capabilities.

---

MongoDB replica sets provide high availability and data redundancy by maintaining multiple copies of data across different servers. When running MongoDB on Kubernetes, the MongoDB Community Operator simplifies replica set management by automating deployment, configuration, and lifecycle operations.

In this comprehensive guide, we'll deploy MongoDB replica sets using the MongoDB Community Operator on Kubernetes. We'll cover operator installation, replica set configuration, automated failover testing, and monitoring strategies.

## Understanding MongoDB Replica Sets

A replica set is a group of MongoDB instances that maintain the same dataset. One node serves as the primary, accepting all write operations, while secondary nodes replicate data from the primary. If the primary fails, the replica set automatically elects a new primary through a voting process.

Benefits of replica sets include:

- High availability through automatic failover
- Read scaling by distributing read operations
- Data redundancy across multiple nodes
- Zero-downtime maintenance operations
- Geographic distribution for disaster recovery

## Installing the MongoDB Community Operator

First, install the MongoDB Community Operator in your Kubernetes cluster:

```bash
# Add MongoDB Kubernetes repository
git clone https://github.com/mongodb/mongodb-kubernetes-operator.git
cd mongodb-kubernetes-operator

# Create namespace for MongoDB
kubectl create namespace mongodb

# Install CRDs and operator
kubectl apply -f config/crd/bases/mongodbcommunity.mongodb.com_mongodbcommunity.yaml
kubectl apply -k config/rbac/ -n mongodb
kubectl apply -f config/manager/manager.yaml -n mongodb

# Verify operator is running
kubectl get pods -n mongodb
```

Alternatively, install using Helm:

```bash
# Add MongoDB Helm repository
helm repo add mongodb https://mongodb.github.io/helm-charts
helm repo update

# Install operator
helm install community-operator mongodb/community-operator \
  --namespace mongodb \
  --create-namespace

# Confirm installation
kubectl get pods -n mongodb -l app.kubernetes.io/name=community-operator
```

## Deploying a Basic Replica Set

Create a MongoDB replica set with three members:

```yaml
# mongodb-replicaset.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: mongodb-replica
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
      scramCredentialsSecretName: mongodb-admin-scram

    - name: app-user
      db: app-database
      passwordSecretRef:
        name: mongodb-app-password
      roles:
        - name: readWrite
          db: app-database
      scramCredentialsSecretName: mongodb-app-scram

  additionalMongodConfig:
    storage.wiredTiger.engineConfig.journalCompressor: snappy
    net.maxIncomingConnections: 20000
    replication.oplogSizeMB: 10240

  statefulSet:
    spec:
      volumeClaimTemplates:
        - metadata:
            name: data-volume
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: fast-ssd
            resources:
              requests:
                storage: 100Gi
        - metadata:
            name: logs-volume
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: standard
            resources:
              requests:
                storage: 10Gi

      template:
        spec:
          containers:
            - name: mongod
              resources:
                requests:
                  cpu: "2000m"
                  memory: "4Gi"
                limits:
                  cpu: "4000m"
                  memory: "8Gi"

            - name: mongodb-agent
              resources:
                requests:
                  cpu: "500m"
                  memory: "512Mi"
                limits:
                  cpu: "1000m"
                  memory: "1Gi"
```

Create password secrets:

```bash
# Create admin password secret
kubectl create secret generic mongodb-admin-password \
  --from-literal="password=SecureAdminPassword123!" \
  -n mongodb

# Create app user password secret
kubectl create secret generic mongodb-app-password \
  --from-literal="password=SecureAppPassword123!" \
  -n mongodb

# Deploy replica set
kubectl apply -f mongodb-replicaset.yaml
```

## Configuring Replica Set with Advanced Options

For production deployments, configure additional settings:

```yaml
# mongodb-production-replicaset.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: mongodb-prod
  namespace: mongodb
spec:
  members: 5  # Increased for better fault tolerance
  type: ReplicaSet
  version: "6.0.5"

  # Arbiter for odd number voting without data storage
  arbiters: 1

  security:
    authentication:
      modes: ["SCRAM"]
    tls:
      enabled: true
      certificateKeySecretRef:
        name: mongodb-tls-cert
      caConfigMapRef:
        name: mongodb-ca-cert

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
        - name: backup
          db: admin
      scramCredentialsSecretName: mongodb-admin-scram

  additionalMongodConfig:
    # Storage configuration
    storage:
      wiredTiger:
        engineConfig:
          journalCompressor: snappy
          cacheSizeGB: 3

    # Network settings
    net:
      maxIncomingConnections: 50000
      compression:
        compressors: snappy,zstd

    # Replication settings
    replication:
      oplogSizeMB: 20480
      enableMajorityReadConcern: true

    # Operation profiling
    operationProfiling:
      mode: slowOp
      slowOpThresholdMs: 100

    # Security settings
    security:
      authorization: enabled

  statefulSet:
    spec:
      # Pod placement for high availability
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
                          - mongodb-prod-svc
                  topologyKey: kubernetes.io/hostname

          # Toleration for dedicated database nodes
          tolerations:
            - key: "database"
              operator: "Equal"
              value: "mongodb"
              effect: "NoSchedule"

          nodeSelector:
            workload: database

          containers:
            - name: mongod
              resources:
                requests:
                  cpu: "4000m"
                  memory: "8Gi"
                limits:
                  cpu: "8000m"
                  memory: "16Gi"

              # Readiness probe
              readinessProbe:
                exec:
                  command:
                    - /bin/bash
                    - -c
                    - mongo --eval "db.adminCommand('ping')"
                initialDelaySeconds: 30
                periodSeconds: 10
                timeoutSeconds: 5

              # Liveness probe
              livenessProbe:
                exec:
                  command:
                    - /bin/bash
                    - -c
                    - mongo --eval "db.adminCommand('ping')"
                initialDelaySeconds: 60
                periodSeconds: 30
                timeoutSeconds: 10

      volumeClaimTemplates:
        - metadata:
            name: data-volume
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: fast-ssd
            resources:
              requests:
                storage: 500Gi
        - metadata:
            name: logs-volume
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: standard
            resources:
              requests:
                storage: 50Gi
```

Deploy the production replica set:

```bash
kubectl apply -f mongodb-production-replicaset.yaml
```

## Connecting to the Replica Set

The operator creates a service for connecting to the replica set. Create a connection string:

```bash
# Get the service name
kubectl get svc -n mongodb

# Connection string format
MONGODB_URI="mongodb://app-user:SecureAppPassword123!@mongodb-prod-0.mongodb-prod-svc.mongodb.svc.cluster.local:27017,mongodb-prod-1.mongodb-prod-svc.mongodb.svc.cluster.local:27017,mongodb-prod-2.mongodb-prod-svc.mongodb.svc.cluster.local:27017/app-database?replicaSet=mongodb-prod"
```

Test connection from a pod:

```yaml
# test-connection.yaml
apiVersion: v1
kind: Pod
metadata:
  name: mongodb-client
  namespace: mongodb
spec:
  containers:
  - name: mongo-client
    image: mongo:6.0
    command: ["sleep", "infinity"]
    env:
    - name: MONGODB_URI
      value: "mongodb://app-user:SecureAppPassword123!@mongodb-prod-svc.mongodb.svc.cluster.local:27017/app-database?replicaSet=mongodb-prod"
```

Deploy and test:

```bash
kubectl apply -f test-connection.yaml

# Connect to the replica set
kubectl exec -it mongodb-client -n mongodb -- mongo "$MONGODB_URI"

# Check replica set status
rs.status()

# Check replica set configuration
rs.conf()
```

## Testing Automatic Failover

Simulate a primary failure to verify automatic failover:

```bash
# Identify the current primary
kubectl exec -it mongodb-prod-0 -n mongodb -- mongo -u admin-user -p SecureAdminPassword123! --eval "rs.isMaster()"

# Delete the primary pod (assuming it's mongodb-prod-0)
kubectl delete pod mongodb-prod-0 -n mongodb

# Watch the election process
kubectl exec -it mongodb-prod-1 -n mongodb -- mongo -u admin-user -p SecureAdminPassword123! --eval "rs.status()" | grep stateStr

# Verify new primary is elected within 10-15 seconds
```

## Scaling the Replica Set

Scale the replica set up or down:

```bash
# Scale to 7 members
kubectl patch mongodbcommunity mongodb-prod -n mongodb \
  --type merge \
  --patch '{"spec":{"members":7}}'

# Watch pods being created
kubectl get pods -n mongodb -w

# Verify new members joined
kubectl exec -it mongodb-prod-0 -n mongodb -- \
  mongo -u admin-user -p SecureAdminPassword123! \
  --eval "rs.status().members.length"
```

## Monitoring Replica Set Health

Create a monitoring script:

```bash
#!/bin/bash
# monitor-replicaset.sh

NAMESPACE="mongodb"
REPLICA_SET="mongodb-prod"

# Check replica set status
echo "Checking replica set health..."

MEMBERS=$(kubectl get mongodbcommunity $REPLICA_SET -n $NAMESPACE -o jsonpath='{.spec.members}')
echo "Expected members: $MEMBERS"

# Check each member
for i in $(seq 0 $((MEMBERS-1))); do
  POD="${REPLICA_SET}-${i}"

  # Check pod status
  POD_STATUS=$(kubectl get pod $POD -n $NAMESPACE -o jsonpath='{.status.phase}')
  echo "Pod $POD status: $POD_STATUS"

  # Check MongoDB status
  if [ "$POD_STATUS" = "Running" ]; then
    STATE=$(kubectl exec $POD -n $NAMESPACE -- mongo --quiet --eval "rs.status().members.find(m => m.name.includes('$POD')).stateStr" 2>/dev/null)
    echo "MongoDB state: $STATE"
  fi
done

# Check for primary
PRIMARY=$(kubectl exec ${REPLICA_SET}-0 -n $NAMESPACE -- mongo --quiet --eval "rs.status().members.find(m => m.state === 1).name" 2>/dev/null)
echo "Current primary: $PRIMARY"
```

## Conclusion

The MongoDB Community Operator simplifies deploying and managing MongoDB replica sets on Kubernetes. It handles the complexity of replica set configuration, automatic failover, and scaling operations while providing a Kubernetes-native experience through custom resources.

Key advantages:

- Automated replica set deployment and configuration
- Built-in high availability with automatic failover
- Simple scaling operations through spec changes
- Integration with Kubernetes storage and networking
- Support for TLS encryption and authentication

By leveraging the operator, you can focus on application development while ensuring your MongoDB deployment follows production best practices for reliability and performance.
