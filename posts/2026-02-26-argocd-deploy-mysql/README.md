# How to Deploy MySQL with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, MySQL, Database

Description: Learn how to deploy and manage MySQL on Kubernetes with ArgoCD, including standalone instances, InnoDB Cluster for HA, backups, and production configuration.

---

MySQL is one of the most widely used relational databases. Running MySQL on Kubernetes with ArgoCD lets you manage your database infrastructure the same way you manage your applications - through Git. This guide covers standalone deployments, high-availability setups with MySQL InnoDB Cluster, and production best practices.

## Standalone MySQL Deployment

For development or small workloads, deploy a single MySQL instance:

```yaml
# apps/mysql/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysql-credentials
  annotations:
    argocd.argoproj.io/sync-wave: "-3"
type: Opaque
stringData:
  MYSQL_ROOT_PASSWORD: changeme-root
  MYSQL_USER: myapp
  MYSQL_PASSWORD: changeme-app
  MYSQL_DATABASE: myapp
---
# apps/mysql/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-config
  annotations:
    argocd.argoproj.io/sync-wave: "-3"
data:
  my.cnf: |
    [mysqld]
    # InnoDB settings
    innodb_buffer_pool_size = 1G
    innodb_log_file_size = 256M
    innodb_flush_log_at_trx_commit = 1
    innodb_flush_method = O_DIRECT

    # Connection settings
    max_connections = 200
    max_allowed_packet = 64M

    # Character set
    character-set-server = utf8mb4
    collation-server = utf8mb4_unicode_ci

    # Logging
    slow_query_log = 1
    slow_query_log_file = /var/log/mysql/slow.log
    long_query_time = 1

    # Performance
    table_open_cache = 4000
    thread_cache_size = 16
---
# apps/mysql/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-data
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
# apps/mysql/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  replicas: 1
  strategy:
    type: Recreate  # Required for single-instance with PVC
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          ports:
            - containerPort: 3306
          envFrom:
            - secretRef:
                name: mysql-credentials
          volumeMounts:
            - name: data
              mountPath: /var/lib/mysql
            - name: config
              mountPath: /etc/mysql/conf.d
            - name: logs
              mountPath: /var/log/mysql
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
                - mysqladmin
                - ping
                - -h
                - localhost
                - -u
                - root
                - -p$(MYSQL_ROOT_PASSWORD)
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            exec:
              command:
                - mysqladmin
                - ping
                - -h
                - localhost
                - -u
                - root
                - -p$(MYSQL_ROOT_PASSWORD)
            initialDelaySeconds: 30
            periodSeconds: 30
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: mysql-data
        - name: config
          configMap:
            name: mysql-config
        - name: logs
          emptyDir: {}
---
# apps/mysql/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  selector:
    app: mysql
  ports:
    - port: 3306
      targetPort: 3306
```

## ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: mysql
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops
    targetRevision: main
    path: apps/mysql
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

## MySQL with Helm Chart

The Bitnami MySQL chart provides replication and monitoring:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: mysql
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://charts.bitnami.com/bitnami
    chart: mysql
    targetRevision: 9.15.0
    helm:
      values: |
        auth:
          rootPassword: changeme-root
          database: myapp
          username: myapp
          password: changeme-app

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
          configuration: |
            [mysqld]
            innodb_buffer_pool_size=1G
            max_connections=200
            character-set-server=utf8mb4

        # Enable read replicas
        secondary:
          replicaCount: 2
          persistence:
            enabled: true
            storageClass: fast-ssd
            size: 50Gi
          resources:
            requests:
              cpu: 250m
              memory: 512Mi

        metrics:
          enabled: true
          serviceMonitor:
            enabled: true
  destination:
    server: https://kubernetes.default.svc
    namespace: databases
  syncPolicy:
    automated:
      prune: false
      selfHeal: true
```

## High-Availability with MySQL Operator

Oracle's MySQL Operator for Kubernetes provides InnoDB Cluster with automatic failover:

```yaml
# Step 1: Deploy the operator
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: mysql-operator
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-5"
spec:
  project: default
  source:
    repoURL: https://mysql.github.io/mysql-operator/
    chart: mysql-operator
    targetRevision: 2.1.2
  destination:
    server: https://kubernetes.default.svc
    namespace: mysql-operator
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

```yaml
# Step 2: Deploy an InnoDB Cluster
# apps/mysql-ha/cluster.yaml
apiVersion: mysql.oracle.com/v2
kind: InnoDBCluster
metadata:
  name: mysql-ha
  namespace: databases
spec:
  # 3 instances for HA
  instances: 3

  # MySQL Router for connection routing
  router:
    instances: 2

  # TLS configuration
  tlsUseSelfSigned: true

  # Secret with root credentials
  secretName: mysql-cluster-secret

  # Storage
  datadirVolumeClaimTemplate:
    accessModes:
      - ReadWriteOnce
    resources:
      requests:
        storage: 100Gi
    storageClassName: fast-ssd

  # MySQL configuration
  mycnf: |
    [mysqld]
    innodb_buffer_pool_size=2G
    max_connections=300
    character_set_server=utf8mb4
    collation_server=utf8mb4_unicode_ci
    innodb_flush_log_at_trx_commit=1
    sync_binlog=1
---
# Secret for the cluster
apiVersion: v1
kind: Secret
metadata:
  name: mysql-cluster-secret
  namespace: databases
type: Opaque
stringData:
  rootUser: root
  rootHost: "%"
  rootPassword: changeme-production
```

## MySQL Replication with StatefulSet

For a manual replication setup without an operator:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql-headless
  replicas: 3
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      initContainers:
        # Assign server-id based on pod ordinal
        - name: init-mysql
          image: mysql:8.0
          command: [sh, -c]
          args:
            - |
              # Extract ordinal from hostname
              ORDINAL=$(echo $HOSTNAME | grep -o '[0-9]*$')
              # Server ID must be unique and non-zero
              SERVER_ID=$((ORDINAL + 1))
              echo "[mysqld]" > /mnt/conf.d/server-id.cnf
              echo "server-id=$SERVER_ID" >> /mnt/conf.d/server-id.cnf

              # First pod is primary, others are replicas
              if [ "$ORDINAL" -eq 0 ]; then
                echo "log-bin=mysql-bin" >> /mnt/conf.d/server-id.cnf
              else
                echo "super-read-only" >> /mnt/conf.d/server-id.cnf
              fi
          volumeMounts:
            - name: conf
              mountPath: /mnt/conf.d
      containers:
        - name: mysql
          image: mysql:8.0
          ports:
            - containerPort: 3306
          env:
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-credentials
                  key: MYSQL_ROOT_PASSWORD
          volumeMounts:
            - name: data
              mountPath: /var/lib/mysql
            - name: conf
              mountPath: /etc/mysql/conf.d
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
      volumes:
        - name: conf
          emptyDir: {}
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
# Headless service for StatefulSet DNS
apiVersion: v1
kind: Service
metadata:
  name: mysql-headless
spec:
  clusterIP: None
  selector:
    app: mysql
  ports:
    - port: 3306
---
# Regular service pointing to primary (pod-0)
apiVersion: v1
kind: Service
metadata:
  name: mysql-primary
spec:
  selector:
    app: mysql
    statefulset.kubernetes.io/pod-name: mysql-0
  ports:
    - port: 3306
```

## Database Migrations

Run migrations as ArgoCD PreSync hooks:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: mysql-migration
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
          command: ["./run-migrations.sh"]
          env:
            - name: DB_HOST
              value: mysql.databases.svc
            - name: DB_PORT
              value: "3306"
            - name: DB_NAME
              value: myapp
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: mysql-credentials
                  key: MYSQL_USER
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-credentials
                  key: MYSQL_PASSWORD
      restartPolicy: Never
```

## Automated Backups

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mysql-backup
spec:
  schedule: "0 3 * * *"  # 3 AM daily
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: mysql:8.0
              command: [sh, -c]
              args:
                - |
                  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
                  mysqldump \
                    -h mysql.databases.svc \
                    -u root \
                    -p${MYSQL_ROOT_PASSWORD} \
                    --all-databases \
                    --single-transaction \
                    --routines \
                    --triggers \
                    --events \
                    > /backup/full_backup_${TIMESTAMP}.sql

                  gzip /backup/full_backup_${TIMESTAMP}.sql

                  # Upload to object storage
                  aws s3 cp /backup/full_backup_${TIMESTAMP}.sql.gz \
                    s3://mysql-backups/daily/

                  echo "Backup completed successfully"
              env:
                - name: MYSQL_ROOT_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: mysql-credentials
                      key: MYSQL_ROOT_PASSWORD
              volumeMounts:
                - name: backup
                  mountPath: /backup
          volumes:
            - name: backup
              emptyDir: {}
          restartPolicy: OnFailure
```

## Monitoring MySQL

Deploy MySQL Exporter for Prometheus metrics:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql-exporter
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql-exporter
  template:
    metadata:
      labels:
        app: mysql-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9104"
    spec:
      containers:
        - name: exporter
          image: prom/mysqld-exporter:v0.15.1
          ports:
            - containerPort: 9104
          env:
            - name: DATA_SOURCE_NAME
              value: "exporter:exporterpass@(mysql.databases.svc:3306)/"
```

## Summary

Deploying MySQL with ArgoCD gives you version-controlled database infrastructure from simple standalone instances to production HA clusters. For development, a plain Deployment with Recreate strategy works well. For production, use the MySQL Operator for InnoDB Cluster with automatic failover, or the Bitnami Helm chart for managed replication. Always disable auto-prune for database resources, use PreSync hooks for migrations, and set up automated backups with CronJobs. The entire database lifecycle - provisioning, configuration, migration, and backup scheduling - is declared in Git and managed through ArgoCD.
