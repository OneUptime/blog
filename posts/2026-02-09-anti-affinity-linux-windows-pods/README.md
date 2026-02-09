# How to Configure Anti-Affinity Between Linux and Windows Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Windows, Scheduling

Description: Learn how to use pod affinity and anti-affinity rules to control scheduling between Linux and Windows pods for optimal resource utilization and application isolation.

---

In mixed-OS Kubernetes clusters, controlling where pods schedule is critical for resource optimization and application requirements. Pod affinity and anti-affinity rules allow you to influence scheduling decisions based on pod labels, node labels, and topology. This guide covers configuring anti-affinity between Linux and Windows pods to prevent scheduling conflicts and optimize cluster utilization.

## Understanding Pod Affinity and Anti-Affinity

Affinity rules express preferences or requirements about where pods should or should not run relative to other pods. Anti-affinity spreads pods across nodes or prevents certain pods from co-locating.

In mixed-OS clusters, you typically want to ensure Windows pods only run on Windows nodes and Linux pods only run on Linux nodes. Additionally, you might want to prevent certain application types from sharing nodes regardless of OS.

## Basic OS-Based Node Affinity

Ensure pods run only on their compatible OS:

```yaml
# linux-pod-node-selector.yaml
apiVersion: v1
kind: Pod
metadata:
  name: linux-app
spec:
  nodeSelector:
    kubernetes.io/os: linux
  containers:
  - name: app
    image: nginx:latest
---
# windows-pod-node-selector.yaml
apiVersion: v1
kind: Pod
metadata:
  name: windows-app
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: app
    image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
```

Using node affinity for more flexibility:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: linux-app-with-affinity
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: kubernetes.io/os
            operator: In
            values:
            - linux
  containers:
  - name: app
    image: nginx:latest
```

## Pod Anti-Affinity to Spread Across Nodes

Prevent multiple replicas from running on the same node:

```yaml
# anti-affinity-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
      os: windows
  template:
    metadata:
      labels:
        app: web
        os: windows
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: web
                os: windows
            topologyKey: kubernetes.io/hostname
      containers:
      - name: iis
        image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
```

This ensures each replica runs on a different Windows node.

## Preventing Cross-OS Pod Interference

Use pod anti-affinity to prevent Windows and Linux pods from sharing nodes in dedicated scenarios:

```yaml
# dedicated-windows-node.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dedicated-windows-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dedicated-app
  template:
    metadata:
      labels:
        app: dedicated-app
        workload-type: dedicated
        os: windows
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      affinity:
        # Prevent scheduling on nodes with Linux pods
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: os
                operator: In
                values:
                - linux
            topologyKey: kubernetes.io/hostname
      containers:
      - name: app
        image: myregistry.azurecr.io/windows-app:v1
```

## Zone-Based Affinity for High Availability

Spread pods across availability zones:

```yaml
# multi-zone-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ha-windows-app
spec:
  replicas: 6
  selector:
    matchLabels:
      app: ha-app
  template:
    metadata:
      labels:
        app: ha-app
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      affinity:
        # Spread across zones
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: ha-app
              topologyKey: topology.kubernetes.io/zone
        # Spread across nodes within zones
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 50
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: ha-app
              topologyKey: kubernetes.io/hostname
      containers:
      - name: app
        image: myregistry.azurecr.io/app:v1
```

## Co-locating Related Pods

Use pod affinity to schedule Windows frontend with Windows backend:

```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
      tier: backend
  template:
    metadata:
      labels:
        app: backend
        tier: backend
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: api
        image: myregistry.azurecr.io/backend:v1
---
# frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
      tier: frontend
  template:
    metadata:
      labels:
        app: frontend
        tier: frontend
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      affinity:
        # Prefer nodes with backend pods
        podAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  tier: backend
              topologyKey: kubernetes.io/hostname
      containers:
      - name: web
        image: myregistry.azurecr.io/frontend:v1
```

## Resource-Based Anti-Affinity

Prevent resource-intensive pods from co-locating:

```yaml
# resource-intensive-pods.yaml
apiVersion: v1
kind: Pod
metadata:
  name: intensive-workload-1
  labels:
    workload: intensive
spec:
  nodeSelector:
    kubernetes.io/os: windows
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: workload
            operator: In
            values:
            - intensive
        topologyKey: kubernetes.io/hostname
  containers:
  - name: processor
    image: myregistry.azurecr.io/heavy-processor:v1
    resources:
      requests:
        memory: "8Gi"
        cpu: "4"
      limits:
        memory: "16Gi"
        cpu: "8"
```

## Taints and Tolerations for OS Isolation

Add taints to Windows nodes:

```bash
# Taint all Windows nodes
kubectl taint nodes -l kubernetes.io/os=windows os=windows:NoSchedule

# Or taint specific node
kubectl taint nodes <windows-node-name> os=windows:NoSchedule
```

Add tolerations to Windows pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: windows-pod-with-toleration
spec:
  nodeSelector:
    kubernetes.io/os: windows
  tolerations:
  - key: "os"
    operator: "Equal"
    value: "windows"
    effect: "NoSchedule"
  containers:
  - name: app
    image: mcr.microsoft.com/windows/servercore:ltsc2022
```

## Complex Affinity Rules

Combine multiple affinity rules:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: complex-affinity-app
spec:
  replicas: 4
  selector:
    matchLabels:
      app: complex-app
  template:
    metadata:
      labels:
        app: complex-app
        environment: production
        tier: application
    spec:
      affinity:
        # Node affinity: Windows only
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/os
                operator: In
                values:
                - windows
              - key: node.kubernetes.io/instance-type
                operator: In
                values:
                - Standard_D4s_v3
                - Standard_D8s_v3
        # Pod affinity: Co-locate with cache pods
        podAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 80
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: redis-cache
              topologyKey: kubernetes.io/hostname
        # Pod anti-affinity: Spread across nodes
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: complex-app
              topologyKey: kubernetes.io/hostname
      containers:
      - name: app
        image: myregistry.azurecr.io/app:v1
```

## Monitoring Scheduling Decisions

Check pod placement:

```bash
# View pod distribution across nodes
kubectl get pods -o wide --sort-by=.spec.nodeName

# Check pending pods
kubectl get pods --field-selector=status.phase=Pending

# Describe pod to see scheduling events
kubectl describe pod <pod-name> | grep -A 10 Events

# View node labels
kubectl get nodes --show-labels

# Check affinity rules
kubectl get pod <pod-name> -o yaml | grep -A 20 affinity
```

## Troubleshooting Affinity Issues

Common problems and solutions:

```bash
# Pod stuck in Pending due to affinity rules
kubectl describe pod <pod-name>
# Look for: "0/N nodes are available: N node(s) didn't match pod affinity/anti-affinity"

# Check if enough nodes meet criteria
kubectl get nodes -l kubernetes.io/os=windows

# Verify pod labels match affinity selectors
kubectl get pods --show-labels

# Check if topology key exists on nodes
kubectl get nodes -o jsonpath='{.items[*].metadata.labels.topology\.kubernetes\.io/zone}'
```

## Conclusion

Pod affinity and anti-affinity provide powerful tools for controlling pod scheduling in mixed-OS clusters. Use node selectors for basic OS targeting, affinity rules for co-location preferences, and anti-affinity to spread workloads for high availability. Combine these with taints and tolerations for strict isolation. Test affinity rules thoroughly to ensure they don't prevent pods from scheduling when nodes are available.
