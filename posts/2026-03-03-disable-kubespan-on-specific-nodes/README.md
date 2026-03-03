# How to Disable KubeSpan on Specific Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, KubeSpan, Configuration, WireGuard, Node Management

Description: Learn how to selectively disable KubeSpan on specific nodes in a Talos Linux cluster while keeping it enabled on the rest of the cluster.

---

There are situations where you want KubeSpan running on most of your Talos Linux cluster but need to disable it on specific nodes. Maybe a node has a dedicated high-speed link to the rest of the cluster and WireGuard encryption would reduce throughput. Maybe a node is used for network-sensitive workloads where the extra latency from encryption is unacceptable. Or maybe you are troubleshooting and want to isolate a node from the KubeSpan mesh. This guide covers how to disable KubeSpan on individual nodes and what to consider when doing so.

## When to Disable KubeSpan on Specific Nodes

Before disabling KubeSpan selectively, consider whether it is actually necessary. KubeSpan's WireGuard encryption adds minimal overhead on modern hardware, typically less than 5% throughput reduction and well under a millisecond of latency. However, there are legitimate reasons to disable it on specific nodes:

- Nodes running on the same LAN where encryption is handled at a different layer
- Dedicated storage nodes where you need maximum throughput between specific node pairs
- Nodes running network testing or benchmarking workloads
- Temporary disabling for troubleshooting connectivity issues
- Nodes with limited CPU that cannot handle encryption overhead (rare with modern processors)

## How to Disable KubeSpan on a Single Node

Each Talos node has its own machine configuration, and KubeSpan can be enabled or disabled per node. To disable KubeSpan on a specific node, patch its machine config:

```yaml
# disable-kubespan.yaml
machine:
  network:
    kubespan:
      enabled: false
```

Apply the patch to the specific node:

```bash
# Disable KubeSpan on a specific worker node
talosctl patch machineconfig --patch @disable-kubespan.yaml \
  --nodes 192.168.1.25
```

After applying, the node will:
1. Tear down its WireGuard interface
2. Remove KubeSpan routes
3. Stop advertising its endpoints through the discovery service
4. Other nodes will mark this peer as removed

You can verify the change:

```bash
# Verify KubeSpan is disabled on the node
talosctl get links --nodes 192.168.1.25 | grep kubespan
# Should return nothing

# Check that other nodes no longer see this as a KubeSpan peer
talosctl get kubespanpeerstatus --nodes 192.168.1.10
# The disabled node should not appear in the peer list
```

## Impact on Cluster Connectivity

When you disable KubeSpan on a node, that node must be able to reach other cluster nodes through regular network routing. This is important: if KubeSpan was the only network path between this node and the rest of the cluster (for example, in a multi-site setup), disabling it will completely isolate the node.

For nodes on the same LAN as the rest of the cluster, disabling KubeSpan is straightforward because direct network connectivity already exists. For nodes in different network segments, you need to ensure that regular routing works before disabling KubeSpan.

```bash
# Before disabling KubeSpan, verify the node can reach the control plane
# through regular networking
talosctl health --nodes 192.168.1.25

# Check regular network routes
talosctl get routes --nodes 192.168.1.25
```

## Pod-to-Pod Traffic Considerations

If you had `advertiseKubernetesNetworks: true` on the cluster, KubeSpan was routing pod traffic between nodes through WireGuard tunnels. When KubeSpan is disabled on a node, pod traffic to and from that node must flow through the regular CNI routing.

This means the CNI must have a route to the pod subnet on the disabled node. With most CNIs (Cilium, Calico, Flannel), this happens automatically because they maintain their own routing tables. But you should verify:

```bash
# Check that pods on the disabled node can reach pods on other nodes
kubectl run test-disabled --image=busybox \
  --overrides='{"spec":{"nodeName":"disabled-node"}}' \
  --rm -it --restart=Never -- ping -c 3 <pod-ip-on-another-node>

# And vice versa
kubectl run test-enabled --image=busybox \
  --overrides='{"spec":{"nodeName":"enabled-node"}}' \
  --rm -it --restart=Never -- ping -c 3 <pod-ip-on-disabled-node>
```

## Disabling KubeSpan During Initial Configuration

If you know certain nodes should not have KubeSpan from the start, generate separate configurations:

```bash
# Generate base config with KubeSpan enabled
talosctl gen config my-cluster https://10.0.0.10:6443 --with-kubespan

# For nodes that should not have KubeSpan, create a separate patch
cat > no-kubespan-patch.yaml <<EOF
machine:
  network:
    kubespan:
      enabled: false
EOF

# Apply different configs to different nodes
talosctl apply-config --insecure \
  --nodes 192.168.1.10,192.168.1.11 \
  --file controlplane.yaml

talosctl apply-config --insecure \
  --nodes 192.168.1.20,192.168.1.21 \
  --file worker.yaml

# Apply config without KubeSpan to specific nodes
talosctl apply-config --insecure \
  --nodes 192.168.1.25 \
  --file worker.yaml \
  --config-patch @no-kubespan-patch.yaml
```

## Handling Mixed KubeSpan Clusters

A cluster with mixed KubeSpan nodes (some enabled, some disabled) works fine as long as network connectivity exists between all nodes through regular routing. However, there are nuances:

**Traffic between two KubeSpan-enabled nodes** flows through the WireGuard tunnel and is encrypted.

**Traffic between a KubeSpan-enabled node and a disabled node** flows through regular routing and is NOT encrypted by KubeSpan (the CNI may provide its own encryption).

**Traffic between two KubeSpan-disabled nodes** flows through regular routing without KubeSpan encryption.

If you need encryption on all traffic, even for nodes without KubeSpan, consider using Cilium's WireGuard encryption feature as a complement:

```yaml
# Cilium WireGuard encryption for non-KubeSpan traffic
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-config
  namespace: kube-system
data:
  enable-wireguard: "true"
```

## Re-Enabling KubeSpan

To re-enable KubeSpan on a node where it was disabled:

```yaml
# enable-kubespan.yaml
machine:
  network:
    kubespan:
      enabled: true
```

```bash
talosctl patch machineconfig --patch @enable-kubespan.yaml \
  --nodes 192.168.1.25

# Verify KubeSpan is back up
talosctl get kubespanpeerstatus --nodes 192.168.1.25

# Check the WireGuard interface
talosctl get links --nodes 192.168.1.25 | grep kubespan
```

The node will re-register with the discovery service and establish WireGuard tunnels to all other KubeSpan-enabled peers. This typically takes less than a minute.

## Automation with Labels

If you manage a large cluster, you can use a systematic approach to track which nodes have KubeSpan disabled:

```bash
# Label nodes without KubeSpan
kubectl label node storage-node-1 kubespan=disabled
kubectl label node storage-node-2 kubespan=disabled

# Query nodes by KubeSpan status
kubectl get nodes -l kubespan=disabled
```

This makes it easy to see at a glance which nodes are running without KubeSpan and helps with documentation and auditing.

## Monitoring Mixed Clusters

In a mixed cluster, your monitoring should account for both KubeSpan and non-KubeSpan nodes:

```bash
#!/bin/bash
# Check KubeSpan status on all enabled nodes
KUBESPAN_NODES=$(kubectl get nodes -l 'kubespan!=disabled' -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}')

for node in $KUBESPAN_NODES; do
  echo "Checking KubeSpan on $node"
  talosctl get kubespanpeerstatus --nodes "$node" -o json | \
    jq '{node: "'$node'", peers_up: [.[] | select(.spec.state == "up")] | length, peers_down: [.[] | select(.spec.state != "up")] | length}'
done

# Check general connectivity for non-KubeSpan nodes
NO_KUBESPAN_NODES=$(kubectl get nodes -l kubespan=disabled -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}')

for node in $NO_KUBESPAN_NODES; do
  echo "Checking connectivity on non-KubeSpan node $node"
  talosctl health --nodes "$node" 2>&1 | head -5
done
```

Disabling KubeSpan on specific nodes is a straightforward configuration change, but the implications depend on your network topology. On a single LAN, it is simple and safe. Across network boundaries, you need to make sure regular routing covers the gap. Think through the connectivity requirements before making changes, and always verify with actual traffic tests after applying the configuration.
