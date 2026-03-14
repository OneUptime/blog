# How to Monitor Cluster Health with talosctl health

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Cluster Health, Monitoring, Talosctl

Description: Learn how to use talosctl health to monitor and validate the health of your Talos Linux cluster, including all checks it performs.

---

Knowing the health of your Talos Linux cluster at any moment is essential for reliable operations. The `talosctl health` command gives you a comprehensive health check that validates everything from node connectivity to etcd membership to Kubernetes component status. This guide explains what the command checks, how to use it effectively, and how to interpret its output.

## What talosctl health Checks

The `talosctl health` command performs a series of checks across multiple layers of the cluster:

1. **Node discovery** - Finds all nodes in the cluster
2. **Talos API connectivity** - Verifies it can reach the Talos API on each node
3. **etcd health** - Checks that etcd is running and healthy on control plane nodes
4. **etcd membership** - Validates that all expected etcd members are present
5. **Kubernetes API server** - Verifies the Kubernetes API is responding
6. **Kubernetes node readiness** - Checks that all nodes report as Ready
7. **Kubelet health** - Validates kubelet is running on all nodes
8. **All system pods** - Checks that critical system pods are running

This makes it a one-stop command for validating your entire cluster.

## Basic Usage

```bash
# Run a health check against the cluster
talosctl health --nodes <control-plane-ip>
```

You only need to target one control plane node. The command will discover the rest of the cluster from there.

A healthy cluster produces output like:

```text
discovered nodes: ["10.0.0.1" "10.0.0.2" "10.0.0.3" "10.0.0.4" "10.0.0.5"]
waiting for etcd to be healthy: OK
waiting for etcd members to be consistent across nodes: OK
waiting for etcd members to be control plane nodes: OK
waiting for apid to be ready: OK
waiting for all nodes memory sizes: OK
waiting for all nodes disk sizes: OK
waiting for kubelet to be healthy: OK
waiting for all nodes to finish boot sequence: OK
waiting for all k8s nodes to report: OK
waiting for all k8s nodes to report ready: OK
waiting for all control plane static pods to be running: OK
waiting for all control plane components to be ready: OK
waiting for kube-proxy to report ready: OK
waiting for coredns to report ready: OK
waiting for all k8s nodes to report schedulable: OK
```

## Adjusting Timeouts

By default, the health command waits a certain amount of time for each check to pass. You can adjust this:

```bash
# Set a custom wait timeout (default is around 10 minutes)
talosctl health --nodes <cp-ip> --wait-timeout 15m
```

A longer timeout is useful when:

- The cluster is still booting up
- You just performed an upgrade and services are restarting
- Network conditions are slow

A shorter timeout helps when you want a quick pass/fail:

```bash
# Quick health check with short timeout
talosctl health --nodes <cp-ip> --wait-timeout 2m
```

## Specifying Control Plane and Worker Nodes

If node discovery does not work correctly in your environment, you can explicitly specify which nodes to check:

```bash
# Explicitly specify control plane and worker nodes
talosctl health \
    --nodes <cp-ip> \
    --control-plane-nodes 10.0.0.1,10.0.0.2,10.0.0.3 \
    --worker-nodes 10.0.0.4,10.0.0.5
```

This bypasses the automatic discovery and checks exactly the nodes you specify.

## Interpreting Failures

When a health check fails, the output tells you which check failed and why:

### etcd Not Healthy

```text
waiting for etcd to be healthy: FAILED
  1 error(s) occurred:
    10.0.0.2: etcd: member not healthy
```

This means etcd on one of the control plane nodes is not responding. Check the etcd service:

```bash
# Check etcd service status on the failing node
talosctl services --nodes 10.0.0.2 | grep etcd

# Check etcd logs for errors
talosctl logs etcd --nodes 10.0.0.2
```

### Nodes Not Ready

```text
waiting for all k8s nodes to report ready: FAILED
  1 error(s) occurred:
    10.0.0.4: node not ready
```

A node reporting NotReady usually indicates kubelet issues or the node being unable to communicate with the API server:

```bash
# Check kubelet logs on the problem node
talosctl logs kubelet --nodes 10.0.0.4

# Check node conditions in Kubernetes
kubectl describe node <node-name> | grep -A10 "Conditions"
```

### System Pods Not Running

```text
waiting for all control plane static pods to be running: FAILED
```

This means one or more static pods (API server, controller manager, scheduler) are not running:

```bash
# Check system pod status
kubectl get pods -n kube-system -o wide

# Check for pod events
kubectl get events -n kube-system --sort-by='.lastTimestamp'
```

## Using Health Checks in Scripts

The `talosctl health` command returns a non-zero exit code on failure, making it perfect for scripts:

```bash
#!/bin/bash
# health-check.sh - Run health check and alert on failure

if talosctl health --nodes <cp-ip> --wait-timeout 3m 2>&1; then
    echo "Cluster is healthy"
else
    echo "ALERT: Cluster health check failed!"
    # Send notification, page on-call, etc.
fi
```

## Pre-Operation Health Checks

Run health checks before performing any major operation:

```bash
# Before an upgrade
echo "Pre-upgrade health check..."
talosctl health --nodes <cp-ip> --wait-timeout 5m
if [ $? -ne 0 ]; then
    echo "Cluster is not healthy. Aborting upgrade."
    exit 1
fi

# Proceed with upgrade
talosctl upgrade --nodes <node-ip> --image ghcr.io/siderolabs/installer:v1.7.0
```

## Post-Operation Health Checks

After maintenance, verify the cluster recovered:

```bash
# After a node reboot
echo "Post-reboot health check..."
talosctl health --nodes <cp-ip> --wait-timeout 10m
```

The longer timeout accounts for services restarting after the operation.

## Continuous Monitoring

While `talosctl health` is great for point-in-time checks, you can also run it periodically for continuous monitoring:

```bash
# Run a health check every 5 minutes
while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    if talosctl health --nodes <cp-ip> --wait-timeout 2m > /dev/null 2>&1; then
        echo "$TIMESTAMP - Cluster healthy"
    else
        echo "$TIMESTAMP - CLUSTER UNHEALTHY!"
    fi
    sleep 300
done
```

For production environments, consider integrating with your existing monitoring stack (Prometheus, Grafana, PagerDuty) rather than running a shell loop.

## Health Check vs. Individual Checks

The `talosctl health` command is a comprehensive check. For more targeted monitoring, you can check individual components:

```bash
# Just check etcd
talosctl etcd members --nodes <cp-ip>

# Just check services on a node
talosctl services --nodes <node-ip>

# Just check Kubernetes node status
kubectl get nodes
```

But `talosctl health` has the advantage of checking the relationships between components. A node might show as Ready in Kubernetes but have a failing etcd member. The comprehensive health check catches these cross-cutting issues.

## Health Checks During Cluster Bootstrap

When bootstrapping a new cluster, use the health command to know when everything is ready:

```bash
# After bootstrapping, wait for the cluster to become healthy
talosctl health --nodes <cp-ip> --wait-timeout 15m
```

The first boot takes longer because images need to be pulled and certificates need to be generated. A 15-minute timeout is reasonable for initial bootstrap.

## Conclusion

The `talosctl health` command is your go-to tool for validating Talos Linux cluster health. It checks every layer of the stack, from the Talos API to etcd to Kubernetes components, in a single command. Use it before and after maintenance operations, integrate it into your automation scripts, and run it periodically to catch issues early. When it reports a failure, the output points you directly to the problem component so you can investigate efficiently.
