# How to Install Calico in nftables Mode Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, nftables, Installation

Description: A step-by-step guide to installing Calico with the nftables dataplane backend instead of the traditional iptables dataplane.

---

## Introduction

Calico's nftables mode uses the Linux nftables framework instead of iptables for packet filtering and network policy enforcement. nftables is the modern successor to iptables, offering better performance through atomic rule updates, more efficient rule lookup, and a cleaner rule structure. It is the default firewall framework on Debian 11+, Ubuntu 22.04+, RHEL 8+, and Fedora 32+.

Installing Calico in nftables mode requires a kernel with nftables support and explicitly configuring the Calico operator to use the nftables dataplane. It also requires kube-proxy to run in nftables mode so Kubernetes Service rules and Calico rules use the same packet filtering framework.

## Prerequisites

- A Kubernetes cluster with kube-proxy running in nftables mode
- Nodes running Linux 5.13+ with `nft` 1.0.1+
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

The kernel must be 5.13+ and the `nft` userspace tool must be 1.0.1+ for Calico's nftables dataplane.

## Step 2: Install the Tigera Operator

```bash
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/v1_crd_projectcalico_org.yaml
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/tigera-operator.yaml
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
    linuxDataplane: Nftables
    ipPools:
    - name: default-ipv4-ippool
      blockSize: 26
      cidr: 192.168.0.0/16
      encapsulation: VXLANCrossSubnet
      natOutgoing: Enabled
      nodeSelector: all()
  nodeUpdateStrategy:
    type: RollingUpdate
---
apiVersion: operator.tigera.io/v1
kind: APIServer
metadata:
  name: default
spec: {}
```

```bash
kubectl create -f calico-installation.yaml
```

## Step 4: Verify kube-proxy is in nftables Mode

Calico's nftables dataplane must be used with kube-proxy in nftables mode. For kubeadm-based clusters, the kube-proxy configuration should include:

```yaml
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: nftables
```

If you changed kube-proxy mode on an existing cluster, restart kube-proxy and calico-node pods to apply:

```bash
kubectl rollout restart daemonset/kube-proxy -n kube-system
kubectl rollout status daemonset/kube-proxy -n kube-system
kubectl rollout restart daemonset/calico-node -n calico-system
kubectl rollout status daemonset/calico-node -n calico-system
```

## Step 5: Verify nftables Rules Are Being Used

```bash
# On a node, check nftables rules
nft list tables | grep calico
nft list ruleset | grep calico
```

Felix should have created `calico-*` nftables tables.

## Step 6: Verify Pod Networking

```bash
kubectl get tigerastatus
kubectl get nodes
kubectl run test-a --image=busybox -- sleep 300
kubectl run test-b --image=busybox -- sleep 300
kubectl get pods -o wide
kubectl exec test-a -- ping -c3 <test-b-pod-ip>
kubectl delete pod test-a test-b
```

## Conclusion

Installing Calico in nftables mode requires configuring the Calico operator to use the `Nftables` Linux dataplane and running kube-proxy in nftables mode. nftables mode is the forward-compatible choice for modern Linux distributions and provides better performance than legacy iptables through atomic rule updates and more efficient data structures.
