# How to Deploy CockroachDB with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CockroachDB, Database

Description: Learn how to deploy CockroachDB distributed SQL database on Kubernetes using ArgoCD for GitOps-driven provisioning, scaling, and lifecycle management.

---

CockroachDB is a distributed SQL database designed for global scale, strong consistency, and automated failover. Running it on Kubernetes is natural since both systems embrace distributed architectures. But deploying and managing CockroachDB manually introduces drift and risk. With ArgoCD, your entire CockroachDB deployment - from the operator to cluster topology - is declared in Git and automatically reconciled.

This guide walks through deploying the CockroachDB Operator via ArgoCD, provisioning clusters, configuring multi-region topologies, and handling the stateful nuances that come with database management through GitOps.

## Prerequisites

- Kubernetes cluster (1.25+)
- ArgoCD installed and running
- A Git repository for manifests
- Storage class with dynamic provisioning

## Step 1: Deploy the CockroachDB Operator

CockroachDB provides an official Kubernetes operator. Install it through an ArgoCD Application.

```yaml
# argocd/cockroachdb-operator.yaml

apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cockroachdb-operator
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/k8s-manifests.git
    targetRevision: main
    path: operators/cockroachdb
  destination:
    server: https://kubernetes.default.svc
    namespace: cockroach-operator-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

Place the operator manifests in your Git repository. Download them from the CockroachDB releases:

```yaml
# operators/cockroachdb/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - https://raw.githubusercontent.com/cockroachdb/cockroach-operator/v2.18.3/install/operator.yaml
patches:
  - target:
      kind: Deployment
      name: cockroach-operator-manager
    patch: |
      - op: replace
        path: /spec/replicas
        value: 2
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --feature-gates=AffinityRules=true,TopologySpreadRules=true
```

## Step 2: Define a CockroachDB Cluster

Create a `CrdbCluster` custom resource that describes your desired database topology.

```yaml
# databases/cockroachdb/production-cluster.yaml
apiVersion: crdb.cockroachlabs.com/v1alpha1
kind: CrdbCluster
metadata:
  name: production-crdb
  namespace: databases
spec:
  # Number of nodes in the cluster
  nodes: 3

  # CockroachDB version
  cockroachDBVersion: v24.2.4

  # Data store configuration
  dataStore:
    pvc:
      spec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 100Gi
        storageClassName: gp3-encrypted
        volumeMode: Filesystem

  # Resource allocation
  resources:
    requests:
      cpu: "2"
      memory: 8Gi
    limits:
      cpu: "4"
      memory: 16Gi

  # TLS configuration
  tlsEnabled: true

  # Pod placement
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchLabels:
                app.kubernetes.io/instance: production-crdb
            topologyKey: kubernetes.io/hostname

  # Topology spread for zone distribution
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      whenUnsatisfiable: DoNotSchedule
      labelSelector:
        matchLabels:
          app.kubernetes.io/instance: production-crdb

  # Additional command-line flags
  additionalArgs:
    - "--cache=2GB"
    - "--max-sql-memory=2GB"
    - "--locality=region=us-east-1"
```

## Step 3: Create the ArgoCD Application for Clusters

```yaml
# argocd/cockroachdb-clusters.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cockroachdb-clusters
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/k8s-manifests.git
    targetRevision: main
    path: databases/cockroachdb
  destination:
    server: https://kubernetes.default.svc
    namespace: databases
  syncPolicy:
    automated:
      prune: false  # Never auto-delete database clusters
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Step 4: Verify Cluster Initialization

CockroachDB requires a one-time initialization after the pods are running. The CockroachDB Operator handles this automatically by running `cockroach init` in the first pod and recording an `Initialized` condition on the `CrdbCluster` status. You can track initialization through the custom resource status.

```yaml
# output from kubectl get crdb production-crdb -n databases -o yaml
apiVersion: crdb.cockroachlabs.com/v1alpha1
kind: CrdbCluster
metadata:
  name: production-crdb
  namespace: databases
status:
  clusterStatus: Finished
  conditions:
    - type: Initialized
      status: "True"
```

Because initialization is part of the operator reconciliation loop, keep it in the `CrdbCluster` workflow instead of adding a separate ArgoCD hook that could race with the operator.

## Step 5: Custom Health Check

```yaml
# argocd-cm ConfigMap
data:
  resource.customizations.health.crdb.cockroachlabs.com_CrdbCluster: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.clusterStatus == "Failed" then
        hs.status = "Degraded"
        hs.message = "CockroachDB operator reported a failed action"
        return hs
      end

      if obj.status.conditions ~= nil then
        for _, condition in ipairs(obj.status.conditions) do
          if condition.type == "Initialized" and condition.status == "True" then
            hs.status = "Healthy"
            hs.message = "CockroachDB cluster is initialized and running"
            return hs
          end
        end
      end

      if obj.status.clusterStatus == "Starting" or
             obj.status.clusterStatus == "Unknown" then
        hs.status = "Progressing"
        hs.message = obj.status.clusterStatus
      else
        hs.status = "Progressing"
        hs.message = obj.status.clusterStatus or "Unknown"
      end
    else
      hs.status = "Progressing"
      hs.message = "Waiting for cluster status"
    end
    return hs
```

## Step 6: Configure Monitoring

CockroachDB exposes a Prometheus-compatible metrics endpoint. Create a ServiceMonitor to scrape it.

```yaml
# databases/cockroachdb/service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: production-crdb-monitor
  namespace: databases
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/instance: production-crdb
  endpoints:
    - port: http
      path: /_status/vars
      interval: 30s
      tlsConfig:
        ca:
          secret:
            name: production-crdb-node
            key: ca.crt
        serverName: "127.0.0.1"
```

## Architecture Overview

```mermaid
graph TD
    A[Git Repository] --> B[ArgoCD]
    B --> C[CockroachDB Operator]
    B --> D[CrdbCluster CR]
    C --> D
    D --> E[CRDB Node 1 - Zone A]
    D --> F[CRDB Node 2 - Zone B]
    D --> G[CRDB Node 3 - Zone C]
    E <--> F
    F <--> G
    E <--> G
    I[ServiceMonitor] --> E
    I --> F
    I --> G
```

## Scaling the Cluster

To add nodes, update the `nodes` field in your CrdbCluster manifest:

```yaml
spec:
  nodes: 5  # was 3
```

CockroachDB automatically rebalances data across the new nodes. ArgoCD syncs the change, and the operator provisions the additional pods with their persistent volumes.

## Decommissioning Nodes Safely

When scaling down, CockroachDB needs to decommission nodes before they are removed to ensure data is migrated. The operator handles this automatically when you reduce the node count. However, this process takes time depending on data volume. Configure ArgoCD retry backoff so transient reconciliation failures are retried:

```yaml
spec:
  syncPolicy:
    syncOptions:
      - ApplyOutOfSyncOnly=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 10m
```

## Handling Version Upgrades

CockroachDB supports rolling upgrades. Update the version in your manifest:

```yaml
spec:
  cockroachDBVersion: v24.3.0  # was v24.2.4
```

The operator performs a rolling restart, one node at a time. Monitor the upgrade progress and finalization in the CockroachDB admin UI or through your monitoring stack with [OneUptime](https://oneuptime.com).

## Conclusion

Deploying CockroachDB through ArgoCD gives you a production-grade distributed SQL database that is fully managed through Git. The combination of the CockroachDB Operator for lifecycle management and ArgoCD for declarative deployment ensures your database infrastructure is consistent, auditable, and easy to scale. Key practices: let the operator handle initialization, disable auto-pruning, spread nodes across availability zones, and configure proper health checks for accurate ArgoCD status reporting.
