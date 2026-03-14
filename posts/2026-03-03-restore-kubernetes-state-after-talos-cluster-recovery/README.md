# How to Restore Kubernetes State After Talos Cluster Recovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, State Recovery, etcd, Disaster Recovery, Cluster Management

Description: A guide to restoring and reconciling Kubernetes state after recovering a Talos Linux cluster from an etcd backup or disaster.

---

After recovering a Talos Linux cluster from an etcd backup, the Kubernetes state is restored to the point when the snapshot was taken. But that does not mean everything works perfectly right away. There are stale resources to clean up, pods to reconcile, persistent volumes to reconnect, and application state to verify. This guide walks through the full process of getting your Kubernetes workloads back to a healthy state after cluster recovery.

## Understanding Restored State

When you recover from an etcd snapshot, Kubernetes sees the world as it was at the time of the snapshot. Any changes made between the snapshot and the failure are lost. This means:

- Deployments, Services, ConfigMaps, and Secrets are restored to their snapshot-time state
- Pods that were created or deleted after the snapshot appear or disappear
- Node registrations may include nodes that no longer exist
- Persistent volume bindings reference the old state
- Lease objects and leader elections need to re-establish

```bash
# After recovery, start by checking the overall cluster state
kubectl get nodes
kubectl get namespaces
kubectl get pods --all-namespaces
```

## Step 1: Clean Up Stale Node Objects

The recovered etcd may contain node objects for nodes that no longer exist or have different identities:

```bash
# List all registered nodes
kubectl get nodes -o wide

# Identify nodes that are NotReady or Unknown
kubectl get nodes | grep -E "NotReady|Unknown"

# Delete stale node entries
# These are nodes that will not be coming back
kubectl delete node <stale-node-name>

# For nodes that have been reprovisioned with new IPs
# but the same name, they should update automatically
# If not, delete the old entry and the node will re-register
```

Wait for all current nodes to show as Ready:

```bash
# Watch node status
kubectl get nodes --watch

# All nodes should eventually show Ready
# Worker nodes may take a few minutes to reconnect
```

## Step 2: Reconcile Pod State

After recovery, some pods will be in inconsistent states:

```bash
# Find pods in bad states
kubectl get pods --all-namespaces | grep -v "Running\|Completed"

# Common states after recovery:
# - Terminating: Pods that were being deleted at snapshot time
# - Pending: Pods waiting for nodes or resources
# - Unknown: Pods on nodes that have not reconnected yet
# - CrashLoopBackOff: Pods failing to start
```

### Force Delete Stuck Terminating Pods

```bash
# Find all Terminating pods
kubectl get pods --all-namespaces --field-selector status.phase=Running \
  -o json | jq -r '.items[] | select(.metadata.deletionTimestamp != null) | "\(.metadata.namespace) \(.metadata.name)"'

# Force delete stuck pods
kubectl get pods --all-namespaces | grep Terminating | \
  awk '{print $1, $2}' | while read ns pod; do
    kubectl delete pod ${pod} -n ${ns} --force --grace-period=0
done
```

### Handle Unknown Pods

```bash
# Pods in Unknown state are on nodes that have not reconnected
# Wait for nodes to come back, or force delete if nodes are gone

kubectl get pods --all-namespaces | grep Unknown | \
  awk '{print $1, $2}' | while read ns pod; do
    kubectl delete pod ${pod} -n ${ns} --force --grace-period=0
done
```

### Restart Stuck Deployments

```bash
# Some deployments may be stuck with the wrong number of replicas
# or have pods in CrashLoopBackOff

# Restart all deployments in a namespace
kubectl rollout restart deployment --all -n <namespace>

# Or restart specific deployments
kubectl rollout restart deployment <deployment-name> -n <namespace>

# Watch the rollout
kubectl rollout status deployment <deployment-name> -n <namespace>
```

## Step 3: Restore System Components

Kubernetes system components may need attention after recovery:

### CoreDNS

```bash
# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns

# If CoreDNS is not running, restart it
kubectl rollout restart deployment coredns -n kube-system

# Verify DNS is working
kubectl run dns-test --image=busybox --restart=Never \
  -- nslookup kubernetes.default.svc.cluster.local
kubectl logs dns-test
kubectl delete pod dns-test
```

### CNI Plugin

```bash
# Check your CNI (example with Cilium)
kubectl get pods -n kube-system -l k8s-app=cilium

# If CNI pods are not running, they may need a restart
kubectl rollout restart daemonset cilium -n kube-system

# For Calico
kubectl rollout restart daemonset calico-node -n kube-system
```

### Ingress Controller

```bash
# Check ingress controller pods
kubectl get pods -n ingress-nginx

# Restart if needed
kubectl rollout restart deployment ingress-nginx-controller -n ingress-nginx

# Verify ingress is working
kubectl get ingress --all-namespaces
```

## Step 4: Reconnect Persistent Volumes

Persistent volume (PV) data is not stored in etcd - only the PV and PVC metadata is. After recovery:

```bash
# Check PV and PVC status
kubectl get pv
kubectl get pvc --all-namespaces

# Look for PVs in Released or Failed state
kubectl get pv | grep -E "Released|Failed"

# Check for PVCs that are not Bound
kubectl get pvc --all-namespaces | grep -v Bound
```

### For Cloud-Backed Volumes

```bash
# Cloud volumes (EBS, GCE PD, Azure Disk) should reconnect
# automatically once the pod is scheduled on a node

# If a PV is stuck in Released state, you may need to
# clear the claimRef to allow it to be rebound
kubectl patch pv <pv-name> --type json \
  -p '[{"op": "remove", "path": "/spec/claimRef"}]'
```

### For Local Volumes

```bash
# Local volumes only work on specific nodes
# If the node was replaced, the data may be lost

# Check which node a local PV is bound to
kubectl get pv <pv-name> -o yaml | grep -A5 "nodeAffinity"

# If the node no longer exists, you need to restore
# the data from separate backups
```

### For Network Storage (NFS, Ceph, etc.)

```bash
# Network storage should reconnect automatically
# Verify the storage backend is accessible

# Check StorageClass
kubectl get storageclass
kubectl describe storageclass <sc-name>

# Verify CSI driver is running
kubectl get pods -n kube-system | grep csi
```

## Step 5: Verify Application State

Go through each application and verify it is working correctly:

```bash
# List all deployments and their status
kubectl get deployments --all-namespaces

# Check for deployments with unavailable replicas
kubectl get deployments --all-namespaces | awk '$3 != $4 {print}'

# Check StatefulSets
kubectl get statefulsets --all-namespaces

# Check DaemonSets
kubectl get daemonsets --all-namespaces
```

### Application-Specific Checks

```bash
# Database applications - check data integrity
kubectl exec -it <db-pod> -- psql -c "SELECT count(*) FROM important_table;"

# Message queues - check queue status
kubectl exec -it <rabbitmq-pod> -- rabbitmqctl list_queues

# Web applications - check health endpoints
kubectl port-forward svc/my-web-app 8080:80 &
curl http://localhost:8080/health
```

## Step 6: Reconcile RBAC and Secrets

RBAC policies and secrets are restored from the snapshot, but verify they are correct:

```bash
# Check ServiceAccounts
kubectl get serviceaccounts --all-namespaces | wc -l

# Check ClusterRoles and ClusterRoleBindings
kubectl get clusterroles | wc -l
kubectl get clusterrolebindings | wc -l

# Verify critical secrets exist
kubectl get secrets -n kube-system
kubectl get secrets -n <app-namespace>

# If any secrets were rotated after the snapshot was taken,
# they need to be rotated again
```

## Step 7: Restore Changes Lost Since Snapshot

Anything that happened between the snapshot and the failure is lost. You need to recreate those changes:

```bash
# Check your deployment pipeline for recent changes
# that need to be reapplied

# Re-run any Helm upgrades that occurred after the snapshot
helm list --all-namespaces
helm upgrade <release> <chart> --values values.yaml -n <namespace>

# Re-apply any manual changes
kubectl apply -f recent-changes/

# Re-create any resources that were added after the snapshot
```

This is why keeping infrastructure as code is so valuable. If all your Kubernetes resources are defined in manifests or Helm charts, reapplying them is straightforward.

## Step 8: Verify Monitoring and Logging

Make sure your observability stack is working:

```bash
# Check Prometheus
kubectl get pods -n monitoring | grep prometheus
kubectl port-forward svc/prometheus-server 9090:80 -n monitoring &
curl http://localhost:9090/api/v1/status/config

# Check Grafana
kubectl get pods -n monitoring | grep grafana

# Check log collection (Fluentd, Fluent Bit, etc.)
kubectl get pods -n logging

# Check alert manager
kubectl get pods -n monitoring | grep alertmanager
```

## Post-Recovery Validation Script

```bash
#!/bin/bash
# post-recovery-k8s-validation.sh

echo "=== Kubernetes State Validation After Recovery ==="
echo ""

echo "--- Nodes ---"
kubectl get nodes -o wide
echo ""

echo "--- System Pods ---"
kubectl get pods -n kube-system
echo ""

echo "--- Problem Pods ---"
kubectl get pods --all-namespaces | grep -v "Running\|Completed\|NAME"
echo ""

echo "--- Persistent Volumes ---"
kubectl get pv
echo ""

echo "--- Unbound PVCs ---"
kubectl get pvc --all-namespaces | grep -v Bound | grep -v NAME
echo ""

echo "--- Deployment Status ---"
kubectl get deployments --all-namespaces | awk 'NR==1 || $3 != $4'
echo ""

echo "--- DaemonSet Status ---"
kubectl get daemonsets --all-namespaces | awk 'NR==1 || $3 != $4'
echo ""

echo "--- Recent Events ---"
kubectl get events --all-namespaces --sort-by=.lastTimestamp | tail -20
echo ""

echo "=== Validation Complete ==="
```

## Summary

Restoring Kubernetes state after a Talos Linux cluster recovery involves more than just bringing etcd back online. You need to clean up stale node and pod objects, restart system components like CoreDNS and CNI plugins, reconnect persistent volumes, verify application health, reconcile RBAC and secrets, and reapply any changes that were lost since the snapshot. Work through these steps methodically, starting with the infrastructure layer and moving up to the application layer. Having your resources defined as code makes the process significantly easier, as you can simply reapply your manifests to bring everything back to the desired state.
