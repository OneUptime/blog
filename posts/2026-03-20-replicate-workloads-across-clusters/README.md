# How to Replicate Workloads Across Clusters in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Multi-Cluster, Workload Replication, Fleet, Kubernetes, High Availability, GitOps

Description: Learn how to replicate Kubernetes workloads across multiple Rancher-managed clusters for high availability, disaster recovery, and geographic distribution using Fleet and GitOps.

---

Replicating workloads across clusters helps keep an app available if one cluster fails, provided traffic is routed to a healthy cluster. Rancher Fleet makes this declarative and Git-driven.

---

## Step 1: Structure Your Repository for Multi-Cluster Delivery

Organize your Git repository so Fleet can deliver the same workload with environment-specific overrides:

```text
workloads/
  my-app/
    fleet.yaml            # Bundle definition
    base/
      deployment.yaml
      service.yaml
      hpa.yaml
    overlays/
      us-east/
        kustomization.yaml  # Region-specific patches
      eu-west/
        kustomization.yaml
```

---

## Step 2: Define the Fleet Bundle

`fleet.yaml` tells Fleet which clusters to target and how to apply the workload:

```yaml
# workloads/my-app/fleet.yaml

defaultNamespace: my-app

kustomize:
  dir: base

# Per-cluster customization using overlays
targetCustomizations:
  - name: us-east
    clusterSelector:
      matchLabels:
        region: us-east
    kustomize:
      dir: overlays/us-east

  - name: eu-west
    clusterSelector:
      matchLabels:
        region: eu-west
    kustomize:
      dir: overlays/eu-west
```

---

## Step 3: Region-Specific Kustomize Overlays

Each overlay patches the base manifests with region-specific values:

```yaml
# overlays/us-east/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - target:
      kind: Deployment
      name: my-app
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 5
  - target:
      kind: Deployment
      name: my-app
    patch: |-
      - op: add
        path: /spec/template/spec/nodeSelector
        value:
          topology.kubernetes.io/region: us-east-1
```

---

## Step 4: Register the GitRepo

Apply the Fleet GitRepo to start replication:

```yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: workloads
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/k8s-workloads.git
  branch: main
  paths:
    - workloads/my-app
  targets:
    - name: all-production
      clusterSelector:
        matchLabels:
          env: production
```

---

## Step 5: Verify Replication Status

```bash
# Check that the bundle is deployed to all target clusters
kubectl get bundles.fleet.cattle.io -n fleet-default

# Get per-cluster bundle deployment status
kubectl get bundledeployments.fleet.cattle.io -A -L fleet.cattle.io/cluster
```

---

## Step 6: Handle Cross-Cluster State Synchronization

For stateful workloads, replication requires additional consideration:

```yaml
# Use a distributed database (e.g., CockroachDB) that handles its own replication
# Reference config via ConfigMap per cluster
apiVersion: v1
kind: ConfigMap
metadata:
  name: db-config
  namespace: my-app
data:
  # Each cluster connects to a regional DB node
  DATABASE_URL: "postgresql://cockroachdb-us-east:26257/mydb"
```

---

## Best Practices

- Use **read replicas** for stateful workloads rather than running primary databases in multiple clusters simultaneously.
- Set **different PodDisruptionBudgets** per region based on traffic expectations.
- Test failover by temporarily draining all worker nodes in one cluster and verifying the other cluster handles the full load.
- Use a global traffic management layer (for example, AWS Route 53 or Cloudflare Load Balancing) to route traffic to the healthiest cluster.
