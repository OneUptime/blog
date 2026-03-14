# Upgrade Azure CNI to Cilium on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, EBPF

Description: A step-by-step guide to upgrading from Azure CNI to Cilium on Azure Kubernetes Service, covering pre-migration checks, the migration process, and post-upgrade validation.

---

## Introduction

Azure Kubernetes Service now supports running Cilium as the CNI through "Azure CNI Powered by Cilium" and "Azure CNI Overlay with Cilium." Migrating from standard Azure CNI to one of these Cilium-powered options delivers significant benefits: eBPF-accelerated networking, Cilium NetworkPolicy support, and improved observability through Hubble.

The migration from Azure CNI to Cilium on AKS is a disruptive operation that requires careful planning. Unlike in-place CNI upgrades, changing the CNI on AKS requires recreating node pools, and existing workloads will experience brief connectivity interruptions during node draining. Understanding this process and planning around it is critical for production migrations.

This guide covers the full migration path from Azure CNI to Cilium on AKS, including pre-migration checks, the recommended rolling migration approach using node pool replacement, and post-migration validation.

## Prerequisites

- AKS cluster running Azure CNI
- `az` CLI with Contributor access
- `kubectl` with cluster-admin permissions
- `cilium` CLI installed
- Maintenance window planned for production clusters

## Step 1: Assess Current Cluster Configuration

Before migration, document the current cluster configuration thoroughly.

```bash
# Document current network configuration
az aks show \
  --resource-group <resource-group> \
  --name <cluster-name> \
  --query "{networkPlugin:networkProfile.networkPlugin,podCidr:networkProfile.podCidr,serviceCidr:networkProfile.serviceCidr,dnsServiceIp:networkProfile.dnsServiceIP}" \
  -o json > pre-migration-network-config.json

# Document existing NetworkPolicies
kubectl get networkpolicies -A -o yaml > pre-migration-networkpolicies.yaml

# Document current pod-to-pod connectivity for validation baseline
kubectl get pods -A -o wide
```

## Step 2: Create a New Node Pool with Cilium

AKS Cilium support is enabled at the node pool level with Azure CNI Overlay.

```bash
# Create a new cluster with Azure CNI Overlay and Cilium
# Note: Cilium CNI on AKS requires creating a new cluster or node pool
az aks create \
  --resource-group <resource-group> \
  --name <new-cluster-name> \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --network-dataplane cilium \
  --pod-cidr 192.168.0.0/16 \
  --kubernetes-version 1.29.0 \
  --node-count 3 \
  --generate-ssh-keys

# For existing clusters - add a Cilium-enabled node pool
az aks nodepool add \
  --resource-group <resource-group> \
  --cluster-name <cluster-name> \
  --name ciliumpool \
  --node-count 3
```

## Step 3: Verify Cilium Installation on New Nodes

Confirm Cilium is running correctly on the new node pool before migrating workloads.

```bash
# Get credentials for the new cluster
az aks get-credentials \
  --resource-group <resource-group> \
  --name <cluster-name>

# Check Cilium status
cilium status

# Run the Cilium connectivity test
cilium connectivity test

# Verify all Cilium pods are healthy
kubectl get pods -n kube-system | grep cilium
```

## Step 4: Migrate Workloads to Cilium Nodes

Gradually migrate workloads from Azure CNI nodes to Cilium nodes.

```bash
# Cordon old Azure CNI node pool to prevent new workloads
kubectl cordon <azure-cni-node-name>

# Drain workloads from old node pool (one node at a time)
kubectl drain <azure-cni-node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --force

# Verify pods are rescheduled on Cilium nodes
kubectl get pods -A -o wide | grep ciliumpool

# Validate connectivity after migration
cilium connectivity test --test pod-to-pod
```

## Step 5: Apply CiliumNetworkPolicies for Migrated Workloads

If migrating from Azure NPM NetworkPolicies, review and test with Cilium.

```yaml
# Example: Migrating a NetworkPolicy to CiliumNetworkPolicy
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: migrated-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: my-service
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
```

```bash
# Apply the migrated policy
kubectl apply -f cilium-network-policy.yaml

# Verify the policy is enforced
kubectl get ciliumnetworkpolicies -n production
cilium policy get
```

## Best Practices

- Perform test migrations during off-peak hours with a low-traffic workload first
- Maintain both Azure CNI and Cilium node pools during migration for rollback capability
- Translate all NetworkPolicies to CiliumNetworkPolicies before removing old nodes
- Use Hubble to validate traffic flows before and after migration
- Remove old Azure CNI node pools only after all workloads are validated on Cilium

## Conclusion

Migrating from Azure CNI to Cilium on AKS delivers improved networking performance and advanced policy capabilities. By using a rolling node pool replacement approach, translating NetworkPolicies carefully, and validating connectivity at each step, you can complete the migration with minimal workload disruption. The investment in planning pays off as a more observable and controllable network layer for your AKS workloads.
