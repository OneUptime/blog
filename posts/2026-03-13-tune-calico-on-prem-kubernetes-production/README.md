# How to Tune Calico on On-Prem Kubernetes for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, On-Premises, Performance, Production

Description: A guide to performance-tuning Calico for high-throughput, low-latency production workloads on an on-premises Kubernetes cluster.

---

## Introduction

Default Calico settings prioritize compatibility over performance. On on-premises clusters, where you control both the network hardware and the node operating system, you can tune Calico more aggressively than in cloud environments. The payoff is measurable: lower latency, higher throughput, and better resource efficiency under production load.

On-prem production tuning focuses on eliminating unnecessary encapsulation overhead through native BGP routing, setting the correct MTU for your physical network, enabling eBPF for kernel-bypass networking, tuning Felix's internal timers, and sizing IPAM blocks appropriately for your cluster density.

This guide covers the most impactful tuning parameters for production Calico deployments on on-premises infrastructure.

## Prerequisites

- Calico installed on an on-prem Kubernetes cluster
- Physical network that supports BGP routing
- `kubectl` and `calicoctl` installed
- Nodes running Linux kernel 5.3+ for eBPF support

## Step 1: Eliminate Overlay Encapsulation

With BGP routing to physical switches, overlay encapsulation is unnecessary and adds 50-100 bytes of overhead per packet.

```bash
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec":{"encapsulation":"None"}}'
```

Ensure BGP is properly configured before disabling encapsulation.

## Step 2: Enable eBPF Dataplane

The eBPF dataplane bypasses iptables for packet processing, reducing latency and CPU usage significantly.

```bash
# Disable kube-proxy first (eBPF replaces it)
kubectl patch ds -n kube-system kube-proxy \
  -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-calico":"true"}}}}}'

calicoctl patch felixconfiguration default \
  --patch '{"spec":{"bpfEnabled":true,"bpfDisableUnprivileged":false}}'
```

## Step 3: Set MTU to Physical Network Maximum

For standard 10GbE networks without jumbo frames:

```bash
kubectl patch installation default --type merge \
  --patch '{"spec":{"calicoNetwork":{"mtu":1500}}}'
```

For networks with jumbo frames (9000 MTU):

```bash
kubectl patch installation default --type merge \
  --patch '{"spec":{"calicoNetwork":{"mtu":9000}}}'
```

## Step 4: Tune Felix Timers

For stable production clusters, increase refresh intervals to reduce CPU overhead.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"iptablesRefreshInterval":"90s","routeRefreshInterval":"90s","netlinkTimeout":"10s"}}'
```

## Step 5: Optimize IPAM Block Size

For clusters with predictable node counts, tune block size to minimize IPAM fragmentation.

```bash
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec":{"blockSize":26}}'
```

## Step 6: Enable Calico Metrics

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"prometheusMetricsEnabled":true,"prometheusMetricsPort":9091}}'
```

Create a ServiceMonitor if using Prometheus Operator:

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico-prometheus.yaml
```

## Conclusion

Tuning Calico for production on on-prem Kubernetes focuses on eliminating encapsulation overhead via BGP, enabling eBPF for high-performance packet processing, setting the correct MTU, and tuning Felix timers to reduce background CPU usage. These optimizations together deliver the latency and throughput performance that on-premises hardware is capable of providing.
