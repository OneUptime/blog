# How to Debug Pods Stuck in Terminating State and Force Delete Them

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Debugging, Troubleshooting

Description: Learn how to diagnose and fix pods stuck in Terminating state in Kubernetes, including graceful troubleshooting and force deletion techniques when necessary to recover cluster operations.

---

Pods normally terminate within seconds when deleted. But sometimes pods get stuck in Terminating state for minutes or hours. These zombie pods consume resources, block deployments, and prevent node maintenance. Understanding why pods get stuck and how to force delete them safely is essential for cluster operations.

This guide covers the root causes of stuck terminating pods and shows you how to diagnose and resolve them systematically.

## Understanding the Terminating State

When you delete a pod, Kubernetes follows a termination sequence:

1. Pod status changes to Terminating
2. PreStop hooks execute (if configured)
3. SIGTERM is sent to containers
4. Kubernetes waits up to terminationGracePeriodSeconds (default 30s)
5. SIGKILL is sent if containers are still running
6. Pod is removed from API server

Pods get stuck when this sequence does not complete. Common causes include:
- Finalizers preventing deletion
- Node is down or unreachable
- Container processes not responding to SIGTERM/SIGKILL
- Network partition preventing communication
- Kubelet issues
- Storage volume unmount failures

## Quick Diagnostic Commands

Check if a pod is stuck terminating:

```bash
kubectl get pods
```

Output:

```
NAME        READY   STATUS        RESTARTS   AGE
stuck-pod   1/1     Terminating   0          15m
```

If a pod shows Terminating for more than a few minutes, it is stuck.

Get detailed pod information:

```bash
kubectl describe pod stuck-pod
```

Check deletion timestamp:

```bash
kubectl get pod stuck-pod -o jsonpath='{.metadata.deletionTimestamp}'
```

If deletionTimestamp is set but the pod still exists, it is stuck.

## Checking Finalizers

Finalizers are the most common cause of stuck terminating pods. Finalizers are metadata entries that prevent deletion until removed.

Check pod finalizers:

```bash
kubectl get pod stuck-pod -o jsonpath='{.metadata.finalizers}'
```

Output:

```json
["example.com/cleanup-required"]
```

This finalizer prevents deletion. A controller must remove it, but if the controller is not running, the pod stays stuck.

List all pods with finalizers:

```bash
kubectl get pods -A -o json | jq -r '.items[] | select(.metadata.finalizers != null) | {name: .metadata.name, namespace: .metadata.namespace, finalizers: .metadata.finalizers}'
```

Remove finalizer to allow deletion:

```bash
kubectl patch pod stuck-pod -p '{"metadata":{"finalizers":null}}'
```

The pod should delete immediately after removing finalizers.

For specific finalizers:

```bash
kubectl patch pod stuck-pod --type='json' -p='[{"op": "remove", "path": "/metadata/finalizers"}]'
```

## Checking Node Status

If the node where the pod is running is down, the pod cannot terminate properly.

Find which node the pod is on:

```bash
kubectl get pod stuck-pod -o jsonpath='{.spec.nodeName}'
```

Check node status:

```bash
kubectl get node worker-node-1
```

Output:

```
NAME           STATUS     ROLES    AGE   VERSION
worker-node-1  NotReady   <none>   5d    v1.28.0
```

A NotReady node cannot execute pod deletion.

Check node conditions:

```bash
kubectl describe node worker-node-1 | grep -A 10 "Conditions:"
```

If the node is permanently down, force delete the pod:

```bash
kubectl delete pod stuck-pod --grace-period=0 --force
```

Warning: Force deletion does not guarantee clean termination. Use only when necessary.

## Debugging Kubelet Issues

Sometimes the kubelet fails to process deletion requests.

Check kubelet logs on the node:

```bash
# SSH to the node
ssh worker-node-1

# View kubelet logs
sudo journalctl -u kubelet | grep stuck-pod

# Or
sudo tail -f /var/log/kubelet.log | grep stuck-pod
```

Look for errors like:

```
Failed to delete pod: timeout waiting for volume unmount
Error removing container: context deadline exceeded
Failed to remove pod sandbox: rpc error
```

Restart kubelet if it is stuck:

```bash
sudo systemctl restart kubelet
```

Check if the pod deletes after kubelet restart.

## Volume Unmount Issues

Pods with persistent volumes can get stuck if volumes fail to unmount.

Check volume attachments:

```bash
kubectl get volumeattachments
```

Find attachments for the stuck pod's node:

```bash
kubectl get volumeattachments -o json | jq -r '.items[] | select(.spec.nodeName == "worker-node-1")'
```

Describe the volume attachment for errors:

```bash
kubectl describe volumeattachment pvc-abc123
```

If the volume is stuck, force delete it:

```bash
kubectl delete volumeattachment pvc-abc123
```

Then delete the pod.

Check for PersistentVolumeClaims with stuck finalizers:

```bash
kubectl get pvc -o jsonpath='{.items[?(@.metadata.finalizers)].metadata.name}'
```

Remove PVC finalizers if necessary:

```bash
kubectl patch pvc my-pvc -p '{"metadata":{"finalizers":null}}'
```

## Container Runtime Issues

Container runtime problems can prevent termination.

Check container runtime status on the node:

```bash
# For containerd
sudo systemctl status containerd

# For Docker
sudo systemctl status docker
```

List containers for the stuck pod:

```bash
# Containerd
sudo crictl ps | grep stuck-pod

# Docker
sudo docker ps | grep stuck-pod
```

Force remove stuck containers:

```bash
# Containerd
CONTAINER_ID=$(sudo crictl ps | grep stuck-pod | awk '{print $1}')
sudo crictl rm -f $CONTAINER_ID

# Docker
CONTAINER_ID=$(sudo docker ps | grep stuck-pod | awk '{print $1}')
sudo docker rm -f $CONTAINER_ID
```

## Force Deleting Pods

When all else fails, force delete the pod. This bypasses normal termination.

Standard force delete:

```bash
kubectl delete pod stuck-pod --grace-period=0 --force
```

This sends SIGKILL immediately without waiting for graceful shutdown.

If the pod still does not delete, remove it from API server:

```bash
kubectl patch pod stuck-pod -p '{"metadata":{"finalizers":null}}' && \
kubectl delete pod stuck-pod --grace-period=0 --force
```

For StatefulSet pods, deletion might recreate the pod. Delete the StatefulSet first:

```bash
kubectl delete statefulset my-statefulset --cascade=orphan
kubectl delete pod stuck-pod --grace-period=0 --force
```

## Namespace Stuck in Terminating

Sometimes entire namespaces get stuck terminating, blocking all pod deletions.

Check namespace status:

```bash
kubectl get namespace stuck-namespace
```

Output:

```
NAME              STATUS        AGE
stuck-namespace   Terminating   30m
```

Check namespace finalizers:

```bash
kubectl get namespace stuck-namespace -o jsonpath='{.spec.finalizers}'
```

Remove finalizers:

```bash
kubectl get namespace stuck-namespace -o json | \
  jq '.spec.finalizers = []' | \
  kubectl replace --raw "/api/v1/namespaces/stuck-namespace/finalize" -f -
```

Or edit directly:

```bash
kubectl edit namespace stuck-namespace
# Remove finalizers from spec.finalizers
```

## Preventing Stuck Terminating Pods

Set appropriate terminationGracePeriodSeconds:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: graceful-pod
spec:
  terminationGracePeriodSeconds: 30
  containers:
  - name: app
    image: app:latest
```

Handle SIGTERM in applications:

```python
import signal
import sys

def graceful_shutdown(signum, frame):
    print("Received SIGTERM, cleaning up")
    # Cleanup code here
    sys.exit(0)

signal.signal(signal.SIGTERM, graceful_shutdown)
```

Avoid long-running PreStop hooks:

```yaml
lifecycle:
  preStop:
    exec:
      command:
      - /bin/sh
      - -c
      - sleep 5  # Keep this short
```

Use finalizers only when necessary:

```yaml
metadata:
  finalizers:
  - example.com/cleanup  # Only if you have a controller to remove it
```

Ensure controllers that add finalizers are always running and properly remove them.

## Monitoring Terminating Pods

Create alerts for stuck terminating pods:

```yaml
# PrometheusRule
groups:
- name: terminating-pod-alerts
  rules:
  - alert: PodStuckTerminating
    expr: |
      time() - kube_pod_deletion_timestamp > 300
    for: 5m
    annotations:
      summary: "Pod {{ $labels.pod }} stuck terminating for 5+ minutes"
```

Track terminating pod count:

```bash
kubectl get pods -A --field-selector status.phase=Terminating --no-headers | wc -l
```

Script to find old terminating pods:

```bash
#!/bin/bash
# find-stuck-terminating.sh

THRESHOLD=300  # 5 minutes in seconds
CURRENT_TIME=$(date +%s)

kubectl get pods -A -o json | jq -r '
  .items[] |
  select(.metadata.deletionTimestamp != null) |
  {
    namespace: .metadata.namespace,
    name: .metadata.name,
    deletionTimestamp: .metadata.deletionTimestamp,
    nodeName: .spec.nodeName
  } | @json
' | while read pod_json; do
  DELETION_TIME=$(echo $pod_json | jq -r '.deletionTimestamp' | date -f - +%s)
  AGE=$((CURRENT_TIME - DELETION_TIME))

  if [ $AGE -gt $THRESHOLD ]; then
    echo "Stuck pod found:"
    echo $pod_json | jq .
  fi
done
```

## Recovering from Force Deletions

After force deleting pods, verify the cleanup:

Check if pod is gone:

```bash
kubectl get pod stuck-pod -n my-namespace
```

Check if new pod was created (for Deployments):

```bash
kubectl get pods -n my-namespace -l app=myapp
```

Verify node is clean:

```bash
# SSH to node
ssh worker-node-1

# Check for leftover containers
sudo crictl ps -a | grep stuck-pod

# Check for leftover network interfaces
ip link show | grep stuck-pod
```

Clean up leftover resources manually if necessary.

## Best Practices

Try graceful deletion first. Force delete only as a last resort.

Investigate why pods are stuck before force deleting. Recurring issues indicate underlying problems.

Remove finalizers only if you understand what they do. Some finalizers are critical for cleanup.

Monitor node health. Unhealthy nodes cause stuck terminating pods.

Set reasonable terminationGracePeriodSeconds. Too short causes ungraceful shutdowns. Too long delays cleanup.

Implement proper SIGTERM handling in applications.

Keep kubelet and container runtime updated. Bugs in older versions cause termination issues.

Document force deletion procedures for your team.

Test pod deletion in development to ensure graceful termination works.

## Emergency Procedures

For critical situations where multiple pods are stuck:

1. Identify all stuck pods:
```bash
kubectl get pods -A --field-selector status.phase=Terminating
```

2. Check if specific node is causing issues:
```bash
kubectl get pods -A -o json | jq -r '.items[] | select(.metadata.deletionTimestamp != null) | .spec.nodeName' | sort | uniq -c | sort -rn
```

3. If one node is causing all issues, cordon and drain it:
```bash
kubectl cordon problem-node
kubectl drain problem-node --ignore-daemonsets --delete-emptydir-data
```

4. Force delete stuck pods:
```bash
kubectl get pods -A --field-selector status.phase=Terminating -o json | \
  jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    kubectl delete pod $name -n $ns --grace-period=0 --force
  done
```

Use this only in emergencies. Graceful approaches are always preferred.

## Conclusion

Pods stuck in Terminating state are usually caused by finalizers, node failures, or volume unmount issues. Diagnose systematically by checking finalizers, node status, kubelet logs, and volume attachments.

Force delete pods only when necessary. Remove finalizers first, then use force deletion as a last resort. Prevent stuck pods by implementing proper termination handling, using appropriate grace periods, and monitoring node health.

Master these troubleshooting techniques to quickly recover from stuck terminating pods and maintain reliable Kubernetes operations.
