# How to Use kubectl describe to Analyze Pod Events and Resource Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Debugging, Troubleshooting, Events

Description: Learn how to use kubectl describe effectively to analyze pod events, diagnose resource issues, and troubleshoot Kubernetes workload problems.

---

The kubectl describe command is your first stop when debugging Kubernetes pod issues. It provides comprehensive information about resources, including configuration, status, events, and conditions that aren't visible through other kubectl commands.

## Understanding kubectl describe Output

Unlike kubectl get which shows tabular summaries, kubectl describe provides detailed human-readable information:

```bash
# Describe a pod
kubectl describe pod myapp-7d8f9b6c5d-k4m2n

# Describe with namespace
kubectl describe pod myapp-pod -n production

# Describe multiple resources
kubectl describe pods -l app=myapp
```

The output includes several sections: metadata, spec, status, conditions, volumes, QoS class, and most importantly, events.

## Analyzing Pod Events

Events at the bottom of describe output show the pod's lifecycle:

```bash
# Get pod description focusing on events
kubectl describe pod myapp-pod | grep -A 20 Events:

# Alternative: get events separately
kubectl get events --field-selector involvedObject.name=myapp-pod
```

Common event types and their meanings:

```bash
# Successful events
Scheduled      # Pod assigned to node
Pulling        # Container image being pulled
Pulled         # Image successfully pulled
Created        # Container created
Started        # Container started

# Problem indicators
Failed         # Operation failed
BackOff        # CrashLoopBackOff state
Unhealthy      # Liveness/readiness probe failed
FailedScheduling  # Cannot find suitable node
FailedMount    # Volume mount failed
```

Example of interpreting events:

```bash
kubectl describe pod problem-pod

# Look for event sequences like:
Events:
  Type     Reason     Age                From               Message
  ----     ------     ----               ----               -------
  Normal   Scheduled  5m                 default-scheduler  Successfully assigned default/problem-pod to node-1
  Normal   Pulling    5m                 kubelet            Pulling image "myapp:v2"
  Warning  Failed     4m (x3 over 5m)    kubelet            Failed to pull image "myapp:v2": rpc error: code = Unknown desc = Error response from daemon: manifest for myapp:v2 not found
  Warning  Failed     4m (x3 over 5m)    kubelet            Error: ErrImagePull
  Normal   BackOff    3m (x6 over 4m)    kubelet            Back-off pulling image "myapp:v2"
  Warning  Failed     3m (x6 over 4m)    kubelet            Error: ImagePullBackOff
```

## Diagnosing Resource Issues

The describe output shows resource requests, limits, and QoS classification:

```bash
kubectl describe pod myapp-pod
```

Look for these sections:

```yaml
Containers:
  myapp:
    Limits:
      cpu:     500m
      memory:  512Mi
    Requests:
      cpu:        250m
      memory:     256Mi

QoS Class:       Burstable
```

Check if resource constraints are causing issues:

```bash
# Check for OOMKilled
kubectl describe pod myapp-pod | grep -i "OOMKilled"

# View resource pressure
kubectl describe pod myapp-pod | grep -A 5 "Conditions:"

# Example output:
Conditions:
  Type              Status
  Initialized       True
  Ready             False    # Pod not ready
  ContainersReady   False
  PodScheduled      True
```

## Understanding Container Status

The Containers section reveals why containers aren't running:

```bash
kubectl describe pod myapp-pod | grep -A 30 "Containers:"
```

Key fields to examine:

```yaml
State:          Waiting
  Reason:       CrashLoopBackOff
Last State:     Terminated
  Reason:       Error
  Exit Code:    137    # 137 = OOMKilled
  Started:      Mon, 09 Feb 2026 10:30:00 +0000
  Finished:     Mon, 09 Feb 2026 10:30:45 +0000
Restart Count:  5
```

Common exit codes:

```bash
# 0: Success
# 1: General error
# 2: Misuse of shell builtins
# 126: Command cannot execute
# 127: Command not found
# 128+n: Fatal error signal n
# 137: SIGKILL (OOMKilled = 128+9)
# 143: SIGTERM (128+15)
```

## Troubleshooting Scheduling Issues

When pods won't schedule, describe shows why:

```bash
kubectl describe pod pending-pod
```

Look for scheduling-related events:

```yaml
Events:
  Type     Reason            Message
  ----     ------            -------
  Warning  FailedScheduling  0/3 nodes are available: 1 node(s) had taint {node-role.kubernetes.io/master: }, that the pod didn't tolerate, 2 Insufficient cpu.
```

Common scheduling problems:

```bash
# Insufficient resources
0/3 nodes available: 3 Insufficient memory

# Taints and tolerations
node(s) had taint {key: value}, that the pod didn't tolerate

# Node selector mismatch
0/3 nodes available: 3 node(s) didn't match node selector

# Affinity rules
0/3 nodes available: 3 node(s) didn't match pod affinity rules

# Topology constraints
0/3 nodes available: 3 node(s) didn't satisfy existing topology spread constraints
```

Investigate node capacity:

```bash
# Compare pod requests to node capacity
kubectl describe pod pending-pod | grep -A 5 "Requests:"
kubectl describe nodes | grep -A 5 "Allocated resources:"

# Find nodes with available resources
kubectl describe nodes | grep -E "Name:|Allocated|cpu|memory" | less
```

## Analyzing Volume Mount Issues

Volume problems appear in both status and events:

```bash
kubectl describe pod myapp-pod | grep -A 20 "Volumes:"
kubectl describe pod myapp-pod | grep -i "mount"
```

Common volume issues:

```yaml
# PVC not bound
Events:
  Warning  FailedMount  pod has unbound immediate PersistentVolumeClaims

# Volume doesn't exist
Events:
  Warning  FailedMount  MountVolume.SetUp failed: configmap "app-config" not found

# Permission denied
Events:
  Warning  FailedMount  Unable to mount volumes: chown /data: permission denied
```

Debug volume configuration:

```bash
# Check PVC status
PVC_NAME=$(kubectl describe pod myapp-pod | grep "ClaimName:" | awk '{print $2}')
kubectl describe pvc $PVC_NAME

# Verify ConfigMap exists
kubectl describe pod myapp-pod | grep "ClaimName:\|Type:"
kubectl get configmap app-config

# Check Secret
kubectl describe pod myapp-pod | grep -A 2 "SecretName:"
```

## Investigating Network Problems

Network-related information in describe output:

```bash
kubectl describe pod myapp-pod | grep -E "IP:|Hostname:|Subdomain:|DNS"
```

Output example:

```yaml
IP:           10.244.1.15
IPs:
  IP:  10.244.1.15
Hostname:     myapp-pod
Subdomain:    myapp-service
```

Check readiness and liveness probes:

```bash
kubectl describe pod myapp-pod | grep -A 10 "Liveness:\|Readiness:"
```

Probe failure events:

```yaml
Events:
  Warning  Unhealthy  Liveness probe failed: Get http://10.244.1.15:8080/health: dial tcp 10.244.1.15:8080: connect: connection refused
  Warning  Unhealthy  Readiness probe failed: HTTP probe failed with statuscode: 503
```

## Using describe for Multi-Container Pods

Analyze each container individually:

```bash
kubectl describe pod myapp-pod
```

Each container has its own section:

```yaml
Containers:
  app:
    State:         Running
    Ready:         True
    Restart Count: 0
  sidecar:
    State:         Waiting
      Reason:      CrashLoopBackOff
    Last State:    Terminated
      Reason:      Error
      Exit Code:   1
    Ready:         False
    Restart Count: 5
```

Init containers have a separate section:

```bash
kubectl describe pod myapp-pod | grep -A 20 "Init Containers:"
```

Example init container issue:

```yaml
Init Containers:
  init-config:
    State:          Terminated
      Reason:       Error
      Exit Code:    1
    Ready:          False
    Restart Count:  3
```

## Batch Analysis of Multiple Pods

Analyze patterns across multiple pods:

```bash
# Describe all pods with a label
kubectl describe pods -l app=myapp > all-pods.txt

# Extract just events from all pods
kubectl describe pods -l app=myapp | grep -A 10 "Events:" > pod-events.txt

# Find common issues
kubectl describe pods -l app=myapp | grep -i "error\|failed\|warning" | sort | uniq -c

# Compare two pod descriptions
diff <(kubectl describe pod pod-1) <(kubectl describe pod pod-2)
```

Create a function to summarize pod health:

```bash
pod-health() {
  POD=$1
  echo "=== $POD Health Summary ==="
  echo -n "Status: "
  kubectl describe pod $POD | grep "^Status:" | awk '{print $2}'

  echo -n "Ready: "
  kubectl describe pod $POD | grep "^Ready:" | awk '{print $2}'

  echo -n "Restart Count: "
  kubectl describe pod $POD | grep "Restart Count:" | awk '{sum+=$3} END {print sum}'

  echo -n "Recent Events: "
  kubectl describe pod $POD | grep -A 5 "Events:" | tail -5
  echo ""
}

# Usage
pod-health myapp-7d8f9b6c5d-k4m2n
```

## Advanced Describe Patterns

Extract specific information programmatically:

```bash
# Get pod IP
kubectl describe pod myapp-pod | grep "^IP:" | awk '{print $2}'

# Get node name
kubectl describe pod myapp-pod | grep "^Node:" | awk '{print $2}' | cut -d'/' -f1

# Get QoS class
kubectl describe pod myapp-pod | grep "^QoS Class:" | awk '{print $3}'

# Get all container images
kubectl describe pod myapp-pod | grep "Image:" | awk '{print $2}'

# Count restarts
kubectl describe pod myapp-pod | grep "Restart Count:" | awk '{sum+=$3} END {print sum}'
```

Create monitoring scripts:

```bash
#!/bin/bash
# pod-monitor.sh

NAMESPACE=${1:-default}
LABEL=${2:-app}

echo "Monitoring pods in namespace: $NAMESPACE"
echo ""

for pod in $(kubectl get pods -n $NAMESPACE -l $LABEL -o name); do
  POD_NAME=$(basename $pod)
  echo "=== $POD_NAME ==="

  # Get status
  STATUS=$(kubectl describe pod $POD_NAME -n $NAMESPACE | grep "^Status:" | awk '{print $2}')
  echo "Status: $STATUS"

  # Check for recent errors
  ERRORS=$(kubectl describe pod $POD_NAME -n $NAMESPACE | grep -i "error\|failed" | tail -3)
  if [ -n "$ERRORS" ]; then
    echo "Recent Issues:"
    echo "$ERRORS"
  fi

  echo ""
done
```

## Combining describe with Other Commands

Use describe in conjunction with other kubectl commands:

```bash
# Get pod name from deployment, then describe
POD=$(kubectl get pods -l app=myapp -o name | head -1)
kubectl describe $POD

# Describe pod and check logs
kubectl describe pod myapp-pod
kubectl logs myapp-pod --tail=50

# Describe and exec for live debugging
kubectl describe pod myapp-pod | grep "^Node:"
kubectl exec -it myapp-pod -- /bin/sh

# Describe and get events
kubectl describe pod myapp-pod > pod-desc.txt
kubectl get events --field-selector involvedObject.name=myapp-pod > pod-events.txt
```

## Conclusion

The kubectl describe command is an invaluable tool for diagnosing Kubernetes pod issues. By understanding how to read and interpret its output, especially the Events section, you can quickly identify problems with scheduling, resource allocation, volume mounts, networking, and container lifecycle.

Master the art of correlating events with status information, and combine describe with logs and exec commands for comprehensive troubleshooting. This makes describe your go-to command for understanding what's happening with your Kubernetes workloads.
