# How to Troubleshoot Node Ready/NotReady Status on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Node Status, Troubleshooting, Kubelet

Description: Learn how to diagnose and fix Kubernetes node Ready and NotReady status issues on Talos Linux, covering kubelet health, network problems, and resource pressure.

---

When a node in your Talos Linux cluster shows a NotReady status, it means the kubelet on that node is not reporting healthy to the Kubernetes API server. This triggers pod eviction timers and prevents new workloads from being scheduled on the node. Understanding why a node becomes NotReady and how to fix it quickly is essential for maintaining cluster stability.

## How Node Status Works

The kubelet on each node sends regular heartbeats to the API server. These heartbeats contain the node's status, including:

- **Ready** - The kubelet is healthy and can accept pods
- **NotReady** - The kubelet is not healthy or has stopped reporting
- **MemoryPressure** - The node is running low on memory
- **DiskPressure** - The node is running low on disk space
- **PIDPressure** - Too many processes on the node
- **NetworkUnavailable** - The node network is not properly configured

If the API server does not receive a heartbeat within the node monitor grace period (default 40 seconds), it marks the node as NotReady.

## Checking Node Status

```bash
# Check the status of all nodes
kubectl get nodes

# Get detailed information about a specific node
kubectl describe node <node-name>
```

Look at the Conditions section in the describe output:

```bash
# Check node conditions specifically
kubectl get nodes -o custom-columns=NAME:.metadata.name,STATUS:.status.conditions[-1].type,REASON:.status.conditions[-1].reason,MESSAGE:.status.conditions[-1].message
```

## Common Cause: Kubelet Not Running

The most direct cause of NotReady is the kubelet not running:

```bash
# Check kubelet status on the node
talosctl -n <node-ip> service kubelet

# If kubelet is not running, check the logs
talosctl -n <node-ip> logs kubelet --tail 100
```

If kubelet stopped, restart it:

```bash
# Restart the kubelet service
talosctl -n <node-ip> service kubelet restart
```

Common reasons kubelet stops:

- Out of memory (OOM killed)
- Certificate expired
- Disk full, preventing log writes
- Configuration change that broke kubelet

## Common Cause: Network Connectivity Loss

If the node loses network connectivity to the API server, heartbeats will not arrive and the node will be marked NotReady:

```bash
# Check network status on the node
talosctl -n <node-ip> get addresses
talosctl -n <node-ip> get routes

# Check if the node can reach the API server
talosctl -n <node-ip> service kubelet
```

If the node is completely unreachable from your workstation, the network may be down at a physical level. Check the network switch, cables, or cloud provider networking.

For intermittent connectivity issues, check the kubelet logs for connection errors:

```bash
# Look for API server connection errors
talosctl -n <node-ip> logs kubelet | grep -i "error\|connection\|timeout"
```

## Common Cause: Container Runtime Issues

The kubelet depends on containerd (the container runtime on Talos). If containerd is unhealthy, the kubelet will report the node as NotReady:

```bash
# Check containerd status
talosctl -n <node-ip> service containerd

# View containerd logs
talosctl -n <node-ip> logs containerd --tail 50
```

If containerd is failing, it may be a disk space issue:

```bash
# Check disk usage
talosctl -n <node-ip> usage /var
```

Restart containerd if needed:

```bash
# Restart containerd
talosctl -n <node-ip> service containerd restart
```

## Common Cause: CNI Plugin Not Ready

If the CNI plugin (flannel by default) is not running, the kubelet will report `NetworkUnavailable`, which can make the node NotReady:

```bash
# Check CNI status
kubectl -n kube-system get pods -l app=flannel -o wide | grep <node-name>
```

If the flannel pod is not running on the affected node:

```bash
# Check why the flannel pod is not running
kubectl -n kube-system describe pod <flannel-pod-name>
```

If the flannel DaemonSet is healthy but the CNI config is missing:

```bash
# Check CNI config directory
talosctl -n <node-ip> ls /etc/cni/net.d/
```

## Common Cause: Resource Pressure

When a node runs low on resources, the kubelet starts reporting pressure conditions:

```bash
# Check node conditions
kubectl describe node <node-name> | grep -A 15 Conditions
```

**Memory Pressure:**

```bash
# Check memory usage
talosctl -n <node-ip> memory
```

If memory pressure is the issue, identify the top memory consumers:

```bash
# Check pod memory usage on the node
kubectl top pods -A --sort-by=memory | head -20
```

**Disk Pressure:**

```bash
# Check disk usage
talosctl -n <node-ip> usage /var
```

Clean up unused images or data to free disk space.

**PID Pressure:**

```bash
# Check process count
talosctl -n <node-ip> processes | wc -l
```

PID pressure is rare but can happen with workloads that spawn many processes.

## Common Cause: Clock Skew

If the node clock is significantly off, certificate validation will fail and the kubelet cannot communicate with the API server properly:

```bash
# Check node time
talosctl -n <node-ip> time
```

Fix time synchronization:

```yaml
machine:
  time:
    servers:
      - time.cloudflare.com
      - pool.ntp.org
```

## Investigating Intermittent NotReady

If a node flips between Ready and NotReady, the issue is often intermittent:

```bash
# Check node events for status changes
kubectl get events --field-selector involvedObject.name=<node-name>,reason=NodeNotReady

# Check kubelet logs for repeated errors
talosctl -n <node-ip> logs kubelet | grep -i "ready\|not ready"
```

Intermittent NotReady is often caused by:

- Network flapping
- Temporary high CPU load preventing heartbeat processing
- Slow disk causing kubelet delays
- kubelet garbage collection blocking the main loop

## Node Status After Reboot

After a node reboots, it will be NotReady for a brief period while it bootstraps:

```bash
# Check the boot time
talosctl -n <node-ip> time

# Watch the node status
kubectl get nodes -w
```

A normal boot should bring the node to Ready within 2-5 minutes. If it takes longer, check the kubelet logs:

```bash
# Monitor kubelet startup
talosctl -n <node-ip> logs kubelet --follow
```

## Forcing Pod Eviction from NotReady Nodes

When a node is NotReady, Kubernetes waits for the `pod-eviction-timeout` (default 5 minutes) before evicting pods. If you know the node is not coming back:

```bash
# Drain the node to reschedule pods immediately
kubectl drain <node-name> --force --ignore-daemonsets --delete-emptydir-data --timeout=60s

# If the node is completely unreachable, force-delete its pods
kubectl get pods -A --field-selector spec.nodeName=<node-name> -o name | xargs kubectl delete --force --grace-period=0
```

## Recovering a Node to Ready State

If the underlying issue is fixed but the node is still showing NotReady:

```bash
# Restart the kubelet to force a fresh status report
talosctl -n <node-ip> service kubelet restart

# Uncordon the node if it was cordoned
kubectl uncordon <node-name>
```

If the node refuses to become Ready after fixing the underlying issue, a full reset may be needed:

```bash
# Reset and rejoin
talosctl -n <node-ip> reset --graceful=false
talosctl apply-config --insecure -n <node-ip> --file worker.yaml
```

## Summary

Node NotReady status on Talos Linux is almost always caused by one of five things: kubelet not running, network connectivity loss, container runtime failure, CNI plugin issues, or resource pressure. Start with `kubectl describe node` to see the conditions and events, then use `talosctl service kubelet` and `talosctl logs kubelet` to dig into the specific cause. Most NotReady situations resolve once the underlying issue is fixed and the kubelet resumes sending heartbeats.
