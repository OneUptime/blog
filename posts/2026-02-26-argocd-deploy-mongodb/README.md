# How to Deploy MongoDB with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, MongoDB, Database

Description: Learn how to deploy and manage MongoDB on Kubernetes with ArgoCD, including standalone instances, replica sets for high availability, and the MongoDB Community Operator.

---

MongoDB is the most popular NoSQL document database. Its flexible schema and horizontal scaling make it a common choice for modern applications. Running MongoDB on Kubernetes with ArgoCD gives you declarative database infrastructure that scales from development to production.

## Deployment Options for MongoDB on Kubernetes

You can deploy MongoDB in several ways:

1. **Plain manifests**: Direct StatefulSet with manual replica set configuration
2. **Helm chart**: Bitnami MongoDB chart with built-in replication
3. **MongoDB Community Operator**: Official operator with automated replica sets, backups, and lifecycle management
4. **Percona Operator**: Alternative operator with sharding support

## Standalone MongoDB for Development

A single MongoDB instance is the simplest starting point:

```yaml
# apps/mongodb/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-credentials
  annotations:
    argocd.argoproj.io/sync-wave: "-3"
type: Opaque
stringData:
  MONGO_INITDB_ROOT_USERNAME: admin
  MONGO_INITDB_ROOT_PASSWORD: changeme-admin
---
# apps/mongodb/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-data
  annotations:
    argocd.argoproj.io/sync-wave: "-2"
    argocd.argoproj.io/sync-options: Prune=false
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 50Gi
---
# apps/mongodb/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
        - name: mongodb
          image: mongo:7.0
          ports:
            - containerPort: 27017
          envFrom:
            - secretRef:
                name: mongodb-credentials
          volumeMounts:
            - name: data
              mountPath: /data/db
            - name: config
              mountPath: /etc/mongod.conf
              subPath: mongod.conf
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: "2"
              memory: 4Gi
          readinessProbe:
            exec:
              command:
                - mongosh
                - --eval
                - "db.adminCommand('ping')"
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            exec:
              command:
                - mongosh
                - --eval
                - "db.adminCommand('ping')"
            initialDelaySeconds: 30
            periodSeconds: 30
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: mongodb-data
        - name: config
          configMap:
            name: mongodb-config
---
# apps/mongodb/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mongodb-config
  annotations:
    argocd.argoproj.io/sync-wave: "-3"
data:
  mongod.conf: |
    storage:
      dbPath: /data/db
      journal:
        enabled: true
      wiredTiger:
        engineConfig:
          cacheSizeGB: 1.5

    net:
      port: 27017
      bindIp: 0.0.0.0

    security:
      authorization: enabled

    operationProfiling:
      slowOpThresholdMs: 100
      mode: slowOp
---
# apps/mongodb/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  selector:
    app: mongodb
  ports:
    - port: 27017
      targetPort: 27017
```

## ArgoCD Application Configuration

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: mongodb
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops
    targetRevision: main
    path: apps/mongodb
  destination:
    server: https://kubernetes.default.svc
    namespace: databases
  syncPolicy:
    automated:
      prune: false
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=orphan
```

## MongoDB Replica Set with StatefulSet

For high availability, deploy MongoDB as a replica set using a StatefulSet:

```yaml
# apps/mongodb-rs/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
spec:
  serviceName: mongodb-headless
  replicas: 3
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
        - name: mongodb
          image: mongo:7.0
          ports:
            - containerPort: 27017
          command:
            - mongod
            - "--replSet"
            - rs0
            - "--bind_ip_all"
            - "--keyFile"
            - /etc/mongodb/keyfile
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              valueFrom:
                secretKeyRef:
                  name: mongodb-credentials
                  key: username
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongodb-credentials
                  key: password
          volumeMounts:
            - name: data
              mountPath: /data/db
            - name: keyfile
              mountPath: /etc/mongodb
              readOnly: true
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: "2"
              memory: 4Gi
          readinessProbe:
            exec:
              command:
                - mongosh
                - --eval
                - "db.adminCommand('ping')"
            initialDelaySeconds: 10
            periodSeconds: 10
      volumes:
        - name: keyfile
          secret:
            secretName: mongodb-keyfile
            defaultMode: 0400
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
# Headless service for replica set DNS
apiVersion: v1
kind: Service
metadata:
  name: mongodb-headless
spec:
  clusterIP: None
  selector:
    app: mongodb
  ports:
    - port: 27017
---
# Regular service for client connections
apiVersion: v1
kind: Service
metadata:
  name: mongodb
spec:
  selector:
    app: mongodb
  ports:
    - port: 27017
```

Initialize the replica set with a PostSync hook:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: init-replica-set
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: init
          image: mongo:7.0
          command: [sh, -c]
          args:
            - |
              # Wait for all pods to be ready
              sleep 30

              # Initialize the replica set
              mongosh --host mongodb-0.mongodb-headless \
                -u admin -p $MONGO_PASSWORD --authenticationDatabase admin \
                --eval '
                  rs.initiate({
                    _id: "rs0",
                    members: [
                      { _id: 0, host: "mongodb-0.mongodb-headless:27017" },
                      { _id: 1, host: "mongodb-1.mongodb-headless:27017" },
                      { _id: 2, host: "mongodb-2.mongodb-headless:27017" }
                    ]
                  })
                '
          env:
            - name: MONGO_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongodb-credentials
                  key: password
      restartPolicy: OnFailure
```

## MongoDB Community Operator

For production, the MongoDB Community Operator automates replica set management:

```yaml
# Step 1: Deploy the operator
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: mongodb-operator
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-5"
spec:
  project: default
  source:
    repoURL: https://mongodb.github.io/helm-charts
    chart: community-operator
    targetRevision: 0.9.0
  destination:
    server: https://kubernetes.default.svc
    namespace: mongodb-operator
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

```yaml
# Step 2: Deploy a MongoDB replica set
# apps/mongodb-operator/replicaset.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: mongodb-rs
  namespace: databases
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
        - name: dbAdminAnyDatabase
          db: admin
        - name: readWriteAnyDatabase
          db: admin
    - name: myapp
      db: myapp
      passwordSecretRef:
        name: mongodb-myapp-password
      roles:
        - name: readWrite
          db: myapp

  additionalMongodConfig:
    storage.wiredTiger.engineConfig.cacheSizeGB: 1.5
    operationProfiling.slowOpThresholdMs: 100

  statefulSet:
    spec:
      template:
        spec:
          containers:
            - name: mongod
              resources:
                requests:
                  cpu: 500m
                  memory: 2Gi
                limits:
                  cpu: "2"
                  memory: 4Gi
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
```

## Monitoring MongoDB

Deploy MongoDB Exporter for Prometheus:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb-exporter
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb-exporter
  template:
    metadata:
      labels:
        app: mongodb-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9216"
    spec:
      containers:
        - name: exporter
          image: percona/mongodb_exporter:0.40
          ports:
            - containerPort: 9216
          args:
            - "--mongodb.uri=mongodb://exporter:exporterpass@mongodb-0.mongodb-headless:27017,mongodb-1.mongodb-headless:27017,mongodb-2.mongodb-headless:27017/?replicaSet=rs0&authSource=admin"
            - "--discovering-mode"
            - "--compatible-mode"
```

## Backup with CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-backup
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: mongo:7.0
              command: [sh, -c]
              args:
                - |
                  TIMESTAMP=$(date +%Y%m%d_%H%M%S)

                  # Run mongodump
                  mongodump \
                    --uri="mongodb://admin:${MONGO_PASSWORD}@mongodb-0.mongodb-headless:27017,mongodb-1.mongodb-headless:27017,mongodb-2.mongodb-headless:27017/?replicaSet=rs0&authSource=admin" \
                    --out=/backup/${TIMESTAMP}

                  # Compress
                  tar czf /backup/mongodb_${TIMESTAMP}.tar.gz -C /backup ${TIMESTAMP}

                  # Upload to S3
                  aws s3 cp /backup/mongodb_${TIMESTAMP}.tar.gz \
                    s3://mongodb-backups/daily/

                  # Cleanup
                  rm -rf /backup/${TIMESTAMP} /backup/mongodb_${TIMESTAMP}.tar.gz

                  echo "Backup completed: mongodb_${TIMESTAMP}.tar.gz"
              env:
                - name: MONGO_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: mongodb-credentials
                      key: password
              volumeMounts:
                - name: backup
                  mountPath: /backup
          volumes:
            - name: backup
              emptyDir:
                sizeLimit: 50Gi
          restartPolicy: OnFailure
```

## Connection String Management

Store the connection string as a Secret for application consumption:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-connection
type: Opaque
stringData:
  # For standalone
  MONGODB_URI: "mongodb://myapp:password@mongodb.databases.svc:27017/myapp?authSource=myapp"

  # For replica set
  MONGODB_URI: "mongodb://myapp:password@mongodb-0.mongodb-headless:27017,mongodb-1.mongodb-headless:27017,mongodb-2.mongodb-headless:27017/myapp?replicaSet=rs0&authSource=myapp"
```

Applications reference this Secret:

```yaml
env:
  - name: MONGODB_URI
    valueFrom:
      secretKeyRef:
        name: mongodb-connection
        key: MONGODB_URI
```

## Summary

Deploying MongoDB with ArgoCD ranges from simple standalone instances for development to production replica sets managed by the MongoDB Community Operator. Key practices include using Recreate strategy for standalone instances, the MongoDB Operator for automated replica set management, PreSync/PostSync hooks for initialization, and CronJobs for automated backups. Disable auto-prune for all database resources, use orphan propagation policy for PVCs, and monitor with the Percona MongoDB Exporter. The entire MongoDB deployment - from operator installation to replica set configuration to backup schedules - is declared in Git and managed through ArgoCD.
