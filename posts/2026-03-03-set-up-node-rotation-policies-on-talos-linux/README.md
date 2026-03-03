# How to Set Up Node Rotation Policies on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Node Rotation, Kubernetes, Infrastructure, Security, Cluster Management

Description: Learn how to implement node rotation policies on Talos Linux to improve security posture, reduce configuration drift, and keep your cluster infrastructure fresh.

---

Node rotation is the practice of periodically replacing cluster nodes with fresh ones instead of maintaining the same machines indefinitely. Think of it like changing the oil in your car. You could technically run the engine forever without changing it, but eventually something will break. Fresh nodes mean a clean state, up-to-date configurations, and reduced risk of accumulated issues.

Talos Linux is particularly well-suited for node rotation because its immutable design means that provisioning a fresh node produces an identical result every time. There is no accumulated state from years of patches and configuration changes.

## Why Rotate Nodes?

There are several strong reasons to implement node rotation:

**Security** - Long-running nodes accumulate risk. Even with Talos Linux's immutable OS, container images, cached data, and temporary files can harbor issues. Fresh nodes start clean.

**Drift prevention** - Over time, even well-managed nodes can diverge from their intended configuration. Rotation eliminates drift by definition.

**Infrastructure validation** - Regular rotation continuously tests your provisioning pipeline. If you can successfully rotate nodes every week, you know your infrastructure-as-code actually works.

**Hardware health** - In bare-metal environments, rotation can help identify failing hardware by regularly exercising the provisioning process on different machines.

## Defining a Rotation Policy

Start by defining how often nodes should be rotated and what triggers rotation.

```yaml
# node-rotation-policy.yaml
policy:
  name: "standard-rotation"
  version: "1.0"

  schedules:
    worker_nodes:
      max_age_days: 30
      rotation_window: "weekly maintenance window"
      batch_size: "25% of workers"
      strategy: "replace"  # replace (add new, remove old) vs rebuild (remove, add)

    control_plane_nodes:
      max_age_days: 90
      rotation_window: "monthly maintenance window"
      batch_size: 1
      strategy: "replace"

  triggers:
    - type: "age"
      threshold_days: 30
    - type: "version_behind"
      threshold_versions: 2
    - type: "security_advisory"
      severity: "critical"

  exceptions:
    - "Do not rotate during blackout periods"
    - "Control plane requires manual approval"
    - "Minimum 3 healthy nodes must remain at all times"
```

## Implementing Rotation for Worker Nodes

The basic process for rotating a worker node is: provision a new node, join it to the cluster, drain and remove the old node.

### Step 1: Generate Configuration for the New Node

```bash
# Generate a machine configuration for the new worker
talosctl gen config my-cluster https://<api-endpoint>:6443 \
    --output-types worker \
    --output /tmp/new-worker.yaml

# Or if using an existing config, apply it to the new node
talosctl apply-config \
    --nodes <new-node-ip> \
    --file worker.yaml \
    --insecure
```

### Step 2: Wait for the New Node to Join

```bash
# Watch for the new node to appear
kubectl get nodes -w

# Verify the new node is healthy
kubectl wait --for=condition=Ready node/<new-node-name> --timeout=600s

# Verify the node has the correct labels and taints
kubectl describe node <new-node-name>
```

### Step 3: Drain and Remove the Old Node

```bash
# Cordon the old node to stop new scheduling
kubectl cordon <old-node-name>

# Drain all workloads from the old node
kubectl drain <old-node-name> \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --timeout=600s

# Remove the old node from the cluster
kubectl delete node <old-node-name>

# Reset the old node
talosctl reset -n <old-node-ip> --graceful
```

## Automating Worker Node Rotation

Here is a script that automates the worker rotation process:

```bash
#!/bin/bash
# rotate-workers.sh - Automated worker node rotation

set -euo pipefail

MAX_AGE_DAYS=30
CLUSTER_NAME="my-cluster"
WORKER_CONFIG="/etc/talos/worker.yaml"
API_ENDPOINT="https://10.0.0.1:6443"

# Get nodes and their creation timestamps
get_old_nodes() {
    kubectl get nodes -l '!node-role.kubernetes.io/control-plane' \
        -o json | jq -r --argjson max_age "$MAX_AGE_DAYS" \
        '.items[] |
        select((.metadata.creationTimestamp | fromdateiso8601) < (now - ($max_age * 86400))) |
        "\(.metadata.name) \(.status.addresses[] | select(.type=="InternalIP") | .address)"'
}

# Rotate a single node
rotate_node() {
    local old_name=$1
    local old_ip=$2

    echo "Rotating node: $old_name ($old_ip)"
    echo "Node age exceeds $MAX_AGE_DAYS days policy"

    # Provision the replacement node (platform-specific)
    # This example assumes you have a provisioning script
    echo "Provisioning replacement node..."
    NEW_IP=$(./provision-new-worker.sh)

    # Apply Talos config to the new node
    talosctl apply-config \
        --nodes "$NEW_IP" \
        --file "$WORKER_CONFIG" \
        --insecure

    # Wait for the new node to join
    echo "Waiting for new node to join the cluster..."
    sleep 60
    NEW_NAME=$(kubectl get nodes -o wide --no-headers | grep "$NEW_IP" | awk '{print $1}')
    kubectl wait --for=condition=Ready "node/$NEW_NAME" --timeout=600s

    # Drain and remove the old node
    echo "Draining old node $old_name..."
    kubectl drain "$old_name" \
        --ignore-daemonsets \
        --delete-emptydir-data \
        --timeout=600s

    kubectl delete node "$old_name"
    talosctl reset -n "$old_ip" --graceful

    echo "Node rotation complete: $old_name replaced by $NEW_NAME"
}

# Main rotation loop
OLD_NODES=$(get_old_nodes)
if [ -z "$OLD_NODES" ]; then
    echo "No nodes require rotation"
    exit 0
fi

echo "$OLD_NODES" | while read -r name ip; do
    rotate_node "$name" "$ip"
    sleep 120  # Wait between rotations
done
```

## Control Plane Node Rotation

Control plane rotation requires extra care because of etcd. You must ensure etcd quorum is maintained throughout the process.

```bash
#!/bin/bash
# rotate-control-plane.sh

CP_NODE_NAME="control-plane-3"
CP_NODE_IP="10.0.0.3"
NEW_CP_IP="10.0.0.4"
CP_CONFIG="/etc/talos/controlplane.yaml"

# Step 1: Verify etcd health and quorum
echo "Checking etcd health..."
talosctl etcd status -n 10.0.0.1
talosctl etcd members -n 10.0.0.1

# Step 2: Add the new control plane node
echo "Provisioning new control plane node..."
talosctl apply-config \
    --nodes "$NEW_CP_IP" \
    --file "$CP_CONFIG" \
    --insecure

# Step 3: Wait for the new node to join etcd
echo "Waiting for new node to join etcd..."
sleep 120
talosctl etcd members -n 10.0.0.1

# Verify we now have 4 etcd members (temporary)
MEMBER_COUNT=$(talosctl etcd members -n 10.0.0.1 -o json | jq '. | length')
echo "etcd members: $MEMBER_COUNT"

# Step 4: Remove the old control plane node from etcd
echo "Removing old node from etcd..."
talosctl etcd remove-member "$CP_NODE_NAME" -n 10.0.0.1

# Step 5: Drain and remove the old node from Kubernetes
kubectl drain "$CP_NODE_NAME" --ignore-daemonsets --delete-emptydir-data --timeout=300s
kubectl delete node "$CP_NODE_NAME"

# Step 6: Reset the old node
talosctl reset -n "$CP_NODE_IP" --graceful

# Step 7: Verify etcd is healthy with 3 members again
talosctl etcd status -n 10.0.0.1
talosctl etcd members -n 10.0.0.1

echo "Control plane rotation complete"
```

## Tracking Node Age

To enforce rotation policies, you need to track node age. Kubernetes stores the creation timestamp:

```bash
# Get node ages
kubectl get nodes -o custom-columns=\
"NAME:.metadata.name,\
AGE:.metadata.creationTimestamp,\
VERSION:.status.nodeInfo.kubeletVersion"

# Find nodes older than 30 days
kubectl get nodes -o json | jq -r \
    '.items[] |
    select((.metadata.creationTimestamp | fromdateiso8601) < (now - 2592000)) |
    "\(.metadata.name): created \(.metadata.creationTimestamp)"'
```

## Using Labels to Track Rotation State

Apply labels to nodes to track their rotation state:

```bash
# Label a node with its rotation group
kubectl label node <node-name> rotation-group=batch-1

# Label a node as pending rotation
kubectl label node <node-name> rotation-status=pending

# After rotation, the old node is gone and the new node gets:
kubectl label node <new-node-name> rotation-status=current
kubectl label node <new-node-name> rotation-date=$(date +%Y-%m-%d)
```

## Handling Stateful Workloads

Stateful workloads require special attention during node rotation. Pods backed by persistent volumes need their data available on the new node.

```bash
# Check for PVCs bound to the node being rotated
kubectl get pods --field-selector=spec.nodeName=<old-node> -o json | \
    jq -r '.items[] | select(.spec.volumes[]?.persistentVolumeClaim) |
    "\(.metadata.namespace)/\(.metadata.name)"'
```

For workloads using local persistent volumes, you need to either migrate the data before rotation or use a storage solution that supports replication across nodes.

## Monitoring Rotation Health

Track the health of your rotation process with metrics:

```yaml
# rotation-monitoring.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: node-rotation-alerts
spec:
  groups:
  - name: node-rotation
    rules:
    - alert: NodeTooOld
      expr: |
        (time() - kube_node_created) / 86400 > 45
      for: 24h
      labels:
        severity: warning
      annotations:
        summary: "Node {{ $labels.node }} is older than 45 days"
```

## Conclusion

Node rotation policies keep your Talos Linux cluster infrastructure fresh and your security posture strong. The immutable nature of Talos makes rotation straightforward because new nodes come up in an identical state every time. Start with worker nodes on a 30-day rotation cycle, and add control plane rotation on a longer 90-day cycle. Automate the process, track node age with labels, and handle stateful workloads carefully. Over time, node rotation becomes a routine operation that continuously validates your provisioning pipeline.
