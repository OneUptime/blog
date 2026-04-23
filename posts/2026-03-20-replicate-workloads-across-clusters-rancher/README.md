# How to Replicate Workloads Across Multiple Clusters in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Multi-Cluster, Fleet, GitOps, Workload Replication, Kubernetes, SUSE Rancher

Description: Learn how to replicate Kubernetes workloads across multiple clusters in Rancher using Fleet GitOps, including targeting specific clusters and managing per-cluster configuration overrides.

---

Replicating workloads across multiple clusters ensures high availability, geographic distribution, and disaster recovery. In Rancher, Fleet is the primary tool for deploying the same workload to multiple clusters consistently.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                    Rancher (Fleet Manager)               │
│                                                         │
│  Git Repository                                         │
│       │                                                 │
│       ├──> Fleet Bundle ──> Cluster Group A (prod-us)   │
│       │                                                 │
│       └──> Fleet Bundle ──> Cluster Group B (prod-eu)   │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Create a GitRepo Resource Targeting Multiple Clusters

```yaml
# gitrepo-multi-cluster.yaml

apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: my-app
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/my-app-manifests
  branch: main
  paths:
    - manifests/

  # Target all clusters with the "env=production" label
  targets:
    - name: production-clusters
      clusterSelector:
        matchLabels:
          env: production
```

```bash
kubectl apply -f gitrepo-multi-cluster.yaml
```

---

## Step 2: Label Clusters for Targeting

In Rancher, add labels to the Fleet `Cluster` resources in the same workspace namespace as the `GitRepo`:

```bash
# Label clusters using kubectl (run against the Rancher management cluster)
kubectl label clusters.fleet.cattle.io prod-us \
  -n fleet-default \
  env=production region=us

kubectl label clusters.fleet.cattle.io prod-eu \
  -n fleet-default \
  env=production region=eu
```

---

## Step 3: Use Per-Cluster Overrides with fleet.yaml

Create a `fleet.yaml` in your manifests directory to apply per-cluster customizations:

```yaml
# manifests/fleet.yaml
defaultNamespace: my-app

helm:
  chart: ./chart
  releaseName: my-app

# Apply different values based on cluster labels
targetCustomizations:
  - name: us-override
    clusterSelector:
      matchLabels:
        region: us
    helm:
      values:
        replicaCount: 5
        region: us-west-2

  - name: eu-override
    clusterSelector:
      matchLabels:
        region: eu
    helm:
      values:
        replicaCount: 3
        region: eu-west-1
```

---

## Step 4: Verify Replication Status

```bash
# Check Fleet Bundle status in the Fleet workspace
kubectl get bundles.fleet.cattle.io -n fleet-default

# Check per-cluster BundleDeployment status
kubectl get bundledeployments.fleet.cattle.io -A

# View detailed status
kubectl describe gitrepo my-app -n fleet-default
```

The status should show the expected ready counts, for example:

```yaml
status:
  readyClusters: 2
  desiredReadyClusters: 2
  display:
    readyBundleDeployments: 2/2
  resourceCounts:
    desiredReady: 2
    ready: 2
    modified: 0
    notReady: 0
```

---

## Step 5: Handle Configuration Differences

For configurations that differ significantly between clusters, use Kustomize overlays:

```text
manifests/
├── base/
│   ├── deployment.yaml
│   └── kustomization.yaml
├── overlays/
│   ├── us/
│   │   └── kustomization.yaml    # Patches for US cluster
│   └── eu/
│       └── kustomization.yaml    # Patches for EU cluster
└── fleet.yaml
```

```yaml
# fleet.yaml with Kustomize paths
targetCustomizations:
  - name: us
    clusterSelector:
      matchLabels:
        region: us
    kustomize:
      dir: overlays/us

  - name: eu
    clusterSelector:
      matchLabels:
        region: eu
    kustomize:
      dir: overlays/eu
```

---

## Step 6: Monitor Replication Drift

If you enable drift correction, Fleet can reconcile external changes back to the desired state:

```yaml
# fleet.yaml
correctDrift:
  enabled: true
```

```bash
# Force a resync by setting forceSyncGeneration to a new higher number
kubectl patch gitrepo my-app -n fleet-default \
  --type merge \
  -p '{"spec":{"forceSyncGeneration":1}}'

# Inspect GitRepo status for Ready or Modified state
kubectl get gitrepo my-app -n fleet-default -o yaml
```

---

## Best Practices

- Use cluster labels (`region`, `env`, `tier`) rather than hardcoded cluster names in `fleet.yaml` targets - this makes it easy to add new clusters without modifying manifests.
- Keep base manifests generic and use `targetCustomizations` only for environment-specific differences like replica counts and resource limits.
- If you want Fleet to automatically revert manual changes, enable `correctDrift.enabled: true` in `fleet.yaml` or the `GitRepo`; otherwise Fleet reports those resources as `Modified`.
