# Deploying MongoDB Operator with Helm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, DevOps, MongoDB, Operator, Database, StatefulSet

Description: Complete guide to deploying MongoDB Community and Enterprise operators on Kubernetes using Helm charts for production-grade database management.

> MongoDB operators simplify the deployment and management of MongoDB clusters on Kubernetes. This guide covers deploying MongoDB using both the Community and Enterprise operators with Helm charts.

## MongoDB Operator Architecture

```mermaid
flowchart TB
  subgraph "MongoDB Operator"
    operator[MongoDB Operator]
    webhook[Admission Webhook]
  end
  
  subgraph "MongoDB Resources"
    mdbc[MongoDBCommunity CR]
    mdb[MongoDB CR]
    ops[Ops Manager CR]
  end
  
  subgraph "MongoDB Cluster"
    primary[(Primary)]
    secondary1[(Secondary 1)]
    secondary2[(Secondary 2)]
    arbiter[Arbiter]
  end
  
  subgraph "Supporting Resources"
    statefulset[StatefulSet]
    services[Services]
    secrets[Secrets]
    pvc[PVCs]
  end
  
  mdbc --> operator
  mdb --> operator
  
  operator --> statefulset
  operator --> services
  operator --> secrets
  operator --> pvc
  
  statefulset --> primary
  statefulset --> secondary1
  statefulset --> secondary2
  statefulset --> arbiter
  
  webhook --> mdbc
  webhook --> mdb
```

## MongoDB Community Operator

### Add Helm Repository

```bash
# Add MongoDB Helm repository
helm repo add mongodb https://mongodb.github.io/helm-charts
helm repo update

# Search available versions
helm search repo mongodb --versions
```

### Install Community Operator

```yaml
# mongodb-community-operator-values.yaml
operator:
  # Operator deployment settings
  name: mongodb-kubernetes-operator
  
  replicas: 1
  
  resources:
    requests:
      cpu: 200m
      memory: 200Mi
    limits:
      cpu: 1100m
      memory: 1Gi
      
  # Watch specific namespaces (empty = all namespaces)
  watchNamespace: ""
  
  # Image settings
  operatorImageName: mongodb/mongodb-kubernetes-operator
  versionUpgradeHookImageName: mongodb/mongodb-kubernetes-operator-version-upgrade-post-start-hook
  
# Agent settings
agent:
  name: mongodb-agent
  version: 12.0.21.7698-1
  
# Version upgrade hook
versionUpgradeHook:
  name: mongodb-kubernetes-operator-prestart-hook
```

```bash
helm install mongodb-operator mongodb/community-operator \
  --namespace mongodb \
  --create-namespace \
  -f mongodb-community-operator-values.yaml
```

### Deploy MongoDB Community Cluster

```yaml
# mongodb-community.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: mongodb
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
        name: mongodb-admin-password
      roles:
        - name: clusterAdmin
          db: admin
        - name: userAdminAnyDatabase
          db: admin
        - name: readWriteAnyDatabase
          db: admin
          
    - name: app-user
      db: admin
      passwordSecretRef:
        name: mongodb-app-password
      roles:
        - name: readWrite
          db: myapp
          
  additionalMongodConfig:
    storage.wiredTiger.engineConfig.journalCompressor: zlib
    net.compression.compressors: snappy,zstd,zlib
    
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
                  cpu: 2000m
                  memory: 4Gi
                  
          affinity:
            podAntiAffinity:
              preferredDuringSchedulingIgnoredDuringExecution:
                - weight: 100
                  podAffinityTerm:
                    labelSelector:
                      matchLabels:
                        app: mongodb-svc
                    topologyKey: kubernetes.io/hostname
                    
      volumeClaimTemplates:
        - metadata:
            name: data-volume
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: fast-ssd
            resources:
              requests:
                storage: 50Gi
                
        - metadata:
            name: logs-volume
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: standard
            resources:
              requests:
                storage: 10Gi
```

### Create Password Secrets

```bash
# Create admin password
kubectl create secret generic mongodb-admin-password \
  --namespace mongodb \
  --from-literal=password=$(openssl rand -base64 24)

# Create app user password
kubectl create secret generic mongodb-app-password \
  --namespace mongodb \
  --from-literal=password=$(openssl rand -base64 24)
```

### Deploy the Cluster

```bash
kubectl apply -f mongodb-community.yaml
```

## MongoDB Enterprise Operator

### Install Enterprise Operator

```yaml
# mongodb-enterprise-operator-values.yaml
operator:
  name: mongodb-enterprise-operator
  
  replicas: 1
  
  resources:
    requests:
      cpu: 500m
      memory: 200Mi
    limits:
      cpu: 1100m
      memory: 1Gi
      
  watchNamespace: "*"
  
# Ops Manager configuration (required for enterprise)
opsManager:
  enabled: false  # Set to true if using Ops Manager

# Database settings
database:
  name: mongodb-enterprise-database
```

```bash
helm install mongodb-enterprise-operator mongodb/enterprise-operator \
  --namespace mongodb \
  --create-namespace \
  -f mongodb-enterprise-operator-values.yaml
```

### Deploy Enterprise MongoDB

```yaml
# mongodb-enterprise.yaml
apiVersion: mongodb.com/v1
kind: MongoDB
metadata:
  name: mongodb-enterprise
  namespace: mongodb
spec:
  type: ReplicaSet
  members: 3
  version: "7.0.4-ent"
  
  opsManager:
    configMapRef:
      name: ops-manager-connection
      
  credentials: ops-manager-admin-key
  
  persistent: true
  
  podSpec:
    podTemplate:
      spec:
        containers:
          - name: mongodb-enterprise-database
            resources:
              requests:
                cpu: 1000m
                memory: 2Gi
              limits:
                cpu: 4000m
                memory: 8Gi
                
  statefulSet:
    spec:
      volumeClaimTemplates:
        - metadata:
            name: data
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: fast-ssd
            resources:
              requests:
                storage: 100Gi
```

## Sharded Cluster Deployment

### MongoDB Sharded Cluster

```yaml
# mongodb-sharded.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: mongodb-sharded
  namespace: mongodb
spec:
  type: ShardedCluster
  shardCount: 3
  mongodsPerShardCount: 3
  mongosCount: 2
  configServerCount: 3
  version: "7.0.4"
  
  security:
    authentication:
      modes: ["SCRAM"]
      
  users:
    - name: admin
      db: admin
      passwordSecretRef:
        name: mongodb-sharded-admin
      roles:
        - name: clusterAdmin
          db: admin
        - name: userAdminAnyDatabase
          db: admin
          
  # Shard configuration
  shardPodSpec:
    podTemplate:
      spec:
        containers:
          - name: mongod
            resources:
              requests:
                cpu: 500m
                memory: 1Gi
              limits:
                cpu: 2000m
                memory: 4Gi
                
  # Config server configuration
  configSrvPodSpec:
    podTemplate:
      spec:
        containers:
          - name: mongod
            resources:
              requests:
                cpu: 200m
                memory: 512Mi
              limits:
                cpu: 500m
                memory: 1Gi
                
  # Mongos configuration
  mongosPodSpec:
    podTemplate:
      spec:
        containers:
          - name: mongos
            resources:
              requests:
                cpu: 200m
                memory: 256Mi
              limits:
                cpu: 500m
                memory: 512Mi
```

## TLS Configuration

### Generate Certificates

```bash
# Create CA
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
  -out ca.crt -subj "/CN=MongoDB CA"

# Create server certificate
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr \
  -subj "/CN=*.mongodb.svc.cluster.local"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt -days 365 -sha256

# Create TLS secret
kubectl create secret tls mongodb-tls \
  --namespace mongodb \
  --cert=server.crt \
  --key=server.key

# Create CA configmap
kubectl create configmap mongodb-ca \
  --namespace mongodb \
  --from-file=ca.crt=ca.crt
```

### Enable TLS in MongoDB

```yaml
# mongodb-tls.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: mongodb
  namespace: mongodb
spec:
  members: 3
  type: ReplicaSet
  version: "7.0.4"
  
  security:
    authentication:
      modes: ["SCRAM"]
    tls:
      enabled: true
      certificateKeySecretRef:
        name: mongodb-tls
      caConfigMapRef:
        name: mongodb-ca
        
  additionalMongodConfig:
    net:
      tls:
        mode: requireTLS
```

## Backup and Restore

### Using Percona Backup for MongoDB

```yaml
# pbm-values.yaml
# Deploy Percona Backup for MongoDB
apiVersion: v1
kind: ConfigMap
metadata:
  name: pbm-config
  namespace: mongodb
data:
  pbm-config.yaml: |
    storage:
      type: s3
      s3:
        region: us-east-1
        bucket: mongodb-backups
        prefix: production
        credentials:
          access-key-id: ${AWS_ACCESS_KEY_ID}
          secret-access-key: ${AWS_SECRET_ACCESS_KEY}
    pitr:
      enabled: true
      oplogSpanMin: 10
```

### Backup CronJob

```yaml
# mongodb-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-backup
  namespace: mongodb
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: percona/percona-backup-mongodb:2.3.0
              command:
                - /bin/sh
                - -c
                - |
                  pbm backup --type=logical
              env:
                - name: PBM_MONGODB_URI
                  valueFrom:
                    secretKeyRef:
                      name: mongodb-admin-credentials
                      key: connectionString
              volumeMounts:
                - name: config
                  mountPath: /etc/pbm
          volumes:
            - name: config
              configMap:
                name: pbm-config
          restartPolicy: OnFailure
```

## Connection from Applications

### Connection String Secret

```yaml
# mongodb-connection.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-connection
  namespace: myapp
type: Opaque
stringData:
  # For replica set
  MONGODB_URI: "mongodb://app-user:password@mongodb-0.mongodb-svc.mongodb.svc.cluster.local:27017,mongodb-1.mongodb-svc.mongodb.svc.cluster.local:27017,mongodb-2.mongodb-svc.mongodb.svc.cluster.local:27017/myapp?replicaSet=mongodb&authSource=admin"
  
  # With TLS
  MONGODB_URI_TLS: "mongodb://app-user:password@mongodb-0.mongodb-svc.mongodb.svc.cluster.local:27017,mongodb-1.mongodb-svc.mongodb.svc.cluster.local:27017,mongodb-2.mongodb-svc.mongodb.svc.cluster.local:27017/myapp?replicaSet=mongodb&authSource=admin&tls=true&tlsCAFile=/etc/ssl/certs/mongodb-ca.crt"
```

### Application Deployment

```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    spec:
      containers:
        - name: app
          image: myapp:latest
          env:
            - name: MONGODB_URI
              valueFrom:
                secretKeyRef:
                  name: mongodb-connection
                  key: MONGODB_URI
          volumeMounts:
            - name: mongodb-ca
              mountPath: /etc/ssl/certs/mongodb-ca.crt
              subPath: ca.crt
      volumes:
        - name: mongodb-ca
          configMap:
            name: mongodb-ca
```

## Monitoring

### ServiceMonitor for MongoDB

```yaml
# mongodb-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: mongodb
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: mongodb-svc
  namespaceSelector:
    matchNames:
      - mongodb
  endpoints:
    - port: prometheus
      path: /metrics
      interval: 30s
```

### MongoDB Exporter

```yaml
# mongodb-exporter.yaml
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
          image: percona/mongodb_exporter:0.40.0
          args:
            - --mongodb.uri=mongodb://monitor:password@mongodb-svc:27017/admin?replicaSet=mongodb
            - --collect-all
          ports:
            - containerPort: 9216
              name: metrics
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
```

### Prometheus Alerts

```yaml
# mongodb-prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: mongodb-alerts
spec:
  groups:
    - name: mongodb
      rules:
        - alert: MongoDBReplicaSetUnhealthy
          expr: |
            mongodb_rs_members_health{state!="PRIMARY",state!="SECONDARY"} > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "MongoDB replica set member unhealthy"
            
        - alert: MongoDBHighConnections
          expr: |
            mongodb_connections{state="current"} / mongodb_connections{state="available"} > 0.8
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "MongoDB connections running high"
            
        - alert: MongoDBReplicationLag
          expr: |
            mongodb_rs_members_optimeDate{member_state="SECONDARY"} - 
            ignoring(member_state) mongodb_rs_members_optimeDate{member_state="PRIMARY"} > 10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "MongoDB replication lag detected"
            
        - alert: MongoDBHighMemoryUsage
          expr: |
            mongodb_memory{type="resident"} / mongodb_memory{type="virtual"} > 0.8
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "MongoDB high memory usage"
```

## Scaling Operations

### Horizontal Scaling

```bash
# Scale replica set
kubectl patch mongodbcommunity mongodb -n mongodb --type merge -p '{"spec":{"members":5}}'

# Verify scaling
kubectl get pods -n mongodb -l app=mongodb-svc
```

### Vertical Scaling

```yaml
# Update resource requests
kubectl patch mongodbcommunity mongodb -n mongodb --type merge -p '
spec:
  statefulSet:
    spec:
      template:
        spec:
          containers:
            - name: mongod
              resources:
                requests:
                  cpu: 1000m
                  memory: 2Gi
                limits:
                  cpu: 4000m
                  memory: 8Gi
'
```

## Troubleshooting

```bash
# Check operator logs
kubectl logs -n mongodb -l app.kubernetes.io/name=mongodb-kubernetes-operator

# Check MongoDB pods
kubectl get pods -n mongodb

# Check MongoDB logs
kubectl logs -n mongodb mongodb-0 -c mongod

# Check replica set status
kubectl exec -n mongodb mongodb-0 -- mongosh --eval "rs.status()"

# Check cluster configuration
kubectl exec -n mongodb mongodb-0 -- mongosh --eval "rs.conf()"

# Connect to MongoDB
kubectl exec -it -n mongodb mongodb-0 -- mongosh -u admin -p

# Check PVC status
kubectl get pvc -n mongodb

# Describe MongoDB CR
kubectl describe mongodbcommunity mongodb -n mongodb
```

## Wrap-up

MongoDB operators simplify the deployment and management of MongoDB clusters on Kubernetes. Use the Community Operator for open-source deployments and the Enterprise Operator for advanced features with Ops Manager integration. Configure proper authentication, TLS encryption, and backup strategies for production deployments. Monitor your clusters with Prometheus and set up alerts for replication lag and connection issues.
