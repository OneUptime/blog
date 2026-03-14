# How to Tune Calico on Self-Managed DigitalOcean Kubernetes for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, DigitalOcean, Performance, Production

Description: A guide to performance tuning Calico for production workloads on self-managed Kubernetes clusters running on DigitalOcean Droplets.

---

## Introduction

Default Calico settings are designed for broad compatibility, not maximum performance. On self-managed Kubernetes clusters running on DigitalOcean Droplets, you have full control over both the Kubernetes configuration and the underlying OS, which means you can tune Calico for the specific workload profile and network topology of your cluster.

Production tuning touches multiple layers: Felix's internal polling intervals, iptables rule batching, MTU settings for DigitalOcean's network, IPAM block sizes for dense clusters, and resource requests for Calico's own pods. Each of these has a measurable effect on throughput, latency, and stability at scale.

This guide covers the most impactful tuning parameters for production Calico deployments on DigitalOcean.

## Prerequisites

- A self-managed Kubernetes cluster on DigitalOcean Droplets with Calico installed
- Cluster admin `kubectl` access
- `calicoctl` installed
- Familiarity with Calico's FelixConfiguration CRD

## Step 1: Set the Correct MTU

DigitalOcean's network uses an MTU of 1500. With VXLAN encapsulation, Calico needs overhead. Set the MTU explicitly to avoid fragmentation.

```bash
kubectl patch installation default --type merge \
  --patch '{"spec":{"calicoNetwork":{"mtu":1450}}}'
```

For IP-in-IP encapsulation:

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"ipiniMTU":1480}}'
```

## Step 2: Tune Felix Polling Intervals

Reduce Felix's iptables refresh interval for faster policy convergence under heavy policy churn.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"iptablesRefreshInterval":"10s","routeRefreshInterval":"10s"}}'
```

For stable clusters with infrequent policy changes, increase these intervals to reduce CPU overhead.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"iptablesRefreshInterval":"90s","routeRefreshInterval":"90s"}}'
```

## Step 3: Enable eBPF Dataplane (Optional)

For higher throughput and lower latency, switch to the eBPF dataplane on Droplets with kernel 5.3+.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"bpfEnabled":true}}'
```

Verify kernel version first:

```bash
uname -r
```

## Step 4: Size IPAM Blocks for Your Cluster

Smaller IPAM blocks reduce wasted IPs in large clusters. Larger blocks reduce IPAM churn in small clusters.

```bash
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec":{"blockSize":26}}'
```

A block size of 26 gives 64 IPs per node, suitable for most node sizes.

## Step 5: Set Resource Requests on Calico Pods

Ensure the Kubernetes scheduler places Calico pods on nodes with sufficient resources.

```yaml
# Patch calico-node DaemonSet resources
kubectl patch daemonset calico-node -n kube-system --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/resources","value":{"requests":{"cpu":"250m","memory":"256Mi"},"limits":{"cpu":"1","memory":"512Mi"}}}]'
```

## Step 6: Enable Prometheus Metrics

Enable Calico metrics for ongoing performance visibility.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"prometheusMetricsEnabled":true}}'
```

## Conclusion

Tuning Calico for production on self-managed DigitalOcean Kubernetes clusters involves setting the correct MTU for DigitalOcean's network, adjusting Felix's refresh intervals, optionally enabling eBPF, sizing IPAM blocks appropriately, and setting resource requests on Calico pods. These changes together reduce latency, improve throughput, and stabilize Calico under production load.
