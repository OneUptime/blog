# Upgrade Cilium on Alibaba Cloud ENI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Alibaba Cloud, ENI, eBPF

Description: A step-by-step guide to upgrading Cilium on Alibaba Cloud Kubernetes clusters using Elastic Network Interface (ENI) mode, including Alibaba Cloud-specific prerequisites and validation steps.

---

## Introduction

Alibaba Cloud Container Service for Kubernetes (ACK) supports Cilium as a CNI through its AlibabaCloud ENI mode, which attaches VPC ENIs to ECS nodes and assigns VPC IPs to pods for high-performance networking. Upgrading Cilium in ENI mode on Alibaba Cloud requires understanding how the ENI allocation lifecycle interacts with the Cilium upgrade process.

Cilium's ENI mode on Alibaba Cloud allocates ENI network interfaces from the VPC, attaches them to nodes, and publishes available pod IPs through CiliumNode resources. During a Cilium upgrade, the ENI allocator must be handled carefully to avoid stranding ENIs or causing pod connectivity gaps. The upgrade procedure ensures that ENI configurations are preserved and that the new Cilium version properly re-inherits all existing ENI allocations.

This guide covers the specific steps for upgrading Cilium in Alibaba Cloud ENI mode, including ACK-specific pre-upgrade checks and post-upgrade ENI validation.

## Prerequisites

- Alibaba Cloud ACK cluster with Cilium in ENI mode
- `aliyun` CLI configured with appropriate RAM permissions
- `kubectl` with cluster-admin access
- `cilium` CLI installed
- Helm installed, with the `helm diff` plugin if you want to preview upgrade changes
- Alibaba Cloud VPC with available ENI capacity

## Step 1: Pre-Upgrade Health Check

Verify Cilium and ENI health before the upgrade.

```bash
# Check current Cilium version

cilium version

# Check Cilium status
cilium status --verbose

# Verify all Cilium pods are healthy
kubectl get pods -n kube-system -l k8s-app=cilium

# Check ENI allocations are healthy
kubectl get ciliumnodes -o wide

# View current AlibabaCloud IPAM mode configuration
kubectl get configmap -n kube-system cilium-config \
  -o jsonpath='{.data.ipam}'
```

## Step 2: Check Alibaba Cloud ENI Capacity

Verify sufficient ENI capacity is available for the upgrade process.

```bash
# Check current ENI usage per node
kubectl get ciliumnodes -o json | \
  jq '.items[] | {name: .metadata.name, allocatedIPs: .status.ipam.used | length}'

# Check Alibaba Cloud ENI limits for instance types
aliyun ecs DescribeInstanceTypes \
  --InstanceTypes.1 <instance-type> \
  --output json | jq '.InstanceTypes.InstanceType[0] | {maxENI: .EniQuantity, maxIPPerENI: .EniPrivateIpAddressQuantity}'
```

## Step 3: Backup Current Cilium Configuration

Export Cilium configuration before the upgrade.

```bash
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)

# Back up Cilium ConfigMap
kubectl get configmap -n kube-system cilium-config \
  -o yaml > cilium-config-backup-$BACKUP_DATE.yaml

# Back up CiliumNetworkPolicies
kubectl get ciliumnetworkpolicies -A \
  -o yaml > cilium-cnp-backup-$BACKUP_DATE.yaml

# Back up CiliumClusterwideNetworkPolicies
kubectl get ciliumclusterwidenetworkpolicies \
  -o yaml > cilium-ccnp-backup-$BACKUP_DATE.yaml

echo "Backup complete: $BACKUP_DATE"
```

## Step 4: Perform the Cilium Upgrade

Upgrade Cilium using Helm.

```bash
# Choose the target version from the official Cilium upgrade guide.
# Upgrade one minor version at a time, and use the latest patch release
# for your current version before starting a minor upgrade.
TARGET_VERSION="1.19.3"

# Using Helm for upgrade (recommended for ACK clusters)
helm repo add cilium https://helm.cilium.io/
helm repo update

# Save existing values and review them against the target version's
# version-specific upgrade notes before reusing them.
helm get values cilium --namespace kube-system -o yaml > old-values.yaml

# Preview upgrade changes
helm diff upgrade cilium cilium/cilium \
  --namespace kube-system \
  --version "$TARGET_VERSION" \
  -f old-values.yaml

# Execute upgrade with ENI mode preserved
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --version "$TARGET_VERSION" \
  -f old-values.yaml \
  --atomic \
  --timeout 10m

# Monitor the rolling update
kubectl rollout status daemonset/cilium -n kube-system --timeout=10m
```

## Step 5: Validate ENI Configuration Post-Upgrade

Verify ENI allocations are intact after the upgrade.

```bash
# Check new Cilium version
cilium version

# Verify ENI mode is still configured
kubectl get configmap -n kube-system cilium-config \
  -o jsonpath='{.data.ipam}'

# Verify ENI allocations are healthy on all nodes
kubectl get ciliumnodes -o json | \
  jq '.items[] | {name: .metadata.name, availableIPs: (.spec.ipam.available // {} | length), usedIPs: (.status.ipam.used // {} | length), enis: (.status["alibaba-cloud"].enis // {} | length)}'

# Run connectivity test
cilium connectivity test

# Verify pods can still communicate through ENI interfaces
kubectl run eni-test --image=busybox --rm -it --restart=Never -- \
  ping -c 3 <another-pod-ip>
```

## Best Practices

- Verify ENI quotas before upgrading - ENI capacity constraints can cause upgrade delays
- Use Alibaba Cloud's ECS snapshot before upgrading worker nodes for rollback capability
- Monitor Alibaba Cloud's VPC flow logs for ENI traffic anomalies post-upgrade
- Keep Cilium ConfigMap values for ENI-specific settings in version control
- Test the upgrade on a single node pool first before rolling to all node groups

## Conclusion

Upgrading Cilium in Alibaba Cloud ENI mode requires careful attention to ENI capacity and configuration preservation. By verifying ENI quotas, backing up configuration, using Helm's atomic upgrade with rollback, and validating ENI allocations post-upgrade, you ensure a smooth upgrade that maintains the high-performance networking that Alibaba Cloud ENI mode provides.
