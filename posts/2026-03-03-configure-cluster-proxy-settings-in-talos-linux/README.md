# How to Configure Cluster Proxy Settings in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kube-proxy, Kubernetes Networking, IPVS, Cluster Configuration

Description: Learn how to configure kube-proxy settings in Talos Linux including IPVS mode, extra args, and how to disable kube-proxy for eBPF-based CNIs.

---

Kube-proxy is the Kubernetes component responsible for implementing service networking. It manages iptables or IPVS rules on each node to route traffic from service ClusterIPs to the correct backend pods. In Talos Linux, kube-proxy runs as a DaemonSet and is configured through the cluster section of the machine configuration. You can pass extra arguments to tune its behavior, switch it to IPVS mode for better performance, or disable it entirely when using a CNI that replaces kube-proxy functionality.

This guide walks through how to configure kube-proxy in Talos Linux for different networking scenarios.

## The Proxy Configuration Section

Kube-proxy settings live under `cluster.proxy` in the Talos machine configuration:

```yaml
# Basic kube-proxy configuration
cluster:
  proxy:
    disabled: false
    mode: iptables
    extraArgs:
      metrics-bind-address: "0.0.0.0:10249"
```

The key fields are `disabled` (to completely disable kube-proxy), `mode` (to select the proxy mode), and `extraArgs` (for additional command-line flags).

## Switching to IPVS Mode

The default kube-proxy mode is iptables, which works well for small to medium clusters. For larger clusters (500+ services), IPVS mode provides better performance because it uses hash tables for service lookup instead of linear chain traversal:

```yaml
# Enable IPVS mode for kube-proxy
cluster:
  proxy:
    mode: ipvs
    extraArgs:
      ipvs-scheduler: "rr"     # Round-robin scheduling
      ipvs-min-sync-period: "1s"
      ipvs-sync-period: "30s"
```

IPVS mode requires certain kernel modules to be loaded. Make sure to include them in your machine configuration:

```yaml
# Kernel modules required for IPVS
machine:
  kernel:
    modules:
      - name: ip_vs
      - name: ip_vs_rr
      - name: ip_vs_wrr
      - name: ip_vs_sh
      - name: nf_conntrack
```

Without these modules, kube-proxy will fall back to iptables mode even if you configure IPVS.

## IPVS Scheduling Algorithms

IPVS supports multiple scheduling algorithms. Choose one based on your workload:

```yaml
# Round-robin (default, simple rotation)
cluster:
  proxy:
    mode: ipvs
    extraArgs:
      ipvs-scheduler: "rr"
```

```yaml
# Least connections (route to the pod with fewest active connections)
cluster:
  proxy:
    mode: ipvs
    extraArgs:
      ipvs-scheduler: "lc"
```

```yaml
# Source hashing (same client always goes to the same pod)
cluster:
  proxy:
    mode: ipvs
    extraArgs:
      ipvs-scheduler: "sh"
```

Round-robin is the most common and works well for stateless services. Least connections is better when pods have varying processing times. Source hashing provides session affinity at the network level.

## Disabling Kube-Proxy

If you use a CNI that provides its own service proxy implementation (like Cilium with kube-proxy replacement or Calico eBPF mode), you should disable kube-proxy to avoid conflicts:

```yaml
# Disable kube-proxy for Cilium kube-proxy replacement
cluster:
  proxy:
    disabled: true
```

When kube-proxy is disabled, Talos does not deploy the kube-proxy DaemonSet at all. Your CNI is then responsible for all service routing. Make sure your CNI is properly configured to handle this before disabling kube-proxy, or you will lose all service connectivity.

For Cilium with kube-proxy replacement, the typical setup looks like:

```yaml
# Complete config for Cilium without kube-proxy
cluster:
  proxy:
    disabled: true

machine:
  features:
    kubePrism:
      enabled: true
      port: 7445
```

KubePrism becomes especially important when kube-proxy is disabled because it provides the local API server endpoint that the kubelet and other components need.

## Configuring Metrics

Kube-proxy exposes Prometheus metrics that are valuable for monitoring service networking:

```yaml
# Enable metrics on all interfaces
cluster:
  proxy:
    extraArgs:
      metrics-bind-address: "0.0.0.0:10249"
```

By default, kube-proxy binds metrics to localhost only. Changing this to `0.0.0.0` makes metrics available to your Prometheus setup running as pods in the cluster.

## Conntrack Settings

Kube-proxy manages conntrack entries for tracked connections. In high-traffic environments, you might need to tune these settings:

```yaml
# Conntrack tuning for high-traffic clusters
cluster:
  proxy:
    extraArgs:
      conntrack-max-per-core: "65536"
      conntrack-min: "131072"
      conntrack-tcp-timeout-established: "86400s"
      conntrack-tcp-timeout-close-wait: "1h"
```

These settings work in conjunction with the kernel sysctl values for conntrack. Make sure both are aligned:

```yaml
# Corresponding sysctl settings
machine:
  sysctls:
    net.netfilter.nf_conntrack_max: "1048576"
    net.netfilter.nf_conntrack_tcp_timeout_established: "86400"
```

## Iptables Mode Tuning

If you stick with iptables mode, there are some tuning options:

```yaml
# Iptables mode tuning
cluster:
  proxy:
    mode: iptables
    extraArgs:
      iptables-sync-period: "30s"
      iptables-min-sync-period: "1s"
      iptables-masquerade-bit: "14"
```

The sync periods control how often kube-proxy refreshes iptables rules. Shorter periods mean faster reaction to service changes but higher CPU usage. The default of 30 seconds is appropriate for most clusters.

## Node-Specific Proxy Configuration

You might want different proxy settings for different node roles. Control plane nodes often need different tuning than worker nodes:

```yaml
# Control plane proxy settings (in controlplane.yaml)
cluster:
  proxy:
    mode: ipvs
    extraArgs:
      ipvs-scheduler: "rr"
      metrics-bind-address: "0.0.0.0:10249"
```

```yaml
# Worker node proxy settings (in worker.yaml)
cluster:
  proxy:
    mode: ipvs
    extraArgs:
      ipvs-scheduler: "rr"
      metrics-bind-address: "0.0.0.0:10249"
      conntrack-max-per-core: "131072"  # Workers handle more traffic
```

## Applying Proxy Configuration

Apply the configuration to your nodes:

```bash
# Apply to control plane nodes
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file controlplane.yaml

# Apply to worker nodes
talosctl apply-config \
  --nodes 192.168.1.110 \
  --file worker.yaml
```

Proxy configuration changes cause the kube-proxy DaemonSet to be updated, which triggers a rolling restart:

```bash
# Check kube-proxy pod status
kubectl -n kube-system get pods -l k8s-app=kube-proxy

# View kube-proxy logs for configuration issues
kubectl -n kube-system logs -l k8s-app=kube-proxy --tail=50
```

## Verifying Proxy Configuration

Verify that kube-proxy is running with your desired settings:

```bash
# Check the running mode
kubectl -n kube-system get pods -l k8s-app=kube-proxy -o yaml | grep "mode\|--"

# For IPVS mode, check the IPVS rules
talosctl read --nodes 192.168.1.110 /proc/net/ip_vs

# For iptables mode, check iptables rules
# (Not directly accessible in Talos, but you can check via kube-proxy metrics)
curl http://192.168.1.110:10249/metrics | grep kubeproxy_sync
```

## Troubleshooting Proxy Issues

If services are not reachable, check these common issues:

```bash
# Verify kube-proxy pods are running
kubectl -n kube-system get pods -l k8s-app=kube-proxy

# Check for error logs
kubectl -n kube-system logs -l k8s-app=kube-proxy | grep -i error

# Verify the correct mode is active
kubectl -n kube-system logs -l k8s-app=kube-proxy | grep "Using"
```

Common problems include missing IPVS kernel modules (kube-proxy falls back to iptables silently), conntrack table exhaustion (manifests as random connection drops), and conflicting configurations when both kube-proxy and a CNI's proxy replacement are running.

## Best Practices

For clusters with more than 500 services, use IPVS mode. For clusters using Cilium or Calico eBPF, disable kube-proxy entirely. Always enable metrics for monitoring. Test proxy mode changes on a non-production cluster because switching modes can briefly disrupt service connectivity. Monitor conntrack table utilization and adjust limits before you hit capacity.
