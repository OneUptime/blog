# How to Troubleshoot Service Failures on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Troubleshooting, Service Failures, Kubernetes, Debugging, Operations

Description: A systematic guide to diagnosing and fixing service failures on Talos Linux nodes, covering common failure scenarios and their resolutions.

---

Services fail. It happens on every system, and Talos Linux is no exception. The difference is that Talos gives you a smaller, more predictable set of services to worry about, and a consistent API-based approach to diagnosing problems. When a service fails on Talos Linux, you follow a methodical process: check the status, read the logs, understand the root cause, and apply the fix. This guide walks through that process for the most common service failure scenarios.

## The Troubleshooting Framework

Every service failure investigation should follow these steps:

1. **Identify** which service is failing
2. **Gather** information (status, logs, metrics)
3. **Diagnose** the root cause
4. **Fix** the issue
5. **Verify** the fix worked
6. **Document** what happened

```bash
# Step 1: Identify failing services
talosctl services -n <node-ip>
# Look for any service not showing Running/OK

# Step 2: Get detailed status
talosctl service <service-name> -n <node-ip>

# Step 3: Read the logs
talosctl logs <service-name> -n <node-ip> | tail -100
```

## Common Failure: kubelet Not Starting

The kubelet is the most common service to have issues because it depends on many things working correctly.

### Symptoms
- Node shows as NotReady in `kubectl get nodes`
- Pods on the node are not running
- kubelet service shows as Failed or Waiting

### Diagnosis

```bash
# Check kubelet status
talosctl service kubelet -n <node-ip>

# Read kubelet logs
talosctl logs kubelet -n <node-ip> | tail -100

# Check for common issues:
# 1. Cannot reach API server
talosctl logs kubelet -n <node-ip> | grep -i "api server\|connection refused\|dial tcp"

# 2. Certificate problems
talosctl logs kubelet -n <node-ip> | grep -i "certificate\|tls\|x509"

# 3. Configuration errors
talosctl logs kubelet -n <node-ip> | grep -i "invalid\|malformed\|parse error"

# 4. Resource pressure
talosctl logs kubelet -n <node-ip> | grep -i "eviction\|pressure\|oom"
```

### Fixes

```bash
# If API server is unreachable, check network
talosctl get addresses -n <node-ip>
talosctl get routes -n <node-ip>

# If certificates are expired, trigger renewal
talosctl health -n <node-ip>

# If kubelet is just stuck, restart it
talosctl service kubelet restart -n <node-ip>

# If configuration is wrong, apply a config patch
talosctl patch machineconfig --patch @fix.yaml -n <node-ip>
```

## Common Failure: etcd Member Not Healthy

etcd failures are the scariest because they can affect the entire cluster.

### Symptoms
- `talosctl etcd status` shows unhealthy members
- API server becomes slow or unresponsive
- Writes to Kubernetes fail
- etcd alarm is triggered

### Diagnosis

```bash
# Check etcd service status
talosctl service etcd -n <control-plane-ip>

# Check etcd cluster health
talosctl etcd status -n <control-plane-ip>

# Check etcd members
talosctl etcd members -n <control-plane-ip>

# Check etcd alarms
talosctl etcd alarm list -n <control-plane-ip>

# Read etcd logs for errors
talosctl logs etcd -n <control-plane-ip> | grep -i "error\|warning\|slow\|overloaded"

# Check disk performance (slow disk is a common etcd killer)
talosctl dmesg -n <control-plane-ip> | grep -i "io\|disk\|nvme\|ata"
```

### Common etcd Issues and Fixes

**Database too large:**

```bash
# Check database size
talosctl etcd status -n <control-plane-ip>

# If over 2GB, compact and defragment
# First, find a safe revision to compact to
# Then defragment each member
talosctl etcd defrag -n <member-ip>
```

**Slow disk performance:**

```bash
# Check for disk latency messages in etcd logs
talosctl logs etcd -n <control-plane-ip> | grep "slow fdatasync\|disk"

# etcd needs fast disk I/O (ideally NVMe)
# If on slow disks, consider moving etcd data to faster storage
```

**Member removed/lost quorum:**

```bash
# If a member was lost, you may need to remove it and add a new one
talosctl etcd members -n <healthy-member-ip>

# Remove the unhealthy member
talosctl etcd remove-member <member-id> -n <healthy-member-ip>

# Reboot the failed node to let it rejoin
talosctl reboot -n <failed-node-ip>
```

**etcd alarm triggered:**

```bash
# List alarms
talosctl etcd alarm list -n <control-plane-ip>

# Disarm after fixing the issue
talosctl etcd alarm disarm -n <control-plane-ip>
```

## Common Failure: containerd Not Starting

If containerd fails, no containers can run on the node.

### Diagnosis

```bash
# Check containerd status
talosctl service containerd -n <node-ip>

# Check containerd logs
talosctl logs containerd -n <node-ip> | tail -50

# Check disk space (containerd needs space for images and containers)
talosctl read /proc/mounts -n <node-ip>

# Check kernel messages for storage issues
talosctl dmesg -n <node-ip> | grep -i "no space\|enospc\|readonly"
```

### Fixes

```bash
# If disk is full, the immutable OS itself is fine
# but the ephemeral partition may be full
# Check disk usage
talosctl dmesg -n <node-ip> | grep -i "disk\|space"

# Restart containerd
talosctl service containerd restart -n <node-ip>

# If the problem persists, a reboot may be needed
talosctl reboot -n <node-ip>
```

## Common Failure: API Server Not Responding

When the API server is down, `kubectl` commands fail.

### Diagnosis

```bash
# Check if the issue is on one CP node or all
for ip in 10.0.0.1 10.0.0.2 10.0.0.3; do
    echo "Node $ip:"
    talosctl logs kube-apiserver -n "$ip" 2>/dev/null | tail -5
    echo "---"
done

# Common API server issues:
# 1. etcd connection failure
talosctl logs kube-apiserver -n <cp-ip> | grep -i "etcd\|connection refused"

# 2. Certificate issues
talosctl logs kube-apiserver -n <cp-ip> | grep -i "cert\|tls"

# 3. Resource exhaustion
talosctl logs kube-apiserver -n <cp-ip> | grep -i "too many\|throttl\|429"

# 4. Admission webhook failures
talosctl logs kube-apiserver -n <cp-ip> | grep -i "webhook\|admission"
```

### Fixes

```bash
# If etcd connection issue, fix etcd first
talosctl etcd status -n <cp-ip>

# If resource exhaustion, check node resources
talosctl dmesg -n <cp-ip> | grep -i "oom"

# If admission webhooks are causing failures, check webhook configs
kubectl get validatingwebhookconfigurations
kubectl get mutatingwebhookconfigurations

# Delete problematic webhooks if they are blocking the API server
kubectl delete validatingwebhookconfiguration <name>
```

## Common Failure: Node Cannot Join Cluster

When a new or rebooted node fails to join the cluster.

### Diagnosis

```bash
# Check basic service status
talosctl services -n <node-ip>

# Check network connectivity
talosctl get addresses -n <node-ip>
talosctl get routes -n <node-ip>

# Check if the node can reach the API server
talosctl logs kubelet -n <node-ip> | grep -i "api server\|connection"

# Check if there are certificate issues
talosctl logs kubelet -n <node-ip> | grep -i "certificate\|unauthorized"

# Check if the machine config is valid
talosctl get machineconfig -n <node-ip> -o yaml
```

### Fixes

```bash
# If the node cannot reach the API server, check network
# Verify the control plane endpoint is reachable
talosctl read /etc/hosts -n <node-ip>

# If bootstrap token expired, generate a new one
kubectl get secrets -n kube-system | grep bootstrap

# If the machine config is wrong, apply the correct one
talosctl apply-config --file correct-config.yaml -n <node-ip>
```

## Common Failure: CRI Service Issues

The CRI service provides the container runtime for pods.

### Diagnosis

```bash
# Check CRI service status
talosctl service cri -n <node-ip>

# Check CRI logs
talosctl logs cri -n <node-ip>

# Check if containerd (which CRI depends on) is healthy
talosctl service containerd -n <node-ip>
```

### Fixes

```bash
# Restart CRI
talosctl service cri restart -n <node-ip>

# If CRI keeps failing, restart containerd
talosctl service containerd restart -n <node-ip>

# If both fail, reboot the node
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
talosctl reboot -n <node-ip>
```

## Building a Diagnostic Script

Create a comprehensive diagnostic script for quick troubleshooting:

```bash
#!/bin/bash
# diagnose-node.sh - Comprehensive node diagnostics

NODE_IP=$1

if [ -z "$NODE_IP" ]; then
    echo "Usage: ./diagnose-node.sh <node-ip>"
    exit 1
fi

echo "============================================="
echo "  Node Diagnostics: $NODE_IP"
echo "  Time: $(date)"
echo "============================================="

echo ""
echo "--- Service Status ---"
talosctl services -n "$NODE_IP" 2>/dev/null || echo "CANNOT CONNECT TO NODE"

echo ""
echo "--- Talos Version ---"
talosctl version -n "$NODE_IP" 2>/dev/null

echo ""
echo "--- Network ---"
talosctl get addresses -n "$NODE_IP" 2>/dev/null
talosctl get routes -n "$NODE_IP" 2>/dev/null

echo ""
echo "--- Recent Errors (kubelet) ---"
talosctl logs kubelet -n "$NODE_IP" 2>/dev/null | grep -i "error\|fail" | tail -10

echo ""
echo "--- Recent Errors (etcd) ---"
talosctl logs etcd -n "$NODE_IP" 2>/dev/null | grep -i "error\|fail" | tail -10

echo ""
echo "--- Recent Errors (containerd) ---"
talosctl logs containerd -n "$NODE_IP" 2>/dev/null | grep -i "error\|fail" | tail -10

echo ""
echo "--- Kernel Messages (last 20) ---"
talosctl dmesg -n "$NODE_IP" 2>/dev/null | tail -20

echo ""
echo "--- etcd Status ---"
talosctl etcd status -n "$NODE_IP" 2>/dev/null || echo "Not a control plane node or etcd unavailable"

echo ""
echo "--- Kubernetes Node Status ---"
NODE_NAME=$(kubectl get nodes -o wide --no-headers 2>/dev/null | grep "$NODE_IP" | awk '{print $1}')
if [ -n "$NODE_NAME" ]; then
    kubectl describe node "$NODE_NAME" | grep -A 10 "Conditions:"
else
    echo "Node not found in Kubernetes"
fi

echo ""
echo "============================================="
echo "  Diagnostics Complete"
echo "============================================="
```

## When to Escalate

Not every service failure can be fixed by restarting or reconfiguring. Escalate when:

- etcd has lost quorum (less than majority of members healthy)
- The CA certificate has expired
- Hardware failures (visible in dmesg as disk errors, memory errors)
- Data corruption in etcd
- Repeated failures that are not resolved by restarts

For these situations, you may need to restore from backup, replace hardware, or rebuild the cluster.

```bash
# Emergency: Restore etcd from backup
talosctl etcd restore --snapshot /backup/etcd-snapshot.db -n <node-ip>

# This is a destructive operation that should only be used
# when etcd has lost quorum and cannot be recovered normally
```

## Conclusion

Troubleshooting service failures on Talos Linux follows a predictable pattern because the system is small and well-defined. Check the service status, read the logs, identify the root cause, and apply the appropriate fix. The most common failures involve kubelet communication issues, etcd health problems, and resource exhaustion. Build diagnostic scripts, practice common scenarios, and document your findings. Over time, you will build intuition for which service to check first based on the symptoms you observe.
