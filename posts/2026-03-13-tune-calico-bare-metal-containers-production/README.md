# How to Tune Calico on Bare Metal with Containers for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Containers, Performance, Production

Description: A guide to tuning Calico for maximum performance and stability on bare metal Kubernetes clusters running containerized production workloads.

---

## Introduction

Bare metal hardware delivers the highest possible network performance, but realizing that performance with containerized workloads requires tuning the entire networking stack - from the NIC driver settings to Calico's internal timers. Default Calico settings leave significant performance on the table because they are tuned for compatibility across diverse environments rather than peak throughput on dedicated hardware.

Production tuning on bare metal focuses on three areas: eliminating encapsulation overhead, enabling the eBPF dataplane for kernel-bypass processing, and tuning the Linux networking stack to support high packet rates. Each optimization is independent, and the cumulative effect can increase throughput by 30-50% compared to default settings.

This guide covers the key tuning parameters for production Calico deployments on bare metal with containers.

## Prerequisites

- Calico installed on a bare metal Kubernetes cluster with containers
- Nodes with Linux kernel 5.3+ for eBPF support
- BGP-capable physical switches
- `kubectl` and `calicoctl` installed

## Step 1: Disable Encapsulation

Remove VXLAN or IPIP overhead with native BGP routing.

```bash
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec":{"encapsulation":"None"}}'
```

## Step 2: Enable eBPF Dataplane

eBPF bypasses iptables entirely, reducing latency and CPU usage.

```bash
# Disable kube-proxy
kubectl patch ds kube-proxy -n kube-system \
  -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-calico":"true"}}}}}'

calicoctl patch felixconfiguration default \
  --patch '{"spec":{"bpfEnabled":true}}'
```

## Step 3: Set Jumbo Frame MTU (If Supported)

If your physical network supports jumbo frames:

```bash
# Verify switch and NIC support
ip link show | grep mtu

# Set Calico MTU
kubectl patch installation default --type merge \
  --patch '{"spec":{"calicoNetwork":{"mtu":9000}}}'
```

## Step 4: Tune Linux Networking Stack

On each node, increase socket buffer sizes and connection tracking limits.

```bash
cat >> /etc/sysctl.d/99-calico-perf.conf << EOF
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.core.netdev_max_backlog = 250000
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.netfilter.nf_conntrack_max = 1048576
EOF
sysctl -p /etc/sysctl.d/99-calico-perf.conf
```

## Step 5: Tune Felix for Low-Churn Clusters

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "iptablesRefreshInterval": "120s",
    "routeRefreshInterval": "60s",
    "reportingInterval": "60s"
  }}'
```

## Step 6: Enable Hardware Offload (If Supported)

If your NICs support XDP hardware offload:

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"bpfDataIfacePattern":"^bond0$"}}'
```

## Conclusion

Tuning Calico for production on bare metal with containers combines software optimizations - eBPF dataplane, encapsulation removal, Felix timer tuning - with OS-level networking stack tuning. Together these changes allow Calico to deliver the full throughput and low latency that bare metal NIC hardware is capable of achieving for containerized workloads.
