# How to Calico eBPF Mode with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Calico, eBPF, IPv6, Kubernetes, XDP, Kube-proxy Replacement, Performance

Description: Configure Calico in eBPF mode for high-performance IPv6 packet forwarding, replacing kube-proxy with eBPF-native service load balancing.

## Introduction

Configure Calico in eBPF mode on an IPv6-capable self-managed Kubernetes cluster, replacing kube-proxy with eBPF-native service handling. This guide uses the Tigera Operator workflow, assumes Calico IPAM, and covers the essential prerequisites, configuration, and verification steps.

## Step 1: Prerequisites and Setup

```bash
# Check the kernel version. Calico eBPF requires Linux 5.10+,
# or RHEL 8.4 with kernel 4.18.0-305 or later.
uname -rv

# Ensure IPv6 forwarding is enabled and a default IPv6 route exists.
sysctl net.ipv6.conf.all.forwarding
ip -6 route show default

# Confirm kube-proxy is running as a DaemonSet in kube-system.
kubectl -n kube-system get ds kube-proxy
```

## Step 2: Core Implementation

For an IPv6-only cluster, edit the operator `custom-resources.yaml` so the `Installation` resource includes a single IPv6 pool that matches the Kubernetes pod CIDR and enables the BPF dataplane:

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  variant: Calico
  calicoNetwork:
    linuxDataplane: BPF
    bpfNetworkBootstrap: Enabled
    kubeProxyManagement: Enabled
    nodeAddressAutodetectionV6:
      kubernetes: NodeInternalIP
    ipPools:
      - cidr: 2001:db8:100::/64
        blockSize: 122
        encapsulation: None
        natOutgoing: Enabled
        nodeSelector: all()
```

## Step 3: Configuration

If Calico is already installed with the Tigera Operator and the cluster is already configured for IPv6, switch the existing `Installation` resource to eBPF mode with:

```bash
kubectl patch installation.operator.tigera.io default --type merge -p '{"spec":{"calicoNetwork":{"linuxDataplane":"BPF","bpfNetworkBootstrap":"Enabled","kubeProxyManagement":"Enabled"}}}'
```

## Step 4: Apply and Verify

```bash
# Apply the edited operator custom resources for a new cluster.
kubectl create -f custom-resources.yaml

# Monitor the rollout.
watch kubectl get tigerastatus

# Confirm the IPv6 pool exists.
kubectl get ippools

# Find a calico-node pod for BPF inspection.
kubectl get pod -o wide -n calico-system

# Verify that the eBPF service tables are programmed.
kubectl exec -n calico-system <calico-node-name> -- calico-node -bpf nat dump
```

## Step 5: Monitoring

If your environment requires an overlay, use `VXLAN` in the IP pool. Do not use `IPIP` in eBPF mode.

```bash
# Show the available eBPF inspection commands.
kubectl exec -n calico-system <calico-node-name> -- calico-node -bpf help

# Inspect connection tracking state in the eBPF dataplane.
kubectl exec -n calico-system <calico-node-name> -- calico-node -bpf conntrack dump

# Inspect packet counters on the relevant host interface.
kubectl exec -n calico-system <calico-node-name> -- calico-node -bpf counters dump --iface=eth0
```

## Conclusion

Calico eBPF mode with IPv6 depends on correct Kubernetes pod and service CIDRs, a working IPv6 node address, and an operator-managed BPF configuration. Use the `Installation` resource to enable the BPF dataplane and manage IPv6 pools, and use `tigerastatus` plus `calico-node -bpf` to verify service handling and rollout health.
