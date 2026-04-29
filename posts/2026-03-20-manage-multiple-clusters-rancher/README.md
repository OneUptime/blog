# How to Manage Multiple Clusters from a Single Rancher Instance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Multi-Cluster, Kubernetes, Cluster Management, DevOps, RBAC, Federation

Description: Learn how to import, provision, and manage multiple Kubernetes clusters from a single Rancher instance, covering cluster registration, RBAC, and centralized operations.

---

One of Rancher's core strengths is its ability to manage dozens or hundreds of Kubernetes clusters from a single control plane. This guide covers the key workflows for multi-cluster management.

---

## Cluster Import vs. Provisioning

Rancher supports two modes:

| Method | Use Case |
|---|---|
| **Import** | Existing clusters (EKS, GKE, AKS, on-prem) |
| **Provision** | Rancher creates and manages the cluster lifecycle |

---

## Step 1: Import an Existing Cluster

In Rancher UI, go to **Cluster Management > Import Existing**. Choose the cluster type, give it a name, then run the provided command on the cluster:

```bash
# Rancher generates a unique import manifest per cluster

# Run this on the target cluster to register it
kubectl apply -f https://rancher.example.com/v3/import/<token>.yaml

# Verify the cattle-cluster-agent is running
kubectl get pods -n cattle-system
```

The cluster appears in Rancher UI once the agent connects.

---

## Step 2: Provision a New RKE2 Cluster

Use Rancher to provision a new machine-provisioned RKE2 cluster on Amazon EC2:

```yaml
# cluster-rke2.yaml (apply on the Rancher management cluster)
apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: production-us-east
  namespace: fleet-default
spec:
  cloudCredentialSecretName: cattle-global-data:cc-xxxxx
  rkeConfig:
    machinePools:
      - name: control-plane
        quantity: 3
        machineConfigRef:
          kind: Amazonec2Config
          name: rke2-control-plane
        controlPlaneRole: true
        etcdRole: true
      - name: workers
        quantity: 5
        machineConfigRef:
          kind: Amazonec2Config
          name: rke2-worker
        workerRole: true
```

---

## Step 3: Organize Clusters with Labels and Annotations

Labels help with targeting in Fleet and grouping clusters in the Continuous Delivery UI:

```bash
# Label a managed cluster in the Fleet workspace
kubectl label clusters.fleet.cattle.io c-xxxxx \
  -n fleet-default \
  env=production \
  region=us-east \
  tier=frontend

# Add custom metadata with an annotation
kubectl annotate clusters.fleet.cattle.io c-xxxxx \
  -n fleet-default \
  ops.example.com/description="Production US East"
```

---

## Step 4: Configure Cluster-Level RBAC

Assign users to clusters using Rancher's ClusterRoleTemplateBindings:

```yaml
# Bind a user to the cluster-member role on a specific cluster
apiVersion: management.cattle.io/v3
kind: ClusterRoleTemplateBinding
metadata:
  name: jane-cluster-member
  namespace: c-xxxxx
clusterName: c-xxxxx
roleTemplateName: cluster-member
userPrincipalName: local://u-jane
```

Rancher's primary cluster membership roles include:
- `cluster-owner` - full control
- `cluster-member` - view most cluster-scoped resources and create projects

Project-scoped roles such as `read-only` apply at the project/namespace level rather than the cluster level.

---

## Step 5: Use kubectl for Multiple Clusters

Download per-cluster kubeconfigs from the Rancher UI, or use the Rancher CLI:

```bash
# Download a Rancher CLI release tarball and make it available in PATH
# Replace <version> with a CLI release tag such as v2.14.0
curl -L -o rancher.tar.gz \
  https://github.com/rancher/cli/releases/download/<version>/rancher-linux-amd64-<version>.tar.gz
tar -xzf rancher.tar.gz
export PATH="$PWD/rancher-<version>:$PATH"

# Login
rancher login https://rancher.example.com --token <api-token>

# List clusters
rancher clusters ls

# Export a kubeconfig for a specific cluster
rancher clusters kubeconfig production-us-east > production-us-east.yaml

# Run kubectl against that cluster
KUBECONFIG=./production-us-east.yaml kubectl get nodes
```

---

## Step 6: Centralized Alerting Across Clusters

In current Rancher releases, alerting is configured per cluster rather than through a global receiver in **Cluster Management**. Enable monitoring on each managed cluster, then create receivers at **Monitoring > Alerting > AlertManagerConfigs**. To centralize notifications across clusters, point each cluster's Alertmanager at the same external destination or observability platform.

---

## Best Practices

- Use **cluster groups** in Fleet to apply policies to logical collections of clusters.
- Keep the Rancher management cluster separate from workload clusters for stability.
- Install Rancher's **Compliance** app and run an appropriate **CIS profile** on all clusters to baseline security posture across environments.
- Store cluster provisioning configs in Git and apply with Fleet for infrastructure-as-code.
