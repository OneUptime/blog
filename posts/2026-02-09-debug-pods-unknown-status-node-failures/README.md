# How to Debug Pods with Unknown Status After Node Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Troubleshooting, High Availability

Description: Learn how to identify, diagnose, and recover from pods stuck in Unknown status after node failures, including techniques for safe cleanup and prevention strategies.

---

When a Kubernetes node becomes unreachable, pods running on that node can enter an Unknown status. This happens because the kubelet on the failed node stops sending heartbeats, and the control plane loses visibility into the actual state of the pods. Understanding how to handle Unknown status pods is critical for maintaining application availability and preventing data corruption during recovery.

Unknown status is particularly challenging because the pods might still be running, completely stopped, or in an inconsistent state.

## Understanding Unknown Status

Pods enter Unknown status when:

- Node network connectivity is lost
- Kubelet process crashes or stops responding
- Node runs out of resources and becomes unresponsive
- Hardware failure affects the node

Check for Unknown pods:

```bash
# Find pods in Unknown state
kubectl get pods --all-namespaces --field-selector status.phase=Unknown

# More detailed view
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.status.phase == "Unknown") |
  "\(.metadata.namespace)/\(.metadata.name) on node \(.spec.nodeName)"'
```

## Diagnosing the Problem

First, check node status:

```bash
# View node conditions
kubectl get nodes
kubectl describe node <node-name>

# Check if node is Ready
kubectl get node <node-name> -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
```

Look for node conditions indicating problems:

```bash
# Check for NotReady, MemoryPressure, DiskPressure
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
READY:.status.conditions[?(@.type==\"Ready\")].status,\
MEMORY:.status.conditions[?(@.type==\"MemoryPressure\")].status,\
DISK:.status.conditions[?(@.type==\"DiskPressure\")].status
```

Check pod events:

```bash
# See what happened to the pod
kubectl describe pod <pod-name> -n <namespace>

# Look for events in the namespace
kubectl get events -n <namespace> --sort-by='.lastTimestamp'
```

## Safe Recovery Strategies

### Strategy 1: Wait for Automatic Recovery

Kubernetes has built-in mechanisms to handle node failures:

```bash
# Check the pod-eviction-timeout setting (default 5 minutes)
kubectl get node <node-name> -o yaml | grep -A 5 "taints"
```

After the timeout, pods are automatically evicted and rescheduled if controlled by a higher-level controller (Deployment, StatefulSet, etc.):

```yaml
# This deployment will automatically recover
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resilient-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: resilient-app
  template:
    metadata:
      labels:
        app: resilient-app
    spec:
      containers:
      - name: app
        image: myapp:1.0
```

### Strategy 2: Force Delete (Use with Caution)

If the node is confirmed dead and won't recover, force delete the pods:

```bash
# Force delete a pod (skips graceful shutdown)
kubectl delete pod <pod-name> -n <namespace> --grace-period=0 --force

# For StatefulSet pods, this is more critical
kubectl delete pod <statefulset-pod-name> -n <namespace> --grace-period=0 --force
```

WARNING: Force deletion can cause issues with StatefulSets if the pod is actually still running.

### Strategy 3: Drain and Cordon the Node

For a more controlled approach:

```bash
# Cordon the node to prevent new pods from being scheduled
kubectl cordon <node-name>

# Drain the node (evicts pods gracefully)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# If drain hangs due to Unknown pods, add --force
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data --force --grace-period=30
```

## Handling StatefulSet Pods

StatefulSets require special care because they maintain pod identity:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database-cluster
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: db
        image: postgres:15
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

Safe deletion procedure:

```bash
# 1. Verify the node is truly dead
ping <node-ip>
ssh <node-ip>  # Try to connect

# 2. Check if any process is still running on the node
# If you can SSH to the node:
ssh <node-ip> "docker ps | grep <pod-name>"

# 3. Only after confirming the pod is not running, force delete
kubectl delete pod database-cluster-0 --grace-period=0 --force

# 4. Verify the replacement pod starts
kubectl get pod database-cluster-0 -w
```

## Preventing Split-Brain Scenarios

For distributed systems, prevent split-brain by using pod disruption budgets and proper fencing:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: database-pdb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: database
---
apiVersion: v1
kind: Pod
metadata:
  name: database-with-fencing
spec:
  containers:
  - name: db
    image: postgres:15
    lifecycle:
      preStop:
        exec:
          command:
          - /bin/sh
          - -c
          - |
            # Implement fencing logic
            # Ensure no other instance can write to the same storage
            pg_ctl stop -m fast
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: db-data
```

## Automated Recovery with Custom Controllers

Build a controller to handle Unknown pods automatically:

```python
#!/usr/bin/env python3
from kubernetes import client, config, watch
import time
from datetime import datetime, timedelta

config.load_kube_config()
v1 = client.CoreV1Api()

UNKNOWN_TIMEOUT_MINUTES = 10

def should_force_delete(pod):
    """Determine if a pod in Unknown status should be force deleted."""
    # Only handle Unknown pods
    if pod.status.phase != "Unknown":
        return False

    # Check how long it's been unknown
    for condition in pod.status.conditions or []:
        if condition.type == "Ready":
            last_transition = condition.last_transition_time
            if last_transition:
                unknown_duration = datetime.now(last_transition.tzinfo) - last_transition
                if unknown_duration > timedelta(minutes=UNKNOWN_TIMEOUT_MINUTES):
                    return True

    return False

def handle_unknown_pod(pod):
    """Handle a pod in Unknown status."""
    namespace = pod.metadata.namespace
    name = pod.metadata.name
    node = pod.spec.node_name

    print(f"Found Unknown pod: {namespace}/{name} on node {node}")

    # Check if node is still NotReady
    try:
        node_obj = v1.read_node(node)
        ready_condition = None
        for condition in node_obj.status.conditions:
            if condition.type == "Ready":
                ready_condition = condition
                break

        if ready_condition and ready_condition.status == "True":
            print(f"  Node {node} is actually Ready, waiting for pod to recover...")
            return

    except client.exceptions.ApiException:
        print(f"  Node {node} not found, proceeding with force delete")

    # Check if pod should be force deleted
    if should_force_delete(pod):
        print(f"  Force deleting {namespace}/{name}")
        try:
            v1.delete_namespaced_pod(
                name=name,
                namespace=namespace,
                grace_period_seconds=0,
                body=client.V1DeleteOptions(grace_period_seconds=0)
            )
            print(f"  Successfully deleted {namespace}/{name}")
        except Exception as e:
            print(f"  Error deleting pod: {e}")

def main():
    """Monitor and handle Unknown pods."""
    print("Starting Unknown Pod Handler")

    while True:
        try:
            pods = v1.list_pod_for_all_namespaces(watch=False)
            for pod in pods.items:
                if pod.status.phase == "Unknown":
                    handle_unknown_pod(pod)

        except Exception as e:
            print(f"Error: {e}")

        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    main()
```

Deploy as a Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unknown-pod-handler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: unknown-pod-handler
  template:
    metadata:
      labels:
        app: unknown-pod-handler
    spec:
      serviceAccountName: unknown-pod-handler
      containers:
      - name: handler
        image: unknown-pod-handler:1.0
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: unknown-pod-handler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: unknown-pod-handler
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch", "delete"]
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: unknown-pod-handler
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: unknown-pod-handler
subjects:
- kind: ServiceAccount
  name: unknown-pod-handler
  namespace: kube-system
```

## Monitoring and Alerting

Set up alerts for Unknown pods:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: unknown-pod-alerts
data:
  alerts.yaml: |
    groups:
    - name: pod-status
      rules:
      - alert: PodsInUnknownStatus
        expr: kube_pod_status_phase{phase="Unknown"} > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pods stuck in Unknown status"
          description: "{{ $value }} pods have been in Unknown status for >5 minutes"

      - alert: NodeNotReady
        expr: kube_node_status_condition{condition="Ready",status="false"} == 1
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "Node {{ $labels.node }} is NotReady"
          description: "Node has been NotReady for >3 minutes, pods may enter Unknown status"
```

## Best Practices

Never force delete StatefulSet pods unless you're absolutely certain they're not running. Check multiple times and verify node status.

Implement proper health checks and readiness probes. This helps Kubernetes understand pod state even during network issues.

Use pod disruption budgets to limit the impact of node failures on application availability.

Monitor node health proactively. Address NotReady conditions before pods enter Unknown status.

Test failure scenarios in staging. Verify your applications and recovery procedures work correctly.

Document recovery procedures specific to your stateful applications. Not all apps handle force deletion the same way.

Consider using node auto-repair features if running on cloud providers. Services like GKE and EKS can automatically replace failed nodes.

Implement fencing mechanisms for stateful workloads. Ensure only one instance can access shared storage at a time.

Set appropriate pod-eviction-timeout values based on your requirements. Default is 5 minutes, but you might need longer for some workloads.

Understanding and properly handling pods in Unknown status is essential for maintaining Kubernetes cluster reliability and preventing data loss during node failures.
