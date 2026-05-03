# How to Deploy CockroachDB on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, CockroachDB, Kubernetes, Distributed Database, Helm, High Availability

Description: Learn how to deploy a distributed CockroachDB cluster on Rancher with persistent storage, TLS, and proper resource configuration.

## Introduction

CockroachDB is a distributed SQL database built for cloud-native environments. Its multi-region replication and automatic failover make it a strong choice for applications requiring high availability. Running it on Rancher provides additional operational benefits through Kubernetes orchestration.

## Prerequisites

- Rancher cluster with at least three worker nodes (one per CockroachDB replica)
- `kubectl` and `helm` CLI tools
- A StorageClass that supports `ReadWriteOnce` volumes

## Step 1: Add the CockroachDB Helm Repository

```bash
# Add the CockroachDB Helm chart repository

helm repo add cockroachdb https://charts.cockroachdb.com/
helm repo update
```

## Step 2: Create Namespace and Values File

```bash
kubectl create namespace cockroachdb
```

Create a values file to configure the cluster size and storage:

```yaml
# cockroachdb-values.yaml
statefulset:
  replicas: 3    # Deploy 3 replicas for HA

storage:
  persistentVolume:
    enabled: true
    size: 50Gi
    storageClass: "longhorn"   # Use your cluster's StorageClass

tls:
  enabled: true   # Enable TLS for inter-node and client communication

conf:
  cache: "25%"
  max-sql-memory: "25%"

resources:
  requests:
    cpu: "500m"
    memory: "1Gi"
  limits:
    cpu: "2"
    memory: "4Gi"
```

## Step 3: Deploy CockroachDB

```bash
# Install CockroachDB with the custom values
helm install cockroachdb cockroachdb/cockroachdb \
  --namespace cockroachdb \
  --values cockroachdb-values.yaml
```

## Step 4: Verify the StatefulSet

CockroachDB deploys as a StatefulSet. Check that all pods reach the Running state.

```bash
# Watch StatefulSet pod startup
kubectl get pods -n cockroachdb -w

# View StatefulSet details
kubectl describe statefulset cockroachdb -n cockroachdb
```

## Step 5: Verify Cluster Initialization

The Helm chart automatically runs a post-install Job (named `cockroachdb-init`) that initializes the cluster when `statefulset.replicas` is greater than 1. Confirm it completed successfully.

```bash
# Check that the init job finished
kubectl get jobs -n cockroachdb
kubectl logs -l job-name=cockroachdb-init -n cockroachdb
```

## Step 6: Access the Admin UI

CockroachDB includes a web-based admin console. Port-forward to access it locally.

```bash
# Forward port 8080 to access the admin UI
kubectl port-forward svc/cockroachdb-public 8080 -n cockroachdb
# Open https://localhost:8080 in your browser (TLS is enabled)
```

## Step 7: Create a Database User

```bash
# Connect to the running CockroachDB pod (TLS is enabled, so use --certs-dir)
kubectl exec -it cockroachdb-0 -n cockroachdb -- \
  ./cockroach sql --certs-dir=/cockroach/cockroach-certs --host=cockroachdb-public

-- Inside the SQL shell, create a database and user
CREATE DATABASE myapp;
CREATE USER appuser WITH PASSWORD 'securepassword';
GRANT ALL ON DATABASE myapp TO appuser;
```

## Conclusion

Your CockroachDB cluster is now running on Rancher with persistent storage and TLS enabled. The StatefulSet ensures each replica has stable network identities and persistent storage. Monitor cluster health through the built-in Admin UI or integrate with Prometheus using the chart's built-in metrics exporter.
