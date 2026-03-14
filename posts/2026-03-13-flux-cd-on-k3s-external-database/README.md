# How to Set Up Flux CD on k3s with External Database

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, K3s, PostgreSQL, MySQL, External Database

Description: Configure Flux CD on k3s using an external database (PostgreSQL or MySQL) for the k3s datastore, enabling high availability without embedded etcd.

---

## Introduction

k3s supports replacing embedded SQLite or etcd with an external relational database - PostgreSQL or MySQL - for its datastore. This mode is ideal when you already operate a managed database service (Amazon RDS, Google Cloud SQL, Azure Database) and want to leverage it for Kubernetes state storage rather than managing etcd. It simplifies HA configuration since the database handles replication, and it integrates naturally with existing database backup and monitoring infrastructure.

When Flux CD runs on a k3s cluster backed by an external database, the architecture is familiar to teams already comfortable with relational database operations. The trade-off is that k3s datastore performance is tied to database query latency, so using a geographically co-located database is important.

This guide covers deploying k3s with an external PostgreSQL datastore, configuring multiple server nodes for HA, and bootstrapping Flux CD.

## Prerequisites

- PostgreSQL 12+ or MySQL 8.0+ database accessible from your k3s nodes
- Three or more Linux nodes for k3s servers
- A load balancer or VIP for the k3s API server
- `kubectl` and `flux` CLI on your workstation
- A Git repository for Flux CD bootstrap

## Step 1: Prepare the PostgreSQL Database

```sql
-- Run on the PostgreSQL server
CREATE DATABASE k3s_datastore;
CREATE USER k3s_user WITH PASSWORD 'strong-password-here';
GRANT ALL PRIVILEGES ON DATABASE k3s_datastore TO k3s_user;

-- Grant schema-level permissions (required for PostgreSQL 15+)
\c k3s_datastore
GRANT ALL ON SCHEMA public TO k3s_user;
```

## Step 2: Install k3s Server with External PostgreSQL

```bash
# On the first k3s server node
export K3S_TOKEN="my-cluster-secret"
export DB_PASSWORD="strong-password-here"

curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint="postgres://k3s_user:${DB_PASSWORD}@postgres.internal:5432/k3s_datastore?sslmode=require" \
  --tls-san=192.168.1.100 \
  --tls-san=k3s.example.com \
  --disable=traefik \
  --node-taint="node-role.kubernetes.io/master=true:NoSchedule"
```

```bash
# On the second and third k3s server nodes (same datastore-endpoint)
curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint="postgres://k3s_user:${DB_PASSWORD}@postgres.internal:5432/k3s_datastore?sslmode=require" \
  --server=https://192.168.1.101:6443 \
  --tls-san=192.168.1.100 \
  --disable=traefik
```

## Step 3: Install k3s with External MySQL

If using MySQL instead of PostgreSQL:

```sql
-- On MySQL server
CREATE DATABASE k3s_datastore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'k3s_user'@'%' IDENTIFIED BY 'strong-password-here';
GRANT ALL PRIVILEGES ON k3s_datastore.* TO 'k3s_user'@'%';
FLUSH PRIVILEGES;
```

```bash
# Install k3s with MySQL datastore
curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint="mysql://k3s_user:${DB_PASSWORD}@tcp(mysql.internal:3306)/k3s_datastore" \
  --tls-san=192.168.1.100 \
  --disable=traefik
```

## Step 4: Add Worker Nodes

```bash
# On worker nodes (same process regardless of datastore type)
export K3S_TOKEN="my-cluster-secret"
export K3S_URL="https://192.168.1.100:6443"

curl -sfL https://get.k3s.io | sh -s - agent \
  --server=${K3S_URL} \
  --token=${K3S_TOKEN}
```

## Step 5: Configure kubectl Access

```bash
# Retrieve kubeconfig from the first server node
scp node1:/etc/rancher/k3s/k3s.yaml ~/.kube/k3s-external-db

# Point to the load balancer address
sed -i 's/127.0.0.1/192.168.1.100/g' ~/.kube/k3s-external-db
export KUBECONFIG=~/.kube/k3s-external-db

# Verify all nodes are ready
kubectl get nodes
```

## Step 6: Bootstrap Flux CD

```bash
# Bootstrap Flux on the k3s cluster
export GITHUB_TOKEN=ghp_your_github_token

flux bootstrap github \
  --owner=my-org \
  --repository=k3s-fleet \
  --branch=main \
  --path=clusters/k3s-external-db \
  --personal

# Verify Flux controllers are running
kubectl get pods -n flux-system
```

## Step 7: Configure a GitRepository Source

```yaml
# clusters/k3s-external-db/flux-system/gotk-sync.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m
  ref:
    branch: main
  secretRef:
    name: flux-system
  url: ssh://git@github.com/my-org/k3s-fleet
```

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/k3s-external-db
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 8: Monitor Datastore Health

```bash
# Check k3s server logs for datastore connectivity issues
journalctl -u k3s --since "5 minutes ago" | grep -i "datastore\|postgres\|mysql"

# Monitor datastore connection count from PostgreSQL
psql -U k3s_user -d k3s_datastore -c \
  "SELECT count(*) FROM pg_stat_activity WHERE datname='k3s_datastore';"
```

## Best Practices

- Use a managed database service (RDS, Cloud SQL) for the k3s datastore in production; it provides automated backups, failover, and patching without additional operational work.
- Enable SSL/TLS on the datastore connection (`sslmode=require` for PostgreSQL, `tls=true` for MySQL) to encrypt state data in transit.
- Place the database in the same availability zone as the k3s server nodes to minimize control plane API latency.
- Set `max_connections` on the PostgreSQL server appropriately: each k3s server node maintains multiple connections to the datastore.
- Do not use the external datastore path if you plan more than 100 nodes; at that scale, embedded etcd or a dedicated etcd cluster performs better.

## Conclusion

k3s with an external database datastore is an excellent option for teams that already invest in managed database infrastructure and want to simplify Kubernetes HA without managing etcd. Flux CD runs identically on this topology, providing the same GitOps workflow regardless of the underlying k3s datastore configuration.
