# How to Configure Node Pools in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Node Templates, Cloud Credentials

Description: A step-by-step guide to configuring and managing node pools in Rancher for scalable Kubernetes cluster infrastructure.

Node pools in Rancher group nodes with the same configuration and role assignment. In newer Rancher releases, the same concept is often surfaced as machine pools, while older RKE1 workflows use node templates. They simplify cluster management by allowing you to scale nodes up or down as a group and ensure consistent configuration across nodes serving the same purpose. This guide covers creating, configuring, and managing node pools effectively.

## Prerequisites

- Rancher v2.6 or later with a machine-provisioned cluster type
- At least one cloud credential configured
- Node templates (RKE1) or machine configs (newer machine-provisioned clusters) created for your infrastructure provider
- Cluster creation permissions

## Understanding Node Pools

A node pool defines a group of nodes that share the same node template or machine config and Kubernetes roles. When you add or remove nodes from a pool, Rancher automatically provisions or decommissions machines with identical configurations. Each node pool can be assigned one or more roles: etcd, control plane, or worker.

## Step 1: Plan Your Node Pool Architecture

Design your node pool structure before creating clusters:

```plaintext
Cluster: production-us-east
├── Pool: etcd-pool
│   ├── Template: aws-etcd-m5-xlarge
│   ├── Count: 3
│   └── Roles: etcd
├── Pool: controlplane-pool
│   ├── Template: aws-cp-m5-xlarge
│   ├── Count: 3
│   └── Roles: Control Plane
├── Pool: worker-general
│   ├── Template: aws-worker-t3-large
│   ├── Count: 5
│   └── Roles: Worker
└── Pool: worker-gpu
    ├── Template: aws-gpu-p3-2xlarge
    ├── Count: 2
    └── Roles: Worker
```

## Step 2: Create Node Pools During Cluster Creation

When creating a new machine-provisioned cluster with an infrastructure provider:

1. Go to **Cluster Management** and click **Create**.
2. Select your infrastructure provider (e.g., Amazon EC2).
3. Enter the cluster name and configuration.
4. In the **Node Pools** section, or **Machine Pools** in newer releases, configure your first pool.

For the etcd pool:

```plaintext
Name Prefix: etcd
Count: 3
Template: aws-etcd-m5-xlarge
Roles: ☑ etcd  ☐ Control Plane  ☐ Worker
Recreate Unreachable After: 0 (disabled)
```

## Step 3: Add Multiple Node Pools

Click **Add Node Pool** to create additional pools:

For the control plane pool:

```plaintext
Name Prefix: controlplane
Count: 3
Template: aws-cp-m5-xlarge
Roles: ☐ etcd  ☑ Control Plane  ☐ Worker
Recreate Unreachable After: 0 (disabled)
```

For the worker pool:

```plaintext
Name Prefix: worker
Count: 5
Template: aws-worker-t3-large
Roles: ☐ etcd  ☐ Control Plane  ☑ Worker
Recreate Unreachable After: 5 minutes
```

## Step 4: Configure Auto-Replace Settings

Auto-replace is typically used for stateless worker pools:

1. For worker pools, set the **Recreate Unreachable After** timeout, labeled **Auto Replace** in newer machine-pool UIs.
2. This defines how long Rancher waits before replacing a non-responsive node.
3. Leave auto-replace disabled for etcd, control plane, or stateful pools.

```plaintext
Recreate Unreachable After: 5 minutes (300 seconds)
```

When a node becomes unresponsive for longer than the timeout, Rancher will:
1. Mark the node as unreachable and start the deletion countdown.
2. Delete the node object if it does not recover before the timeout.
3. Provision a new node with the same template or machine config.
4. Return the pool to its desired count.

## Step 5: Configure Node Pool Labels

Add Kubernetes labels to all nodes in a pool:

1. In the node pool configuration, find the **Node Labels** section.
2. Add labels that help with workload scheduling.

```yaml
# Labels for worker-general pool
node-pool: worker-general
workload-type: general
cost-center: engineering
---
# Labels for worker-gpu pool
node-pool: worker-gpu
workload-type: gpu
accelerator: nvidia-tesla-v100
```

## Step 6: Configure Node Pool Taints

Add taints to control workload scheduling:

```yaml
# Taints for GPU worker pool
- key: nvidia.com/gpu
  value: "true"
  effect: NoSchedule
---
# Taints for dedicated workload pool
- key: dedicated
  value: database
  effect: NoSchedule
```

This ensures that only pods with matching tolerations are scheduled on these nodes:

```yaml
# Pod spec with toleration for GPU nodes
spec:
  tolerations:
    - key: nvidia.com/gpu
      operator: Equal
      value: "true"
      effect: NoSchedule
  nodeSelector:
    workload-type: gpu
```

## Step 7: Scale Node Pools

Adjust node pool sizes after cluster creation:

1. Go to **Cluster Management** and select your cluster.
2. Click the three-dot menu and select **Edit Config**.
3. In the **Node Pools** or **Machine Pools** section, change the **Count** for any pool.
4. Click **Save**.

Scale via the API:

```bash
# Get current node pool configuration
curl -s -k \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  "https://rancher.example.com/v3/nodePools" | \
  jq '.data[]
      | select(.clusterId == "c-xxxxx")
      | {id: .id, name: .hostnamePrefix, quantity: .quantity}'

# Scale a node pool
NODE_POOL_ID="$(curl -s -k \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  "https://rancher.example.com/v3/nodePools" | \
  jq -r '.data[]
         | select(.clusterId == "c-xxxxx" and .hostnamePrefix == "worker")
         | .id')"

curl -s -k \
  -X PUT \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 8}' \
  "https://rancher.example.com/v3/nodePools/${NODE_POOL_ID}"
```

## Step 8: Monitor Node Pool Health

Track the health and status of nodes in each pool:

```bash
# List nodes by pool
curl -s -k \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  "https://rancher.example.com/v3/nodes" | \
  jq '.data[]
      | select(.clusterId == "c-xxxxx")
      | {
          name: .nodeName,
          pool: .nodePoolId,
          state: .state,
          transitioning: .transitioning,
          roles: {
            etcd: .etcd,
            controlplane: .controlPlane,
            worker: .worker
          }
        }'
```

## Step 9: Replace Individual Nodes

Replace a specific node in a pool without scaling:

1. Go to the cluster dashboard.
2. Navigate to **Nodes**.
3. Find the node you want to replace.
4. Click the three-dot menu and select **Delete**.
5. If node auto-replace is enabled for that pool, Rancher will provision a replacement to maintain the pool's desired count.

For a controlled replacement:

```bash
# Cordon the node first
kubectl cordon <node-name>

# Drain workloads
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data --force

# Look up the Rancher node ID
NODE_ID="$(curl -s -k \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  "https://rancher.example.com/v3/nodes" | \
  jq -r '.data[]
         | select(.clusterId == "c-xxxxx" and .nodeName == "<node-name>")
         | .id')"

# Delete the node from Rancher
curl -s -k \
  -X DELETE \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  "https://rancher.example.com/v3/nodes/${NODE_ID}"
```

## Step 10: Delete Node Pools

Remove a node pool from an existing cluster:

1. Navigate to the cluster's edit configuration.
2. Click the **X** next to the node pool you want to remove.
3. Click **Save**.

If **Drain Before Delete** is enabled for the pool, Rancher will drain nodes before deleting them; otherwise, it will decommission them without a drain step. Make sure workloads on those nodes can be rescheduled to other nodes.

## Best Practices

- **Separate roles**: Keep worker nodes separate from etcd and control plane roles in production, and use dedicated pools where appropriate.
- **Use odd numbers for etcd**: Always run 3 or 5 etcd nodes for proper quorum.
- **Size appropriately**: Choose instance types that match the expected workload for each pool.
- **Enable auto-replace selectively**: Use auto-replace for stateless worker pools, not etcd/control-plane pools or nodes with persistent volumes.
- **Label everything**: Use consistent labeling across node pools to simplify workload scheduling and cost tracking.

## Conclusion

Node pools in Rancher provide a structured approach to managing cluster infrastructure. By designing your pools with clear role separation, appropriate sizing, and automated recovery, you build resilient Kubernetes clusters that can scale with your workloads. Start with a well-planned pool architecture and adjust as you learn more about your workload patterns.
