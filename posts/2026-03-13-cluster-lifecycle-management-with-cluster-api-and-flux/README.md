# How to Implement Cluster Lifecycle Management with Cluster API and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Cluster API, CAPI, Lifecycle Management, GitOps, Kubernetes, Multi-Cluster

Description: Manage the full Kubernetes cluster lifecycle including creation, upgrades, scaling, and deletion using Cluster API and Flux CD.

---

## Introduction

Cluster lifecycle management encompasses everything from initial provisioning to version upgrades, node pool scaling, and eventual decommissioning. With Cluster API and Flux, this entire lifecycle is driven by Git. Creating a cluster means adding manifests to a repository. Upgrading Kubernetes means changing a version string and merging a pull request. Scaling nodes means updating a replica count and pushing a commit.

This GitOps approach to cluster lifecycle management provides a complete audit trail, enforces peer review for infrastructure changes, and enables disaster recovery by recreating clusters from their Git definitions. This guide covers the end-to-end lifecycle workflow using CAPI and Flux.

## Prerequisites

- Cluster API installed on a management cluster
- Flux CD bootstrapped on the management cluster
- Cloud provider credentials configured
- `kubectl`, `clusterctl`, and `flux` CLIs

## Step 1: Repository Structure for Multi-Cluster Management

```
clusters/
├── management/              # Management cluster's own Flux config
│   └── workloads/           # Kustomizations for each workload cluster
│       ├── dev-01.yaml
│       ├── staging-01.yaml
│       └── production-01.yaml
└── workloads/               # Cluster definitions
    ├── dev-01/
    │   ├── cluster.yaml
    │   ├── workers.yaml
    │   └── kustomization.yaml
    ├── staging-01/
    └── production-01/
```

## Step 2: Cluster Creation

Adding a new cluster to the fleet is as simple as committing new manifests.

```bash
# Create the cluster manifest directory
mkdir -p clusters/workloads/dev-02

# Copy an existing cluster template and customize it
cp -r clusters/workloads/dev-01/* clusters/workloads/dev-02/

# Update the cluster name and configuration
sed -i 's/dev-01/dev-02/g' clusters/workloads/dev-02/*.yaml

# Create the Flux Kustomization for the new cluster
cat > clusters/management/workloads/dev-02.yaml << 'EOF'
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: workload-cluster-dev-02
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/workloads/dev-02
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: cluster-api
  timeout: 30m
EOF

# Commit and push to trigger cluster creation
git add clusters/workloads/dev-02/ clusters/management/workloads/dev-02.yaml
git commit -m "feat: add dev-02 workload cluster"
git push origin main
```

## Step 3: Kubernetes Version Upgrades

Upgrading Kubernetes version requires updating the `version` field in multiple resources.

```yaml
# clusters/workloads/production-01/control-plane.yaml
# Before upgrade:
apiVersion: controlplane.cluster.x-k8s.io/v1beta1
kind: KubeadmControlPlane
metadata:
  name: production-01-control-plane
spec:
  version: v1.28.5  # <-- Change this
  replicas: 3
  ...

# After upgrade (in a pull request):
apiVersion: controlplane.cluster.x-k8s.io/v1beta1
kind: KubeadmControlPlane
metadata:
  name: production-01-control-plane
spec:
  version: v1.29.2  # <-- Updated
  replicas: 3
```

```yaml
# clusters/workloads/production-01/workers.yaml
# Also update the MachineDeployment version
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: production-01-workers
spec:
  template:
    spec:
      version: v1.29.2  # <-- Must match control plane version
```

## Step 4: Node Pool Scaling

Scale a node pool by updating the `replicas` field in a pull request.

```yaml
# clusters/workloads/production-01/workers.yaml
# Scale from 3 to 6 nodes
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: production-01-workers
spec:
  replicas: 6  # Changed from 3 to 6
```

```bash
# After merging the PR, watch the scale-out
kubectl get machinedeployment production-01-workers \
  -n default --watch

# Verify new nodes join the workload cluster
clusterctl get kubeconfig production-01 > prod.kubeconfig
kubectl --kubeconfig=prod.kubeconfig get nodes --watch
```

## Step 5: Cluster Pausing for Maintenance

Temporarily pause reconciliation without deleting the cluster.

```yaml
# clusters/workloads/production-01/cluster.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: production-01
  namespace: default
  annotations:
    # Add this annotation to pause CAPI reconciliation
    cluster.x-k8s.io/paused: "true"
spec:
  ...
```

## Step 6: Cluster Decommissioning

Remove a cluster from the fleet safely.

```bash
# Step 1: Drain all workloads from the cluster first
KUBECONFIG=target-cluster.kubeconfig \
  kubectl drain --all-namespaces --ignore-daemonsets --delete-emptydir-data

# Step 2: Remove the Flux Kustomization for the cluster
# This prevents Flux from re-applying the cluster manifests
git rm clusters/management/workloads/dev-02.yaml
git commit -m "chore: remove dev-02 cluster from Flux"
git push origin main

# Step 3: Wait for Flux to reconcile (the Kustomization is pruned)
flux reconcile kustomization flux-system --with-source

# Step 4: Delete the cluster manifests from Git
git rm -r clusters/workloads/dev-02/
git commit -m "chore: remove dev-02 cluster manifests"
git push origin main

# Step 5: Watch CAPI deprovision the cloud resources
kubectl get cluster dev-02 -n default --watch
```

## Step 7: Monitor Cluster Fleet Status

```bash
# View all managed clusters and their status
kubectl get clusters -A

# Check upgrade status across the fleet
kubectl get kubeadmcontrolplanes -A

# View machine status for all clusters
kubectl get machines -A | head -30

# Use clusterctl to get a fleet overview
clusterctl describe cluster production-01 -n default
```

## Best Practices

- Use a template-based approach for cluster creation. Maintain a `cluster-template/` directory with base manifests that you copy and customize for new clusters.
- Always upgrade control plane before worker nodes. CAPI enforces this ordering, but making it explicit in your runbook prevents confusion.
- Test Kubernetes version upgrades in dev and staging clusters before applying to production. Use Flux Kustomization `dependsOn` to enforce environment ordering.
- Use Git tags to mark the cluster manifest versions that correspond to specific Kubernetes releases. This makes rollback to a known state straightforward.
- Implement cluster fleet monitoring using Prometheus metrics from CAPI controllers to track machine health, upgrade progress, and remediation events.

## Conclusion

The full Kubernetes cluster lifecycle—creation, upgrade, scaling, and decommissioning—is now managed through Cluster API and Flux CD. Every lifecycle operation is a Git commit, making the process reviewable, auditable, and reproducible. The management cluster becomes the authoritative source of truth for all workload cluster configurations across the fleet.
