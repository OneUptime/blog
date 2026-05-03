# How to Deploy MariaDB on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, MariaDB, Kubernetes, Database, Helm, Persistent Storage

Description: A step-by-step guide to deploying MariaDB on Rancher using Helm charts with persistent storage and proper configuration.

## Introduction

MariaDB is a popular open-source relational database that serves as a drop-in replacement for MySQL. Deploying it on Rancher gives you the benefits of Kubernetes orchestration-automated restarts, resource management, and scalability-while keeping your database operations straightforward.

## Prerequisites

- A running Rancher instance with at least one downstream cluster
- `kubectl` and `helm` configured to target your cluster
- A StorageClass available for persistent volumes

## Step 1: Add the Bitnami Helm Repository

Bitnami maintains a well-tested MariaDB Helm chart. Add the repository before deploying.

```bash
# Add and update the Bitnami Helm repository

helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

## Step 2: Create a Namespace

Keep database workloads isolated in their own namespace.

```bash
# Create a dedicated namespace for databases
kubectl create namespace databases
```

## Step 3: Create a Values File

A custom values file lets you override chart defaults without modifying the chart itself.

```yaml
# mariadb-values.yaml
auth:
  rootPassword: "your-secure-root-password"
  database: "appdb"
  username: "appuser"
  password: "your-secure-user-password"

primary:
  persistence:
    enabled: true
    storageClass: "longhorn"   # Replace with your StorageClass name
    size: 20Gi

  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "1Gi"
      cpu: "500m"

metrics:
  enabled: true   # Exposes Prometheus metrics
```

## Step 4: Deploy MariaDB

Install MariaDB using the values file you created.

```bash
# Deploy MariaDB into the databases namespace
helm install mariadb bitnami/mariadb \
  --namespace databases \
  --values mariadb-values.yaml \
  --version 23.0.1
```

## Step 5: Verify the Deployment

Check that the pod is running and the persistent volume claim is bound.

```bash
# Verify pod status
kubectl get pods -n databases

# Check PVC is bound
kubectl get pvc -n databases

# View logs to confirm startup
kubectl logs -n databases statefulset/mariadb -f
```

## Step 6: Connect to MariaDB

Use a temporary pod to test the connection from within the cluster.

```bash
# Launch a temporary MariaDB client pod
kubectl run mariadb-client --rm --tty -i \
  --restart='Never' \
  --image docker.io/bitnami/mariadb:latest \
  --namespace databases \
  --env MARIADB_ROOT_PASSWORD=your-secure-root-password \
  --command -- bash

# Inside the pod, connect to MariaDB
mysql -h mariadb.databases.svc.cluster.local -uroot -p
```

## Step 7: Expose MariaDB (Optional)

If external access is needed, expose the service via a LoadBalancer or NodePort-only do this on a private network.

```bash
# Patch the service type to LoadBalancer
kubectl patch svc mariadb -n databases \
  -p '{"spec": {"type": "LoadBalancer"}}'
```

## Monitoring with OneUptime

Once MariaDB is running, integrate with [OneUptime](https://oneuptime.com) to monitor database availability. Create a TCP monitor targeting the MariaDB service endpoint on port 3306 to receive alerts if the database becomes unreachable.

## Conclusion

You now have a production-ready MariaDB instance running on Rancher with persistent storage and resource limits. For high availability, consider the MariaDB Galera cluster chart (`bitnami/mariadb-galera`) which supports multi-primary replication across Kubernetes nodes.
