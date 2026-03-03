# How to Collect Debug Information from Talos Linux Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Debugging, Diagnostics, Troubleshooting, Support Bundle

Description: Learn how to collect comprehensive debug information from Talos Linux nodes for troubleshooting, bug reports, and support requests using built-in tools.

---

When troubleshooting complex issues on a Talos Linux cluster, you often need to gather extensive diagnostic information. Whether you are filing a bug report, working with Sidero Labs support, or trying to understand a failure after the fact, having a systematic approach to collecting debug data is essential. Talos provides several tools for gathering diagnostics, and this guide covers all of them.

## The talosctl Support Bundle

The most comprehensive way to collect debug information is the support bundle command. It gathers logs, configuration, status, and diagnostic data from one or more nodes into a single archive:

```bash
# Collect a support bundle from all nodes
talosctl -n <node-ip-1>,<node-ip-2>,<node-ip-3> support --output support-bundle.zip

# Collect from a single node
talosctl -n <node-ip> support --output node-debug.zip
```

The support bundle includes:

- Machine configuration (with secrets redacted)
- Service statuses and logs
- Kernel messages (dmesg)
- Network configuration
- Disk information
- Process list
- Memory usage
- etcd status (on control plane nodes)

This is the single best command to run when you need a complete picture of a node's state.

## Collecting Service Logs

For targeted debugging, collect logs from specific services:

```bash
# Collect kubelet logs
talosctl -n <node-ip> logs kubelet --tail 500 > kubelet-logs.txt

# Collect etcd logs (control plane only)
talosctl -n <node-ip> logs etcd --tail 500 > etcd-logs.txt

# Collect containerd logs
talosctl -n <node-ip> logs containerd --tail 500 > containerd-logs.txt

# Collect API server logs (control plane only)
talosctl -n <node-ip> logs kube-apiserver --tail 500 > apiserver-logs.txt

# Collect controller-runtime logs (Talos internal)
talosctl -n <node-ip> logs controller-runtime --tail 500 > controller-runtime-logs.txt

# Follow logs in real time for active debugging
talosctl -n <node-ip> logs kubelet --follow
```

To get a list of all available services and their log streams:

```bash
# List all services
talosctl -n <node-ip> services
```

## Collecting Kernel Messages

Kernel messages contain hardware-level information, driver issues, and OOM kill records:

```bash
# Get kernel messages
talosctl -n <node-ip> dmesg > dmesg-output.txt

# Filter for specific issues
talosctl -n <node-ip> dmesg | grep -i "error\|warning\|oom\|panic"
```

Kernel messages are especially useful for:

- Hardware driver failures
- Disk errors
- Network interface issues
- Memory-related kernel events
- Boot-time hardware initialization problems

## Collecting Network Diagnostics

Gather network configuration and status information:

```bash
# Network interfaces
talosctl -n <node-ip> get links > network-links.txt

# IP addresses
talosctl -n <node-ip> get addresses > network-addresses.txt

# Routing table
talosctl -n <node-ip> get routes > network-routes.txt

# DNS resolvers
talosctl -n <node-ip> get resolvers > dns-resolvers.txt

# Neighbor cache (ARP table)
talosctl -n <node-ip> get neighbors > arp-table.txt
```

For deep network debugging, capture packets:

```bash
# Capture packets on a specific interface
talosctl -n <node-ip> pcap --interface eth0 --duration 60s > capture.pcap

# Capture with a filter (if supported)
talosctl -n <node-ip> pcap --interface eth0 --duration 30s > filtered-capture.pcap
```

## Collecting Disk and Storage Information

```bash
# List disks
talosctl -n <node-ip> disks > disk-info.txt

# Check disk usage
talosctl -n <node-ip> usage /var > disk-usage.txt

# Check specific directories
talosctl -n <node-ip> usage /var/lib/containerd > containerd-usage.txt
talosctl -n <node-ip> usage /var/lib/etcd > etcd-usage.txt
talosctl -n <node-ip> usage /var/lib/kubelet > kubelet-usage.txt
talosctl -n <node-ip> usage /var/log > log-usage.txt
```

## Collecting Machine Configuration

Get the current machine configuration (secrets are redacted in the support bundle, but be careful with raw output):

```bash
# Get machine configuration
talosctl -n <node-ip> get machineconfiguration -o yaml > machine-config.yaml

# Get specific config sections
talosctl -n <node-ip> get machineconfiguration -o yaml | grep -A20 "network:"
```

When sharing configuration files, always remove sensitive data:

- Cluster secrets
- Machine tokens
- CA keys
- API server certificates

## Collecting Process and Memory Information

```bash
# List all running processes
talosctl -n <node-ip> processes > processes.txt

# Check memory usage
talosctl -n <node-ip> memory > memory-info.txt

# Check CPU information
talosctl -n <node-ip> cpuinfo > cpu-info.txt
```

## Collecting Kubernetes-Level Diagnostics

In addition to Talos-level diagnostics, collect Kubernetes information:

```bash
# Node status
kubectl get nodes -o wide > nodes.txt
kubectl describe nodes > node-descriptions.txt

# Pod status across all namespaces
kubectl get pods -A -o wide > all-pods.txt

# Events (sorted by time)
kubectl get events -A --sort-by=.lastTimestamp > events.txt

# System pod logs
kubectl -n kube-system logs -l k8s-app=kube-dns --tail=200 > coredns-logs.txt
kubectl -n kube-system logs -l k8s-app=kube-proxy --tail=200 > kube-proxy-logs.txt
kubectl -n kube-system logs -l app=flannel --tail=200 > flannel-logs.txt
```

## Collecting etcd Diagnostics

For control plane issues, etcd diagnostics are critical:

```bash
# etcd member list
talosctl -n <cp-ip> etcd members > etcd-members.txt

# etcd status
talosctl -n <cp-ip> etcd status > etcd-status.txt

# etcd health
talosctl -n <cp-ip> health > cluster-health.txt
```

If you have `etcdctl` configured:

```bash
# Detailed endpoint status
ETCDCTL_API=3 etcdctl \
  --endpoints=https://<cp-ip>:2379 \
  --cacert=etcd-ca.crt \
  --cert=etcd.crt \
  --key=etcd.key \
  endpoint status --write-out=table > etcd-endpoint-status.txt

# Check alarm status
ETCDCTL_API=3 etcdctl \
  --endpoints=https://<cp-ip>:2379 \
  --cacert=etcd-ca.crt \
  --cert=etcd.crt \
  --key=etcd.key \
  alarm list > etcd-alarms.txt
```

## Collecting Time Information

Time-related issues are common enough to always check:

```bash
# Check time on each node
for ip in <node-ip-1> <node-ip-2> <node-ip-3>; do
  echo "Node $ip: $(talosctl -n $ip time 2>&1 | head -1)"
done > time-info.txt

# Check time sync status
talosctl -n <node-ip> get timeserverstatus > time-sync-status.txt
```

## Collecting Version Information

Include version information to help with debugging:

```bash
# Talos version
talosctl -n <node-ip> version > talos-version.txt

# talosctl version
talosctl version --client > talosctl-version.txt

# Kubernetes version
kubectl version > kubernetes-version.txt
```

## Automated Debug Collection Script

Create a script to collect everything at once:

```bash
#!/bin/bash
# collect-debug.sh - Collect debug info from a Talos Linux cluster

NODES="10.0.0.1 10.0.0.2 10.0.0.3"
OUTPUT_DIR="debug-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

# Collect support bundle
talosctl -n $(echo $NODES | tr ' ' ',') support --output "$OUTPUT_DIR/support-bundle.zip"

# Collect Kubernetes info
kubectl get nodes -o wide > "$OUTPUT_DIR/nodes.txt"
kubectl get pods -A -o wide > "$OUTPUT_DIR/pods.txt"
kubectl get events -A --sort-by=.lastTimestamp > "$OUTPUT_DIR/events.txt"
kubectl describe nodes > "$OUTPUT_DIR/node-descriptions.txt"

# Collect per-node info
for ip in $NODES; do
  node_dir="$OUTPUT_DIR/node-$ip"
  mkdir -p "$node_dir"

  talosctl -n $ip version > "$node_dir/version.txt" 2>&1
  talosctl -n $ip services > "$node_dir/services.txt" 2>&1
  talosctl -n $ip time > "$node_dir/time.txt" 2>&1
  talosctl -n $ip memory > "$node_dir/memory.txt" 2>&1
  talosctl -n $ip disks > "$node_dir/disks.txt" 2>&1
  talosctl -n $ip dmesg > "$node_dir/dmesg.txt" 2>&1
done

echo "Debug info collected in $OUTPUT_DIR"
```

Make it executable and run it:

```bash
chmod +x collect-debug.sh
./collect-debug.sh
```

## Tips for Bug Reports

When filing a bug report with Sidero Labs or the Talos community:

1. Always include the Talos version and the Kubernetes version
2. Include the support bundle (it automatically redacts secrets)
3. Describe the steps to reproduce the issue
4. Include the expected behavior and actual behavior
5. Note the environment (bare metal, VMware, cloud provider, etc.)
6. Include relevant log excerpts with timestamps

## Sensitive Data Handling

When sharing debug information:

- The support bundle redacts secrets automatically
- Raw machine configuration output may contain CA keys and tokens
- Pod descriptions may show environment variables with secrets
- etcd data contains all cluster secrets

Always review collected data before sharing it publicly.

## Summary

Collecting debug information from Talos Linux is straightforward with `talosctl`. The support bundle command is the most comprehensive single tool, but targeted log collection with `talosctl logs`, `talosctl dmesg`, and the various `talosctl get` commands gives you more control over what you collect. For thorough debugging, combine Talos-level diagnostics with Kubernetes-level information (pod status, events, service logs) to get a complete picture of the issue.
