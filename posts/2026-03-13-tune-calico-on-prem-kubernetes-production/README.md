# How to Tune Calico on On-Prem Kubernetes for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, On-Premise, Performance, Production

Description: A guide to performance-tuning Calico for high-throughput, low-latency production workloads on an on-premises Kubernetes cluster.

---

## Introduction

Default Calico settings prioritize compatibility over performance. On on-premises clusters, where you control both the network hardware and the node operating system, you can tune Calico more aggressively than in cloud environments. The payoff is measurable: lower latency, higher throughput, and better resource efficiency under production load.

On-prem production tuning focuses on eliminating unnecessary encapsulation overhead through native BGP routing, setting the correct MTU for your physical network, enabling eBPF to bypass iptables-based service handling, tuning Felix's internal timers, and sizing IPAM blocks appropriately for your cluster density.

This guide covers the most impactful tuning parameters for production Calico deployments on on-premises infrastructure.

## Prerequisites

- Calico installed on an on-prem Kubernetes cluster
- Physical network that supports BGP routing
- `kubectl` and `calicoctl` installed
- Nodes running Linux kernel 5.10+ for eBPF support, or Red Hat 8.4+ with kernel 4.18.0-305 or later

## Step 1: Eliminate Overlay Encapsulation

With BGP routing to physical switches, overlay encapsulation is unnecessary and adds 20-50 bytes of overhead per packet for common IP-in-IP and VXLAN overlays.

```bash
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec":{"ipipMode":"Never","vxlanMode":"Never"}}'
```

Ensure BGP is properly configured before disabling encapsulation.

## Step 2: Enable eBPF Dataplane

The eBPF dataplane bypasses kube-proxy and iptables for Kubernetes service handling, reducing latency and CPU usage significantly.

```bash
kubectl patch installation.operator.tigera.io default --type merge \
  -p '{"spec":{"calicoNetwork":{"linuxDataplane":"BPF","bpfNetworkBootstrap":"Enabled","kubeProxyManagement":"Enabled"}}}'
```

## Step 3: Set MTU to the Highest Non-Fragmenting Value

For standard 10GbE networks without jumbo frames and without an overlay path:

```bash
kubectl patch installation.operator.tigera.io default --type merge \
  -p '{"spec":{"calicoNetwork":{"mtu":1500}}}'
```

If you use the eBPF service dataplane's default NodePort forwarding, account for its VXLAN handoff and use physical MTU minus 50 bytes:

```bash
kubectl patch installation.operator.tigera.io default --type merge \
  -p '{"spec":{"calicoNetwork":{"mtu":1450}}}'
```

## Step 4: Tune Felix Timers

For stable production clusters using the iptables dataplane on Linux kernel 4.11 or later, increase refresh intervals to reduce CPU overhead.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"iptablesRefreshInterval":"5m","routeRefreshInterval":"5m"}}'
```

## Step 5: Optimize IPAM Block Size

For clusters with predictable node counts, tune block size to minimize IPAM fragmentation. Set this before installation when possible; Calico does not allow editing `blockSize` directly on an existing IP pool.

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 10.244.0.0/16
      encapsulation: None
      natOutgoing: Enabled
      nodeSelector: all()
```

## Step 6: Enable Calico Metrics

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"prometheusMetricsEnabled":true,"prometheusMetricsPort":9091}}'
```

Create a ServiceMonitor if using Prometheus Operator:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: felix-metrics-svc
  namespace: calico-system
  labels:
    k8s-app: calico-node
spec:
  clusterIP: None
  selector:
    k8s-app: calico-node
  ports:
  - name: metrics
    port: 9091
    targetPort: 9091
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: calico-felix
  namespace: calico-system
spec:
  selector:
    matchLabels:
      k8s-app: calico-node
  namespaceSelector:
    matchNames:
    - calico-system
  endpoints:
  - port: metrics
```

## Conclusion

Tuning Calico for production on on-prem Kubernetes focuses on eliminating encapsulation overhead via BGP, enabling eBPF for high-performance packet processing, setting the correct MTU, and tuning Felix timers to reduce background CPU usage. These optimizations together deliver the latency and throughput performance that on-premises hardware is capable of providing.
