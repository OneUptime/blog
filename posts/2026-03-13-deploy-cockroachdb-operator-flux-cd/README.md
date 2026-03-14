# How to Deploy CockroachDB Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, CockroachDB, Distributed SQL, Database Operators

Description: Deploy the CockroachDB Kubernetes Operator for a distributed SQL database using Flux CD HelmRelease for GitOps-managed CockroachDB clusters.

---

## Introduction

CockroachDB is a distributed SQL database designed for global deployments with automatic horizontal scaling, geo-partitioning, and multi-region active-active capabilities. It speaks the PostgreSQL wire protocol, making it compatible with many PostgreSQL drivers without code changes. The CockroachDB Kubernetes Operator automates deployment, scaling, certificate management, and upgrades.

Deploying CockroachDB through Flux CD gives you GitOps control over cluster topology, SQL user management, and backup configuration. Scaling the cluster — adding nodes, adjusting storage, enabling geo-partitioning — flows through pull requests with clear diffs.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs (SSDs strongly recommended)
- `kubectl` and `flux` CLIs installed
- cert-manager (recommended for TLS certificate management)

## Step 1: Add the CockroachDB HelmRepository

```yaml
# infrastructure/sources/cockroachdb-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: cockroachdb
  namespace: flux-system
spec:
  interval: 12h
  url: https://charts.cockroachdb.com
```

## Step 2: Deploy the CockroachDB Operator

```yaml
# infrastructure/databases/cockroachdb/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cockroachdb
```

```yaml
# infrastructure/databases/cockroachdb/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cockroach-operator
  namespace: cockroachdb
spec:
  interval: 30m
  chart:
    spec:
      chart: cockroach-operator
      version: "6.0.13"
      sourceRef:
        kind: HelmRepository
        name: cockroachdb
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

## Step 3: Create a CrdbCluster

```yaml
# infrastructure/databases/cockroachdb/crdb-cluster.yaml
apiVersion: crdb.cockroachlabs.com/v1alpha1
kind: CrdbCluster
metadata:
  name: crdb-production
  namespace: cockroachdb
spec:
  dataStore:
    pvc:
      spec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 50Gi
        storageClassName: premium-ssd
        volumeMode: Filesystem

  # Number of CockroachDB nodes (minimum 3 for quorum)
  nodes: 3

  # CockroachDB version
  cockroachDBVersion: v24.1.3

  resources:
    requests:
      cpu: "500m"
      memory: "2Gi"
    limits:
      cpu: "2"
      memory: "4Gi"

  # TLS: use certificates from cert-manager
  tlsEnabled: true

  # SQL configuration via startup flags
  additionalArgs:
    - "--cache=.25"          # 25% of RAM for cache
    - "--max-sql-memory=.25" # 25% of RAM for SQL memory
    - "--locality=region=us-east"
    # Enable the vectorized SQL execution engine
    - "--vectorize=on"

  image:
    name: cockroachdb/cockroach:v24.1.3

  # Expose the cluster via a load balancer
  ingress:
    ui:
      ingressClassName: nginx
      host: cockroachdb.example.com
      annotations:
        nginx.ingress.kubernetes.io/backend-protocol: HTTPS
```

## Step 4: Initialize the Cluster

After the operator creates the StatefulSet, initialize the cluster and create users:

```yaml
# infrastructure/databases/cockroachdb/init-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: crdb-init
  namespace: cockroachdb
spec:
  ttlSecondsAfterFinished: 600
  template:
    spec:
      restartPolicy: OnFailure
      serviceAccountName: cockroach-operator-sa
      containers:
        - name: init
          image: cockroachdb/cockroach:v24.1.3
          command:
            - /bin/sh
            - -c
            - |
              # Wait for nodes to be ready
              until cockroach sql \
                --certs-dir=/cockroach/cockroach-certs \
                --host=crdb-production-public.cockroachdb.svc.cluster.local \
                -e "SELECT 1;"; do
                echo "Waiting for CockroachDB..."; sleep 5
              done

              # Create application database and user
              cockroach sql \
                --certs-dir=/cockroach/cockroach-certs \
                --host=crdb-production-public.cockroachdb.svc.cluster.local \
                -e "
                  CREATE DATABASE IF NOT EXISTS myapp;
                  CREATE USER IF NOT EXISTS app WITH PASSWORD 'AppPassword123!';
                  GRANT ALL ON DATABASE myapp TO app;
                "
          volumeMounts:
            - name: client-certs
              mountPath: /cockroach/cockroach-certs
              readOnly: true
      volumes:
        - name: client-certs
          secret:
            secretName: crdb-production-client-secret
```

## Step 5: Flux Kustomization

```yaml
# clusters/production/cockroachdb-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cockroachdb
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/cockroachdb
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: cockroach-operator-manager
      namespace: cockroachdb
```

## Step 6: Verify and Connect

```bash
# Check operator status
kubectl get deployment cockroach-operator-manager -n cockroachdb

# Check cluster status
kubectl get crdbcluster crdb-production -n cockroachdb

# Check all pods
kubectl get pods -n cockroachdb

# Access CockroachDB SQL console
kubectl exec -n cockroachdb crdb-production-0 -- \
  cockroach sql --insecure --host=localhost:26257

# Check cluster health
kubectl exec -n cockroachdb crdb-production-0 -- \
  cockroach node status --certs-dir=/cockroach/cockroach-certs \
  --host=crdb-production-public.cockroachdb.svc.cluster.local

# Port-forward the Admin UI
kubectl port-forward svc/crdb-production-public 8080:8080 -n cockroachdb
```

## Best Practices

- Always run an odd number of CockroachDB nodes (3, 5, 7) to maintain Raft quorum during node failures.
- Set `--cache=.25` and `--max-sql-memory=.25` to limit CockroachDB's memory usage to 25% of RAM each, leaving room for the OS and other processes.
- Use SSD-backed storage classes — CockroachDB's performance degrades significantly on spinning disks.
- Enable `tlsEnabled: true` and use cert-manager for certificate rotation.
- Monitor the Admin UI dashboard for range lease rebalancing, slow queries, and node health before adding load.

## Conclusion

The CockroachDB Operator deployed via Flux CD provides a GitOps-managed distributed SQL database with automatic replication, horizontal scaling, and resilience to node failures. Its PostgreSQL wire protocol compatibility makes migration from existing PostgreSQL applications straightforward. With Flux managing the operator and CrdbCluster CRDs, your CockroachDB deployment is version-controlled and automatically reconciled, giving you the operational discipline that production distributed databases demand.
