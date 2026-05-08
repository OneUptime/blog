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
kubectl patch installation.operator.tigera.io default --type merge \
  --patch '{"spec":{"calicoNetwork":{"mtu":1450}}}'
```

For IP-in-IP encapsulation:

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"ipipMTU":1480}}'
```

## Step 2: Tune Felix Polling Intervals

Reduce Felix's iptables and route refresh intervals when you need Felix to detect unexpected dataplane drift more quickly.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"iptablesRefreshInterval":"10s","routeRefreshInterval":"10s"}}'
```

For stable clusters where unexpected dataplane drift is rare, increase these intervals to reduce CPU overhead.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"iptablesRefreshInterval":"90s","routeRefreshInterval":"90s"}}'
```

## Step 3: Enable eBPF Dataplane (Optional)

For higher throughput and lower latency, switch to the eBPF dataplane on Droplets with kernel 5.10+.

```bash
kubectl patch installation.operator.tigera.io default --type merge \
  --patch '{"spec":{"calicoNetwork":{"linuxDataplane":"BPF","bpfNetworkBootstrap":"Enabled","kubeProxyManagement":"Enabled"}}}'
```

Verify kernel version first:

```bash
uname -r
```

## Step 4: Size IPAM Blocks for Your Cluster

Smaller IPAM blocks reduce wasted IPs in large clusters. Larger blocks reduce IPAM churn in small clusters.

The `blockSize` value can only be set when an IP pool is created. For existing pools, migrate to a new IP pool with the desired block size instead of patching the current pool in place.

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: production-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  blockSize: 26
  vxlanMode: Always
  natOutgoing: true
```

A block size of 26 gives 64 IPs per allocation block, suitable for most node sizes.

## Step 5: Set Resource Requests on Calico Pods

Ensure the Kubernetes scheduler places Calico pods on nodes with sufficient resources.

```bash
# Patch calico-node DaemonSet resources

kubectl patch installation.operator.tigera.io default --type=merge \
  --patch='{"spec":{"calicoNodeDaemonSet":{"spec":{"template":{"spec":{"containers":[{"name":"calico-node","resources":{"requests":{"cpu":"250m","memory":"256Mi"},"limits":{"cpu":"1","memory":"512Mi"}}}]}}}}}}'
```

## Step 6: Enable Prometheus Metrics

Enable Calico metrics for ongoing performance visibility.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"prometheusMetricsEnabled":true}}'
```

## Conclusion

Tuning Calico for production on self-managed DigitalOcean Kubernetes clusters involves setting the correct MTU for DigitalOcean's network, adjusting Felix's refresh intervals, optionally enabling eBPF, sizing IPAM blocks appropriately, and setting resource requests on Calico pods. These changes together reduce latency, improve throughput, and stabilize Calico under production load.
