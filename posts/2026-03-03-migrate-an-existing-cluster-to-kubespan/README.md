# How to Migrate an Existing Cluster to KubeSpan

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, KubeSpan, Migration, WireGuard, Cluster Management

Description: A step-by-step guide to migrating an existing Talos Linux cluster to KubeSpan mesh networking without downtime or disrupting running workloads.

---

If you are running a Talos Linux cluster without KubeSpan and want to enable it, migrating is entirely possible without rebuilding the cluster. The process requires some care to avoid disrupting running workloads, but Talos makes it relatively smooth since KubeSpan is built into the OS. This guide walks through the migration step by step.

## Pre-Migration Assessment

Before enabling KubeSpan, assess your current cluster setup:

```bash
# Check current Talos version (KubeSpan requires Talos 1.0+)
talosctl version --nodes <node-ip>

# Check current network configuration
talosctl get machineconfig --nodes <node-ip> -o yaml | grep -A20 "network:"

# List all nodes
kubectl get nodes -o wide

# Check if discovery service is enabled (required for KubeSpan)
talosctl get machineconfig --nodes <node-ip> -o yaml | grep -A10 "discovery"
```

KubeSpan requires the discovery service, which is enabled by default in Talos. If you disabled it, you will need to re-enable it:

```yaml
# Ensure discovery is enabled
cluster:
  discovery:
    enabled: true
```

## Plan the Migration

Decide on your KubeSpan configuration before starting. Key questions:

- Do you need `advertiseKubernetesNetworks: true`? (Only for multi-site clusters where pod subnets are not directly routable between nodes)
- What MTU should you use? (Default 1420 works for most cases, lower to 1380 for cloud environments)
- Do you need endpoint filters? (Only if nodes have multiple IPs and you need to control which ones are advertised)
- Will all nodes have KubeSpan, or only specific ones?

For a typical single-site cluster, a simple configuration works:

```yaml
# kubespan-config.yaml
machine:
  network:
    kubespan:
      enabled: true
```

For multi-site clusters:

```yaml
# kubespan-multi-site.yaml
machine:
  network:
    kubespan:
      enabled: true
      advertiseKubernetesNetworks: true
      mtu: 1420
```

## Migration Strategy: Rolling Update

The safest migration strategy is to enable KubeSpan one node at a time. KubeSpan nodes can communicate with non-KubeSpan nodes through regular networking, so the cluster stays functional throughout the migration.

### Step 1: Enable on Worker Nodes First

Start with worker nodes because they are less critical and easier to recover if something goes wrong:

```bash
# Patch the first worker node
talosctl patch machineconfig \
  --patch @kubespan-config.yaml \
  --nodes 192.168.1.20

# Wait for the config to be applied
talosctl get machineconfig --nodes 192.168.1.20 -o yaml | grep -A5 kubespan

# Verify KubeSpan is running
talosctl get links --nodes 192.168.1.20 | grep kubespan
talosctl get kubespanidentity --nodes 192.168.1.20
```

Verify the node is still healthy:

```bash
# Check that the node is still Ready
kubectl get node <worker-node-name>

# Check that pods on this node are still running
kubectl get pods --field-selector spec.nodeName=<worker-node-name> -A

# Run a connectivity test from this node
kubectl run test --image=busybox \
  --overrides='{"spec":{"nodeName":"<worker-node-name>"}}' \
  --rm -it --restart=Never -- wget -qO- --timeout=5 http://kubernetes.default.svc:443
```

If everything looks good, proceed to the next worker:

```bash
# Enable on remaining worker nodes one by one
talosctl patch machineconfig \
  --patch @kubespan-config.yaml \
  --nodes 192.168.1.21

# Verify and then proceed to the next
talosctl patch machineconfig \
  --patch @kubespan-config.yaml \
  --nodes 192.168.1.22
```

### Step 2: Check KubeSpan Mesh Between Workers

Once multiple workers have KubeSpan enabled, verify they are connecting to each other:

```bash
# Check peer status from one KubeSpan-enabled worker
talosctl get kubespanpeerstatus --nodes 192.168.1.20

# You should see other KubeSpan-enabled nodes as peers
# Nodes without KubeSpan will NOT appear here (this is normal)
```

### Step 3: Enable on Control Plane Nodes

After all workers are successfully running KubeSpan, enable it on control plane nodes one at a time. Be especially careful here because control plane disruptions affect the entire cluster:

```bash
# Enable on the first control plane node
talosctl patch machineconfig \
  --patch @kubespan-config.yaml \
  --nodes 192.168.1.10

# Wait and verify
talosctl get kubespanpeerstatus --nodes 192.168.1.10

# Check etcd health
talosctl etcd members --nodes 192.168.1.10

# Check Kubernetes API responsiveness
kubectl get nodes
```

Wait a few minutes between control plane nodes to make sure etcd is stable:

```bash
# Enable on second control plane node
talosctl patch machineconfig \
  --patch @kubespan-config.yaml \
  --nodes 192.168.1.11

# Verify etcd cluster health
talosctl etcd members --nodes 192.168.1.10
talosctl etcd status --nodes 192.168.1.10

# Enable on third control plane node
talosctl patch machineconfig \
  --patch @kubespan-config.yaml \
  --nodes 192.168.1.12
```

### Step 4: Verify Full Mesh

Once all nodes have KubeSpan enabled, verify the complete mesh:

```bash
# Check peer status from each node
for node in 192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21 192.168.1.22; do
  echo "=== Node: $node ==="
  talosctl get kubespanpeerstatus --nodes $node
  echo ""
done
```

Every node should see all other nodes as peers with state "up."

## Alternative Strategy: All Nodes at Once

If you are comfortable with a brief potential disruption, you can enable KubeSpan on all nodes simultaneously:

```bash
# Enable on all nodes at once
talosctl patch machineconfig \
  --patch @kubespan-config.yaml \
  --nodes 192.168.1.10,192.168.1.11,192.168.1.12,192.168.1.20,192.168.1.21,192.168.1.22
```

This is faster but riskier. If something goes wrong, it affects all nodes at once. Use this approach only for non-production clusters or during maintenance windows.

## Post-Migration Validation

After the migration is complete, run a thorough validation:

```bash
# Check all nodes are Ready
kubectl get nodes

# Check all system pods are Running
kubectl get pods -n kube-system

# Verify KubeSpan on every node
talosctl get kubespanpeerstatus --nodes 192.168.1.10

# Run cross-node pod connectivity tests
kubectl run test-a --image=busybox \
  --overrides='{"spec":{"nodeName":"node-1"}}' \
  --restart=Never -- sleep 3600

kubectl run test-b --image=busybox \
  --overrides='{"spec":{"nodeName":"node-2"}}' \
  --restart=Never -- sleep 3600

TEST_B_IP=$(kubectl get pod test-b -o jsonpath='{.status.podIP}')
kubectl exec test-a -- ping -c 5 $TEST_B_IP

# Clean up test pods
kubectl delete pod test-a test-b
```

## Rollback Plan

If something goes wrong during migration, you can disable KubeSpan on affected nodes:

```yaml
# rollback-kubespan.yaml
machine:
  network:
    kubespan:
      enabled: false
```

```bash
# Disable KubeSpan on a problematic node
talosctl patch machineconfig \
  --patch @rollback-kubespan.yaml \
  --nodes <problematic-node-ip>
```

The node will revert to using regular networking. Since KubeSpan nodes can communicate with non-KubeSpan nodes through regular routes, rolling back individual nodes does not break the cluster.

## Updating Applications After Migration

After KubeSpan is running, your applications should not need any changes. Kubernetes services, DNS, and pod networking all work the same way. However, there are a few things to check:

- Network policies: If you have network policies, they continue to work as before. KubeSpan operates at a lower level than network policies.
- Service mesh: If you run Istio or Linkerd, verify that the mesh traffic still flows correctly.
- Metrics and monitoring: Check that your monitoring can still scrape metrics from all nodes.

```bash
# Verify Prometheus can scrape all targets
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Open http://localhost:9090/targets and check for any down targets
```

Migrating to KubeSpan is a low-risk operation when done incrementally. The key is to enable it one node at a time, verify after each change, and have a rollback plan ready. Once complete, you get encrypted node-to-node traffic with minimal operational overhead, and the foundation for stretching your cluster across multiple networks in the future.
