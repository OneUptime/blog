# How to Use talosctl health for Cluster Health Checks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Health Checks, Talosctl, Cluster Validation

Description: A detailed guide to using talosctl health for comprehensive cluster health checks in Talos Linux, including automation and CI integration.

---

A healthy Talos Linux cluster requires many components working together. The Talos API must be reachable on every node. etcd must have quorum. Kubernetes components must be running. System pods must be operational. Checking all of these manually is tedious and error-prone. The `talosctl health` command automates this entire process, running a comprehensive suite of checks and giving you a clear pass or fail result.

## What talosctl health Checks

The command runs through a sequence of validation steps:

1. **Node discovery** - Identifies all nodes in the cluster
2. **Talos API reachability** - Confirms each node's Talos API is responding
3. **etcd health** - Validates etcd is running and healthy on control plane nodes
4. **etcd membership consistency** - Checks that all control plane nodes agree on etcd membership
5. **etcd members match control plane** - Verifies etcd members correspond to control plane nodes
6. **Boot sequence completion** - Confirms all nodes have finished booting
7. **kubelet health** - Checks kubelet is running on all nodes
8. **Kubernetes node registration** - Verifies all nodes appear in the Kubernetes API
9. **Kubernetes node readiness** - Confirms all nodes report as Ready
10. **Control plane static pods** - Checks that API server, controller-manager, and scheduler are running
11. **CoreDNS readiness** - Verifies cluster DNS is operational
12. **Node schedulability** - Confirms nodes are schedulable

This is the most thorough single-command health check available for a Talos Linux cluster.

## Basic Usage

```bash
# Run a health check targeting any control plane node
talosctl health --nodes <control-plane-ip>
```

You only need to point it at one control plane node. The command discovers the rest of the cluster automatically.

### Healthy Output

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

Every "OK" means that check passed. If any check fails, the output clearly indicates which one and why.

## Adjusting the Timeout

Each check has a built-in wait period. The overall timeout controls how long the command waits before declaring failure:

```bash
# Default timeout (varies by Talos version, usually around 10 minutes)
talosctl health --nodes <cp-ip>

# Custom timeout - shorter for quick checks
talosctl health --nodes <cp-ip> --wait-timeout 2m

# Longer timeout for post-upgrade or bootstrap checks
talosctl health --nodes <cp-ip> --wait-timeout 15m
```

Shorter timeouts are useful for quick pass/fail checks. Longer timeouts are needed when the cluster is still stabilizing after an operation.

## Specifying Nodes Explicitly

If automatic node discovery does not work in your environment (perhaps due to network segmentation or disabled discovery), specify nodes manually:

```bash
# Explicitly specify control plane and worker nodes
talosctl health \
    --nodes <cp-ip> \
    --control-plane-nodes 10.0.0.1,10.0.0.2,10.0.0.3 \
    --worker-nodes 10.0.0.4,10.0.0.5
```

This bypasses discovery and checks exactly the nodes you specify.

## Using Health Checks Operationally

### Before Maintenance

Always run a health check before starting any maintenance operation:

```bash
# Pre-maintenance health check
echo "Running pre-maintenance health check..."
if talosctl health --nodes <cp-ip> --wait-timeout 3m; then
    echo "Cluster healthy. Proceeding with maintenance."
else
    echo "Cluster not healthy! Investigate before proceeding."
    exit 1
fi
```

If the cluster is already unhealthy, performing additional operations (upgrades, node removals) could make things worse.

### After Maintenance

Verify the cluster recovered:

```bash
# Post-maintenance health check with extra time
echo "Running post-maintenance health check..."
talosctl health --nodes <cp-ip> --wait-timeout 10m
```

The longer timeout accounts for services restarting and pods being rescheduled.

### After Node Addition

When a new node joins the cluster:

```bash
# Wait for the new node to be fully integrated
talosctl health --nodes <cp-ip> --wait-timeout 10m \
    --worker-nodes 10.0.0.4,10.0.0.5,10.0.0.6  # Including the new node
```

### After Upgrades

Talos upgrades restart services, which temporarily causes health check failures. Wait for everything to stabilize:

```bash
# Post-upgrade health check
echo "Waiting for cluster to stabilize after upgrade..."
talosctl health --nodes <cp-ip> --wait-timeout 15m
```

## Interpreting Failures

### etcd Not Healthy

```text
waiting for etcd to be healthy: 1 error(s) occurred:
    10.0.0.2: etcd: rpc error: code = DeadlineExceeded
```

Action: Check etcd service and logs on the failing node:

```bash
talosctl services --nodes 10.0.0.2 | grep etcd
talosctl logs etcd --nodes 10.0.0.2
```

### etcd Members Inconsistent

```text
waiting for etcd members to be consistent across nodes: FAILED
```

Action: Compare etcd membership from each control plane node:

```bash
talosctl etcd members --nodes 10.0.0.1
talosctl etcd members --nodes 10.0.0.2
talosctl etcd members --nodes 10.0.0.3
```

### Nodes Not Ready

```text
waiting for all k8s nodes to report ready: 1 error(s) occurred:
    node talos-w-2 not ready
```

Action: Check the node's kubelet and network:

```bash
kubectl describe node talos-w-2
talosctl logs kubelet --nodes <w2-ip>
```

### Static Pods Not Running

```text
waiting for all control plane static pods to be running: FAILED
```

Action: Check control plane pods:

```bash
kubectl get pods -n kube-system -o wide
kubectl describe pod kube-apiserver-<node> -n kube-system
```

## Automation and CI/CD Integration

### In Shell Scripts

```bash
#!/bin/bash
# cluster-health-gate.sh
# Use as a gate before deploying applications

CP_NODE="10.0.0.1"

echo "Checking cluster health before deployment..."
if ! talosctl health --nodes $CP_NODE --wait-timeout 3m 2>&1; then
    echo "ERROR: Cluster is not healthy. Aborting deployment."
    exit 1
fi

echo "Cluster is healthy. Proceeding with deployment."
kubectl apply -f deployment.yaml
```

### In CI/CD Pipelines

```yaml
# Example GitHub Actions step
- name: Verify cluster health
  run: |
    talosctl health --nodes ${{ secrets.CP_NODE }} --wait-timeout 5m
  env:
    TALOSCONFIG: ${{ secrets.TALOSCONFIG }}
```

### Periodic Monitoring

```bash
#!/bin/bash
# periodic-health-check.sh
# Run via cron every 5 minutes

CP_NODE="10.0.0.1"
LOG_FILE="/var/log/talos-health.log"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

if talosctl health --nodes $CP_NODE --wait-timeout 2m > /dev/null 2>&1; then
    echo "$TIMESTAMP HEALTHY" >> $LOG_FILE
else
    echo "$TIMESTAMP UNHEALTHY" >> $LOG_FILE
    # Send alert (email, Slack, PagerDuty, etc.)
fi
```

## Health Check as a Bootstrap Gate

When bootstrapping a new cluster, use health checks to know when the cluster is ready:

```bash
# After bootstrapping
talosctl bootstrap --nodes <cp-ip>

# Wait for the cluster to become fully healthy
echo "Waiting for cluster to bootstrap..."
talosctl health --nodes <cp-ip> --wait-timeout 20m

echo "Cluster is ready!"
# Now safe to install CNI, deploy applications, etc.
```

The first bootstrap takes the longest because images need to be pulled and certificates need to be generated. A 20-minute timeout is reasonable.

## Combining with Other Health Checks

For the most thorough validation, combine talosctl health with Kubernetes-level checks:

```bash
#!/bin/bash
# comprehensive-health-check.sh

CP_NODE="10.0.0.1"

# Talos-level health
echo "=== Talos Health ==="
talosctl health --nodes $CP_NODE --wait-timeout 5m
TALOS_OK=$?

# Kubernetes-level checks
echo ""
echo "=== Kubernetes Health ==="
kubectl get nodes
kubectl get pods -n kube-system | grep -v Running | grep -v Completed
K8S_OK=$?

# etcd specific checks
echo ""
echo "=== etcd Health ==="
talosctl etcd members --nodes $CP_NODE
ETCD_OK=$?

# Summary
echo ""
echo "=== Summary ==="
[ $TALOS_OK -eq 0 ] && echo "Talos: HEALTHY" || echo "Talos: UNHEALTHY"
[ $K8S_OK -eq 0 ] && echo "Kubernetes: HEALTHY" || echo "Kubernetes: ISSUES FOUND"
[ $ETCD_OK -eq 0 ] && echo "etcd: HEALTHY" || echo "etcd: UNHEALTHY"
```

## Exit Codes

The `talosctl health` command uses standard exit codes:

- **0** - All health checks passed
- **Non-zero** - One or more health checks failed

This makes it easy to use in scripts and CI/CD pipelines:

```bash
talosctl health --nodes <cp-ip> --wait-timeout 5m
if [ $? -eq 0 ]; then
    echo "All checks passed"
else
    echo "Health check failed"
fi
```

## Best Practices

1. Run health checks before and after every significant cluster operation
2. Use appropriate timeouts based on the context (short for routine checks, long for post-operation)
3. Integrate health checks into your deployment pipeline
4. Set up periodic health monitoring with alerting
5. When a health check fails, investigate immediately rather than re-running and hoping it passes

## Conclusion

The `talosctl health` command is the single most important diagnostic command for Talos Linux clusters. It validates every critical component in one operation and gives you a clear answer about whether your cluster is functioning properly. Use it as a gate before and after operations, integrate it into your automation, and run it periodically for ongoing monitoring. It catches issues that individual checks might miss by validating the relationships between components, making it indispensable for reliable cluster operations.
