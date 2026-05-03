# How to Set Up Database Operators in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes Operator, Database, PostgreSQL, MySQL, Operator Pattern

Description: Learn how to install and configure Kubernetes database operators in Rancher to automate database provisioning, backups, and failover.

## Introduction

Kubernetes Operators extend the Kubernetes API with custom resources for managing stateful applications. Database operators automate day-2 operations like backups, failover, scaling, and version upgrades-tasks that are error-prone when done manually.

## Popular Database Operators

| Operator | Database | Repository |
|---|---|---|
| CloudNativePG | PostgreSQL | cloudnative-pg/cloudnative-pg |
| PXC Operator | MySQL/Percona | percona/percona-xtradb-cluster-operator |
| Zalando Postgres | PostgreSQL | zalando/postgres-operator |
| MongoDB Community | MongoDB | mongodb/mongodb-kubernetes-operator |

## Step 1: Install CloudNativePG Operator

CloudNativePG is a CNCF sandbox operator for PostgreSQL. Install it cluster-wide via Helm.

```bash
# Add the CloudNativePG repository

helm repo add cnpg https://cloudnative-pg.github.io/charts
helm repo update

# Install the operator into its own namespace
helm install cnpg cnpg/cloudnative-pg \
  --namespace cnpg-system \
  --create-namespace
```

## Step 2: Verify the Operator is Running

```bash
# Check the operator deployment
kubectl get deployment -n cnpg-system

# Confirm the CRDs were registered
kubectl get crd | grep postgresql
```

## Step 3: Create a PostgreSQL Cluster

With the operator running, you can create a PostgreSQL cluster using a custom resource.

```yaml
# postgres-cluster.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-cluster
  namespace: databases
spec:
  instances: 3   # One primary, two standbys

  storage:
    size: 20Gi
    storageClass: longhorn

  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"

  bootstrap:
    initdb:
      database: appdb
      owner: appuser
      secret:
        name: app-credentials   # Must exist before applying

  backup:
    barmanObjectStore:
      destinationPath: "s3://my-bucket/postgres-backups"
      s3Credentials:
        accessKeyId:
          name: s3-creds
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: s3-creds
          key: SECRET_ACCESS_KEY
```

```bash
# Apply the cluster definition
kubectl apply -f postgres-cluster.yaml
```

## Step 4: Monitor the Cluster

```bash
# Watch cluster events
kubectl describe cluster postgres-cluster -n databases

# Get cluster status
kubectl get cluster postgres-cluster -n databases -o jsonpath='{.status.phase}'
```

## Step 5: Install the Percona MySQL Operator

For MySQL, the Percona XtraDB Cluster Operator provides multi-primary replication.

```bash
# Deploy the Percona MySQL operator
kubectl apply --server-side -f https://raw.githubusercontent.com/percona/percona-xtradb-cluster-operator/main/deploy/bundle.yaml \
  --namespace databases
```

## Operator Lifecycle Management via Rancher Apps

Rancher's Apps & Marketplace is built on Helm 3 and provides a curated catalog of charts you can install graphically with version management. Navigate to **Apps > Charts** in the Rancher UI and search for your database operator's Helm chart to install it.

## Conclusion

Database operators dramatically reduce operational overhead by automating lifecycle management. CloudNativePG is the recommended choice for PostgreSQL due to its active CNCF community and rich feature set including streaming replication, automated failover, and integrated backup management.
