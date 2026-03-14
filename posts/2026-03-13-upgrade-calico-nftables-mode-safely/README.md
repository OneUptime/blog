# How to Upgrade Calico in nftables Mode Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, nftables, Upgrade

Description: A safe upgrade procedure for Calico when running in nftables mode on a Kubernetes cluster.

---

## Introduction

Upgrading Calico in nftables mode follows the same operator-managed rolling upgrade process as iptables mode. The nftables-specific consideration is that new Calico versions may change the structure of nftables tables — adding new tables, changing chain names, or modifying rule order. nftables' atomic transaction model means these changes apply cleanly without partial rule states, but they can briefly interrupt existing connections if rules are completely reprogrammed on a node.

The upgrade procedure should include verifying that nftables tables are correctly structured after the upgrade, as new Calico versions may expect a different table layout than the previous version.

## Prerequisites

- Calico running in nftables mode
- `kubectl` with cluster admin access
- A maintenance window

## Step 1: Pre-Upgrade Health Check

```bash
kubectl get tigerastatus
kubectl get pods -n calico-system
kubectl get nodes
calicoctl version

# Verify nftables state before upgrade
nft list tables | grep calico
```

## Step 2: Backup Calico Configuration

```bash
calicoctl get felixconfiguration -o yaml > felix-backup.yaml
calicoctl get ippool -o yaml > ippool-backup.yaml
kubectl get installation default -o yaml > installation-backup.yaml
```

Confirm the nftables backend is configured in the backup:

```bash
grep iptablesBackend felix-backup.yaml
```

## Step 3: Upgrade the Tigera Operator

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
kubectl rollout status deployment/tigera-operator -n tigera-operator
```

## Step 4: Monitor the Rolling Upgrade

```bash
watch kubectl get pods -n calico-system
kubectl rollout status daemonset/calico-node -n calico-system
```

## Step 5: Verify nftables After Upgrade

After each node's calico-node pod restarts, verify nftables tables are correctly structured.

```bash
# On an upgraded node
nft list tables | grep calico
nft list table ip calico-filter | wc -l
```

The rule count in `calico-filter` should be non-zero and roughly similar to pre-upgrade.

## Step 6: Test Policy Enforcement Post-Upgrade

```bash
kubectl create namespace nft-upgrade-test
kubectl run server --image=nginx --labels="app=s" -n nft-upgrade-test
kubectl expose pod server --port=80 -n nft-upgrade-test
kubectl run client --image=busybox -n nft-upgrade-test -- sleep 60
kubectl exec -n nft-upgrade-test client -- wget -qO- --timeout=5 http://server
kubectl delete namespace nft-upgrade-test
```

## Step 7: Confirm Felix Backend After Upgrade

```bash
calicoctl get felixconfiguration default -o yaml | grep iptablesBackend
```

If the upgrade reset the backend to iptables (this should not happen, but verify):

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"iptablesBackend":"nft"}}'
```

## Conclusion

Upgrading Calico in nftables mode follows the standard operator-managed rolling upgrade, with the added step of verifying nftables table structure after each node upgrades. The atomic nature of nftables means rule transitions are clean, but verifying the post-upgrade rule structure confirms the new Calico version's expected table layout is correctly applied.
