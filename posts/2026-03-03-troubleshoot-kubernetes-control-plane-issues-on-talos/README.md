# How to Troubleshoot Kubernetes Control Plane Issues on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Control Plane, Troubleshooting, API Server, Scheduler

Description: Complete troubleshooting guide for Kubernetes control plane problems on Talos Linux, covering the API server, scheduler, controller manager, and etcd.

---

The Kubernetes control plane consists of several components that work together to manage the cluster. On Talos Linux, these components run as static pods on control plane nodes, managed by the kubelet. When any control plane component fails, the impact can range from degraded functionality to a complete cluster outage. This guide covers how to troubleshoot each control plane component on Talos Linux.

## Control Plane Components Overview

The Kubernetes control plane on Talos Linux includes:

- **kube-apiserver** - The central API that all components communicate through
- **kube-controller-manager** - Runs controllers that handle replication, endpoints, service accounts, etc.
- **kube-scheduler** - Assigns pods to nodes
- **etcd** - Distributed key-value store for all cluster data

Each of these runs as a static pod, which means the kubelet manages them directly from manifest files rather than through the API server.

## Checking Overall Control Plane Health

Start with a high-level health check:

```bash
# Check if the API server responds
kubectl get --raw='/healthz'

# Check component statuses
kubectl get componentstatuses

# Check all control plane pods
kubectl -n kube-system get pods -l tier=control-plane
```

On Talos, you can also use `talosctl`:

```bash
# Check all services on a control plane node
talosctl -n <cp-ip> services

# Quick health check
talosctl -n <cp-ip> health
```

## Troubleshooting the API Server

The API server is the most critical component. If it is down, nothing works.

```bash
# Check API server status
talosctl -n <cp-ip> service kube-apiserver

# View API server logs
talosctl -n <cp-ip> logs kube-apiserver --tail 100
```

Common API server issues:

**etcd connection failure:**

```
Error: connection error: desc = "transport: Error while dialing: dial tcp 127.0.0.1:2379: connect: connection refused"
```

Fix etcd first - the API server cannot function without it.

**Bind address in use:**

```
listen tcp 0.0.0.0:6443: bind: address already in use
```

This happens if a previous API server instance did not shut down cleanly. On Talos, restarting the kubelet usually fixes this:

```bash
# Restart kubelet to clear the port
talosctl -n <cp-ip> service kubelet restart
```

**Out of memory:**

```bash
# Check for OOM kills
talosctl -n <cp-ip> dmesg | grep -i "oom\|kube-apiserver"
```

If the API server is being OOM killed, increase the memory on your control plane nodes.

## Troubleshooting the Controller Manager

The controller manager runs all the built-in controllers. If it fails, pods will not be replicated, services will not get endpoints, and many automated processes will stop.

```bash
# Check controller manager status
talosctl -n <cp-ip> service kube-controller-manager

# View logs
talosctl -n <cp-ip> logs kube-controller-manager --tail 100
```

Common controller manager issues:

**Leader election failure:**

In a multi-node control plane, only one controller manager instance is active (the leader). If leader election fails, no controllers will run:

```bash
# Check controller manager logs for election issues
talosctl -n <cp-ip> logs kube-controller-manager | grep -i "leader\|election"
```

Leader election requires the API server to be healthy. Fix the API server first if it is down.

**Certificate issues:**

The controller manager uses certificates to communicate with the API server. If certificates are wrong:

```bash
# Check for certificate errors
talosctl -n <cp-ip> logs kube-controller-manager | grep -i "tls\|cert\|x509"
```

Regenerate the cluster configuration and re-apply to fix certificate issues.

## Troubleshooting the Scheduler

The scheduler assigns pods to nodes. If it fails, new pods will remain in Pending state.

```bash
# Check scheduler status
talosctl -n <cp-ip> service kube-scheduler

# View scheduler logs
talosctl -n <cp-ip> logs kube-scheduler --tail 100
```

Common scheduler issues:

**Scheduler not running:**

If the scheduler pod is not running, check the static pod manifest:

```bash
# Check static pod status
talosctl -n <cp-ip> get staticpodstatus
```

**Scheduler cannot reach API server:**

The scheduler needs to connect to the API server. Check connectivity:

```bash
# Look for connection errors in scheduler logs
talosctl -n <cp-ip> logs kube-scheduler | grep -i "error\|failed"
```

## Troubleshooting etcd

etcd issues have the most severe impact because all cluster data is stored there.

```bash
# Check etcd service
talosctl -n <cp-ip> service etcd

# Check etcd health
talosctl -n <cp-ip> etcd status

# List etcd members
talosctl -n <cp-ip> etcd members

# View etcd logs
talosctl -n <cp-ip> logs etcd --tail 100
```

If etcd has lost quorum (majority of members are down):

```bash
# Check how many members are healthy
talosctl -n <cp-1-ip> etcd status 2>/dev/null && echo "cp-1: healthy" || echo "cp-1: unhealthy"
talosctl -n <cp-2-ip> etcd status 2>/dev/null && echo "cp-2: healthy" || echo "cp-2: unhealthy"
talosctl -n <cp-3-ip> etcd status 2>/dev/null && echo "cp-3: healthy" || echo "cp-3: unhealthy"
```

For a three-node cluster, you need at least two healthy members to maintain quorum.

## Static Pod Management on Talos

Unlike regular Kubernetes distributions where you can edit static pod manifests directly, Talos generates them from the machine configuration. To change control plane component settings:

```yaml
cluster:
  apiServer:
    extraArgs:
      audit-log-path: /var/log/audit.log
      audit-log-maxsize: "100"
    certSANs:
      - 10.0.0.100
  controllerManager:
    extraArgs:
      terminated-pod-gc-threshold: "100"
  scheduler:
    extraArgs:
      # Add scheduler arguments here
```

Apply the updated configuration:

```bash
# Apply to the control plane node
talosctl apply-config -n <cp-ip> --file controlplane.yaml
```

## Control Plane Node Resource Exhaustion

Control plane components compete for resources on the node. Monitor resource usage:

```bash
# Check overall node resource usage
kubectl top node <cp-node-name>

# Check individual control plane pod resource usage
kubectl -n kube-system top pods -l tier=control-plane

# Check from Talos
talosctl -n <cp-ip> memory
```

If the control plane node is resource-constrained:

1. Increase node resources (more CPU and memory)
2. Ensure no regular workloads are scheduled on control plane nodes
3. Consider scaling up to 3 or 5 control plane nodes to distribute load

## Control Plane Component Restarts

If a control plane component needs to be restarted on Talos:

```bash
# Restart a specific service
talosctl -n <cp-ip> service kube-apiserver restart

# Restart the kubelet (which manages all static pods)
talosctl -n <cp-ip> service kubelet restart
```

Be careful about restarting the API server on a single-node control plane - there will be a brief outage while it comes back up.

## Multi-Node Control Plane Issues

In a multi-node control plane, issues can affect a single node or all nodes:

```bash
# Check the status of all control plane pods across all nodes
kubectl -n kube-system get pods -o wide -l tier=control-plane

# Check which node is the etcd leader
talosctl -n <cp-ip> etcd status
```

If one control plane node is unhealthy but the others are fine, the cluster should continue to function. Focus on fixing the unhealthy node without disrupting the healthy ones.

## Complete Control Plane Recovery

If the entire control plane is down:

```bash
# 1. Start with etcd - it must be healthy first
talosctl -n <cp-1-ip> service etcd
talosctl -n <cp-1-ip> logs etcd --tail 50

# 2. Once etcd is up, check the API server
talosctl -n <cp-1-ip> service kube-apiserver

# 3. Then check the remaining components
talosctl -n <cp-1-ip> service kube-controller-manager
talosctl -n <cp-1-ip> service kube-scheduler
```

If etcd has completely failed and you need to restore from backup:

```bash
# Bootstrap from an etcd snapshot
talosctl -n <cp-1-ip> bootstrap --recover-from=/path/to/snapshot.db
```

## Summary

Control plane troubleshooting on Talos Linux follows a clear priority order: check etcd first (it is the foundation), then the API server (everything depends on it), then the controller manager and scheduler. Use `talosctl services` and `talosctl logs` for diagnosis, and remember that on Talos, control plane settings are managed through the machine configuration rather than by editing files directly.
