# Upgrade Calico on Self-Managed Azure Kubernetes Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Upgrade, Azure, Self-Managed

Description: A guide to safely upgrading Calico on self-managed Kubernetes clusters running on Azure VMs, with Azure-specific validation steps and procedures for maintaining network continuity.

---

## Introduction

Self-managed Kubernetes clusters on Azure VMs run Calico on top of Azure's VNet networking layer. Upgrading Calico in this environment requires ensuring that Azure VNet routes, NSG rules, and VXLAN configurations remain consistent throughout the rolling upgrade process.

Azure VMs communicate via VNet, and Calico's VXLAN tunnels or Azure route-based networking must remain functional during the upgrade. Unlike AKS, there's no managed upgrade workflow - all aspects of the Calico upgrade are your responsibility, including ensuring the Tigera Operator rollout doesn't cause traffic gaps on nodes being upgraded.

This guide provides safe Calico upgrade procedures for self-managed Azure Kubernetes, including Azure-specific pre-checks, backup procedures, and post-upgrade validation.

## Prerequisites

- Self-managed Kubernetes on Azure VMs
- `az` CLI with Network Contributor access
- `kubectl` with cluster-admin permissions
- `calicoctl` matching the installed Calico version
- SSH access to cluster nodes

## Step 1: Pre-Upgrade Azure Network Validation

Verify Azure networking is healthy before the Calico upgrade.

```bash
# Check Kubernetes nodes are all Ready
kubectl get nodes -o wide

# Check current Calico version
kubectl get pods -n calico-system \
  -o jsonpath='{.items[0].spec.containers[0].image}'

# Verify VXLAN tunnels are functional (if using VXLAN mode)
calicoctl node status

# Verify Azure NSG rules are in place
az network nsg rule list \
  --resource-group <resource-group> \
  --nsg-name <nsg-name> \
  --query "[?contains(name,'calico')]" \
  -o table
```

## Step 2: Backup Calico and Azure Network Configuration

Document all configuration for rollback capability.

```bash
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)

# Back up Calico resources
calicoctl get felixconfiguration -o yaml > azure-calico-backup-felix-$BACKUP_DATE.yaml
calicoctl get ippools -o yaml > azure-calico-backup-ippools-$BACKUP_DATE.yaml
calicoctl get globalnetworkpolicies -o yaml > azure-calico-backup-gnp-$BACKUP_DATE.yaml
kubectl get installation default -o yaml > azure-calico-backup-installation-$BACKUP_DATE.yaml

# Document Azure NSG rules
az network nsg list \
  --resource-group <resource-group> \
  -o json > azure-nsg-backup-$BACKUP_DATE.json

# Document Azure VNet routes
az network route-table list \
  --resource-group <resource-group> \
  -o json > azure-routes-backup-$BACKUP_DATE.json
```

## Step 3: Upgrade Tigera Operator

Update the operator before upgrading Calico components.

```bash
# Apply the new Tigera Operator manifest
kubectl apply --server-side \
  -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/tigera-operator.yaml

# Wait for the operator to be healthy
kubectl rollout status deployment/tigera-operator -n tigera-operator --timeout=5m

# Verify operator pod is running the new version
kubectl get pod -n tigera-operator \
  -o jsonpath='{.items[0].spec.containers[0].image}'
```

## Step 4: Rolling Upgrade of Calico DaemonSet

Trigger the rolling upgrade through the operator.

```bash
# Apply updated custom resources
kubectl apply \
  -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/custom-resources.yaml

# Monitor calico-node rolling update - each node upgrades sequentially
kubectl rollout status daemonset/calico-node -n calico-system --timeout=15m

# During rolling upgrade, verify VXLAN tunnel recovery on recently upgraded nodes
# Wait for each node's VXLAN tunnel to come back up
calicoctl node status

# Monitor Azure load balancer health probes (if serving LB traffic)
az network lb show \
  --resource-group <resource-group> \
  --name <lb-name> \
  --query "loadBalancingRules[*].{name:name,protocol:protocol,port:frontendPort}"
```

## Step 5: Post-Upgrade Azure Network Validation

Verify all Azure networking integrations are intact.

```bash
# Verify new Calico version
kubectl get clusterinformation default -o yaml | grep calicoVersion

# Check TigeraStatus
kubectl get tigerastatus calico

# Test inter-node pod connectivity (including cross-AZ if applicable)
kubectl create deployment conn-test --image=nginx --replicas=3
kubectl expose deployment conn-test --port=80
kubectl run test-client --image=curlimages/curl --rm -it --restart=Never -- \
  curl http://conn-test

# Verify Azure NSG rules still allow Calico VXLAN traffic (UDP 4789)
az network nsg rule show \
  --resource-group <resource-group> \
  --nsg-name <nsg-name> \
  --name allow-calico-vxlan

# Clean up test resources
kubectl delete deployment conn-test
kubectl delete service conn-test
```

## Best Practices

- Schedule Azure VM maintenance windows to align with Calico upgrade windows
- Verify Azure proximity placement groups (if used) don't interfere with Calico node selection
- Monitor Azure VM CPU and network metrics during the rolling upgrade
- Keep a terminal session open with `kubectl get pods -n calico-system -w` throughout the upgrade
- Test VXLAN connectivity explicitly if using VXLAN mode - Azure VNet sometimes needs time to learn new routes

## Conclusion

Upgrading Calico on self-managed Azure Kubernetes requires attention to Azure VNet and NSG configuration alongside the standard Calico upgrade procedure. By backing up both Calico configuration and Azure network configuration, using the Tigera Operator's rolling update, and explicitly validating VXLAN tunnel recovery and Azure NSG consistency, you achieve a safe upgrade with no lasting impact on production workload connectivity.
