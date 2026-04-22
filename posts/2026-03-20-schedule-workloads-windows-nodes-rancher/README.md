# How to Schedule Workloads on Windows Nodes in Rancher - Workloads Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Window, Scheduling, Kubernetes, Node Affinity, Taints and Tolerations

Description: Configure Kubernetes scheduling rules in Rancher to place workloads on specific Windows nodes using node selectors, affinity rules, and taints and tolerations.

## Introduction

Kubernetes scheduling on Windows nodes requires explicit configuration because Windows nodes cannot run Linux containers. Without proper scheduling rules, Linux pods will fail on Windows nodes and vice versa. This guide covers common scheduling mechanisms for Windows node targeting.

## Method 1: Node Selector (Simplest)

The simplest way to target Windows nodes:

```yaml
spec:
  nodeSelector:
    kubernetes.io/os: windows                  # Built-in label
    node.kubernetes.io/windows-build: "10.0.20348" # Windows Server 2022 build label
```

## Method 2: Node Affinity (More Flexible)

Node affinity provides required and preferred rules:

```yaml
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: kubernetes.io/os
                operator: In
                values:
                  - windows
              - key: node.kubernetes.io/windows-build
                operator: In
                values:
                  - "10.0.20348"      # Only Windows Server 2022 nodes
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          preference:
            matchExpressions:
              - key: workload-class
                operator: In
                values:
                  - high-performance  # Prefer high-performance nodes
```

## Method 3: Taints and Tolerations

```yaml
# Apply taints to Windows nodes

# kubectl taint node win-node-1 os=windows:NoSchedule

# Add toleration to Windows workloads
spec:
  tolerations:
    - key: os
      operator: Equal
      value: windows
      effect: NoSchedule
```

## Method 4: Pod Topology Spread Constraints

Spread Windows pods across multiple Windows nodes for HA:

```yaml
spec:
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: kubernetes.io/hostname    # One extra pod per node max
      whenUnsatisfiable: DoNotSchedule
      labelSelector:
        matchLabels:
          app: windows-api
  nodeSelector:
    kubernetes.io/os: windows
```

## Method 5: Resource-Based Scheduling

Windows containers have different resource characteristics:

```yaml
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
    - name: app
      resources:
        requests:
          memory: "1Gi"       # Windows containers typically need more memory
          cpu: "250m"
        limits:
          memory: "4Gi"
          cpu: "1"          # Windows can limit CPU; CPU requests are for scheduling
```

## DaemonSet for All Windows Nodes

```yaml
# Run on all Windows nodes
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: windows-agent
spec:
  selector:
    matchLabels:
      app: windows-agent
  template:
    metadata:
      labels:
        app: windows-agent
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      tolerations:
        - effect: NoSchedule
          key: os
          operator: Equal
          value: windows
      containers:
        - name: agent
          image: myregistry/windows-agent:latest
```

## Conclusion

Windows node scheduling in Rancher typically uses node selectors (or affinity) for positive targeting. Add tolerations when the target Windows nodes have `NoSchedule` taints. Use topology spread constraints to distribute Windows pods across multiple nodes for high availability.
