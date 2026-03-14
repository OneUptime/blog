# Upgrade Calico on Rancher Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, rancher, rke2, kubernetes, upgrade, networking, safety

Description: A comprehensive guide to safely upgrading Calico on Rancher-managed Kubernetes clusters (RKE and RKE2), with Rancher-specific pre-upgrade checks and rolling upgrade procedures.

---

## Introduction

Rancher's RKE and RKE2 distributions bundle specific versions of Calico (via Canal or standalone), and Rancher's management plane expects these components to remain in sync. Upgrading Calico outside of Rancher's managed upgrade path can cause the Rancher UI to show incorrect status or lose visibility into cluster networking.

For RKE2 clusters, Calico upgrades are typically handled through Rancher's cluster upgrade workflow, which updates the Kubernetes version and bundled CNI together. For clusters where Calico was installed separately via Tigera Operator, the upgrade path is more flexible but requires careful coordination with Rancher's cluster state.

This guide covers safe Calico upgrade procedures for both Rancher-managed CNI (RKE2 Canal/Calico) and operator-installed Calico on Rancher clusters.

## Prerequisites

- Rancher v2.7+ managing RKE or RKE2 clusters
- Rancher admin access (UI or CLI)
- `kubectl` with cluster-admin permissions on the target cluster
- `calicoctl` matching the current Calico version
- Maintenance window scheduled

## Step 1: Identify Calico Installation Method

Determine whether Calico is managed by Rancher or installed separately.

```bash
# Check if Calico is managed by Rancher (bundled in RKE2)
kubectl get pods -n kube-system | grep -E "calico|canal"

# Check if Tigera Operator is present (operator-managed Calico)
kubectl get pods -n tigera-operator 2>/dev/null && \
  echo "Tigera Operator managed" || \
  echo "Rancher-managed Canal/Calico"

# Check the RKE2 config for CNI setting
# On RKE2 nodes: cat /etc/rancher/rke2/config.yaml | grep cni
```

## Step 2: Pre-Upgrade Validation

Verify cluster health before beginning any upgrade.

```bash
# Check all Calico/Canal pods are healthy
kubectl get pods -n kube-system | grep -E "calico|canal|felix"

# Verify Calico node status on multiple nodes
calicoctl node status

# Check TigeraStatus if using Tigera Operator
kubectl get tigerastatus 2>/dev/null

# Verify all worker nodes are Ready
kubectl get nodes

# Check Rancher cluster health in UI or via CLI
# Rancher cluster should show "Active" state
```

## Step 3: Backup Calico Configuration

Export all Calico resources.

```bash
# Backup all Calico configuration
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)

calicoctl get felixconfiguration -o yaml > rancher-calico-backup-felix-$BACKUP_DATE.yaml
calicoctl get ippools -o yaml > rancher-calico-backup-ippools-$BACKUP_DATE.yaml
calicoctl get globalnetworkpolicies -o yaml > rancher-calico-backup-gnp-$BACKUP_DATE.yaml
calicoctl get networkpolicies -A -o yaml > rancher-calico-backup-np-$BACKUP_DATE.yaml

echo "Backup files created with timestamp: $BACKUP_DATE"
ls -la rancher-calico-backup-*-$BACKUP_DATE.yaml
```

## Step 4: Upgrade via Rancher UI (RKE2 Managed)

For RKE2 clusters where Calico is bundled, upgrade via the Rancher UI.

```bash
# Rancher UI path: Cluster Management > {cluster} > Edit > Kubernetes Version
# Updating the Kubernetes version upgrades bundled components including Calico

# Monitor the upgrade from kubectl
kubectl get nodes -w

# Each node will be cordoned, drained, upgraded, and uncordoned by Rancher
# Watch node status during rolling upgrade
kubectl get nodes | grep -E "SchedulingDisabled|Ready|NotReady"
```

For operator-managed Calico, upgrade independently:

```bash
# Download new Tigera Operator for standalone upgrade
kubectl apply --server-side \
  -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/tigera-operator.yaml

# Monitor operator upgrade
kubectl rollout status deployment/tigera-operator -n tigera-operator

# Watch calico-system pods upgrade
kubectl get pods -n calico-system -w
```

## Step 5: Post-Upgrade Validation

Verify Calico and Rancher are both healthy after the upgrade.

```bash
# Verify new Calico version
kubectl get pods -n kube-system -l k8s-app=calico-node \
  -o jsonpath='{.items[0].spec.containers[0].image}'

# Check that all nodes show Ready in kubectl
kubectl get nodes

# Verify Rancher shows cluster as Active (check Rancher UI)

# Run connectivity test
kubectl run conn-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl -s http://kubernetes.default.svc.cluster.local

# Verify network policies are enforced
calicoctl get networkpolicies -A
```

## Best Practices

- Prefer upgrading Calico through Rancher's managed upgrade workflow for RKE2 clusters
- Test Calico upgrades on a Rancher dev cluster with the same RKE2 version first
- Notify Rancher admin team before performing manual Calico upgrades on operator-managed clusters
- Watch Rancher's cluster state in the UI throughout the upgrade — it should remain Active
- If Rancher shows cluster as Unavailable during upgrade, wait — it typically recovers

## Conclusion

Safely upgrading Calico on Rancher requires understanding whether Calico is managed by Rancher's bundled RKE2 components or installed separately via the Tigera Operator. For bundled installations, Rancher's cluster upgrade workflow is the safest path. For operator-managed Calico, the standard Tigera Operator upgrade procedure applies with additional validation against Rancher's cluster state. In both cases, pre-upgrade backup and post-upgrade connectivity testing are essential.
