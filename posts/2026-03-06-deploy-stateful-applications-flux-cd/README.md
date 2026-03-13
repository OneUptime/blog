# How to Deploy Stateful Applications with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, StatefulSets, Stateful Applications, GitOps, Database

Description: A practical guide to deploying and managing stateful applications like databases and message queues using Flux CD and StatefulSets.

---

## Introduction

Stateful applications such as databases, message queues, and caches require persistent storage, stable network identities, and ordered deployment. Kubernetes StatefulSets provide these guarantees, and Flux CD can manage them through GitOps workflows.

This guide covers practical patterns for deploying stateful applications with Flux CD while handling the unique challenges that stateful workloads present.

## Prerequisites

- A Kubernetes cluster (v1.26+) with a StorageClass configured
- Flux CD installed and bootstrapped
- A Git repository connected to Flux

## Repository Structure

```text
clusters/
  my-cluster/
    infrastructure.yaml
    apps.yaml
infrastructure/
  storage/
    storage-class.yaml
apps/
  postgres/
    namespace.yaml
    statefulset.yaml
    service.yaml
    configmap.yaml
  redis/
    namespace.yaml
    statefulset.yaml
    service.yaml
```

## Deploying a PostgreSQL StatefulSet

### Namespace and ConfigMap

```yaml
# apps/postgres/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: postgres
  labels:
    app.kubernetes.io/managed-by: flux
---
# apps/postgres/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: postgres
data:
  # PostgreSQL configuration parameters
  POSTGRES_DB: "appdb"
  POSTGRES_USER: "appuser"
  PGDATA: "/var/lib/postgresql/data/pgdata"
  # Custom postgresql.conf settings
  postgresql.conf: |
    max_connections = 200
    shared_buffers = 256MB
    effective_cache_size = 768MB
    maintenance_work_mem = 128MB
    checkpoint_completion_target = 0.9
    wal_buffers = 16MB
    default_statistics_target = 100
    random_page_cost = 1.1
    effective_io_concurrency = 200
    work_mem = 4MB
    min_wal_size = 1GB
    max_wal_size = 4GB
```

### StatefulSet Definition

```yaml
# apps/postgres/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: postgres
  labels:
    app: postgres
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  # OrderedReady ensures pods are created and deleted sequentially
  podManagementPolicy: OrderedReady
  # RollingUpdate strategy with partition for staged rollouts
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
  template:
    metadata:
      labels:
        app: postgres
    spec:
      # Prevent multiple postgres pods on the same node
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - postgres
              topologyKey: kubernetes.io/hostname
      # Graceful shutdown for PostgreSQL
      terminationGracePeriodSeconds: 120
      containers:
        - name: postgres
          image: postgres:16.2
          ports:
            - containerPort: 5432
              name: postgres
          envFrom:
            - configMapRef:
                name: postgres-config
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
          # Resource limits appropriate for a database workload
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
          # Readiness probe ensures traffic only goes to ready instances
          readinessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - appuser
                - -d
                - appdb
            initialDelaySeconds: 15
            periodSeconds: 10
            timeoutSeconds: 5
          # Liveness probe restarts unhealthy pods
          livenessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - appuser
            initialDelaySeconds: 30
            periodSeconds: 20
            timeoutSeconds: 5
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
            - name: postgres-config-volume
              mountPath: /etc/postgresql/postgresql.conf
              subPath: postgresql.conf
      volumes:
        - name: postgres-config-volume
          configMap:
            name: postgres-config
            items:
              - key: postgresql.conf
                path: postgresql.conf
  # VolumeClaimTemplates create a PVC for each pod in the StatefulSet
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi
```

### Headless Service for Stable Network Identity

```yaml
# apps/postgres/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: postgres
  labels:
    app: postgres
spec:
  # Headless service gives each pod a stable DNS name
  # postgres-0.postgres.postgres.svc.cluster.local
  clusterIP: None
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
      name: postgres
---
# Read-write service pointing to the primary
apiVersion: v1
kind: Service
metadata:
  name: postgres-primary
  namespace: postgres
spec:
  selector:
    app: postgres
    role: primary
  ports:
    - port: 5432
      targetPort: 5432
```

## Flux Kustomization for Stateful Apps

```yaml
# clusters/my-cluster/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: stateful-apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/postgres
  prune: false  # Do not prune stateful workloads automatically
  wait: true
  timeout: 10m  # Longer timeout for stateful apps
  # Health checks specific to StatefulSets
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: postgres
      namespace: postgres
```

## Deploying Redis with Sentinel

```yaml
# apps/redis/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: redis
spec:
  serviceName: redis
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      # Init container to configure redis role based on ordinal index
      initContainers:
        - name: config
          image: redis:7.2
          command: ["sh", "-c"]
          args:
            - |
              # Determine if this is the primary or a replica
              # Pod ordinal 0 is always the primary
              ORDINAL=$(echo $HOSTNAME | rev | cut -d'-' -f1 | rev)
              if [ "$ORDINAL" = "0" ]; then
                echo "Setting up as primary"
                cp /mnt/config/redis-primary.conf /etc/redis/redis.conf
              else
                echo "Setting up as replica of redis-0"
                cp /mnt/config/redis-replica.conf /etc/redis/redis.conf
              fi
          volumeMounts:
            - name: redis-config
              mountPath: /etc/redis
            - name: config-template
              mountPath: /mnt/config
      containers:
        - name: redis
          image: redis:7.2
          command: ["redis-server", "/etc/redis/redis.conf"]
          ports:
            - containerPort: 6379
              name: redis
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "1"
              memory: "2Gi"
          readinessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 5
            periodSeconds: 10
          volumeMounts:
            - name: redis-data
              mountPath: /data
            - name: redis-config
              mountPath: /etc/redis
      volumes:
        - name: config-template
          configMap:
            name: redis-config
        - name: redis-config
          emptyDir: {}
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 10Gi
```

## Handling Secrets with SOPS

Store database credentials securely using Mozilla SOPS:

```yaml
# apps/postgres/secret.yaml (encrypted with SOPS)
apiVersion: v1
kind: Secret
metadata:
  name: postgres-credentials
  namespace: postgres
type: Opaque
stringData:
  password: ENC[AES256_GCM,data:encrypted-password-here,type:str]
  replication-password: ENC[AES256_GCM,data:encrypted-repl-pass,type:str]
sops:
  kms: []
  gcp_kms: []
  azure_kv: []
  age:
    - recipient: age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
      enc: |
        -----BEGIN AGE ENCRYPTED FILE-----
        ...
        -----END AGE ENCRYPTED FILE-----
  lastmodified: "2026-03-06T00:00:00Z"
  version: 3.8.1
```

Enable SOPS decryption in your Kustomization:

```yaml
# clusters/my-cluster/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: stateful-apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/postgres
  prune: false
  # Enable SOPS decryption for secrets
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Backup Strategy with CronJobs

Pair your StatefulSet with a backup CronJob managed by Flux:

```yaml
# apps/postgres/backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: postgres
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:16.2
              command: ["/bin/sh", "-c"]
              args:
                - |
                  # Connect to the primary and create a backup
                  PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
                    -h postgres-0.postgres.postgres.svc.cluster.local \
                    -U appuser \
                    -d appdb \
                    --format=custom \
                    --file=/backups/backup-$(date +%Y%m%d-%H%M%S).dump
              env:
                - name: POSTGRES_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: postgres-credentials
                      key: password
              volumeMounts:
                - name: backup-storage
                  mountPath: /backups
          restartPolicy: OnFailure
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: postgres-backups
```

## Update Strategy for Stateful Applications

Use the partition-based rolling update to safely upgrade stateful applications:

```yaml
# Staged rollout: update only the last replica first
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: postgres
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      # Only update pods with ordinal >= 2 (the last replica)
      # After verifying, change to 1, then 0
      partition: 2
```

## Notifications for Stateful App Changes

```yaml
# clusters/my-cluster/notifications.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: stateful-app-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: stateful-apps
  summary: "Stateful application deployment alert"
```

## Summary

Deploying stateful applications with Flux CD requires additional care compared to stateless workloads:

- Use `prune: false` to prevent accidental deletion of stateful resources
- Configure pod anti-affinity to spread replicas across nodes
- Use headless services for stable DNS names
- Set appropriate termination grace periods for graceful shutdown
- Implement backup strategies alongside your StatefulSet deployments
- Use partition-based rolling updates for staged rollouts
- Encrypt secrets with SOPS for secure credential management
