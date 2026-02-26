# How to Deploy PostgreSQL with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, PostgreSQL, Databases

Description: Learn how to deploy and manage PostgreSQL on Kubernetes with ArgoCD, including single-instance setups, high-availability clusters, backups, and production best practices.

---

PostgreSQL is the most popular open-source relational database, and running it on Kubernetes with ArgoCD gives you declarative, version-controlled database infrastructure. This guide covers everything from a simple single-instance deployment to a production-grade high-availability setup using operators.

## Deployment Options

You have several ways to run PostgreSQL on Kubernetes:

1. **Plain manifests**: Direct StatefulSet or Deployment. Simple but manual.
2. **Helm chart**: Bitnami or other community charts. Good balance of simplicity and features.
3. **Operators**: CloudNativePG, Crunchy Data, Zalando. Best for production HA.

## Single-Instance PostgreSQL

For development or small workloads, a simple Deployment works:

```yaml
# apps/postgres/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-credentials
type: Opaque
stringData:
  POSTGRES_USER: myapp
  POSTGRES_PASSWORD: changeme-in-production
  POSTGRES_DB: myapp
---
# apps/postgres/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
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
# apps/postgres/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  replicas: 1
  strategy:
    type: Recreate  # Important for single-instance with PVC
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          envFrom:
            - secretRef:
                name: postgres-credentials
          env:
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
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
                - pg_isready
                - -U
                - myapp
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - myapp
            initialDelaySeconds: 30
            periodSeconds: 30
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: postgres-data
---
# apps/postgres/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
```

Note the `strategy: Recreate` - this is critical for single-instance databases with PVCs. A rolling update would try to attach the same PVC to two pods simultaneously, which fails with ReadWriteOnce volumes.

## ArgoCD Application Configuration

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: postgres
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops
    targetRevision: main
    path: apps/postgres
  destination:
    server: https://kubernetes.default.svc
    namespace: databases
  syncPolicy:
    automated:
      prune: false       # Never auto-delete database resources
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=orphan
```

Key settings for database deployments:

- `prune: false` - Prevents accidental deletion of the database
- `PrunePropagationPolicy=orphan` - Keeps PVCs if the parent resource is deleted

## PostgreSQL with Helm Chart

The Bitnami PostgreSQL Helm chart provides more features out of the box:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: postgres
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://charts.bitnami.com/bitnami
    chart: postgresql
    targetRevision: 14.0.0
    helm:
      values: |
        auth:
          postgresPassword: changeme
          username: myapp
          password: apppassword
          database: myapp

        primary:
          persistence:
            enabled: true
            storageClass: fast-ssd
            size: 50Gi
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: "2"
              memory: 4Gi

        # PostgreSQL configuration
        postgresql:
          maxConnections: 200
          sharedBuffers: 1024MB
          effectiveCacheSize: 3072MB
          workMem: 16MB

        metrics:
          enabled: true
          serviceMonitor:
            enabled: true

        backup:
          enabled: false  # Handle separately
  destination:
    server: https://kubernetes.default.svc
    namespace: databases
  syncPolicy:
    automated:
      prune: false
      selfHeal: true
```

## High-Availability with CloudNativePG Operator

For production, use the CloudNativePG operator for automatic failover, backups, and replication:

```yaml
# Step 1: Deploy the operator
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cnpg-operator
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-5"
spec:
  project: default
  source:
    repoURL: https://cloudnative-pg.github.io/charts
    chart: cloudnative-pg
    targetRevision: 0.20.0
  destination:
    server: https://kubernetes.default.svc
    namespace: cnpg-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

```yaml
# Step 2: Deploy a PostgreSQL cluster
# apps/postgres-ha/cluster.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-ha
  namespace: databases
spec:
  instances: 3

  # PostgreSQL configuration
  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "1024MB"
      effective_cache_size: "3072MB"
      work_mem: "16MB"
      maintenance_work_mem: "256MB"
      wal_level: "replica"
      max_wal_senders: "10"
      max_replication_slots: "10"

  # Storage
  storage:
    size: 100Gi
    storageClass: fast-ssd

  # Resources
  resources:
    requests:
      cpu: "1"
      memory: 2Gi
    limits:
      cpu: "4"
      memory: 8Gi

  # Automatic backup to S3
  backup:
    barmanObjectStore:
      destinationPath: s3://postgres-backups/ha-cluster/
      endpointURL: https://s3.amazonaws.com
      s3Credentials:
        accessKeyId:
          name: s3-creds
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: s3-creds
          key: ACCESS_SECRET_KEY
      wal:
        compression: gzip
      data:
        compression: gzip
    retentionPolicy: "30d"

  # Scheduled backups
  scheduledBackups:
    - name: daily-backup
      schedule: "0 0 2 * * *"  # 2 AM daily
      backupOwnerReference: self

  # Monitoring
  monitoring:
    enablePodMonitor: true

  # Affinity - spread across nodes
  affinity:
    topologyKey: kubernetes.io/hostname
```

## Database Migrations with PreSync Hooks

Run database migrations before deploying new application versions:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  backoffLimit: 3
  template:
    spec:
      containers:
        - name: migrate
          image: myapp:2.0.0
          command: ["./migrate.sh"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: database-url
      restartPolicy: Never
```

## Custom PostgreSQL Configuration

Mount a custom configuration file:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  annotations:
    argocd.argoproj.io/sync-wave: "-3"
data:
  postgresql.conf: |
    # Connection settings
    listen_addresses = '*'
    max_connections = 200

    # Memory settings
    shared_buffers = 1024MB
    effective_cache_size = 3072MB
    work_mem = 16MB
    maintenance_work_mem = 256MB

    # WAL settings
    wal_level = replica
    max_wal_size = 2GB
    min_wal_size = 1GB

    # Query tuning
    random_page_cost = 1.1
    effective_io_concurrency = 200

    # Logging
    log_min_duration_statement = 500
    log_checkpoints = on
    log_connections = on
    log_disconnections = on

  pg_hba.conf: |
    # TYPE  DATABASE  USER  ADDRESS    METHOD
    local   all       all              trust
    host    all       all   0.0.0.0/0  scram-sha-256
```

## Monitoring PostgreSQL

Deploy postgres-exporter for Prometheus metrics:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-exporter
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres-exporter
  template:
    metadata:
      labels:
        app: postgres-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9187"
    spec:
      containers:
        - name: exporter
          image: prometheuscommunity/postgres-exporter:v0.15.0
          ports:
            - containerPort: 9187
          env:
            - name: DATA_SOURCE_URI
              value: "postgres.databases.svc:5432/myapp?sslmode=disable"
            - name: DATA_SOURCE_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: POSTGRES_USER
            - name: DATA_SOURCE_PASS
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: POSTGRES_PASSWORD
```

## Backup and Restore Strategy

For non-operator deployments, set up backups with a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:16
              command: [sh, -c]
              args:
                - |
                  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
                  PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
                    -h postgres.databases.svc \
                    -U $POSTGRES_USER \
                    -d $POSTGRES_DB \
                    -F custom \
                    -f /backup/backup_${TIMESTAMP}.dump

                  # Upload to S3
                  aws s3 cp /backup/backup_${TIMESTAMP}.dump \
                    s3://postgres-backups/daily/backup_${TIMESTAMP}.dump

                  # Clean up local file
                  rm /backup/backup_${TIMESTAMP}.dump

                  echo "Backup completed: backup_${TIMESTAMP}.dump"
              envFrom:
                - secretRef:
                    name: postgres-credentials
              volumeMounts:
                - name: backup
                  mountPath: /backup
          volumes:
            - name: backup
              emptyDir: {}
          restartPolicy: OnFailure
```

## Connection Pooling with PgBouncer

For applications with many connections, add PgBouncer as a connection pooler:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: pgbouncer
  template:
    metadata:
      labels:
        app: pgbouncer
    spec:
      containers:
        - name: pgbouncer
          image: edoburu/pgbouncer:1.21.0
          ports:
            - containerPort: 5432
          env:
            - name: DATABASE_URL
              value: "postgres://myapp:password@postgres:5432/myapp"
            - name: POOL_MODE
              value: "transaction"
            - name: MAX_CLIENT_CONN
              value: "500"
            - name: DEFAULT_POOL_SIZE
              value: "50"
```

Applications connect to PgBouncer instead of PostgreSQL directly, which multiplexes hundreds of application connections into a smaller pool of database connections.

## Summary

Deploying PostgreSQL with ArgoCD ranges from simple single-instance setups to production-grade HA clusters with the CloudNativePG operator. Key practices include disabling auto-prune to protect data, using Recreate strategy for single-instance deployments, running migrations as PreSync hooks, and setting up automated backups. For production, use an operator like CloudNativePG that handles replication, failover, and backups automatically. The entire database infrastructure - from the operator to the cluster definition to the backup schedule - lives in Git and is managed through ArgoCD.
