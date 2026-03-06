# How to Deploy MySQL Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, mysql, kubernetes, database, gitops, operator, innodb cluster, mysql-operator

Description: A hands-on guide to deploying the MySQL Operator for Kubernetes using Flux CD to manage MySQL InnoDB Clusters through GitOps workflows.

---

## Introduction

The MySQL Operator for Kubernetes manages MySQL InnoDB Clusters and MySQL Router instances within a Kubernetes cluster. It automates the deployment, scaling, backup, and recovery of MySQL database instances with built-in high availability through MySQL Group Replication.

This guide covers deploying the MySQL Operator with Flux CD, creating InnoDB Clusters, configuring backups, and managing MySQL databases using GitOps.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped on your cluster
- A storage class that supports dynamic provisioning
- kubectl configured to access your cluster
- A Git repository connected to Flux CD

## Repository Structure

```
clusters/
  my-cluster/
    databases/
      mysql/
        namespace.yaml
        helmrepository.yaml
        helmrelease.yaml
        credentials.yaml
        innodbcluster.yaml
        backup.yaml
        kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/databases/mysql/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mysql
  labels:
    app.kubernetes.io/name: mysql-operator
    app.kubernetes.io/part-of: database
```

## Step 2: Add the MySQL Operator Helm Repository

```yaml
# clusters/my-cluster/databases/mysql/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: mysql-operator
  namespace: mysql
spec:
  interval: 1h
  # Official MySQL Operator Helm chart repository
  url: https://mysql.github.io/mysql-operator/
```

## Step 3: Deploy the MySQL Operator

```yaml
# clusters/my-cluster/databases/mysql/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: mysql-operator
  namespace: mysql
spec:
  interval: 30m
  chart:
    spec:
      chart: mysql-operator
      version: "2.1.x"
      sourceRef:
        kind: HelmRepository
        name: mysql-operator
        namespace: mysql
  timeout: 10m
  values:
    # Resource limits for the operator pod
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
    # Number of operator replicas for high availability
    replicas: 1
    # Image pull policy
    image:
      pullPolicy: IfNotPresent
```

## Step 4: Create Database Credentials

```yaml
# clusters/my-cluster/databases/mysql/credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysql-root-credentials
  namespace: mysql
type: Opaque
stringData:
  # Root user password for the InnoDB Cluster
  rootUser: root
  rootHost: "%"
  rootPassword: "change-me-to-a-strong-password"
---
apiVersion: v1
kind: Secret
metadata:
  name: mysql-app-credentials
  namespace: mysql
type: Opaque
stringData:
  # Application user credentials
  rootUser: app_user
  rootHost: "%"
  rootPassword: "change-me-app-password"
```

## Step 5: Deploy a MySQL InnoDB Cluster

```yaml
# clusters/my-cluster/databases/mysql/innodbcluster.yaml
apiVersion: mysql.oracle.com/v2
kind: InnoDBCluster
metadata:
  name: mysql-cluster
  namespace: mysql
spec:
  # Number of MySQL server instances (minimum 3 for Group Replication)
  instances: 3
  # Secret containing root credentials
  secretName: mysql-root-credentials

  # TLS configuration
  tlsUseSelfSigned: true

  # MySQL version
  version: "8.4.0"

  # MySQL Router configuration for connection routing
  router:
    instances: 2
    # Resource limits for MySQL Router
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi

  # Data storage configuration
  datadirVolumeClaimTemplate:
    accessModes:
      - ReadWriteOnce
    resources:
      requests:
        storage: 20Gi
    storageClassName: standard

  # MySQL configuration overrides
  mycnf: |
    [mysqld]
    # InnoDB buffer pool size (adjust based on available memory)
    innodb_buffer_pool_size=512M
    innodb_buffer_pool_instances=4

    # Binary log configuration
    binlog_expire_logs_seconds=604800
    max_binlog_size=256M

    # Connection settings
    max_connections=500
    max_connect_errors=1000

    # Query cache and performance settings
    tmp_table_size=64M
    max_heap_table_size=64M

    # Slow query log
    slow_query_log=ON
    long_query_time=2

    # Character set
    character_set_server=utf8mb4
    collation_server=utf8mb4_unicode_ci

  # Resource limits for MySQL server pods
  podSpec:
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: "2"
        memory: 4Gi
    # Spread instances across different nodes
    affinity:
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  mysql.oracle.com/cluster: mysql-cluster
              topologyKey: kubernetes.io/hostname
```

## Step 6: Configure Backup Schedule

```yaml
# clusters/my-cluster/databases/mysql/backup.yaml
# S3 credentials for backup storage
apiVersion: v1
kind: Secret
metadata:
  name: mysql-backup-s3-credentials
  namespace: mysql
type: Opaque
stringData:
  # S3 credentials for backup destination
  credentials: |
    [default]
    aws_access_key_id=your-access-key
    aws_secret_access_key=your-secret-key
---
# Backup profile configuration
apiVersion: mysql.oracle.com/v2
kind: MySQLBackup
metadata:
  name: mysql-cluster-full-backup
  namespace: mysql
spec:
  # Reference to the InnoDB Cluster
  clusterName: mysql-cluster
  # Backup profile to use
  backupProfile:
    name: full-s3-backup
    dumpInstance:
      storage:
        s3:
          bucketName: mysql-backups
          prefix: /mysql-cluster/full
          endpoint: https://s3.amazonaws.com
          config: mysql-backup-s3-credentials
          profile: default
---
# Scheduled backup using a CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mysql-scheduled-backup
  namespace: mysql
spec:
  # Run daily at 3 AM UTC
  schedule: "0 3 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: mysql-operator-sa
          restartPolicy: OnFailure
          containers:
            - name: backup-trigger
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Create a MySQLBackup resource with timestamp
                  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
                  cat <<YAML | kubectl apply -f -
                  apiVersion: mysql.oracle.com/v2
                  kind: MySQLBackup
                  metadata:
                    name: backup-${TIMESTAMP}
                    namespace: mysql
                  spec:
                    clusterName: mysql-cluster
                    backupProfile:
                      name: scheduled-backup
                      dumpInstance:
                        storage:
                          s3:
                            bucketName: mysql-backups
                            prefix: /mysql-cluster/scheduled/${TIMESTAMP}
                            endpoint: https://s3.amazonaws.com
                            config: mysql-backup-s3-credentials
                            profile: default
                  YAML
```

## Step 7: Create a Service for Application Access

```yaml
# clusters/my-cluster/databases/mysql/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql-cluster-primary
  namespace: mysql
  labels:
    app: mysql-cluster
    role: primary
spec:
  # Route traffic to the MySQL Router for automatic failover
  selector:
    component: mysqlrouter
    mysql.oracle.com/cluster: mysql-cluster
  ports:
    - name: mysql
      port: 3306
      targetPort: 6446
      protocol: TCP
    - name: mysql-readonly
      port: 3307
      targetPort: 6447
      protocol: TCP
  type: ClusterIP
```

## Step 8: Create the Kustomization

```yaml
# clusters/my-cluster/databases/mysql/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
  - credentials.yaml
  - innodbcluster.yaml
  - backup.yaml
  - service.yaml
```

## Step 9: Create the Flux Kustomization

```yaml
# clusters/my-cluster/databases/mysql-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: mysql
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/databases/mysql
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: mysql-operator
      namespace: mysql
  timeout: 20m
```

## Verify the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations mysql

# Verify the operator pod
kubectl get pods -n mysql -l name=mysql-operator

# Check InnoDB Cluster status
kubectl get innodbcluster -n mysql

# View detailed cluster status
kubectl describe innodbcluster mysql-cluster -n mysql

# Check all MySQL pods
kubectl get pods -n mysql

# Connect to MySQL via the Router
kubectl run mysql-client --rm -it --restart=Never \
  --image=mysql:8.4 --namespace=mysql -- \
  mysql -h mysql-cluster -u root -p

# Check Group Replication status from inside MySQL
# SELECT * FROM performance_schema.replication_group_members;
```

## Scaling the Cluster

To scale the MySQL InnoDB Cluster, update the `instances` field in the InnoDBCluster manifest and push to Git:

```yaml
spec:
  # Scale from 3 to 5 instances
  instances: 5
```

Flux CD will detect the change and apply it automatically.

## Troubleshooting

1. **Instances not joining the group**: Check that all pods can communicate on the Group Replication ports (33061). Verify network policies allow inter-pod communication.

2. **Router not routing traffic**: Ensure the Router pods are running and check their logs with `kubectl logs -n mysql -l component=mysqlrouter`.

3. **Backup failures**: Verify S3 credentials and bucket permissions. Check the backup job logs for detailed error messages.

```bash
# Check operator logs
kubectl logs -n mysql -l name=mysql-operator --tail=100

# Check MySQL server logs
kubectl logs -n mysql mysql-cluster-0 --tail=100

# Check backup status
kubectl get mysqlbackup -n mysql
```

## Conclusion

You have successfully deployed a MySQL InnoDB Cluster on Kubernetes using the MySQL Operator and Flux CD. The setup provides high availability through Group Replication, automatic connection routing via MySQL Router, and scheduled backups to S3 -- all managed declaratively through your Git repository.
