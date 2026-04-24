# How to Configure Rancher Agent Resource Allocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Rancher Agent, Resource Management, Kubernetes, Cattle Agent, Performance

Description: Configure resource requests and limits for Rancher Agent pods to ensure stable cluster management without impacting application workloads.

## Introduction

Rancher deploys a `cattle-cluster-agent` in managed downstream clusters. Depending on cluster type, node-level operations are handled by `cattle-node-agent` on Rancher-created RKE clusters or by `rancher-system-agent` on Rancher-provisioned RKE2/K3s nodes. If you use Fleet, a `fleet-agent` is also deployed in the downstream cluster. Properly tuning agent resources ensures stable management communication without starving application workloads.

## Rancher Agent Components

| Component | Location | Purpose |
|---|---|---|
| cattle-cluster-agent | cattle-system namespace | Connects the downstream cluster to Rancher Server |
| cattle-node-agent | DaemonSet on Rancher-created RKE clusters | Node-level cluster operations |
| rancher-system-agent | systemd service on Rancher-provisioned RKE2/K3s nodes | Node lifecycle operations |
| fleet-agent | cattle-fleet-system namespace | GitOps and application deployment |

## Step 1: Configure cattle-cluster-agent Resources

For an immediate change on an existing cluster, update the cluster agent Deployment resources:

```bash
kubectl set resources deployment/cattle-cluster-agent \
  -n cattle-system \
  --requests=cpu=200m,memory=256Mi \
  --limits=cpu=1000m,memory=1Gi
```

## Step 2: Configure Agent Resources via Rancher Server

For Rancher-managed RKE2/K3s clusters, configure agent resources in the cluster spec:

```yaml
apiVersion: provisioning.cattle.io/v1
kind: Cluster
spec:
  clusterAgentDeploymentCustomization:
    overrideResourceRequirements:
      requests:
        cpu: "500m"
        memory: "512Mi"
      limits:
        cpu: "2000m"
        memory: "2Gi"
  fleetAgentDeploymentCustomization:
    overrideResourceRequirements:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
```

## Step 3: Configure cattle-node-agent Resources

If your downstream cluster was created in Rancher with RKE and `cattle-node-agent` is present, keep its footprint small. Rancher-provisioned RKE2/K3s clusters use `rancher-system-agent` on the node instead of a `cattle-node-agent` DaemonSet.

```bash
kubectl set resources daemonset/cattle-node-agent \
  -n cattle-system \
  --requests=cpu=50m,memory=64Mi \
  --limits=cpu=250m,memory=256Mi
```

## Step 4: Assign Agents to Specific Nodes

The `cattle-cluster-agent` already prefers control plane nodes. If control plane labels are not visible in the cluster, label a node so Rancher will prefer scheduling the cluster agent there:

```bash
kubectl label node my-node cattle.io/cluster-agent=true
```

## Step 5: Monitor Agent Resource Usage

```bash
# Requires Metrics Server to be installed
kubectl top pod -n cattle-system

# If Fleet is installed, check Fleet agent usage as well
kubectl top pod -n cattle-fleet-system

# Alert if cluster agent memory exceeds 80% of limit
# (indicates need to increase limits)
```

## Conclusion

Properly sized Rancher Agent resources ensure stable cluster management without impacting application performance. Start with Rancher's documented `cattle-cluster-agent` baseline request of `50m` CPU and `100Mi` memory, then increase requests and limits based on observed usage in your environment.
