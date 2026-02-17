# How to Troubleshoot AKS Pod Stuck in Terminating State and Force Delete Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Kubernetes, Troubleshooting, Pods, Terminating, kubectl, Azure

Description: A practical guide to diagnosing why AKS pods get stuck in Terminating state and the safe procedures for force-deleting them when necessary.

---

You run `kubectl delete pod my-pod` and expect it to disappear in a few seconds. Instead, the pod sits in Terminating state for minutes, then hours. You check back the next day and it is still there. This is one of the most frustrating issues in Kubernetes, and it happens in AKS clusters more often than you might expect.

Pods get stuck in Terminating for specific, diagnosable reasons. In this guide, I will walk through the most common causes, how to investigate each one, and when it is safe to force delete the pod.

## Understanding the Pod Termination Lifecycle

When you delete a pod, Kubernetes follows a specific sequence:

1. The API server marks the pod as Terminating and sets a deletion timestamp
2. The kubelet on the node receives the update
3. The kubelet runs any preStop hooks defined in the pod spec
4. The kubelet sends SIGTERM to the main container process
5. The kubelet waits for the `terminationGracePeriodSeconds` (default 30 seconds)
6. If the process is still running, the kubelet sends SIGKILL
7. The kubelet reports back to the API server that the containers have stopped
8. The API server removes the pod from etcd

A pod gets stuck in Terminating when something in this sequence fails to complete.

## Step 1: Check the Pod Status

Start by looking at the pod details to understand what is going on.

```bash
# Get the pod status and see how long it has been terminating
kubectl get pod my-pod -o wide

# Get detailed information including events
kubectl describe pod my-pod
```

Look for these specific things in the describe output:

- **Deletion Timestamp**: When the delete was initiated
- **Finalizers**: Any finalizers that must complete before deletion
- **Events**: Error messages from the kubelet
- **Node**: Which node the pod is on (important for node-level issues)

## Step 2: Check for Finalizers

Finalizers are the number one reason pods get stuck in Terminating. A finalizer is a string in the pod's metadata that tells Kubernetes "do not delete this resource until I have cleaned up." If the controller responsible for removing the finalizer is broken or missing, the pod hangs forever.

```bash
# Check for finalizers on the pod
kubectl get pod my-pod -o jsonpath='{.metadata.finalizers}'

# Common finalizers you might see:
# - kubernetes.io/pv-protection (related to persistent volumes)
# - foregroundDeletion (related to garbage collection)
# - Custom finalizers from operators or controllers
```

If you find a finalizer that should not be there or whose controller is broken, you can remove it manually.

```bash
# Remove all finalizers from a stuck pod using a JSON patch
kubectl patch pod my-pod -p '{"metadata":{"finalizers":null}}' --type=merge
```

After removing finalizers, the pod should be deleted within a few seconds.

## Step 3: Check the Node Status

If the node where the pod is running has become unreachable, the kubelet cannot report back that the containers have stopped. The API server keeps waiting for that confirmation, and the pod stays in Terminating.

```bash
# Check if the node is healthy
kubectl get node <node-name> -o wide

# Look for node conditions
kubectl describe node <node-name> | grep -A5 "Conditions:"

# Check if the node is reachable
kubectl get nodes | grep <node-name>
```

If the node shows as NotReady, that explains why the pod is stuck. The options are:

1. Wait for the node to recover
2. Force delete the pod
3. Delete the node from the cluster

## Step 4: Check for Volume Mount Issues

Pods with persistent volumes can get stuck if the volume cannot be unmounted cleanly. This is common with Azure Disk volumes when the disk detach operation fails.

```bash
# Check volume attachment status on the node
kubectl describe node <node-name> | grep -A20 "VolumesAttached"

# Check PVC status
kubectl get pvc -o wide

# Check for VolumeAttachment resources
kubectl get volumeattachment
```

If a volume is stuck in an attached state, the kubelet will not allow the pod to terminate because it needs to unmount the volume first.

```bash
# Check for volume detach errors in kubelet logs
# You need node access for this (via debug pod or SSH)
kubectl debug node/<node-name> -it --image=busybox
# Inside the debug container:
chroot /host
journalctl -u kubelet | grep -i "detach\|unmount" | tail -20
```

## Step 5: Check for Processes That Will Not Die

Sometimes the container process ignores SIGTERM and does not respond to SIGKILL either. This can happen with zombie processes or processes stuck in uninterruptible sleep (D state).

```bash
# If you can exec into the node, check for stuck processes
kubectl debug node/<node-name> -it --image=busybox
chroot /host

# List processes related to the pod (use the container ID from describe output)
crictl ps -a | grep <pod-name>

# Check for zombie or D-state processes
ps aux | grep -E "Z|D" | grep -v grep
```

Processes in D state are waiting for I/O operations that may never complete. This is often related to NFS mounts or broken storage drivers.

## Step 6: Force Delete the Pod

If you have diagnosed the issue and determined that the pod will not terminate on its own, force deletion is the last resort.

```bash
# Force delete a single pod
# --grace-period=0 skips the graceful shutdown period
# --force removes the pod from etcd immediately
kubectl delete pod my-pod --grace-period=0 --force
```

This does several things:

- Immediately removes the pod from the API server (etcd)
- Does NOT guarantee that containers are stopped on the node
- The kubelet will eventually clean up orphaned containers when it recovers

For pods controlled by a ReplicaSet or Deployment, a new pod will be created to replace the force-deleted one. For standalone pods, the pod is simply gone.

## Step 7: Bulk Force Delete

If you have multiple stuck pods (common after a node failure), you can force delete them in bulk.

```bash
# Force delete all pods stuck in Terminating in a specific namespace
kubectl get pods -n my-namespace \
  --field-selector=status.phase=Running \
  -o name | while read pod; do
    # Check if the pod has a deletion timestamp (means it is terminating)
    DT=$(kubectl get $pod -n my-namespace -o jsonpath='{.metadata.deletionTimestamp}' 2>/dev/null)
    if [ -n "$DT" ]; then
      echo "Force deleting $pod"
      kubectl delete $pod -n my-namespace --grace-period=0 --force
    fi
  done
```

A simpler approach if you know all Terminating pods need to be cleaned up:

```bash
# Find and force delete all Terminating pods across all namespaces
kubectl get pods --all-namespaces | grep Terminating | \
  awk '{print $1, $2}' | while read ns pod; do
    kubectl delete pod $pod -n $ns --grace-period=0 --force
  done
```

## Preventing Stuck Terminating Pods

### Set Appropriate Termination Grace Periods

The default grace period is 30 seconds. If your application needs more time to shut down, increase it. If it does not need any grace period, reduce it.

```yaml
# pod-spec.yaml
# Set a custom termination grace period based on your application's needs
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  # Give the app 60 seconds to shut down gracefully
  terminationGracePeriodSeconds: 60
  containers:
  - name: my-app
    image: myapp:v1
    # Handle SIGTERM in your application code
    lifecycle:
      preStop:
        exec:
          # Run cleanup before SIGTERM is sent
          command: ["/bin/sh", "-c", "cleanup.sh"]
```

### Handle SIGTERM in Your Application

Many stuck pods are caused by applications that ignore SIGTERM. Make sure your application listens for the signal and shuts down cleanly.

Here is an example in Node.js:

```javascript
// server.js
// Graceful shutdown handler for Kubernetes pod termination
const server = app.listen(3000);

process.on('SIGTERM', () => {
  console.log('SIGTERM received, starting graceful shutdown');

  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');

    // Close database connections
    db.close().then(() => {
      console.log('Database connections closed');
      process.exit(0);
    });
  });

  // Force exit after 25 seconds if graceful shutdown fails
  // Leave 5 seconds buffer before Kubernetes sends SIGKILL
  setTimeout(() => {
    console.log('Forced exit after timeout');
    process.exit(1);
  }, 25000);
});
```

### Monitor Terminating Pods

Set up monitoring to alert on pods that have been in Terminating state for too long.

```bash
# Simple check for pods stuck in Terminating for more than 5 minutes
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.metadata.deletionTimestamp != null) |
  "\(.metadata.namespace)/\(.metadata.name) - Deleting since \(.metadata.deletionTimestamp)"'
```

You can run this as a CronJob in your cluster or as part of your external monitoring.

## When Not to Force Delete

Force deletion should be a last resort, not a first response. Avoid force deletion when:

- The pod is using a ReadWriteOnce persistent volume. Force deleting the pod without unmounting the volume can lead to data corruption if a new pod attaches the same volume on a different node.
- The pod is part of a StatefulSet with strict ordering guarantees. Force deleting can violate the at-most-one guarantee.
- The node is just slow, not dead. Give the kubelet time to complete the termination sequence before intervening.

Always diagnose the root cause before reaching for the force delete hammer. Understanding why pods get stuck helps you prevent the same issue from happening again.
