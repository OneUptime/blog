# How to Clean Up After Removing a Node from the Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Node Cleanup, Cluster Management, Kubernetes, etcd

Description: A thorough guide to cleaning up all resources and state after removing a Talos Linux node from a Kubernetes cluster to prevent orphaned objects.

---

Removing a node from a Talos Linux cluster involves more than just running a reset command. Without proper cleanup, you end up with orphaned Kubernetes objects, stale etcd members, dangling persistent volumes, and monitoring gaps. These leftovers can cause confusion, waste resources, and even impact cluster stability.

This guide covers the complete cleanup process after removing a node, ensuring nothing is left behind.

## The Cleanup Checklist

When a node is removed from the cluster, you need to address these areas:

1. Kubernetes node object
2. etcd membership (control plane nodes only)
3. Pods and workloads
4. Persistent volumes and claims
5. Node-specific resources (leases, CSR objects, RBAC)
6. Monitoring and alerting
7. DNS and load balancer entries
8. The physical or virtual machine itself

Let's go through each one.

## Step 1: Drain and Delete the Kubernetes Node

If the node is still responding, drain it first:

```bash
# Cordon to prevent new scheduling
kubectl cordon node-to-remove

# Drain all workloads
kubectl drain node-to-remove \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=300s \
  --force

# Delete the node object
kubectl delete node node-to-remove
```

If the node is already gone (crashed or force-reset), you still need to delete the node object:

```bash
# Delete an unreachable node
kubectl delete node node-to-remove

# Force delete if the normal delete hangs
kubectl delete node node-to-remove --force --grace-period=0
```

## Step 2: Clean Up etcd (Control Plane Nodes)

For control plane nodes, the etcd member must be removed:

```bash
# List current etcd members from a healthy node
talosctl etcd members --nodes 10.0.0.11

# Remove the member for the deleted node
talosctl etcd remove-member --nodes 10.0.0.11 <member-id>

# Verify removal
talosctl etcd members --nodes 10.0.0.11
```

Failing to remove the etcd member leaves the cluster with a phantom member. With a 3-node etcd cluster, an unremoved member means you can only tolerate zero more failures before losing quorum.

## Step 3: Clean Up Stuck Pods

Pods that were running on the removed node may be stuck in Terminating or Unknown state:

```bash
# Find pods stuck on the removed node
kubectl get pods --all-namespaces -o wide | grep "node-to-remove"

# Force delete stuck pods
kubectl get pods --all-namespaces --field-selector spec.nodeName=node-to-remove \
  -o json | jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns pod; do
    echo "Deleting ${ns}/${pod}..."
    kubectl delete pod -n "${ns}" "${pod}" --force --grace-period=0
  done
```

For StatefulSet pods, Kubernetes will automatically create replacements on other nodes. For Deployments, the replica count ensures replacements are scheduled immediately.

## Step 4: Handle Persistent Volumes

Persistent volumes (PVs) that were bound to the removed node need attention:

```bash
# Find PVs that were on the removed node
kubectl get pv -o json | jq -r '
  .items[] |
  select(.spec.nodeAffinity.required.nodeSelectorTerms[].matchExpressions[].values[] == "node-to-remove") |
  .metadata.name'

# Check PVC status for affected volumes
kubectl get pvc --all-namespaces -o wide
```

### Local Persistent Volumes

Local PVs are tied to a specific node. When the node is removed, these PVs become unavailable:

```bash
# List local PVs for the removed node
kubectl get pv -o json | jq '.items[] | select(.spec.local) | .metadata.name'

# Delete PVs that were on the removed node
# First, delete the PVCs that reference them
kubectl delete pvc -n my-namespace my-local-pvc

# Then delete the PVs
kubectl delete pv my-local-pv
```

### Network-Attached Persistent Volumes

CSI-backed PVs (like those from Longhorn, Rook-Ceph, or cloud providers) should automatically detach from the removed node. However, if volumes are stuck:

```bash
# Check for VolumeAttachment objects referencing the removed node
kubectl get volumeattachments -o json | jq '
  .items[] |
  select(.spec.nodeName == "node-to-remove") |
  .metadata.name'

# Delete stuck volume attachments
kubectl delete volumeattachment <attachment-name>
```

## Step 5: Clean Up Node-Specific Resources

### Node Leases

Kubernetes uses leases for node heartbeating. The lease is usually cleaned up automatically when the node object is deleted, but verify:

```bash
# Check for orphaned leases
kubectl get lease -n kube-node-lease | grep "node-to-remove"

# Delete if still present
kubectl delete lease -n kube-node-lease node-to-remove
```

### Certificate Signing Requests

If the node had pending CSRs:

```bash
# Find CSRs for the removed node
kubectl get csr | grep "node-to-remove"

# Delete orphaned CSRs
kubectl get csr | grep "node-to-remove" | awk '{print $1}' | xargs kubectl delete csr
```

### Endpoint Slices

Services may have stale endpoint slices pointing to the removed node:

```bash
# Check endpoint slices for references to the removed node
kubectl get endpointslices --all-namespaces -o json | \
  jq '.items[] | select(.endpoints[].nodeName == "node-to-remove") | .metadata.name'
```

These typically clean themselves up within a few minutes, but if they persist, deleting the endpoint slice forces Kubernetes to regenerate it.

## Step 6: Update Monitoring and Alerting

### Remove from Monitoring Targets

If you are using Prometheus with static targets or a ServiceMonitor:

```bash
# If using static targets in Prometheus config, remove the node's IP
# If using ServiceMonitor, the endpoint will be removed automatically
# once the Kubernetes node object is deleted

# Check Prometheus targets for stale entries
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit http://localhost:9090/targets and check for DOWN targets
```

### Silence or Resolve Alerts

The removed node will trigger alerts for unresponsive nodes. Handle these:

```bash
# If using Alertmanager, create a silence for the removed node
# Or acknowledge the alerts in your alerting system

# Check current alerts
kubectl port-forward -n monitoring svc/alertmanager 9093:9093
# Visit http://localhost:9093 to manage silences
```

## Step 7: Update DNS and Load Balancers

### DNS Records

If the node had DNS records (for example, for the Kubernetes API endpoint on control plane nodes):

```bash
# Remove DNS records for the node
# This depends on your DNS provider

# For example, with external-dns, removing the Kubernetes node
# should automatically clean up DNS records

# For manual DNS, update your zone files
```

### Load Balancer Backends

If the node was a backend in a load balancer:

```bash
# For cloud load balancers, check backend pools
# AWS
aws elbv2 describe-target-health --target-group-arn <arn>

# Remove unhealthy targets
aws elbv2 deregister-targets --target-group-arn <arn> \
  --targets Id=10.0.0.50
```

## Step 8: Clean Up the Machine

### Reset the Talos Node

If you have not already:

```bash
# Full reset of the node
talosctl reset --nodes 10.0.0.50 \
  --graceful=false \
  --reboot=true
```

### For Cloud Instances

Terminate the instance to stop incurring charges:

```bash
# AWS
aws ec2 terminate-instances --instance-ids i-1234567890abcdef0

# Azure
az vm delete --resource-group my-rg --name my-node --yes

# GCP
gcloud compute instances delete my-node --zone us-central1-a
```

## Automated Cleanup Script

Here is a comprehensive cleanup script:

```bash
#!/bin/bash
# cleanup-removed-node.sh - complete cleanup after node removal
set -euo pipefail

NODE_NAME=$1
NODE_IP=$2
IS_CONTROL_PLANE="${3:-false}"

echo "=== Cleaning up node: ${NODE_NAME} (${NODE_IP}) ==="

# Drain and delete the Kubernetes node
echo "Step 1: Removing Kubernetes node..."
kubectl drain "${NODE_NAME}" --ignore-daemonsets --delete-emptydir-data --timeout=120s 2>/dev/null || true
kubectl delete node "${NODE_NAME}" --force --grace-period=0 2>/dev/null || true

# Clean up etcd if control plane
if [ "${IS_CONTROL_PLANE}" = "true" ]; then
  echo "Step 2: Cleaning up etcd member..."
  HEALTHY_CP=$(kubectl get nodes -l node-role.kubernetes.io/control-plane -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
  MEMBER_ID=$(talosctl etcd members --nodes "${HEALTHY_CP}" 2>/dev/null | grep "${NODE_IP}" | awk '{print $2}' || true)
  if [ -n "${MEMBER_ID}" ]; then
    talosctl etcd remove-member --nodes "${HEALTHY_CP}" "${MEMBER_ID}"
  fi
fi

# Clean up stuck pods
echo "Step 3: Cleaning up stuck pods..."
kubectl get pods --all-namespaces --field-selector spec.nodeName="${NODE_NAME}" \
  -o json 2>/dev/null | jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns pod; do
    kubectl delete pod -n "$ns" "$pod" --force --grace-period=0 2>/dev/null || true
  done

# Clean up volume attachments
echo "Step 4: Cleaning up volume attachments..."
kubectl get volumeattachments -o json 2>/dev/null | \
  jq -r ".items[] | select(.spec.nodeName == \"${NODE_NAME}\") | .metadata.name" | \
  while read va; do
    kubectl delete volumeattachment "$va" 2>/dev/null || true
  done

# Clean up leases
echo "Step 5: Cleaning up node lease..."
kubectl delete lease -n kube-node-lease "${NODE_NAME}" 2>/dev/null || true

echo "=== Cleanup complete ==="
```

## Wrapping Up

Proper cleanup after removing a Talos Linux node prevents orphaned resources from accumulating in your cluster. The checklist is straightforward but easy to overlook when you are in a hurry: remove the Kubernetes node, clean up etcd membership, handle stuck pods and volumes, and update your monitoring and DNS. By scripting this process, you ensure that nothing is missed and that your cluster stays clean and healthy after every node removal.
