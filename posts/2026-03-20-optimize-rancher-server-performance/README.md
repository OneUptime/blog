# How to Optimize Rancher Server Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Performance, Optimization, Server Tuning, etcd, Kubernetes

Description: Optimize Rancher Server performance by tuning resource allocations, etcd configuration, database settings, and caching to handle large numbers of clusters and resources.

## Introduction

Rancher Server performance degrades as the number of managed clusters and Kubernetes resources grows. Common symptoms include slow UI response, delayed event processing, and high CPU usage on the Rancher Server pods. This guide covers key optimization areas.

## Step 1: Increase Rancher Server Resources

Rancher Server's resource requests are often too low for large deployments:

```yaml
# rancher-values.yaml (helm upgrade)

resources:
  requests:
    cpu: "2"
    memory: "4Gi"
  limits:
    cpu: "4"
    memory: "8Gi"

# Scale to multiple replicas for HA
replicas: 3
```

```bash
helm upgrade rancher rancher-stable/rancher \
  --namespace cattle-system \
  --values rancher-values.yaml
```

## Step 2: Tune Rancher Environment Variables

Key Rancher tuning parameters are set via environment variables:

```yaml
# rancher-values.yaml additions
extraEnv:
  - name: CATTLE_AGENT_IMAGE
    value: "rancher/rancher-agent:v2.9.0"
  # Disable the periodic full resync of objects (runs every 10 hours by default).
  # Accepts a comma-separated list of controller types: mgmt, user.
  - name: CATTLE_SYNC_ONLY_CHANGED_OBJECTS
    value: "mgmt,user"
  # Raise the minimum TLS version negotiated by the Rancher server
  - name: CATTLE_TLS_MIN_VERSION
    value: "1.2"
```

## Step 3: Optimize the Local Cluster (etcd)

The local Rancher cluster's etcd performance is critical. Defragment regularly:

```bash
# Defragment etcd on all etcd nodes
kubectl exec -n kube-system etcd-rancher-node-1 -- \
  etcdctl defrag \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/ssl/kube-ca.pem \
  --cert=/etc/kubernetes/ssl/kube-node.pem \
  --key=/etc/kubernetes/ssl/kube-node-key.pem
```

## Step 4: Configure etcd Quota

Increase the etcd database size if you hit quota errors:

```bash
# Current etcd DB size
etcdctl --endpoints=https://127.0.0.1:2379 endpoint status \
  --write-out=table

# Increase quota to 8GB (default 2GB)
# Set via RKE2 cluster config
cat > /etc/rancher/rke2/config.yaml << 'EOF'
etcd-arg:
  - "quota-backend-bytes=8589934592"
EOF
```

## Step 5: Reduce Audit Log Impact

Audit logging at high verbosity levels consumes significant CPU:

```yaml
# Reduce audit log level in cluster config
auditLog:
  level: 1    # Level 1 only logs request metadata (lowest impact)
  maxAge: 7   # Keep 7 days only
  maxSize: 100  # 100MB max file size
```

## Step 6: Database Tuning (External PostgreSQL)

Rancher v2 stores its data in the Kubernetes resources of the local cluster it runs on, so the "database" you tune is the datastore of that underlying cluster (etcd by default, or - when Rancher is running on K3s - the embedded SQLite). For large deployments running on K3s, switching K3s from SQLite to an external PostgreSQL is a common scaling step. This is configured on the K3s server, not via Rancher's `extraEnv`:

```bash
# On each K3s server node (set before starting k3s)
export K3S_DATASTORE_ENDPOINT="postgres://rancher:password@postgres.example.com:5432/rancher?sslmode=require"

# Or pass as a flag
k3s server \
  --datastore-endpoint="postgres://rancher:password@postgres.example.com:5432/rancher?sslmode=require"
```

If the underlying cluster is RKE2 (which uses etcd), no SQL database migration is needed - instead, focus on the etcd tuning in Steps 3 and 4.

## Step 7: Monitor Rancher Server Performance

```bash
# Watch Rancher server resource usage
kubectl top pods -n cattle-system

# View leader election and reconciliation logs
kubectl logs -n cattle-system rancher-xxxxx | grep -E "requeue|enqueue" | head -50
```

## Conclusion

Rancher Server performance at scale requires tuning in multiple areas: resource allocations, reconciliation frequencies, etcd health, and database backend. The most impactful change for large deployments (50+ clusters) is migrating to an external PostgreSQL database and increasing the Rancher Server pod memory to 8GB or more.
