# Tune Calico on Rancher for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Performance, Tuning, Rancher

Description: Learn how to tune Calico networking on Rancher-managed Kubernetes clusters for production workloads, covering MTU, IPAM, BGP, and eBPF optimizations specific to the Rancher environment.

---

## Introduction

Rancher simplifies Kubernetes cluster management across on-premises and cloud environments, but production deployments require careful Calico tuning to maximize performance and reliability. Default Calico settings are designed for broad compatibility, not peak throughput - meaning production clusters often leave significant performance on the table.

Rancher's RKE and RKE2 distributions have specific networking configurations that interact with Calico in unique ways. Understanding these interactions - from how Rancher provisions worker nodes to how it manages CNI configuration - is essential for tuning Calico effectively.

This guide walks through key Calico tuning parameters for Rancher clusters, including MTU optimization, IPAM configuration, BGP peering, and optional eBPF dataplane settings that can dramatically improve network performance.

## Prerequisites

- Rancher v2.6+ managing an RKE2 or RKE cluster
- `kubectl` configured with cluster-admin permissions
- `calicoctl` v3.x installed
- Access to Rancher UI or `rancher` CLI
- Basic understanding of Kubernetes networking

## Step 1: Assess Current Calico Configuration

Before tuning, inspect the existing Calico setup to understand the baseline configuration.

```bash
# Check current Calico version and installation mode
kubectl get pods -n calico-system -o wide

# View the current FelixConfiguration
calicoctl get felixconfiguration default -o yaml

# Check existing IPPools
calicoctl get ippools -o yaml
```

## Step 2: Optimize MTU Settings

Setting the correct MTU prevents fragmentation and maximizes throughput. For Rancher clusters using VXLAN encapsulation, the MTU should be set to the underlying network MTU minus the encapsulation overhead.

```bash
# Patch FelixConfiguration to set the correct MTU
# For VXLAN: set mtu to (underlay MTU - 50), typically 1450 for 1500 underlay
calicoctl patch felixconfiguration default \
  --patch='{"spec": {"vethMTU": 1450}}'
```

For VXLAN-based Rancher clusters, also update the calico-config ConfigMap:

```yaml
# Apply updated MTU in the calico-config ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: calico-config
  namespace: calico-system
data:
  # Set veth MTU to account for VXLAN overhead (50 bytes)
  veth_mtu: "1450"
```

## Step 3: Tune IPAM and IP Pools

Rancher clusters often span multiple node pools. Configure IPAM to optimize address allocation per node pool.

```yaml
# Configure per-node-pool IP pools using node selectors
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: rancher-worker-pool
spec:
  cidr: 10.244.0.0/16
  # Block size of 26 provides 64 IPs per node - suitable for dense workloads
  blockSize: 26
  ipipMode: Never
  vxlanMode: Always
  natOutgoing: true
  nodeSelector: "nodepool == 'worker'"
```

## Step 4: Configure Felix for High Throughput

Tune Felix parameters to handle high connection rates typical of production Rancher clusters.

```bash
# Increase iptables refresh interval and conntrack table size
calicoctl patch felixconfiguration default --patch='{
  "spec": {
    "iptablesRefreshInterval": "90s",
    "routeRefreshInterval": "90s",
    "ipv6Support": false,
    "reportingInterval": "0s"
  }
}'
```

## Step 5: Enable eBPF Dataplane (Optional)

For Rancher clusters running kernel 5.3+, the eBPF dataplane provides significant performance improvements.

```bash
# First, disable kube-proxy on all nodes
kubectl -n kube-system patch ds kube-proxy \
  -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-calico": "true"}}}}}'

# Enable eBPF mode in FelixConfiguration
calicoctl patch felixconfiguration default \
  --patch='{"spec": {"bpfEnabled": true, "bpfKubeProxyIptablesCleanupEnabled": true}}'
```

## Best Practices

- Always test MTU changes in a staging Rancher cluster before applying to production
- Use node selectors in IPPools to isolate workload traffic by node pool
- Monitor Felix metrics via Prometheus to identify configuration bottlenecks
- Set `reportingInterval: 0s` in FelixConfiguration to reduce API server load
- Regularly review Calico logs with `kubectl logs -n calico-system` for warnings
- Pin Calico version in Rancher cluster configuration to avoid surprise upgrades

## Conclusion

Tuning Calico on Rancher requires understanding both the Rancher provisioning model and Calico's internal parameters. By optimizing MTU, IPAM block sizes, Felix refresh intervals, and optionally enabling the eBPF dataplane, you can significantly improve network performance and reliability for production workloads running on Rancher-managed Kubernetes clusters.
