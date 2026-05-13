# How to Deploy CockroachDB Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, CockroachDB, Distributed SQL, Database Operators

Description: Deploy the CockroachDB Kubernetes Operator for a distributed SQL database using Flux CD HelmRelease for GitOps-managed CockroachDB clusters.

---

## Introduction

CockroachDB is a distributed SQL database designed for global deployments with automatic horizontal scaling, geo-partitioning, and multi-region active-active capabilities. It speaks the PostgreSQL wire protocol, making it compatible with many PostgreSQL drivers without code changes. The CockroachDB Kubernetes Operator automates deployment, scaling, certificate management, and upgrades.

Deploying CockroachDB through Flux CD gives you GitOps control over cluster topology, SQL user management, and backup configuration. Scaling the cluster - adding nodes, adjusting storage, enabling geo-partitioning - flows through pull requests with clear diffs.

## Prerequisites

- Kubernetes v1.30+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs (SSDs strongly recommended)
- `kubectl` and `flux` CLIs installed
- cert-manager (recommended for TLS certificate management)

## Step 1: Add the CockroachDB HelmRepository

```yaml
# infrastructure/databases/cockroachdb/cockroachdb-helm.yaml

apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: cockroachdb
  namespace: flux-system
spec:
  interval: 12h
  url: https://charts.cockroachdb.com/v2
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
  name: crdb-operator
  namespace: cockroachdb
spec:
  interval: 30m
  chart:
    spec:
      chart: cockroachdb-operator-chart
      version: "1.0.0-rc.1"
      sourceRef:
        kind: HelmRepository
        name: cockroachdb
        namespace: flux-system
  install:
    crds: CreateReplace
  upgrade:
    crds: CreateReplace
  values:
    cloudRegion: us-east-1
```

## Step 3: Create a CrdbCluster

```yaml
# infrastructure/databases/cockroachdb/crdb-cluster.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: crdb-production
  namespace: cockroachdb
spec:
  interval: 30m
  dependsOn:
    - name: crdb-operator
  chart:
    spec:
      chart: cockroachdb-chart
      version: "26.1.4"
      sourceRef:
        kind: HelmRepository
        name: cockroachdb
        namespace: flux-system
  values:
    k8s:
      fullnameOverride: crdb-production
    cockroachdb:
      tls:
        enabled: true
        selfSigner:
          enabled: true
      crdbCluster:
        image:
          name: cockroachdb/cockroach:v26.1.4
        regions:
          - code: us-east-1
            nodes: 3
            cloudProvider: aws
            namespace: cockroachdb
        dataStore:
          volumeClaimTemplate:
            spec:
              accessModes:
                - ReadWriteOnce
              resources:
                requests:
                  storage: 50Gi
              storageClassName: premium-ssd
              volumeMode: Filesystem
        podTemplate:
          spec:
            resources:
              requests:
                cpu: "2"
                memory: "4Gi"
              limits:
                cpu: "2"
                memory: "4Gi"
        startFlags:
          cache: ".25"
          max-sql-memory: ".25"
        service:
          ingress:
            enabled: true
            ui:
              ingressClassName: nginx
              host: cockroachdb.example.com
              annotations:
                nginx.ingress.kubernetes.io/backend-protocol: HTTPS
```

## Step 4: Initialize the Cluster

After the operator creates the cluster, create users:

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
      serviceAccountName: crdb-production
      containers:
        - name: init
          image: cockroachdb/cockroach:v26.1.4
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
          projected:
            sources:
              - configMap:
                  name: crdb-production-ca-secret-crt
                  items:
                    - key: ca.crt
                      path: ca.crt
              - secret:
                  name: crdb-production-client-secret
                  items:
                    - key: tls.crt
                      path: client.root.crt
                    - key: tls.key
                      path: client.root.key
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
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: crdb-operator
      namespace: cockroachdb
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: crdb-production
      namespace: cockroachdb
```

## Step 6: Verify and Connect

```bash
# Check operator status
kubectl get deployment cockroach-operator -n cockroachdb

# Check cluster status
kubectl get crdbcluster crdb-production -n cockroachdb

# Check all pods
kubectl get pods -n cockroachdb

POD=$(kubectl get pod -n cockroachdb \
  -l app.kubernetes.io/instance=crdb-production \
  -o jsonpath='{.items[0].metadata.name}')

# Access CockroachDB SQL console
kubectl exec -n cockroachdb "$POD" -- \
  cockroach sql --certs-dir=/cockroach/cockroach-certs --host=localhost:26257

# Check cluster health
kubectl exec -n cockroachdb "$POD" -- \
  cockroach node status --certs-dir=/cockroach/cockroach-certs \
  --host=crdb-production-public.cockroachdb.svc.cluster.local

# Port-forward the Admin UI
kubectl port-forward svc/crdb-production-public 8080:8080 -n cockroachdb
```

## Best Practices

- Always run an odd number of CockroachDB nodes (3, 5, 7) to maintain Raft quorum during node failures.
- Set `cache: ".25"` and `max-sql-memory: ".25"` in `startFlags` to limit CockroachDB's memory usage to 25% of RAM each, leaving room for the OS and other processes.
- Use SSD-backed storage classes - CockroachDB's performance degrades significantly on spinning disks.
- Enable `cockroachdb.tls.enabled: true` and use cert-manager or the chart's self-signer for certificate rotation.
- Monitor the Admin UI dashboard for range lease rebalancing, slow queries, and node health before adding load.

## Conclusion

The CockroachDB Operator deployed via Flux CD provides a GitOps-managed distributed SQL database with automatic replication, horizontal scaling, and resilience to node failures. Its PostgreSQL wire protocol compatibility makes migration from existing PostgreSQL applications straightforward. With Flux managing the operator and CrdbCluster CRDs, your CockroachDB deployment is version-controlled and automatically reconciled, giving you the operational discipline that production distributed databases demand.
