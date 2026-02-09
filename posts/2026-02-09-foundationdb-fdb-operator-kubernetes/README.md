# How to Run FoundationDB on Kubernetes with the FDB Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, FoundationDB, Database Operators

Description: Deploy and manage FoundationDB clusters on Kubernetes using the FDB Operator for distributed transactional key-value storage with ACID guarantees.

---

FoundationDB is a distributed database that provides strong ACID guarantees and incredible performance for transactional workloads. Running it on Kubernetes used to be challenging, but the FoundationDB Operator simplifies deployment and operations. This guide shows you how to deploy a production-ready FDB cluster on Kubernetes with proper configuration and monitoring.

## Why FoundationDB on Kubernetes

FoundationDB excels at workloads requiring strict consistency and high transaction rates. It powers applications at Apple, Snowflake, and other companies with demanding data requirements. Kubernetes provides orchestration benefits like automated failover, rolling updates, and declarative configuration management.

The FDB Operator handles cluster formation, membership changes, and upgrades automatically. It monitors process health and coordinates recovery when nodes fail. This combination gives you a highly available distributed database with minimal operational overhead.

## Installing the FDB Operator

Start by installing the operator and its custom resource definitions:

```bash
# Create namespace for FDB operator
kubectl create namespace fdb-system

# Install CRDs
kubectl apply -f https://raw.githubusercontent.com/FoundationDB/fdb-kubernetes-operator/main/config/crd/bases/apps.foundationdb.org_foundationdbclusters.yaml
kubectl apply -f https://raw.githubusercontent.com/FoundationDB/fdb-kubernetes-operator/main/config/crd/bases/apps.foundationdb.org_foundationdbbackups.yaml
kubectl apply -f https://raw.githubusercontent.com/FoundationDB/fdb-kubernetes-operator/main/config/crd/bases/apps.foundationdb.org_foundationdbrestores.yaml

# Deploy operator
kubectl apply -f https://raw.githubusercontent.com/FoundationDB/fdb-kubernetes-operator/main/config/samples/deployment.yaml

# Verify operator is running
kubectl get pods -n fdb-system
```

The operator watches for FoundationDBCluster resources and manages the underlying pods and services. It uses the FDB CLI internally to configure clusters and monitor status.

## Creating a Basic FDB Cluster

Create a simple three-node cluster to get started:

```yaml
# fdb-cluster.yaml
apiVersion: apps.foundationdb.org/v1beta2
kind: FoundationDBCluster
metadata:
  name: fdb-cluster
  namespace: default
spec:
  version: 7.1.27

  # Process configuration
  processCounts:
    stateless: 3  # Transaction processing nodes
    storage: 3    # Storage nodes
    log: 3        # Write-ahead log nodes

  # Resource requirements per process
  processes:
    general:
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 16Gi
      podTemplate:
        spec:
          containers:
            - name: foundationdb
              resources:
                requests:
                  cpu: 1
                  memory: 2Gi
                limits:
                  cpu: 2
                  memory: 4Gi
            - name: foundationdb-kubernetes-sidecar
              resources:
                requests:
                  cpu: 100m
                  memory: 128Mi
                limits:
                  cpu: 200m
                  memory: 256Mi

  # Database configuration
  databaseConfiguration:
    redundancy_mode: triple  # Data replicated 3 times
    storage_engine: ssd-2
    usable_regions: 1

  # Routing configuration
  routing:
    defineDNSLocalityFields: false
    publicIPSource: pod
```

Apply this configuration:

```bash
kubectl apply -f fdb-cluster.yaml

# Watch cluster creation
kubectl get fdb fdb-cluster -w
```

The operator creates pods for each process type. Storage processes hold data, log processes handle transaction logs, and stateless processes coordinate transactions.

## Understanding Process Types

FoundationDB separates responsibilities across different process types. Each type has specific resource needs and scaling characteristics.

Storage processes need substantial disk I/O and capacity. They store the actual data and serve read requests. Use fast SSDs and size storage based on your dataset.

Log processes handle write-ahead logging for durability. They need good sequential write performance but less storage capacity. Typically, you need fewer log processes than storage processes.

Stateless processes coordinate transactions without storing data. They need CPU and memory but minimal storage. These scale horizontally to handle more concurrent transactions.

Here's a production configuration with optimized process counts:

```yaml
apiVersion: apps.foundationdb.org/v1beta2
kind: FoundationDBCluster
metadata:
  name: fdb-prod
  namespace: production
spec:
  version: 7.1.27

  processCounts:
    stateless: 6      # Handle transaction load
    storage: 9        # Data storage and serving
    log: 4            # Transaction logging
    cluster_controller: 1

  # Separate resource configurations per role
  processes:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: fast-ssd
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 100Gi
      podTemplate:
        spec:
          containers:
            - name: foundationdb
              resources:
                requests:
                  cpu: 2
                  memory: 8Gi
                limits:
                  cpu: 4
                  memory: 16Gi
          affinity:
            podAntiAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                - labelSelector:
                    matchExpressions:
                      - key: fdb-process-class
                        operator: In
                        values:
                          - storage
                  topologyKey: kubernetes.io/hostname

    log:
      volumeClaimTemplate:
        spec:
          storageClassName: fast-ssd
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 50Gi
      podTemplate:
        spec:
          containers:
            - name: foundationdb
              resources:
                requests:
                  cpu: 2
                  memory: 4Gi
                limits:
                  cpu: 4
                  memory: 8Gi

    stateless:
      podTemplate:
        spec:
          containers:
            - name: foundationdb
              resources:
                requests:
                  cpu: 1
                  memory: 2Gi
                limits:
                  cpu: 2
                  memory: 4Gi

  databaseConfiguration:
    redundancy_mode: triple
    storage_engine: ssd-2
    usable_regions: 1
```

## Configuring Storage Classes

Use appropriate storage classes for different process types. FDB storage processes benefit from low-latency SSDs:

```yaml
# storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs  # Or your cloud provider
parameters:
  type: io2
  iopsPerGB: "50"
  encrypted: "true"
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

Apply this before creating clusters:

```bash
kubectl apply -f storage-class.yaml
```

## Accessing the Cluster

The operator creates a service for client connections. Use the connection string from the cluster status:

```bash
# Get connection string
kubectl get fdb fdb-cluster -o jsonpath='{.status.connectionString}'
```

Create a client pod to interact with the database:

```yaml
# fdb-client.yaml
apiVersion: v1
kind: Pod
metadata:
  name: fdb-client
spec:
  containers:
  - name: fdb
    image: foundationdb/foundationdb:7.1.27
    command: ["/bin/bash", "-c", "sleep infinity"]
    env:
    - name: FDB_CLUSTER_FILE
      value: /etc/foundationdb/fdb.cluster
    volumeMounts:
    - name: config
      mountPath: /etc/foundationdb
  volumes:
  - name: config
    configMap:
      name: fdb-cluster-config
```

Connect and test:

```bash
kubectl exec -it fdb-client -- bash

# Inside the pod, use fdbcli
fdbcli

# Check cluster status
fdb> status
```

## Implementing Backup and Restore

Configure automated backups to blob storage. First, create credentials:

```yaml
# backup-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: fdb-backup-credentials
type: Opaque
stringData:
  credentials: |
    [default]
    aws_access_key_id = YOUR_ACCESS_KEY
    aws_secret_access_key = YOUR_SECRET_KEY
```

Create a backup resource:

```yaml
# fdb-backup.yaml
apiVersion: apps.foundationdb.org/v1beta2
kind: FoundationDBBackup
metadata:
  name: fdb-backup
spec:
  clusterName: fdb-cluster
  backupState: Running

  # Backup destination
  backupDeploymentName: backup-agents
  agentCount: 3

  # Storage configuration
  customParameters:
    - "blob_credentials=/etc/backup-credentials/credentials"

  podTemplateSpec:
    spec:
      containers:
        - name: foundationdb
          env:
            - name: FDB_BLOB_CREDENTIALS
              value: /etc/backup-credentials/credentials
          volumeMounts:
            - name: backup-credentials
              mountPath: /etc/backup-credentials
              readOnly: true
      volumes:
        - name: backup-credentials
          secret:
            secretName: fdb-backup-credentials
```

Start the backup:

```bash
kubectl apply -f backup-secret.yaml
kubectl apply -f fdb-backup.yaml

# Monitor backup progress
kubectl get fdbbackup fdb-backup -w
```

To restore from backup:

```yaml
# fdb-restore.yaml
apiVersion: apps.foundationdb.org/v1beta2
kind: FoundationDBRestore
metadata:
  name: fdb-restore
spec:
  clusterName: fdb-cluster
  backupURL: "blobstore://backup-bucket/fdb-backup?bucket=backups"
  customParameters:
    - "blob_credentials=/etc/backup-credentials/credentials"
```

## Upgrading FDB Versions

The operator handles rolling upgrades safely. Change the version in your cluster spec:

```bash
# Update cluster to new version
kubectl patch fdb fdb-cluster --type merge -p '{"spec":{"version":"7.1.30"}}'

# Watch upgrade progress
kubectl get fdb fdb-cluster -w
```

The operator upgrades processes one at a time, ensuring the cluster remains available. It waits for the cluster to achieve full replication before moving to the next process.

## Monitoring Cluster Health

Deploy a monitoring sidecar to export metrics:

```yaml
apiVersion: apps.foundationdb.org/v1beta2
kind: FoundationDBCluster
metadata:
  name: fdb-cluster
spec:
  # ... other configuration ...

  sidecarContainer:
    enableTls: false

  processes:
    general:
      podTemplate:
        spec:
          containers:
            - name: metrics-exporter
              image: foundationdb/fdb-prometheus-exporter:latest
              ports:
                - containerPort: 8080
                  name: metrics
              env:
                - name: FDB_CLUSTER_FILE
                  value: /etc/foundationdb/fdb.cluster
```

Key metrics to monitor:

- Process availability and health
- Transaction rate and latency
- Storage capacity and I/O utilization
- Replication status and lag

Query cluster status programmatically:

```bash
# Check if cluster is available
kubectl get fdb fdb-cluster -o jsonpath='{.status.health.available}'

# Get process count
kubectl get fdb fdb-cluster -o jsonpath='{.status.processCounts}'
```

## Scaling Operations

Scale your cluster by adjusting process counts:

```bash
# Add more storage capacity
kubectl patch fdb fdb-cluster --type merge \
  -p '{"spec":{"processCounts":{"storage":12}}}'

# Scale transaction processing
kubectl patch fdb fdb-cluster --type merge \
  -p '{"spec":{"processCounts":{"stateless":8}}}'
```

The operator handles adding new processes and rebalancing data automatically. For storage scaling, data redistributes across the new processes over time.

## Conclusion

The FoundationDB Operator makes running FDB on Kubernetes practical and manageable. It handles the complex coordination required for distributed database operations, from initial deployment through upgrades and scaling. By understanding process types and configuring appropriate resources, you can build a high-performance transactional database that leverages Kubernetes orchestration while maintaining FDB's strong consistency guarantees. Regular backups and monitoring ensure your cluster remains healthy and recoverable.
