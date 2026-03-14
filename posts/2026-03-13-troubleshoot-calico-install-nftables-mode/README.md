# How to Troubleshoot Installation Issues with Calico in nftables Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, nftables, Troubleshooting

Description: A diagnostic guide for resolving Calico installation and policy enforcement failures when running in nftables mode.

---

## Introduction

Calico in nftables mode has several unique failure modes: nftables kernel module not loaded, conflict with legacy iptables rules left by kube-proxy or other tools, nftables version incompatibility with Felix's expected table structure, and distribution-specific differences in how nftables is packaged and configured.

The key diagnostic tool for nftables mode is the `nft` command — using it to inspect what Calico has programmed in the kernel, comparing against what should be there based on the NetworkPolicy resources. This guide covers the most common nftables-specific Calico failures.

## Prerequisites

- Calico installed or partially installed in nftables mode
- `kubectl` with cluster admin access
- Root access to nodes for nftables inspection

## Step 1: Confirm Felix is Running in nftables Mode

```bash
kubectl logs -n calico-system -l k8s-app=calico-node --tail=20 | grep -i "iptables\|nft"
calicoctl get felixconfiguration default -o yaml | grep iptablesBackend
```

If Felix is not in nftables mode, patch the configuration:

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"iptablesBackend":"nft"}}'
kubectl rollout restart daemonset/calico-node -n calico-system
```

## Step 2: Check nftables Module Availability

```bash
# On a node
lsmod | grep nf_tables
modinfo nf_tables
```

If the module is not loaded:

```bash
modprobe nf_tables
echo "nf_tables" >> /etc/modules-load.d/calico.conf
```

## Step 3: Check for Legacy iptables Conflicts

If kube-proxy or other tools are still writing iptables (legacy) rules, they can conflict with nftables.

```bash
# Check for legacy iptables rules
iptables-legacy -L | grep -c "KUBE-\|cali-"
```

If rules exist in legacy iptables alongside nftables:

```bash
# Switch kube-proxy to nftables mode
kubectl edit configmap kube-proxy -n kube-system
# Set: mode: "nftables"
kubectl rollout restart daemonset/kube-proxy -n kube-system
```

## Step 4: Verify nftables Tables Exist

```bash
nft list tables | grep calico
```

If tables are missing, Felix is not running or not in nftables mode on this node.

## Step 5: Check nftables Version Compatibility

```bash
nft --version
# Felix requires nft 0.9.1 or later
```

Update if needed:

```bash
sudo apt-get install --only-upgrade nftables
# or
sudo dnf update nftables
```

## Step 6: Read Felix Logs for nftables Errors

```bash
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50 | grep -iE "nft|nftables|error"
```

Common errors:
- `nftables backend not supported` — kernel version too old
- `failed to create table` — permission issue
- `nft: command not found` — nftables not installed on node

## Conclusion

Troubleshooting Calico in nftables mode centers on verifying that the nftables kernel module is loaded, Felix is configured for the `nft` backend, legacy iptables rules from kube-proxy are not conflicting, and the `nft` binary version is compatible with Felix's expected table structure. The `nft list tables` command is the fastest way to confirm whether Felix has successfully programmed nftables on a given node.
