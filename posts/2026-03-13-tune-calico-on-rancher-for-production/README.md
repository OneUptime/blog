# Tune Calico on Rancher for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Performance, Tuning, Rancher

Description: Learn how to tune Calico networking on Rancher-managed Kubernetes clusters for production workloads, covering MTU, IPAM, BGP, and eBPF optimizations specific to the Rancher environment.

---

## Introduction

Rancher simplifies Kubernetes cluster management across on-premises and cloud environments, but production deployments require careful Calico tuning to maximize performance and reliability. Default Calico settings are designed for broad compatibility, not peak throughput - meaning production clusters often leave significant performance on the table.

Rancher's RKE and RKE2 distributions have specific networking configurations that interact with Calico in unique ways. Understanding these interactions - from how Rancher provisions worker nodes to how it manages CNI configuration - is essential for tuning Calico effectively.

This guide walks through key Calico tuning parameters for Rancher clusters, including MTU optimization, IPAM configuration, and optional eBPF dataplane settings that can improve network performance.

## Prerequisites

- Rancher managing an RKE2 or RKE cluster with Calico selected as the CNI
- `kubectl` configured with cluster-admin permissions
- `calicoctl` v3.x installed
- Access to Rancher UI or `rancher` CLI
- Basic understanding of Kubernetes networking
- For eBPF mode on RKE2, an RKE2 release that supports Calico eBPF dataplane

## Step 1: Assess Current Calico Configuration

Before tuning, inspect the existing Calico setup to understand the baseline configuration.

```bash
# Check current Calico pods and installation namespace

kubectl get pods -A -l k8s-app=calico-node -o wide

# View the current FelixConfiguration
calicoctl get felixconfiguration default -o yaml

# Check existing IPPools
calicoctl get ippools -o yaml
```

## Step 2: Optimize MTU Settings

Setting the correct MTU prevents fragmentation and maximizes throughput. For Rancher clusters using VXLAN encapsulation, the MTU should be set to the underlying network MTU minus the encapsulation overhead.

For RKE2 clusters using the bundled Calico chart, configure MTU through the chart's `HelmChartConfig`:

```yaml
# /var/lib/rancher/rke2/server/manifests/rke2-calico-config.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: rke2-calico
  namespace: kube-system
spec:
  valuesContent: |-
    installation:
      calicoNetwork:
        # For VXLAN: set MTU to underlay MTU - 50, typically 1450 for 1500 underlay
        mtu: 1450
```

For manifest-based RKE clusters that use a `calico-config` ConfigMap, update `veth_mtu` and restart `calico-node` so new pods get the updated workload MTU:

```bash
kubectl patch configmap/calico-config -n kube-system --type merge \
  -p '{"data":{"veth_mtu": "1450"}}'

kubectl rollout restart daemonset calico-node -n kube-system
```

## Step 3: Tune IPAM and IP Pools

Rancher clusters often span multiple node pools. Configure IPAM to optimize address allocation per node pool. If the existing default IP pool already covers the entire pod CIDR, first migrate or disable the overlapping pool before creating new per-node-pool ranges.

```yaml
# Configure per-node-pool IP pools using node selectors
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: rancher-worker-pool
spec:
  # Use a non-overlapping range from your cluster pod CIDR.
  cidr: 10.42.128.0/17
  # Block size of 26 provides 64 IPs per node - suitable for dense workloads
  blockSize: 26
  vxlanMode: Always
  natOutgoing: true
  nodeSelector: "nodepool == 'worker'"
```

## Step 4: Configure Felix for High Throughput

Tune Felix parameters to handle high connection rates typical of production Rancher clusters.

```bash
# Increase Felix route and iptables refresh intervals
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

For supported RKE2 releases, the Calico eBPF dataplane can replace the default iptables dataplane. Enable it through the RKE2 Calico chart configuration and deploy RKE2 with `disable-kube-proxy: true`.

```yaml
# /var/lib/rancher/rke2/server/manifests/rke2-calico-config.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: rke2-calico
  namespace: kube-system
spec:
  valuesContent: |-
    installation:
      calicoNetwork:
        kubeProxyManagement: Enabled
        linuxDataplane: BPF
    kubernetesServiceEndpoint:
      host: "localhost"
      port: "6443"
```

For manifest-based Calico installations, disable `kube-proxy` before enabling BPF mode in `FelixConfiguration`.

```bash
kubectl -n kube-system patch ds kube-proxy --type merge \
  -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-calico": "true"}}}}}'

calicoctl patch felixconfiguration default \
  --patch='{"spec": {"bpfEnabled": true}}'
```

## Best Practices

- Always test MTU changes in a staging Rancher cluster before applying to production
- Use node selectors in IPPools to isolate workload traffic by node pool
- Monitor Felix metrics via Prometheus to identify configuration bottlenecks
- Set `reportingInterval: 0s` in FelixConfiguration only after confirming you do not rely on Felix status reports
- Regularly review Calico logs with `kubectl logs -A -l k8s-app=calico-node --tail=100` for warnings
- Pin Calico version in Rancher cluster configuration to avoid surprise upgrades

## Conclusion

Tuning Calico on Rancher requires understanding both the Rancher provisioning model and Calico's internal parameters. By optimizing MTU, IPAM block sizes, Felix refresh intervals, and optionally enabling the eBPF dataplane, you can significantly improve network performance and reliability for production workloads running on Rancher-managed Kubernetes clusters.
