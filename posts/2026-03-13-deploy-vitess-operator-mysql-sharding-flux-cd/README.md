# How to Deploy Vitess Operator for MySQL Sharding with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Vitess, MySQL, Sharding, Database Operators

Description: Deploy the Vitess Operator for MySQL horizontal sharding on Kubernetes using Flux CD for GitOps-managed distributed MySQL infrastructure.

---

## Introduction

Vitess is a database clustering system for horizontal scaling of MySQL. Originally developed at YouTube to handle their MySQL scaling challenges, Vitess provides transparent sharding, connection pooling via VTGate, schema management, and online schema changes - all without modifying application code beyond the connection string. PlanetScale, the company behind Vitess, uses it to power their cloud database service.

The Vitess Operator (`vitess-operator`) manages Vitess clusters on Kubernetes using CRDs (`VitessCluster`, `VitessKeyspace`). Deploying through Flux CD gives you GitOps control over your Vitess topology - adding shards, adjusting tablet counts, and managing schema changes all flow through pull requests.

## Prerequisites

- Kubernetes v1.31-v1.34 with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs
- `kubectl` and `flux` CLIs installed
- `vtctldclient` binary for schema management

## Step 1: Add the Vitess Operator GitRepository

```yaml
# infrastructure/sources/vitess-operator.yaml

apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: vitess-operator
  namespace: flux-system
spec:
  interval: 12h
  url: https://github.com/planetscale/vitess-operator
  ref:
    tag: v2.16.0
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
# clusters/production/vitess-operator-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: vitess-operator
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: vitess-operator
  path: ./deploy
  targetNamespace: vitess
  prune: true
  wait: true
  patches:
    - target:
        kind: Deployment
        name: vitess-operator
      patch: |
        - op: replace
          path: /spec/template/spec/containers/0/image
          value: planetscale/vitess-operator:v2.16.0
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: vitess-operator
      namespace: vitess
```

## Step 3: Create the Vitess Cluster

```yaml
# infrastructure/databases/vitess/vitess-cluster.yaml
apiVersion: planetscale.com/v2
kind: VitessCluster
metadata:
  name: vitess
  namespace: vitess
spec:
  backup:
    engine: xtrabackup
    locations:
      - volume:
          persistentVolumeClaim:
            claimName: vitess-backups

  images:
    vtctld: vitess/lite:v23.0.0
    vtgate: vitess/lite:v23.0.0
    vttablet: vitess/lite:v23.0.0
    vtorc: vitess/lite:v23.0.0
    vtbackup: vitess/lite:v23.0.0
    mysqld:
      mysql80Compatible: vitess/lite:v23.0.0
    mysqldExporter: prom/mysqld-exporter:v0.15.1

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
      durabilityPolicy: semi_sync
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
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: vitess-backups
  namespace: vitess
spec:
  accessModes:
    - ReadWriteOnce
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
    SET @original_super_read_only=IF(@@global.super_read_only=1, 'ON', 'OFF');
    SET GLOBAL super_read_only='OFF';
    SET sql_log_bin = 0;

    CREATE DATABASE IF NOT EXISTS _vt;
    CREATE TABLE IF NOT EXISTS _vt.local_metadata (
      name VARCHAR(255) NOT NULL,
      value VARCHAR(255) NOT NULL,
      db_name VARBINARY(255) NOT NULL,
      PRIMARY KEY (db_name, name)
    ) ENGINE=InnoDB;
    CREATE TABLE IF NOT EXISTS _vt.shard_metadata (
      name VARCHAR(255) NOT NULL,
      value MEDIUMBLOB NOT NULL,
      db_name VARBINARY(255) NOT NULL,
      PRIMARY KEY (db_name, name)
    ) ENGINE=InnoDB;

    CREATE USER IF NOT EXISTS 'vt_dba'@'localhost';
    GRANT ALL ON *.* TO 'vt_dba'@'localhost' WITH GRANT OPTION;

    CREATE USER IF NOT EXISTS 'vt_app'@'localhost';
    GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, RELOAD, PROCESS, FILE,
      REFERENCES, INDEX, ALTER, SHOW DATABASES, CREATE TEMPORARY TABLES,
      LOCK TABLES, EXECUTE, REPLICATION CLIENT, CREATE VIEW,
      SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, CREATE USER, EVENT, TRIGGER
      ON *.* TO 'vt_app'@'localhost';

    CREATE USER IF NOT EXISTS 'vt_appdebug'@'localhost';
    GRANT SELECT, SHOW DATABASES, PROCESS ON *.* TO 'vt_appdebug'@'localhost';

    CREATE USER IF NOT EXISTS 'vt_allprivs'@'localhost';
    GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, RELOAD, PROCESS, FILE,
      REFERENCES, INDEX, ALTER, SHOW DATABASES, CREATE TEMPORARY TABLES,
      LOCK TABLES, EXECUTE, REPLICATION SLAVE, REPLICATION CLIENT, CREATE VIEW,
      SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, CREATE USER, EVENT, TRIGGER
      ON *.* TO 'vt_allprivs'@'localhost';

    CREATE USER IF NOT EXISTS 'vt_repl'@'%';
    GRANT REPLICATION SLAVE ON *.* TO 'vt_repl'@'%';

    CREATE USER IF NOT EXISTS 'vt_filtered'@'localhost';
    GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, RELOAD, PROCESS, FILE,
      REFERENCES, INDEX, ALTER, SHOW DATABASES, CREATE TEMPORARY TABLES,
      LOCK TABLES, EXECUTE, REPLICATION SLAVE, REPLICATION CLIENT, CREATE VIEW,
      SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, CREATE USER, EVENT, TRIGGER
      ON *.* TO 'vt_filtered'@'localhost';

    CREATE DATABASE IF NOT EXISTS commerce;
    CREATE USER IF NOT EXISTS 'app_user'@'%' IDENTIFIED BY 'AppPassword123!';
    GRANT ALL ON commerce.* TO 'app_user'@'%';

    FLUSH PRIVILEGES;
    RESET SLAVE ALL;
    RESET MASTER;
    SET GLOBAL super_read_only=IFNULL(@original_super_read_only, 'ON');
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
  dependsOn:
    - name: vitess-operator
  healthChecks:
    - apiVersion: planetscale.com/v2
      kind: VitessCluster
      name: vitess
      namespace: vitess
```

## Step 6: Connect and Verify

```bash
# Check Vitess cluster
kubectl get vitesscluster vitess -n vitess

# Check tablets
kubectl get pods -n vitess -l planetscale.com/component=vttablet

# Port-forward VTGate for SQL access (MySQL protocol on 3306)
kubectl port-forward svc/vitess-zone1-vtgate 3306:3306 -n vitess

# Connect via MySQL client through VTGate
mysql -h 127.0.0.1 -u app_user -p'AppPassword123!' commerce

# Check shard distribution via vtctld
kubectl port-forward svc/vitess-vtctld 15000:15000 15999:15999 -n vitess
vtctldclient --server localhost:15999 GetTablets
```

## Best Practices

- Use VSchema to define your vindex (sharding key) carefully - changing it later requires a full table copy.
- Set `enforceSemiSync: true` to ensure at least one replica has received each transaction before the primary commits.
- Use Vitess's `MoveTables` workflow for zero-downtime migration of unsharded tables to sharded keyspaces.
- Monitor VTGate QPS and latency metrics via Prometheus to understand query routing overhead.
- Test schema changes with Vitess's online schema change (OSC) feature before applying to production.

## Conclusion

The Vitess Operator deployed via Flux CD provides GitOps-managed MySQL sharding at scale. Vitess handles the complexity of shard routing, replication management, and schema changes while your applications connect through VTGate as if it were a single MySQL server. With Flux managing the VitessCluster CRDs, your sharding topology is version-controlled and reproducible - a critical property for infrastructure that is difficult to recreate manually.
