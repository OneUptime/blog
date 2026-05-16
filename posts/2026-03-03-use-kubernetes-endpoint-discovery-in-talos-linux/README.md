# How to Use Kubernetes Endpoint Discovery in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Endpoint Discovery, Service Discovery, Networking

Description: Learn how to leverage Kubernetes-based endpoint discovery in Talos Linux as an alternative or complement to the external discovery service for node registration.

---

Talos Linux supports two discovery registries: the external service registry (which communicates with a discovery endpoint) and the Kubernetes registry (which stores discovery data directly in the Kubernetes cluster). The Kubernetes registry is deprecated in current Talos releases and disabled by default because Kubernetes 1.32 and later restrict Node read access in a way that prevents it from working in the default configuration. For older clusters or environments that explicitly enable it, it can provide a self-contained discovery mechanism that does not depend on an external discovery service. This guide explains how to use Kubernetes endpoint discovery effectively when that trade-off is acceptable.

## How the Kubernetes Registry Works

The Kubernetes discovery registry stores node information as annotations on Kubernetes Node objects. When a Talos node registers itself, it writes its discovery data (endpoints, capabilities, identity) to its own Node object's annotations. Other nodes read these annotations to discover cluster members.

This approach has a key advantage: it does not require an external discovery service. The Kubernetes API server and etcd, which are already part of your cluster, act as the discovery backend.

The trade-off is that the Kubernetes registry only works after Kubernetes is running. During initial cluster bootstrap, before the API server is available, the Kubernetes registry cannot help nodes find each other. Current Talos releases use the service registry by default and leave the Kubernetes registry disabled unless you explicitly enable it.

## Viewing Kubernetes Discovery Data

You can inspect the discovery data stored in Kubernetes:

```bash
# View node annotations related to discovery

kubectl get nodes -o json | jq '.items[] | {name: .metadata.name, discovery: [(.metadata.annotations // {}) | to_entries[] | select(.key | startswith("cluster.talos.dev") or startswith("networking.talos.dev"))]}'
```

The annotations include Talos discovery metadata such as the node ID, assigned prefixes, and node addresses.

You can also check the discovery from the Talos side:

```bash
# View confirmed cluster members
talosctl get members --nodes <node-ip>

# View affiliates from each raw registry source
talosctl get affiliates --namespace=cluster-raw --nodes <node-ip>
```

## Enabling the Kubernetes Registry

The Kubernetes registry is disabled by default in current Talos releases. Enable it only if your Kubernetes version and API server authorization configuration support it:

```yaml
cluster:
  discovery:
    enabled: true
    registries:
      kubernetes:
        disabled: false
```

Apply the change to a running node with:

```bash
talosctl patch machineconfig --patch '{"cluster": {"discovery": {"registries": {"kubernetes": {"disabled": false}}}}}' \
  --nodes <node-ip>
```

## Using Only the Kubernetes Registry

If you want to avoid any external discovery service and rely solely on the Kubernetes registry, disable the service registry only after confirming that the Kubernetes registry works with your Kubernetes version and API server authorization settings:

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
2. KubeSpan can use the Kubernetes registry for peer discovery once Kubernetes is running, but the service registry is the recommended default for KubeSpan.
3. Adding new nodes to the cluster requires the API server to be available.
4. Kubernetes 1.32 and later do not support this registry in the default configuration because of the `AuthorizeNodeWithSelectors` feature gate.

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
# Check KubeSpan peer status
talosctl get kubespanpeerstatuses --nodes <node-ip>

# Compare with registry affiliates
talosctl get affiliates --namespace=cluster-raw --nodes <node-ip>
```

The process looks like this:
1. Node A writes its endpoint information to its Node annotation
2. Node B reads Node A's annotation through the Kubernetes API
3. Node B extracts the endpoint and KubeSpan identity
4. Node B establishes a WireGuard tunnel to Node A

This works for clusters where all nodes can reach the API server and the Kubernetes registry is compatible with the cluster's authorization settings.

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

The request count is roughly O(N) for N nodes, while the amount of data returned by each full-node read grows with cluster size.

## Monitoring Kubernetes Discovery Health

Monitor the health of Kubernetes-based discovery:

```bash
#!/bin/bash
# Check Kubernetes discovery health

NODE_IP="10.0.0.10"

# Check confirmed members
MEMBER_COUNT=$(talosctl get members --nodes $NODE_IP | awk 'NR > 1 {count++} END {print count+0}')
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)

echo "Discovered members: $MEMBER_COUNT"
echo "Kubernetes nodes: $NODE_COUNT"

if [ "$MEMBER_COUNT" -lt "$NODE_COUNT" ]; then
  echo "WARNING: Not all nodes are discovered"
fi
```

Check that discovery annotations are being updated:

```bash
# Count discovery annotations
kubectl get nodes -o json | jq '.items[] | {
  name: .metadata.name,
  annotations: [(.metadata.annotations // {}) | to_entries[] | select(.key | startswith("cluster.talos.dev") or startswith("networking.talos.dev")) | .key] | length
}'
```

## Combining Both Registries

If the Kubernetes registry is compatible with your cluster, you can enable both registries:

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
- The Kubernetes registry can provide redundancy if the service registry is unreachable, as long as the Kubernetes API remains available and the registry is supported by your Kubernetes version
- Nodes merge results from both registries

This dual-registry approach means that even if the external discovery service goes down, nodes can still discover each other through the Kubernetes API when the Kubernetes registry is working. And if the Kubernetes API is temporarily unavailable (during a control plane upgrade, for example), the service registry keeps discovery working.

## Troubleshooting

When Kubernetes discovery is not working:

```bash
# Check if the Kubernetes API is reachable from the node
talosctl logs controller-runtime --nodes <node-ip> | grep -i "kube.*discover\|annotation"

# Verify the node's own annotations exist
kubectl get node <node-name> -o yaml | grep -A2 "cluster.talos.dev"

# Check RBAC - the node needs permission to read/write annotations
kubectl auth can-i patch node <node-name> --as=system:node:<node-name> --as-group=system:nodes
```

If annotations are missing, the node may not have the right permissions, the Kubernetes registry may be disabled, or the annotation update may be failing. On Kubernetes 1.32 and later, the default `AuthorizeNodeWithSelectors` behavior prevents the Kubernetes registry from functioning correctly. Check the controller logs for specific errors.

The Kubernetes endpoint discovery registry can make older or specially configured Talos clusters more self-contained. In current Talos releases, the service registry remains the default and recommended registry, while the Kubernetes registry should be treated as a deprecated compatibility option.
