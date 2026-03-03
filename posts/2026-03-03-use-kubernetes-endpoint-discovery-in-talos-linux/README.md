# How to Use Kubernetes Endpoint Discovery in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Endpoint Discovery, Service Discovery, Networking

Description: Learn how to leverage Kubernetes-based endpoint discovery in Talos Linux as an alternative or complement to the external discovery service for node registration.

---

Talos Linux supports two discovery registries: the external service registry (which communicates with a discovery endpoint) and the Kubernetes registry (which stores discovery data directly in the Kubernetes cluster). The Kubernetes registry is often overlooked, but it provides a self-contained discovery mechanism that does not depend on any external service. This guide explains how to use Kubernetes endpoint discovery effectively.

## How the Kubernetes Registry Works

The Kubernetes discovery registry stores node information as annotations on Kubernetes Node objects. When a Talos node registers itself, it writes its discovery data (endpoints, capabilities, identity) to its own Node object's annotations. Other nodes read these annotations to discover cluster members.

This approach has a key advantage: it does not require any external infrastructure. The Kubernetes API server, which is already part of your cluster, acts as the discovery backend.

The trade-off is that the Kubernetes registry only works after Kubernetes is running. During initial cluster bootstrap, before the API server is available, the Kubernetes registry cannot help nodes find each other. That is why Talos uses the service registry for initial bootstrap and the Kubernetes registry as an ongoing complement.

## Viewing Kubernetes Discovery Data

You can inspect the discovery data stored in Kubernetes:

```bash
# View node annotations related to discovery
kubectl get nodes -o json | jq '.items[] | {name: .metadata.name, discovery: [.metadata.annotations | to_entries[] | select(.key | startswith("cluster.talos.dev"))]}'
```

The annotations contain encrypted discovery information that other Talos nodes can decrypt using the cluster secrets. The Kubernetes API server does not know the contents of these annotations.

You can also check the discovery from the Talos side:

```bash
# View discovered members (includes data from both registries)
talosctl get discoveredmembers --nodes <node-ip>
```

## Enabling the Kubernetes Registry

The Kubernetes registry is enabled by default. Verify it:

```yaml
cluster:
  discovery:
    enabled: true
    registries:
      kubernetes:
        disabled: false
```

If it was disabled, enable it:

```bash
talosctl patch machineconfig --patch '{"cluster": {"discovery": {"registries": {"kubernetes": {"disabled": false}}}}}' \
  --nodes <node-ip>
```

## Using Only the Kubernetes Registry

If you want to avoid any external discovery service and rely solely on the Kubernetes registry, disable the service registry:

```yaml
# kubernetes-only-discovery.yaml
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: true
      kubernetes:
        disabled: false
```

Apply to all nodes:

```bash
talosctl patch machineconfig \
  --patch @kubernetes-only-discovery.yaml \
  --nodes <all-node-ips>
```

There are important implications to this choice:

1. Initial cluster bootstrap does not benefit from service-based discovery. You need to make sure your cluster can bootstrap without it.
2. KubeSpan will use the Kubernetes registry for peer discovery once Kubernetes is running.
3. Adding new nodes to the cluster requires the API server to be available.

## Bootstrap Considerations

When using only the Kubernetes registry, the initial cluster bootstrap relies on the control plane endpoint specified in the machine configuration:

```yaml
cluster:
  controlPlane:
    endpoint: https://10.0.0.10:6443
```

The first control plane node is bootstrapped explicitly:

```bash
# Bootstrap the first node
talosctl bootstrap --nodes 10.0.0.10
```

Subsequent control plane nodes find the cluster through the control plane endpoint. Once the API server is running, the Kubernetes registry kicks in for ongoing discovery:

```bash
# Apply config to second control plane node
talosctl apply-config --insecure \
  --nodes 10.0.0.11 \
  --file controlplane.yaml

# The node connects to the API server at 10.0.0.10:6443
# and begins participating in Kubernetes-based discovery
```

Worker nodes similarly use the control plane endpoint for initial connection:

```bash
talosctl apply-config --insecure \
  --nodes 10.0.0.20 \
  --file worker.yaml
```

## How Kubernetes Discovery Interacts with KubeSpan

KubeSpan uses discovered members to set up WireGuard peers. When using the Kubernetes registry, KubeSpan gets its peer information from the Node annotations:

```bash
# Check KubeSpan peer status (sourced from Kubernetes discovery)
talosctl get kubespanpeerstatus --nodes <node-ip>

# Compare with discovered members
talosctl get discoveredmembers --nodes <node-ip>
```

The process looks like this:
1. Node A writes its endpoint information to its Node annotation
2. Node B reads Node A's annotation through the Kubernetes API
3. Node B extracts the endpoint and KubeSpan identity
4. Node B establishes a WireGuard tunnel to Node A

This works well for clusters where all nodes can reach the API server, but it adds latency to peer discovery compared to the service registry (because nodes must poll the API server for changes).

## Performance and Scaling

The Kubernetes registry puts some load on the API server because nodes periodically update their annotations and read other nodes' annotations. For small to medium clusters (under 100 nodes), this is negligible.

For larger clusters, consider the impact:

```bash
# Check API server load
kubectl top pod -n kube-system -l component=kube-apiserver

# Monitor API server request rates
kubectl get --raw /metrics | grep apiserver_request_total
```

Each node makes approximately:
- 1 write per refresh interval (to update its own annotation)
- 1 read per refresh interval (to fetch all node annotations)

The total load is O(N) for N nodes, which is manageable for most clusters.

## Monitoring Kubernetes Discovery Health

Monitor the health of Kubernetes-based discovery:

```bash
#!/bin/bash
# Check Kubernetes discovery health

NODE_IP="10.0.0.10"

# Check discovered members
MEMBER_COUNT=$(talosctl get discoveredmembers --nodes $NODE_IP -o json | jq 'length')
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)

echo "Discovered members: $MEMBER_COUNT"
echo "Kubernetes nodes: $NODE_COUNT"

if [ "$MEMBER_COUNT" -lt "$NODE_COUNT" ]; then
  echo "WARNING: Not all nodes are discovered"
fi
```

Check that discovery annotations are being updated:

```bash
# View the timestamp of discovery annotations
kubectl get nodes -o json | jq '.items[] | {
  name: .metadata.name,
  annotations: [.metadata.annotations | to_entries[] | select(.key | startswith("cluster.talos.dev")) | .key] | length
}'
```

## Combining Both Registries

The most robust configuration uses both registries:

```yaml
cluster:
  discovery:
    enabled: true
    registries:
      kubernetes:
        disabled: false
      service:
        disabled: false
        endpoint: https://discovery.talos.dev/
```

In this setup:
- The service registry handles initial bootstrap and provides fast peer discovery
- The Kubernetes registry provides redundancy if the service registry is unreachable
- Nodes merge results from both registries

This dual-registry approach means that even if the external discovery service goes down, nodes can still discover each other through the Kubernetes API. And if the Kubernetes API is temporarily unavailable (during a control plane upgrade, for example), the service registry keeps discovery working.

## Troubleshooting

When Kubernetes discovery is not working:

```bash
# Check if the Kubernetes API is reachable from the node
talosctl logs controller-runtime --nodes <node-ip> | grep -i "kube.*discover\|annotation"

# Verify the node's own annotations exist
kubectl get node <node-name> -o yaml | grep -A2 "cluster.talos.dev"

# Check RBAC - the node needs permission to read/write annotations
kubectl auth can-i update nodes --as system:node:<node-name>
```

If annotations are missing, the node may not have the right permissions, or the annotation update is failing silently. Check the controller logs for specific errors.

The Kubernetes endpoint discovery registry is a powerful feature that makes Talos clusters more self-contained and resilient. Whether you use it as your sole discovery mechanism or as a complement to the service registry, it reduces your dependency on external infrastructure and provides a reliable fallback for node discovery.
