# How to Use kubectl describe for Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Debugging, Troubleshooting, DevOps

Description: Master the kubectl describe command for debugging Kubernetes resources, understanding events, diagnosing scheduling failures, and interpreting status conditions effectively.

---

The `kubectl describe` command is one of the most powerful debugging tools in Kubernetes. While `kubectl get` shows you what resources exist, `describe` tells you why they are in their current state. This guide shows you how to extract actionable information from describe output to diagnose problems quickly.

## Understanding describe Output

The describe command shows detailed information about a resource including:

- Resource specification and configuration
- Current status and conditions
- Events (recent actions taken on the resource)
- Related resources

```bash
# Basic describe syntax
kubectl describe <resource-type> <resource-name> -n <namespace>

# Examples
kubectl describe pod my-pod -n production
kubectl describe deployment my-app -n production
kubectl describe node worker-1
kubectl describe service my-service -n production
```

## Debugging Pods

Pod describe output contains critical debugging information:

```bash
# Describe a pod
kubectl describe pod api-server-xyz -n production
```

Key sections to examine:

```
Name:         api-server-xyz
Namespace:    production
Node:         worker-2/192.168.1.102
Start Time:   Mon, 25 Jan 2026 10:00:00 +0000
Labels:       app=api-server
              version=v1.5.0
Annotations:  prometheus.io/scrape: true
Status:       Running
IP:           10.244.2.15

# Container section shows resource limits, ports, and mounts
Containers:
  api:
    Container ID:   containerd://abc123
    Image:          myapi:1.5.0
    Image ID:       sha256:def456
    Port:           8080/TCP
    State:          Running
      Started:      Mon, 25 Jan 2026 10:00:05 +0000
    Ready:          True
    Restart Count:  0
    Limits:
      cpu:     500m
      memory:  256Mi
    Requests:
      cpu:     100m
      memory:  128Mi
    Liveness:   http-get http://:8080/health delay=10s timeout=3s period=10s
    Readiness:  http-get http://:8080/ready delay=5s timeout=3s period=5s
    Environment:
      DATABASE_URL:  <set to the key 'url' in secret 'db-creds'>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access

# Conditions show overall pod health
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True

# Events show what happened to the pod
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  5m    default-scheduler  Successfully assigned production/api-server-xyz to worker-2
  Normal  Pulled     5m    kubelet            Container image "myapi:1.5.0" already present on machine
  Normal  Created    5m    kubelet            Created container api
  Normal  Started    5m    kubelet            Started container api
```

## Interpreting Events

Events tell you what Kubernetes has done to a resource. Focus on:

```bash
# Get just the events section
kubectl describe pod my-pod -n production | grep -A 50 "Events:"

# Or use kubectl events (Kubernetes 1.26+)
kubectl events --for pod/my-pod -n production
```

Common event patterns and their meanings:

| Event | Meaning | Action |
|-------|---------|--------|
| `FailedScheduling` | No node can run this pod | Check resource requests, node selectors, taints |
| `Pulling` / `Pulled` | Image being downloaded | Normal, wait for completion |
| `Failed` with `ImagePullBackOff` | Cannot pull container image | Check image name, registry credentials |
| `Created` / `Started` | Container lifecycle | Normal events |
| `Unhealthy` | Probe failed | Check probe configuration and application health |
| `Killing` | Container being terminated | Check liveness probe or resource limits |
| `BackOff` | Container crashed, waiting before restart | Check logs with `kubectl logs --previous` |

## Debugging Deployments

Deployment describe shows rollout status and replica set management:

```bash
kubectl describe deployment api-server -n production
```

Key sections:

```
Name:                   api-server
Namespace:              production
Selector:               app=api-server
Replicas:               3 desired | 3 updated | 3 total | 3 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge

# Shows current and old ReplicaSets
OldReplicaSets:    api-server-abc123 (0/0 replicas created)
NewReplicaSet:     api-server-def456 (3/3 replicas created)

# Deployment events
Events:
  Type    Reason             Age   From                   Message
  ----    ------             ----  ----                   -------
  Normal  ScalingReplicaSet  10m   deployment-controller  Scaled up replica set api-server-def456 to 3
```

If a rollout is stuck:

```bash
# Check deployment conditions
kubectl describe deployment api-server -n production | grep -A 10 "Conditions:"

# Common stuck conditions:
# - Progressing: False (rollout not making progress)
# - Available: False (not enough replicas ready)
```

## Debugging Services

Service describe shows endpoint mapping:

```bash
kubectl describe service api-server -n production
```

```
Name:              api-server
Namespace:         production
Labels:            app=api-server
Selector:          app=api-server
Type:              ClusterIP
IP:                10.96.45.67
Port:              http  80/TCP
TargetPort:        8080/TCP
Endpoints:         10.244.1.5:8080,10.244.2.15:8080,10.244.3.22:8080

# If Endpoints is <none>, no pods match the selector
```

Debug service connectivity:

```bash
# Check endpoints separately
kubectl get endpoints api-server -n production

# If empty, pods do not match service selector
kubectl describe service api-server -n production | grep Selector
kubectl get pods -n production --show-labels | grep api-server
```

## Debugging Nodes

Node describe shows capacity, conditions, and running pods:

```bash
kubectl describe node worker-1
```

Key sections:

```
# Resource capacity and usage
Capacity:
  cpu:                4
  memory:             16Gi
  pods:               110
Allocatable:
  cpu:                3800m
  memory:             15Gi
  pods:               110

# Current resource usage
Allocated resources:
  Resource           Requests    Limits
  --------           --------    ------
  cpu                2100m (55%) 4200m (110%)
  memory             8Gi (53%)   12Gi (80%)

# Node conditions indicate health
Conditions:
  Type             Status  Reason
  ----             ------  ------
  MemoryPressure   False   KubeletHasSufficientMemory
  DiskPressure     False   KubeletHasNoDiskPressure
  PIDPressure      False   KubeletHasSufficientPID
  Ready            True    KubeletReady

# Taints affect scheduling
Taints:             <none>

# Pods running on this node
Non-terminated Pods:
  Namespace    Name                CPU Requests  Memory Requests
  ---------    ----                ------------  ---------------
  production   api-server-xyz      100m          128Mi
  monitoring   prometheus-abc      200m          512Mi
```

## Debugging PersistentVolumeClaims

PVC describe shows binding status and storage details:

```bash
kubectl describe pvc data-volume -n production
```

```
Name:          data-volume
Namespace:     production
StorageClass:  fast-ssd
Status:        Bound
Volume:        pvc-abc123
Capacity:      50Gi
Access Modes:  RWO
VolumeMode:    Filesystem

# If Status is Pending, check events
Events:
  Type     Reason                Age   From                         Message
  ----     ------                ----  ----                         -------
  Warning  ProvisioningFailed    5m    persistentvolume-controller  storageclass.storage.k8s.io "fast-ssd" not found
```

## Filtering describe Output

Extract specific information from describe output:

```bash
# Get only events
kubectl describe pod my-pod -n production | grep -A 100 "Events:"

# Get only conditions
kubectl describe pod my-pod -n production | grep -A 10 "Conditions:"

# Get container state
kubectl describe pod my-pod -n production | grep -A 5 "State:"

# Get resource requests and limits
kubectl describe pod my-pod -n production | grep -A 4 "Limits:"
kubectl describe pod my-pod -n production | grep -A 4 "Requests:"

# Get image being used
kubectl describe pod my-pod -n production | grep "Image:"
```

## Describe with Labels and Selectors

Describe multiple resources at once:

```bash
# Describe all pods with a label
kubectl describe pods -l app=api-server -n production

# Describe all pods in a namespace
kubectl describe pods -n production

# Describe multiple specific resources
kubectl describe pod pod1 pod2 pod3 -n production
```

## Quick Debugging Workflow

When something is not working:

```bash
# Step 1: Get overview of the problematic resource
kubectl describe deployment my-app -n production

# Step 2: Check the ReplicaSet
kubectl describe replicaset -l app=my-app -n production

# Step 3: Check individual pods
kubectl describe pods -l app=my-app -n production

# Step 4: If scheduling issues, check nodes
kubectl describe nodes | grep -A 10 "Conditions:"

# Step 5: Check related resources (services, configmaps, secrets)
kubectl describe service my-app -n production
kubectl describe configmap my-app-config -n production
```

## Common describe Patterns

Create aliases for frequent describe patterns:

```bash
# Add to your shell profile
alias kdp='kubectl describe pod'
alias kdd='kubectl describe deployment'
alias kds='kubectl describe service'
alias kdn='kubectl describe node'

# Usage
kdp my-pod -n production
```

---

The `kubectl describe` command is essential for understanding why Kubernetes resources are in their current state. The Events section is often the most valuable, showing exactly what actions have been taken and what errors occurred. Master reading describe output and you will solve most Kubernetes problems faster. Combine it with `kubectl get`, `kubectl logs`, and `kubectl events` for a complete debugging toolkit.
