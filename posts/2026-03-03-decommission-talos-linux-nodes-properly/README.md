# How to Decommission Talos Linux Nodes Properly

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Decommissioning, Node Management, Kubernetes, Operations

Description: A complete guide to properly decommissioning Talos Linux nodes, including workload migration, data handling, cluster cleanup, and hardware recycling.

---

Decommissioning a node is a routine operation in any Kubernetes cluster. Hardware reaches end of life, capacity planning changes, or you simply need to shrink the cluster. But doing it improperly can lead to data loss, service disruptions, and orphaned resources that haunt your cluster for months. On Talos Linux, the decommissioning process is well-defined and predictable, but it still requires careful attention to order of operations.

This guide provides a thorough, step-by-step process for decommissioning Talos Linux nodes - covering everything from initial planning to final hardware disposal.

## Planning the Decommission

Before pulling any plugs, plan the decommission:

### Capacity Check

Make sure the remaining nodes can handle the workload:

```bash
# Check current resource utilization
kubectl top nodes

# Check resource requests across the cluster
kubectl get pods --all-namespaces -o json | jq '
  [.items[] | select(.spec.nodeName == "node-to-decommission") |
  .spec.containers[].resources.requests] |
  {
    cpu: [.[].cpu // "0"] | join(", "),
    memory: [.[].memory // "0"] | join(", ")
  }'

# Verify remaining nodes have enough capacity
kubectl describe nodes | grep -A 5 "Allocated resources"
```

### Identify Node-Specific Resources

Check for resources that are specifically tied to the node:

```bash
# Local persistent volumes
kubectl get pv -o json | jq '
  .items[] |
  select(.spec.nodeAffinity.required.nodeSelectorTerms[].matchExpressions[].values[] == "node-to-decommission") |
  {name: .metadata.name, capacity: .spec.capacity.storage, claim: .spec.claimRef.name}'

# Pods with node selectors or affinity rules targeting this node
kubectl get pods --all-namespaces -o json | jq '
  .items[] |
  select(.spec.nodeName == "node-to-decommission") |
  select(.spec.nodeSelector or .spec.affinity.nodeAffinity) |
  {namespace: .metadata.namespace, name: .metadata.name}'
```

### Communication

Notify your team about the decommission. For production nodes, schedule a maintenance window if workload disruption is possible.

## Step 1: Migrate Workloads

### Cordon the Node

Prevent new pods from being scheduled:

```bash
# Cordon the node
kubectl cordon node-to-decommission

# Verify the node is marked as unschedulable
kubectl get node node-to-decommission
# STATUS should show SchedulingDisabled
```

### Migrate Persistent Data

If the node has local persistent volumes, migrate the data before draining:

```bash
# For StatefulSet workloads using local storage,
# you may need to manually copy data to the new location

# Example: copying data from a local PV
# First, identify the pod and its volume
kubectl get pod my-stateful-pod-0 -o json | jq '.spec.volumes'

# Create a temporary pod to access the data
kubectl run data-mover --image=busybox --restart=Never \
  --overrides='{
    "spec": {
      "nodeSelector": {"kubernetes.io/hostname": "node-to-decommission"},
      "containers": [{
        "name": "data-mover",
        "image": "busybox",
        "command": ["sleep", "3600"],
        "volumeMounts": [{"name": "data", "mountPath": "/data"}]
      }],
      "volumes": [{"name": "data", "persistentVolumeClaim": {"claimName": "my-pvc"}}]
    }
  }'
```

### Drain the Node

```bash
# Drain all workloads
kubectl drain node-to-decommission \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=600s \
  --force

# Monitor pod rescheduling
kubectl get pods --all-namespaces -o wide --watch
```

The `--force` flag is needed for pods not managed by a controller (bare pods). The `--timeout=600s` gives enough time for graceful shutdown of complex applications.

## Step 2: Remove from Kubernetes

```bash
# Delete the Kubernetes node object
kubectl delete node node-to-decommission

# Verify it is gone
kubectl get nodes
```

## Step 3: Handle etcd (Control Plane Only)

For control plane nodes, remove the etcd member before the node goes offline:

```bash
# List etcd members to find the one being decommissioned
talosctl etcd members --nodes 10.0.0.11

# Remove the member
talosctl etcd remove-member --nodes 10.0.0.11 <member-id>

# Verify the cluster is healthy after removal
talosctl etcd status --nodes 10.0.0.11

# Take an etcd snapshot for safety
talosctl etcd snapshot --nodes 10.0.0.11 ./etcd-post-decommission-$(date +%Y%m%d).db
```

## Step 4: Clean Up Cluster Resources

```bash
# Force-delete any pods still referencing the node
kubectl get pods --all-namespaces --field-selector spec.nodeName=node-to-decommission \
  -o json | jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns pod; do
    kubectl delete pod -n "$ns" "$pod" --force --grace-period=0
  done

# Clean up volume attachments
kubectl get volumeattachments -o json | \
  jq -r ".items[] | select(.spec.nodeName == \"node-to-decommission\") | .metadata.name" | \
  xargs -r kubectl delete volumeattachment

# Clean up node lease
kubectl delete lease -n kube-node-lease node-to-decommission 2>/dev/null || true

# Delete local PVs that were on this node
kubectl get pv -o json | jq -r '
  .items[] |
  select(.spec.nodeAffinity.required.nodeSelectorTerms[].matchExpressions[].values[] == "node-to-decommission") |
  .metadata.name' | xargs -r kubectl delete pv
```

## Step 5: Reset the Talos Node

Wipe the node to ensure no data remains:

```bash
# Full reset with user disk wipe
talosctl reset --nodes 10.0.0.50 \
  --graceful=false \
  --reboot=false \
  --system-labels-to-wipe STATE \
  --system-labels-to-wipe EPHEMERAL \
  --user-disks-to-wipe /dev/sdb \
  --user-disks-to-wipe /dev/sdc
```

Note `--reboot=false` here. Since we are decommissioning, we want the node to shut down, not restart.

## Step 6: Update Infrastructure Configuration

### Remove from Infrastructure Code

Update your Terraform, Ansible, or other infrastructure-as-code definitions:

```hcl
# Remove the node from your Terraform configuration
# Before:
# resource "talos_machine_configuration_apply" "worker_3" {
#   node = "10.0.0.50"
#   ...
# }

# After: Remove the entire resource block and run terraform apply
```

### Update DNS and Load Balancers

```bash
# Remove DNS records
# Remove from load balancer backend pools

# For control plane nodes, update the API endpoint
# If using a load balancer in front of the API server,
# remove the decommissioned node from the backend
```

### Update Monitoring

```bash
# Remove the node from monitoring targets
# Update any node-count-based alerts
# Update capacity dashboards
```

## Step 7: Handle the Hardware

For physical servers:

- **Recycling**: If repurposing the hardware, the Talos reset command wiped the system disk. Additional secure wipe may be needed per your data handling policy.
- **Return**: If the hardware is leased, document the state and coordinate return logistics.
- **Disposal**: Follow your organization's hardware disposal policies, especially for disks that contained sensitive data.

For cloud instances:

```bash
# Terminate the instance
# AWS
aws ec2 terminate-instances --instance-ids i-1234567890abcdef0

# Azure
az vm delete --resource-group my-rg --name node-to-decommission --yes
az disk delete --resource-group my-rg --name node-disk --yes

# GCP
gcloud compute instances delete node-to-decommission --zone us-central1-a
```

## Automated Decommission Script

```bash
#!/bin/bash
# decommission-node.sh - complete node decommission
set -euo pipefail

NODE_NAME=$1
NODE_IP=$2
ROLE="${3:-worker}"  # "worker" or "controlplane"

echo "=== Decommissioning ${NODE_NAME} (${NODE_IP}) [${ROLE}] ==="

# Step 1: Drain
echo "Step 1: Draining workloads..."
kubectl cordon "${NODE_NAME}"
kubectl drain "${NODE_NAME}" \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=600s \
  --force 2>/dev/null || true

# Step 2: Remove etcd member if control plane
if [ "${ROLE}" = "controlplane" ]; then
  echo "Step 2: Removing etcd member..."
  HEALTHY_CP=$(kubectl get nodes -l node-role.kubernetes.io/control-plane \
    -o jsonpath="{.items[?(@.metadata.name!='${NODE_NAME}')].status.addresses[?(@.type=='InternalIP')].address}" | awk '{print $1}')
  MEMBER_ID=$(talosctl etcd members --nodes "${HEALTHY_CP}" | grep "${NODE_IP}" | awk '{print $2}' || true)
  if [ -n "${MEMBER_ID}" ]; then
    talosctl etcd remove-member --nodes "${HEALTHY_CP}" "${MEMBER_ID}"
  fi
fi

# Step 3: Delete Kubernetes node
echo "Step 3: Deleting Kubernetes node..."
kubectl delete node "${NODE_NAME}" --force --grace-period=0 2>/dev/null || true

# Step 4: Clean up orphaned resources
echo "Step 4: Cleaning up orphaned resources..."
kubectl get pods --all-namespaces --field-selector spec.nodeName="${NODE_NAME}" \
  -o json 2>/dev/null | jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns pod; do
    kubectl delete pod -n "$ns" "$pod" --force --grace-period=0 2>/dev/null || true
  done

# Step 5: Reset the node
echo "Step 5: Resetting Talos node..."
talosctl reset --nodes "${NODE_IP}" \
  --graceful=false \
  --reboot=false 2>/dev/null || echo "Could not reach node for reset"

echo "=== Decommission of ${NODE_NAME} complete ==="
echo ""
echo "Remaining tasks:"
echo "  - Remove from infrastructure code (Terraform, etc.)"
echo "  - Update DNS records"
echo "  - Update load balancer configuration"
echo "  - Update monitoring targets"
echo "  - Handle physical hardware or terminate cloud instance"
```

## Decommission Checklist

Use this checklist to track the decommission process:

1. Check cluster capacity can absorb the workload
2. Notify the team and schedule maintenance window
3. Migrate any local persistent data
4. Cordon and drain the node
5. Remove etcd member (control plane only)
6. Delete the Kubernetes node object
7. Clean up orphaned pods, PVs, and volume attachments
8. Reset/wipe the Talos node
9. Terminate cloud instance or handle physical hardware
10. Update infrastructure code, DNS, load balancers, and monitoring
11. Document the decommission in your change log

## Wrapping Up

Properly decommissioning a Talos Linux node is a methodical process that protects your cluster's health and your data's security. By following the steps in order - drain, clean up, reset, and remove - you ensure that no orphaned resources are left behind and no workloads are disrupted. The immutable nature of Talos makes the final wipe clean and definitive, giving you confidence that the hardware can be safely repurposed or disposed of. Take the time to script and document your decommission process, and it becomes a routine operation rather than a stressful event.
