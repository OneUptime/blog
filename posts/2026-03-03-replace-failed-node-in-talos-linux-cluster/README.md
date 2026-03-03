# How to Replace a Failed Node in a Talos Linux Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Node Replacement, Cluster Recovery, High Availability

Description: A step-by-step guide to replacing a failed node in a Talos Linux cluster, covering both worker and control plane node replacement scenarios.

---

When a node in your Talos Linux cluster fails and cannot be recovered, you need to replace it. The process differs depending on whether the failed node was a worker or a control plane node. This guide covers both scenarios in detail so you can get your cluster back to full health quickly.

## Identifying a Failed Node

Before jumping into replacement, confirm the node is truly failed. Sometimes a node just needs a reboot or has a transient network issue.

```bash
# Check the status of all nodes
kubectl get nodes

# Look for nodes in NotReady state
kubectl get nodes | grep NotReady
```

If a node shows as NotReady, try reaching it directly:

```bash
# Attempt to connect to the potentially failed node
talosctl health --nodes <node-ip>
```

If you get connection timeouts and the node is physically unreachable (hardware failure, disk corruption, etc.), it is time to replace it.

## Replacing a Failed Worker Node

Worker node replacement is simpler because worker nodes do not run etcd or the Kubernetes API server. The main concern is making sure workloads are rescheduled properly.

### Step 1: Remove the Failed Worker from Kubernetes

Since the node is already down, pods that were running on it are stuck in Terminating state. Remove the node object:

```bash
# Force delete the failed node from the cluster
kubectl delete node <failed-worker-name>
```

Kubernetes will automatically reschedule pods that had replicas specified through Deployments or StatefulSets.

### Step 2: Provision the New Worker

Boot the new machine with the Talos Linux image. You can use the same machine configuration you used for the original worker, or generate a new one:

```bash
# Apply the worker configuration to the new machine
talosctl apply-config --insecure --nodes <new-worker-ip> --file worker.yaml
```

The `--insecure` flag is needed because the new node does not yet have TLS credentials.

### Step 3: Bootstrap and Verify

The new worker will automatically join the cluster after configuration is applied. Watch for it to appear:

```bash
# Wait for the new node to join and become Ready
kubectl get nodes -w
```

It should appear within a few minutes. Once it shows as Ready, the replacement is complete.

## Replacing a Failed Control Plane Node

Control plane replacement is more involved because you need to handle etcd membership carefully.

### Step 1: Check etcd Quorum

With one control plane node down, verify that etcd still has quorum:

```bash
# Check etcd health from a surviving control plane node
talosctl etcd members --nodes <healthy-cp-ip>
```

In a three-node control plane, losing one node still leaves you with quorum (2 out of 3). But you need to act before another node fails.

### Step 2: Remove the Failed Node from etcd

The failed node cannot gracefully leave etcd because it is offline. You need to force-remove it:

```bash
# List etcd members to find the ID of the failed node
talosctl etcd members --nodes <healthy-cp-ip>

# Force remove the failed member using its member ID
talosctl etcd remove-member <member-id> --nodes <healthy-cp-ip>
```

Verify the removal:

```bash
# Confirm the failed member is no longer in the list
talosctl etcd members --nodes <healthy-cp-ip>
```

### Step 3: Remove the Node from Kubernetes

```bash
# Delete the failed node object
kubectl delete node <failed-cp-name>
```

### Step 4: Provision the Replacement Control Plane Node

Boot a new machine with the Talos Linux image and apply the control plane configuration:

```bash
# Apply control plane config to the new machine
talosctl apply-config --insecure --nodes <new-cp-ip> --file controlplane.yaml
```

Make sure the configuration includes the correct cluster endpoint and certificates. The new node will join the existing etcd cluster automatically since it is configured as a control plane node joining an existing cluster, not bootstrapping a new one.

### Step 5: Verify etcd Membership

Once the new node boots, check that it has joined etcd:

```bash
# Verify the new node appears as an etcd member
talosctl etcd members --nodes <healthy-cp-ip>
```

You should see three members again, with the new node's IP replacing the old one.

### Step 6: Update Configuration

Update your talosctl endpoints to include the new node:

```bash
# Update talosctl endpoints with the new IP
talosctl config endpoints <cp-ip-1> <cp-ip-2> <new-cp-ip>
```

Also update any load balancer configurations that route traffic to the Kubernetes API server.

## Handling Machine Configuration

When replacing a node, you need the correct machine configuration. If you have the original configuration files, use those. If not, you can generate new ones, but you need to match the existing cluster's settings.

If you still have access to a running control plane node, you can retrieve the machine configuration:

```bash
# Get the current machine config from a running node
talosctl get machineconfig -o yaml --nodes <healthy-cp-ip> > current-config.yaml
```

For worker nodes, you can derive the configuration from the cluster's secrets:

```bash
# Generate configs using existing cluster secrets
talosctl gen config my-cluster https://<cluster-endpoint>:6443 \
    --with-secrets secrets.yaml
```

The `secrets.yaml` file contains the cluster's TLS certificates and keys. If you saved this file when you initially created the cluster, you can regenerate configurations that will be compatible with the existing cluster.

## Tips for Faster Recovery

Keep spare machine configurations ready. After your initial cluster setup, save the generated configurations in a secure location:

```bash
# Save these files securely after initial cluster creation
# - controlplane.yaml
# - worker.yaml
# - secrets.yaml
# - talosconfig
```

Consider using a configuration management system or GitOps workflow to store these configurations. That way, when a node fails, you can quickly grab the right configuration and apply it.

Another tip is to maintain hardware spares or cloud instance templates. Having a pre-configured machine image with Talos Linux installed means you only need to apply the configuration rather than installing the OS from scratch.

## Verifying the Replacement

After replacing a node, run a comprehensive health check:

```bash
# Full cluster health check
talosctl health --nodes <any-cp-ip>

# Check all nodes are Ready
kubectl get nodes -o wide

# Verify all system pods are healthy
kubectl get pods -n kube-system

# Check etcd is fully healthy (for control plane replacements)
talosctl etcd members --nodes <any-cp-ip>
```

If everything checks out, your cluster is back to full capacity.

## What About StatefulSets and Persistent Volumes?

If the failed node was running StatefulSet pods with persistent volumes, those volumes may need special attention. Local persistent volumes are tied to specific nodes, so pods using them will not reschedule until the storage issue is resolved.

For cloud environments with network-attached storage, the volumes can typically be detached from the failed node and reattached to the new one. For on-premises clusters using local storage, you may need to restore from backups.

## Conclusion

Replacing a failed node in Talos Linux is a well-defined process. For worker nodes, it is mostly about cleaning up the old node object and applying configuration to the new machine. For control plane nodes, the extra steps around etcd membership are critical. The key to smooth replacements is preparation: save your configurations, maintain backups, and test your recovery procedures before you actually need them.
