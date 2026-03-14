# How to Deploy Vitess Operator for MySQL Sharding with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Vitess, MySQL, Sharding, Database Operators

Description: Deploy the Vitess Operator for MySQL horizontal sharding on Kubernetes using Flux CD for GitOps-managed distributed MySQL infrastructure.

---

## Introduction

Vitess is a database clustering system for horizontal scaling of MySQL. Originally developed at YouTube to handle their MySQL scaling challenges, Vitess provides transparent sharding, connection pooling via VTGate, schema management, and online schema changes — all without modifying application code beyond the connection string. PlanetScale, the company behind Vitess, uses it to power their cloud database service.

The Vitess Operator (`vitess-operator`) manages Vitess clusters on Kubernetes using CRDs (`VitessCluster`, `VitessKeyspace`). Deploying through Flux CD gives you GitOps control over your Vitess topology — adding shards, adjusting tablet counts, and managing schema changes all flow through pull requests.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs
- `kubectl` and `flux` CLIs installed
- `vtctldclient` binary for schema management

## Step 1: Add the PlanetScale HelmRepository

```yaml
# infrastructure/sources/planetscale-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: planetscale
  namespace: flux-system
spec:
  interval: 12h
  url: https://planetscale.github.io/vitess-operator
```

## Step 2: Deploy the Vitess Operator

```yaml
# infrastructure/databases/vitess/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: vitess
```

```yaml
# infrastructure/databases/vitess/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: vitess-operator
  namespace: vitess
spec:
  interval: 30m
  chart:
    spec:
      chart: vitess-operator
      version: "2.13.2"
      sourceRef:
        kind: HelmRepository
        name: planetscale
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "500m"
        memory: "256Mi"
```

## Step 3: Create the Vitess Cluster

```yaml
# infrastructure/databases/vitess/vitess-cluster.yaml
apiVersion: planetscale.dev/v2
kind: VitessCluster
metadata:
  name: vitess
  namespace: vitess
spec:
  images:
    vtgate: vitess/lite:v20.0.2-mysql80
    vttablet: vitess/lite:v20.0.2-mysql80
    vtbackup: vitess/lite:v20.0.2-mysql80

  # Global cell
  cells:
    - name: zone1
      gateway:
        authentication:
          static:
            secret:
              name: vitess-vtgate-auth
              key: users.json
        replicas: 2
        resources:
          requests:
            cpu: "200m"
            memory: "512Mi"
          limits:
            cpu: "500m"
            memory: "1Gi"

  # Keyspaces (databases)
  keyspaces:
    - name: commerce
      turndownPolicy: Immediate

      # VSchema defines the sharding strategy
      vitessOrchestrator:
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"

      # Shards
      partitionings:
        - equal:
            parts: 2    # 2 shards (-80, 80-)
            shardTemplate:
              databaseInitScriptSecret:
                name: vitess-init-script
                key: init_db.sql

              replication:
                enforceSemiSync: true

              # Tablets per shard
              tabletPools:
                - cell: zone1
                  type: replica
                  replicas: 2   # 1 primary + 1 replica
                  vttablet:
                    resources:
                      requests:
                        cpu: "500m"
                        memory: "1Gi"
                      limits:
                        cpu: "1"
                        memory: "2Gi"
                  mysqld:
                    resources:
                      requests:
                        cpu: "500m"
                        memory: "1Gi"
                      limits:
                        cpu: "2"
                        memory: "2Gi"
                    configOverrides: |
                      [mysqld]
                      innodb_buffer_pool_size=512M
                      max_connections=200
                  dataVolumeClaimTemplate:
                    accessModes:
                      - ReadWriteOnce
                    resources:
                      requests:
                        storage: 20Gi

  # Topology service (etcd)
  topoServer:
    etcd:
      dataVolumeClaimTemplate:
        resources:
          requests:
            storage: 1Gi
```

## Step 4: Create Required Secrets

```yaml
# infrastructure/databases/vitess/secrets.yaml (use SealedSecret)
apiVersion: v1
kind: Secret
metadata:
  name: vitess-vtgate-auth
  namespace: vitess
type: Opaque
stringData:
  users.json: |
    {
      "app_user": [{
        "UserData": "app_user",
        "Password": "AppPassword123!"
      }]
    }
---
apiVersion: v1
kind: Secret
metadata:
  name: vitess-init-script
  namespace: vitess
type: Opaque
stringData:
  init_db.sql: |
    -- This script runs on each new MySQL instance
    CREATE DATABASE IF NOT EXISTS commerce;
    CREATE USER IF NOT EXISTS 'app_user'@'%' IDENTIFIED BY 'AppPassword123!';
    GRANT ALL ON commerce.* TO 'app_user'@'%';
```

## Step 5: Flux Kustomization

```yaml
# clusters/production/vitess-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: vitess
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/vitess
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: vitess-operator
      namespace: vitess
```

## Step 6: Connect and Verify

```bash
# Check Vitess cluster
kubectl get vitesscluster vitess -n vitess

# Check tablets
kubectl get pods -n vitess -l planetscale.dev/component=vttablet

# Port-forward VTGate for SQL access (MySQL protocol on 3306)
kubectl port-forward svc/vitess-zone1-vtgate-625ee430 3306:3306 -n vitess

# Connect via MySQL client through VTGate
mysql -h 127.0.0.1 -u app_user -p'AppPassword123!' commerce

# Check shard distribution via vtctld
kubectl port-forward svc/vitess-vtctld-625ee430 15000:15000 -n vitess
vtctldclient --server localhost:15999 GetTablets
```

## Best Practices

- Use VSchema to define your vindex (sharding key) carefully — changing it later requires a full table copy.
- Set `enforceSemiSync: true` to ensure at least one replica has received each transaction before the primary commits.
- Use Vitess's `MoveTables` workflow for zero-downtime migration of unsharded tables to sharded keyspaces.
- Monitor VTGate QPS and latency metrics via Prometheus to understand query routing overhead.
- Test schema changes with Vitess's online schema change (OSC) feature before applying to production.

## Conclusion

The Vitess Operator deployed via Flux CD provides GitOps-managed MySQL sharding at scale. Vitess handles the complexity of shard routing, replication management, and schema changes while your applications connect through VTGate as if it were a single MySQL server. With Flux managing the VitessCluster CRDs, your sharding topology is version-controlled and reproducible — a critical property for infrastructure that is difficult to recreate manually.
