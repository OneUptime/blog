# Upgrade Calico on AKS Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, aks, azure, kubernetes, upgrade, networking, safety

Description: A step-by-step guide to safely upgrading Calico on Azure Kubernetes Service, with pre-upgrade checks, rolling upgrade procedures, and post-upgrade validation to minimize disruption.

---

## Introduction

Upgrading Calico on AKS requires care because Calico manages the network data plane that all workloads depend on. A failed or misconfigured upgrade can cause network disruptions that affect production services. AKS clusters have the additional complexity of Azure's managed control plane, which must remain compatible with your Calico version.

Calico upgrades on AKS follow the standard Calico rolling upgrade process, but with AKS-specific considerations: Azure CNI may be chained with Calico for policy enforcement, node pool upgrades must be coordinated with Calico version bumps, and Azure NSG rules must remain consistent throughout the upgrade.

This guide provides a safe upgrade path for Calico on AKS, covering pre-upgrade validation, the rolling upgrade procedure, and post-upgrade verification steps.

## Prerequisites

- AKS cluster running Calico (via Tigera Operator or manifest installation)
- `az` CLI with appropriate permissions
- `kubectl` with cluster-admin access
- `calicoctl` matching the current Calico version
- Backup of existing Calico configuration

## Step 1: Pre-Upgrade Validation

Before upgrading, validate the current Calico state is healthy.

```bash
# Check current Calico version
kubectl get pods -n calico-system -l app.kubernetes.io/name=calico-node \
  -o jsonpath='{.items[0].spec.containers[0].image}'

# Verify all Calico pods are running and ready
kubectl get pods -n calico-system
kubectl get pods -n tigera-operator

# Check Calico node status
calicoctl node status

# Verify TigeraStatus is Available
kubectl get tigerastatus calico
```

## Step 2: Backup Current Calico Configuration

Back up all Calico custom resources before upgrading.

```bash
# Back up all Calico configuration to a timestamped file
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)

# Export all Calico resources
calicoctl get felixconfiguration -o yaml > calico-backup-felix-$BACKUP_DATE.yaml
calicoctl get bgpconfiguration -o yaml > calico-backup-bgp-$BACKUP_DATE.yaml
calicoctl get ippools -o yaml > calico-backup-ippools-$BACKUP_DATE.yaml
calicoctl get globalnetworkpolicies -o yaml > calico-backup-gnp-$BACKUP_DATE.yaml
calicoctl get networkpolicies -A -o yaml > calico-backup-np-$BACKUP_DATE.yaml

# Also back up the Tigera Operator configuration
kubectl get installation default -o yaml > calico-backup-installation-$BACKUP_DATE.yaml
```

## Step 3: Review the Upgrade Path

Check the Calico upgrade path for your specific version pair.

```bash
# Check current Calico version
kubectl get clusterinformation default -o yaml | grep calicoVersion

# Review release notes for your target version
# Visit: https://docs.tigera.io/calico/latest/release-notes/

# Check if Tigera Operator needs updating first
kubectl get deployment -n tigera-operator tigera-operator \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# Calico upgrade order:
# 1. Upgrade Tigera Operator
# 2. Update the Installation resource to new version
# 3. Operator performs rolling upgrade of Calico components
```

## Step 4: Perform the Upgrade

Upgrade via the Tigera Operator method (recommended for AKS).

```bash
# Download the new Tigera Operator manifest
curl -O https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/tigera-operator.yaml

# Apply the new operator
kubectl apply -f tigera-operator.yaml

# Monitor the operator upgrade
kubectl rollout status deployment tigera-operator -n tigera-operator

# Update the Installation resource to trigger Calico component upgrades
kubectl patch installation default --type merge \
  --patch '{"spec":{"variant":"Calico","calicoNetwork":{"calicoVersion":"v3.28.0"}}}'

# Monitor the rolling upgrade progress
kubectl get pods -n calico-system -w
```

## Step 5: Post-Upgrade Validation

Verify the upgrade completed successfully and all network policies are enforced.

```bash
# Verify new Calico version is running
kubectl get pods -n calico-system \
  -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.containers[0].image}{"\n"}{end}'

# Check TigeraStatus
kubectl get tigerastatus calico

# Validate node status with new calicoctl version
calicoctl version
calicoctl node status

# Run a connectivity test between pods
kubectl run test-pod-1 --image=busybox --rm -it -- wget -qO- http://test-service
kubectl run test-pod-2 --image=busybox --rm -it -- wget -qO- http://test-service

# Verify network policies are still enforced
calicoctl get networkpolicies -A
```

## Best Practices

- Always upgrade Calico during a maintenance window with workload owner notification
- Test the upgrade on a staging AKS cluster with the same node pool configuration first
- Keep `calicoctl` version in sync with the Calico version being deployed
- Monitor Azure Monitor and cluster events during upgrade for anomalies
- Have a rollback plan: keep the backup manifests and know the downgrade procedure

## Conclusion

Safely upgrading Calico on AKS requires systematic pre-upgrade validation, configuration backup, and careful monitoring throughout the rolling upgrade process. By following the Tigera Operator upgrade path and validating each step, you minimize the risk of network disruptions affecting production workloads. Post-upgrade validation using connectivity tests and policy verification confirms the upgrade was successful before closing the maintenance window.
