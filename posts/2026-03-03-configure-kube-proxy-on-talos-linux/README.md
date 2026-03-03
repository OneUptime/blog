# How to Configure kube-proxy on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, kube-proxy, Networking, Kubernetes, IPVS

Description: Learn how to configure kube-proxy settings on Talos Linux including IPVS mode, iptables tuning, and performance optimization.

---

kube-proxy is the Kubernetes component responsible for implementing Service abstractions. It programs the network rules that route traffic from Service ClusterIPs and NodePorts to the actual pod endpoints. On Talos Linux, kube-proxy runs as a DaemonSet that Talos manages as part of the cluster bootstrap. Configuring it requires changes to the Talos machine configuration, which then generates the appropriate kube-proxy settings.

This guide covers the most important kube-proxy configuration options on Talos Linux, including switching between iptables and IPVS modes, tuning performance, and understanding when you might want to disable it entirely in favor of a CNI-based replacement.

## How Talos Manages kube-proxy

Talos Linux deploys kube-proxy as part of the Kubernetes bootstrap process. The configuration lives in the `cluster.proxy` section of the machine configuration. When you modify these settings and apply the configuration, Talos updates the kube-proxy DaemonSet accordingly.

Check the current kube-proxy status:

```bash
# View kube-proxy pods
kubectl get pods -n kube-system -l k8s-app=kube-proxy

# Check the kube-proxy configuration
kubectl get configmap -n kube-system kube-proxy -o yaml

# View kube-proxy logs
talosctl -n 192.168.1.10 logs kube-proxy --tail 20
```

## Switching to IPVS Mode

By default, kube-proxy uses iptables mode for service routing. For clusters with many services, IPVS (IP Virtual Server) mode offers better performance because it uses hash tables for lookups instead of sequential iptables rule scanning.

```yaml
# kube-proxy-ipvs.yaml
# Switch kube-proxy to IPVS mode
cluster:
  proxy:
    extraArgs:
      proxy-mode: ipvs
      ipvs-scheduler: rr  # Round robin scheduling
```

Apply the configuration:

```bash
# Apply IPVS mode to all nodes
talosctl apply-config --nodes 192.168.1.10,192.168.1.20 --patch @kube-proxy-ipvs.yaml
```

After applying, verify that IPVS is active:

```bash
# Check the kube-proxy mode in logs
kubectl logs -n kube-system -l k8s-app=kube-proxy --tail=20 | grep -i "proxy mode\|ipvs"

# List IPVS rules (from a node that has ipvsadm)
kubectl exec -n kube-system $(kubectl get pods -n kube-system -l k8s-app=kube-proxy -o name | head -1) -- cat /proc/net/ip_vs
```

## IPVS Scheduling Algorithms

IPVS supports multiple load balancing algorithms. Choose the one that best fits your workload:

```yaml
# kube-proxy-ipvs-scheduling.yaml
# Configure IPVS scheduling algorithm
cluster:
  proxy:
    extraArgs:
      proxy-mode: ipvs
      # Available schedulers:
      # rr  - Round Robin (default)
      # lc  - Least Connections
      # dh  - Destination Hashing
      # sh  - Source Hashing
      # sed - Shortest Expected Delay
      # nq  - Never Queue
      ipvs-scheduler: lc
```

Round robin distributes requests evenly. Least connections sends traffic to the backend with the fewest active connections, which is better for workloads with uneven request durations. Source hashing ensures the same client always reaches the same backend, providing session affinity at the network level.

## Configuring iptables Mode

If you prefer iptables mode (which is the default), you can still tune its behavior:

```yaml
# kube-proxy-iptables.yaml
# Tune iptables mode settings
cluster:
  proxy:
    extraArgs:
      proxy-mode: iptables
      # How often to refresh iptables rules
      iptables-sync-period: "30s"
      # Minimum interval between iptables rule refreshes
      iptables-min-sync-period: "1s"
      # Enable masquerading for service traffic
      masquerade-all: "false"
```

## Configuring Connection Tracking

kube-proxy's conntrack settings affect how many concurrent connections the node can handle:

```yaml
# kube-proxy-conntrack.yaml
# Tune connection tracking for high-traffic clusters
cluster:
  proxy:
    extraArgs:
      conntrack-max-per-core: "32768"
      conntrack-min: "131072"
      conntrack-tcp-timeout-established: "86400s"
      conntrack-tcp-timeout-close-wait: "1h0m0s"
```

The `conntrack-max-per-core` setting controls the maximum number of tracked connections per CPU core. For nodes handling a lot of short-lived connections, you might need to increase this to prevent conntrack table overflow, which results in dropped packets.

## Configuring Metrics

kube-proxy exposes Prometheus metrics that help you monitor its performance:

```yaml
# kube-proxy-metrics.yaml
# Enable metrics collection from kube-proxy
cluster:
  proxy:
    extraArgs:
      metrics-bind-address: "0.0.0.0:10249"
```

Then create a ServiceMonitor to scrape those metrics:

```yaml
# kube-proxy-servicemonitor.yaml
# Prometheus ServiceMonitor for kube-proxy
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kube-proxy
  namespace: monitoring
  labels:
    release: prometheus
spec:
  endpoints:
    - port: "10249"
      interval: 30s
  namespaceSelector:
    matchNames:
      - kube-system
  selector:
    matchLabels:
      k8s-app: kube-proxy
```

Key metrics to monitor include:

```
# Useful kube-proxy metrics
kubeproxy_sync_proxy_rules_duration_seconds  # How long rule syncing takes
kubeproxy_network_programming_duration_seconds  # End-to-end programming time
kubeproxy_sync_proxy_rules_iptables_total  # Number of iptables rules
kubeproxy_sync_proxy_rules_last_timestamp_seconds  # When rules were last synced
```

## NodePort Configuration

Customize which port range is available for NodePort services:

```yaml
# nodeport-range.yaml
# Configure the NodePort range through the API server
cluster:
  apiServer:
    extraArgs:
      service-node-port-range: "30000-32767"
  proxy:
    extraArgs:
      # Bind NodePort services to all interfaces
      nodeport-addresses: "0.0.0.0/0"
```

If you want to restrict NodePort services to specific network interfaces:

```yaml
# Restrict NodePorts to a specific network
cluster:
  proxy:
    extraArgs:
      nodeport-addresses: "192.168.1.0/24"
```

## Configuring Session Affinity

While session affinity is typically configured per-Service, kube-proxy has some global settings that affect how it handles affinity:

```yaml
# Example Service with session affinity
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800
```

## Logging and Debugging

When troubleshooting kube-proxy issues, increase the logging verbosity:

```yaml
# kube-proxy-debug.yaml
# Increase kube-proxy logging for debugging
cluster:
  proxy:
    extraArgs:
      v: "4"  # Increase verbosity (default is 2)
```

Check the logs for issues:

```bash
# View kube-proxy logs
talosctl -n 192.168.1.20 logs kube-proxy --tail 100

# Look for specific issues
talosctl -n 192.168.1.20 logs kube-proxy | grep -i "error\|fail\|warn"

# Check iptables rules on a node (through a debug pod)
kubectl debug node/talos-worker-1 -it --image=nicolaka/netshoot -- iptables -t nat -L KUBE-SERVICES | head -30
```

## Performance Tuning for Large Clusters

For clusters with hundreds of services, kube-proxy's sync operations can become expensive. Tune the sync intervals:

```yaml
# kube-proxy-performance.yaml
# Performance tuning for large clusters
cluster:
  proxy:
    extraArgs:
      proxy-mode: ipvs
      ipvs-scheduler: rr
      # Increase sync period for large rule sets
      ipvs-sync-period: "30s"
      ipvs-min-sync-period: "2s"
      # Enable connection reuse
      ipvs-tcp-timeout: "900s"
      ipvs-tcpfin-timeout: "120s"
      ipvs-udp-timeout: "300s"
```

## When to Consider Disabling kube-proxy

In some scenarios, you might want to replace kube-proxy entirely with a CNI-based solution like Cilium. This can offer better performance, especially for east-west traffic within the cluster. See our guide on replacing kube-proxy with Cilium for details.

```yaml
# Disable kube-proxy (when using Cilium as a replacement)
cluster:
  proxy:
    disabled: true
```

Only disable kube-proxy if your CNI explicitly supports full kube-proxy replacement. Otherwise, services will stop working.

Configuring kube-proxy on Talos Linux comes down to choosing the right proxy mode for your scale, tuning connection tracking for your traffic patterns, and monitoring the system to catch performance problems early. The iptables mode works fine for small to medium clusters, while IPVS mode is the better choice for clusters with many services or high connection counts. All configuration changes flow through the Talos machine config, keeping your cluster infrastructure declarative and reproducible.
