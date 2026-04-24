# How to Configure Rancher Agent Resource Allocation - Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Agent, Resource Management, Cattle-system

Description: Configure resource requests and limits for Rancher agents running in managed clusters to prevent resource contention and ensure reliable cluster management.

## Introduction

Every Rancher-managed cluster runs the `cattle-cluster-agent` in `cattle-system`. Depending on cluster type, Rancher may also run `cattle-node-agent` or `rancher-system-agent`, and when Fleet is enabled the downstream cluster also runs `fleet-agent` in `cattle-fleet-system`. These agents communicate with Rancher server and maintain cluster state. Without proper resource requests and limits, these agents can consume excessive resources or be starved during high utilization. This guide covers configuring Rancher agent resources appropriately.

## Prerequisites

- Rancher-managed Kubernetes clusters
- Cluster admin access
- Understanding of your cluster's resource profile

## Step 1: Check Current Agent Resource Usage

```bash
# Check agent resource usage in a managed cluster

kubectl top pods -n cattle-system
kubectl top pods -n cattle-fleet-system

# Get current resource configuration
kubectl describe deployment cattle-cluster-agent -n cattle-system
kubectl describe deployment fleet-agent -n cattle-fleet-system

# Check if agents are hitting limits
kubectl get events -n cattle-system | grep -Ei "OOMKilled|Evicted"
kubectl get events -n cattle-fleet-system | grep -Ei "OOMKilled|Evicted"
```

## Step 2: Configure cattle-cluster-agent Resources

```bash
# Example starting point for an immediate downstream-cluster change
kubectl set resources deployment cattle-cluster-agent \
  -n cattle-system \
  --requests=cpu=200m,memory=256Mi \
  --limits=cpu=1000m,memory=1Gi

# Example higher values for a large cluster; validate against observed usage
kubectl set resources deployment cattle-cluster-agent \
  -n cattle-system \
  --requests=cpu=500m,memory=512Mi \
  --limits=cpu=2000m,memory=2Gi
```

## Step 3: Configure Fleet Agent Resources

```bash
# Fleet agent handles GitOps deployments
kubectl set resources deployment fleet-agent \
  -n cattle-fleet-system \
  --requests=cpu=100m,memory=128Mi \
  --limits=cpu=500m,memory=512Mi
```

## Step 4: Configure Persistent Agent Resources Through Rancher

```yaml
# Rancher-provisioned RKE2/K3s cluster object
spec:
  clusterAgentDeploymentCustomization:
    overrideResourceRequirements:
      requests:
        cpu: 200m
        memory: 256Mi
      limits:
        cpu: 1000m
        memory: 1Gi
```

```bash
# Find and edit the Rancher provisioning cluster object
kubectl get clusters.provisioning.cattle.io -A
kubectl edit clusters.provisioning.cattle.io <cluster-name> -n <namespace>

# Fleet downstream agent resources are configured on the Fleet Cluster resource
kubectl get clusters.fleet.cattle.io -A
kubectl edit clusters.fleet.cattle.io <cluster-name> -n <workspace>
```

```yaml
# Fleet Cluster resource
spec:
  agentResources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi
```

## Step 5: Prefer a Dedicated Node for cattle-cluster-agent

```bash
# Rancher already prefers control plane nodes when they are visible.
# If control plane nodes are not visible to Rancher, label a node to prefer
# scheduling the cluster agent there.
kubectl label node <node-name> cattle.io/cluster-agent=true
```

## Step 6: Enable Rancher-Managed Priority Class

```bash
# Enable Rancher's supported scheduling customization feature:
# Global Settings > Feature Flags > cluster-agent-scheduling-customization

# For imported clusters, annotate the management cluster object
kubectl annotate clusters.management.cattle.io c-xxxxx \
  provisioning.cattle.io/enable-scheduling-customization=true

# For Node Driver / Custom / RKE2 / K3s clusters, annotate the provisioning cluster object instead
kubectl annotate clusters.provisioning.cattle.io <cluster-name> -n <namespace> \
  provisioning.cattle.io/enable-scheduling-customization=true

# Rancher will create and manage cattle-cluster-agent-priority-class
# and cattle-cluster-agent-pod-disruption-budget for the cluster
```

## Step 7: Verify Tolerations for Tainted Nodes

```bash
# Rancher automatically applies default tolerations for cattle-cluster-agent
# and replaces them with control plane taint tolerations when control plane
# nodes are present. Verify the effective tolerations and node taints:
kubectl describe deployment cattle-cluster-agent -n cattle-system
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.taints}{"\n"}{end}'
```

## Step 8: Monitor Agent Health

```bash
# Watch agent reconnection patterns
kubectl logs -n cattle-system \
  deployment/cattle-cluster-agent \
  --since=1h | grep -E "error|reconnect|disconnect"

# Check the Rancher server endpoint configured for the agent
kubectl exec -n cattle-system \
  $(kubectl get pod -n cattle-system -l app=cattle-cluster-agent -o name | head -n1) \
  -- env | grep CATTLE_SERVER

# Watch for restarts or reconnect-related churn
kubectl get pods -n cattle-system -w
```

## Conclusion

Properly configured Rancher agent resources are critical for maintaining reliable cluster management. Under-resourced agents can experience disconnections from Rancher, which can cause management operations to fail. For persistent settings, prefer Rancher's cluster configuration fields over one-off downstream patches, and use Rancher's built-in scheduling customization rather than replacing the agent deployment's default scheduling rules.
