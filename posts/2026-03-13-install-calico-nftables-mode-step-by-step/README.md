# How to Install Calico in nftables Mode Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Nftables, Installation

Description: A step-by-step guide to installing Calico with the nftables dataplane backend instead of the traditional iptables dataplane.

---

## Introduction

Calico's nftables mode uses the Linux nftables framework instead of iptables for packet filtering and network policy enforcement. nftables is the modern successor to iptables, offering better performance through atomic rule updates, more efficient rule lookup, and a cleaner rule structure. It is the default firewall framework on Debian 11+, Ubuntu 22.04+, RHEL 8+, and Fedora 32+.

Installing Calico in nftables mode requires a kernel with nftables support (4.2+, with 5.2+ recommended for full feature support) and explicitly configuring Felix to use the nftables backend. This is particularly relevant for distributions that have deprecated the legacy iptables kernel module.

## Prerequisites

- A Kubernetes cluster with nodes running Linux 5.2+
- `kubectl` with cluster admin access
- No other nftables rules that conflict with Calico's expected rule structure

## Step 1: Verify nftables Kernel Support

```bash
# On each node
uname -r
nft --version

# Check nftables module
lsmod | grep nf_tables
```

The kernel must be 5.2+ for the best nftables support.

## Step 2: Install the Tigera Operator

```bash
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
kubectl rollout status deployment/tigera-operator -n tigera-operator
```

## Step 3: Create the Installation CR with nftables Mode

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 192.168.0.0/16
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: all()
  nodeUpdateStrategy:
    type: RollingUpdate
```

```bash
kubectl apply -f calico-installation.yaml
```

## Step 4: Configure Felix for nftables

After the operator installs Calico, patch Felix to use the nftables backend.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"iptablesBackend":"nft"}}'
```

Restart calico-node pods to apply:

```bash
kubectl rollout restart daemonset/calico-node -n calico-system
kubectl rollout status daemonset/calico-node -n calico-system
```

## Step 5: Verify nftables Rules Are Being Used

```bash
# On a node, check nftables rules
nft list tables | grep calico
nft list table ip calico-filter
```

Felix should have created `calico-*` nftables tables.

## Step 6: Verify Pod Networking

```bash
kubectl get tigerastatus
kubectl get nodes
kubectl run test --image=busybox -- sleep 300
kubectl get pod test -o wide
kubectl exec test -- ping -c3 <another-pod-ip>
kubectl delete pod test
```

## Conclusion

Installing Calico in nftables mode requires configuring Felix to use the `nft` iptables backend after standard installation, then restarting calico-node pods. nftables mode is the forward-compatible choice for modern Linux distributions and provides better performance than legacy iptables through atomic rule updates and more efficient data structures.
