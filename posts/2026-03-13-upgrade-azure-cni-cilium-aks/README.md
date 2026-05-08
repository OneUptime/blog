# Upgrade Azure CNI to Cilium on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, eBPF

Description: A step-by-step guide to upgrading from Azure CNI to Cilium on Azure Kubernetes Service, covering pre-migration checks, the migration process, and post-upgrade validation.

---

## Introduction

Azure Kubernetes Service now supports running Cilium as the data plane through "Azure CNI Powered by Cilium" and "Azure CNI Overlay with Cilium." Migrating from standard Azure CNI to one of these Cilium-powered options delivers significant benefits: eBPF-accelerated networking, Cilium NetworkPolicy support, and improved cluster traffic observability.

The migration from Azure CNI to Cilium on AKS is a disruptive operation that requires careful planning. Updating the data plane triggers AKS to reimage node pools simultaneously, and existing workloads can experience connectivity interruptions similar to a node image or Kubernetes version upgrade. Understanding this process and planning around it is critical for production migrations.

This guide covers the migration path from Azure CNI to Cilium on AKS, including pre-migration checks, the supported AKS update process, and post-migration validation.

## Prerequisites

- AKS cluster running Azure CNI
- Azure CLI 2.52.0 or later with Contributor access
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
  --query "{networkPlugin:networkProfile.networkPlugin,podCidr:networkProfile.podCidr,serviceCidr:networkProfile.serviceCidr,dnsServiceIp:networkProfile.dnsServiceIp}" \
  -o json > pre-migration-network-config.json

# Document existing NetworkPolicies
kubectl get networkpolicies -A -o yaml > pre-migration-networkpolicies.yaml

# Document current pod-to-pod connectivity for validation baseline
kubectl get pods -A -o wide
```

## Step 2: Update the Cluster to Cilium

AKS Cilium support is enabled at the cluster data plane level. Updating the data plane on an existing cluster reimages node pools; updating each node pool separately is not supported.

```bash
# Create a new cluster with Azure CNI Overlay and Cilium
az aks create \
  --resource-group <resource-group> \
  --name <new-cluster-name> \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --network-dataplane cilium \
  --pod-cidr 192.168.0.0/16 \
  --node-count 3 \
  --generate-ssh-keys

# For existing Azure CNI clusters - update the data plane to Cilium
az aks update \
  --resource-group <resource-group> \
  --name <cluster-name> \
  --network-dataplane cilium
```

## Step 3: Verify Cilium Installation

Confirm Cilium is running correctly after the update completes.

```bash
# Get credentials for the cluster
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

## Step 4: Validate Workloads After Reimaging

After AKS reimages the node pools, validate that workloads are running and that connectivity matches the pre-migration baseline.

```bash
# Verify node readiness after the update
kubectl get nodes -o wide

# Verify pods have recovered
kubectl get pods -A -o wide

# Validate pod connectivity after migration
cilium connectivity test --test /pod-to-pod
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
kubectl describe ciliumnetworkpolicy migrated-policy -n production
```

## Best Practices

- Perform test migrations during off-peak hours with a low-traffic workload first
- Test the update in a non-production cluster with the same network policy coverage before the production change
- Validate all existing NetworkPolicies for Cilium behavior before the update, especially if migrating from Azure NPM or Calico
- If Hubble is enabled, use it to validate traffic flows before and after migration
- Monitor node reimaging and workload recovery until all applications are validated on Cilium

## Conclusion

Migrating from Azure CNI to Cilium on AKS delivers improved networking performance and advanced policy capabilities. By using the supported AKS data plane update process, validating NetworkPolicies carefully, and checking connectivity after the node pool reimage completes, you can complete the migration with planned workload disruption. The investment in planning pays off as a more observable and controllable network layer for your AKS workloads.
