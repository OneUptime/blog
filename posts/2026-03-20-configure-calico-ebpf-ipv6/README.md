# How to Configure Calico eBPF Mode with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Calico, eBPF, IPv6, Kubernetes, CNI, XDP

Description: Configure Calico in eBPF mode for IPv6 Kubernetes workloads, replacing iptables and kube-proxy with eBPF programs for better performance and IPv6 support.

## Introduction

Calico eBPF mode uses the Linux eBPF subsystem instead of iptables for packet processing, providing lower latency and better performance. It supports IPv6 natively and can replace kube-proxy for Kubernetes service routing.

## Prerequisites and Installation

```bash
# Requirements for eBPF mode:

# - A Kubernetes cluster that is already configured for IPv6-only or dual-stack
# - Calico installed with the Kubernetes datastore and Calico IPAM
# - x86-64 or arm64 nodes on a supported distribution/kernel
#   (for example: Ubuntu 22.04, RHEL 8.4 with kernel 4.18.0-305+,
#   or another supported distro with Linux kernel >= 5.10)
# - Nodes have IPv6 forwarding enabled: net.ipv6.conf.all.forwarding=1
# - If kube-proxy is running in IPVS mode, switch it to iptables mode first

# Install Calico with the Tigera Operator
helm repo add projectcalico https://docs.tigera.io/calico/charts
kubectl create namespace tigera-operator
helm template calico-crds projectcalico/crd.projectcalico.org.v1 --version v3.32.0 | \
  kubectl apply --server-side -f -
helm install calico projectcalico/tigera-operator \
  --version v3.32.0 \
  --namespace tigera-operator
```

## Enable eBPF Mode

```bash
# Recommended for self-managed kubeadm-style clusters where kube-proxy
# is not managed by Helm or ArgoCD: enable eBPF and let the operator
# bootstrap API access and disable kube-proxy.
kubectl patch installation.operator.tigera.io default --type merge -p '{
  "spec": {
    "calicoNetwork": {
      "linuxDataplane": "BPF",
      "bpfNetworkBootstrap": "Enabled",
      "kubeProxyManagement": "Enabled"
    }
  }
}'

# Wait for rollout
kubectl rollout status ds/calico-node -n calico-system

# 3. Verify eBPF mode
kubectl logs -n calico-system ds/calico-node -c calico-node | \
  grep "BPF enabled, starting BPF endpoint manager and map manager."
```

## Calico eBPF with IPv6 IPPools

```bash
# Replace the default pool with an IPv6-only pool for an operator-managed install
kubectl patch installation.operator.tigera.io default --type merge -p '{
  "spec": {
    "calicoNetwork": {
      "ipPools": [
        {
          "cidr": "fd00:10:244::/48",
          "blockSize": 122,
          "encapsulation": "VXLAN",
          "natOutgoing": "Enabled",
          "nodeSelector": "all()"
        }
      ]
    }
  }
}'

# Verify
kubectl get ippools -o yaml
```

## kube-proxy Replacement in eBPF Mode

```bash
# If your platform does not allow kube-proxy to be disabled,
# stop Felix from removing kube-proxy's iptables rules and move
# Calico's health endpoint away from kube-proxy's default port.
kubectl patch felixconfiguration default --type merge --patch='{
  "spec": {
    "bpfKubeProxyIptablesCleanupEnabled": false,
    "bpfKubeProxyHealthzPort": 10258
  }
}'

# Verify services are handled by eBPF
kubectl exec -n calico-system ds/calico-node -- \
  calico-node -bpf nat dump | head -20
```

## Troubleshooting eBPF Mode

```bash
# Check Felix eBPF status
kubectl logs -n calico-system ds/calico-node -c calico-node | \
  grep -iE "bpf enabled|bpf data plane"

# List loaded eBPF programs
kubectl exec -n calico-system ds/calico-node -- \
  bpftool prog list | grep calico | head -20

# Check eBPF maps
kubectl exec -n calico-system ds/calico-node -- \
  bpftool map list | grep calico | head -20

# Inspect service and conntrack state from the embedded BPF tool
kubectl exec -n calico-system ds/calico-node -- \
  calico-node -bpf nat dump | head -20

kubectl exec -n calico-system ds/calico-node -- \
  calico-node -bpf conntrack dump | \
  grep "fd00:10:244"

# Felix logs for debugging
kubectl logs -n calico-system ds/calico-node -c calico-node --follow | \
  grep -iE "ipv6|bpf|error"
```

## Performance Comparison

```bash
# Benchmark eBPF vs iptables mode
# Pod to pod throughput with iperf3

# Test pod 1 (server)
kubectl exec server-pod -- iperf3 -s -6

# Test pod 2 (client)
# Replace fd00:10:244::10 with the actual IPv6 address of the server pod.
kubectl exec client-pod -- iperf3 -c fd00:10:244::10 -6 -t 30

# Actual throughput depends on the kernel, NIC, MTU, and whether
# workloads use an overlay. For best pod-to-pod performance, use
# underlay routing when possible; if an overlay is required, use VXLAN.
```

## Conclusion

Calico eBPF mode improves IPv6 performance by replacing iptables with efficient eBPF programs. Let the operator disable kube-proxy for self-managed clusters or explicitly avoid kube-proxy conflicts on managed platforms, and configure `/122` IPv6 block sizes for efficient IPAM. Use the `calico-node -bpf` tool to inspect runtime state. Monitor node-to-node latency and pod connectivity with OneUptime to verify that eBPF mode is performing as expected.
