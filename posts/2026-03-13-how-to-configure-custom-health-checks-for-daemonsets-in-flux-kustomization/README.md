# How to Configure Custom Health Checks for DaemonSets in Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, Health Checks, DaemonSets, Kustomization

Description: Learn how to configure custom health checks for DaemonSet resources in Flux Kustomization to verify node-level workloads are running correctly across your cluster.

---

## Introduction

DaemonSets ensure that a copy of a pod runs on every node (or a selected subset of nodes) in your Kubernetes cluster. They are commonly used for log collectors, monitoring agents, network plugins, and storage drivers. Health checking DaemonSets in Flux is important because these workloads form the foundation layer that other applications depend on. This guide covers how to set up custom health checks for DaemonSets in Flux Kustomization.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source
- One or more DaemonSets deployed through Flux

## How DaemonSet Health Checking Works

Flux considers a DaemonSet healthy when the number of desired pods equals the number of ready pods and the update has been rolled out to all nodes. Unlike Deployments with a fixed replica count, DaemonSets automatically adjust their pod count based on the number of eligible nodes, so the health check must verify that the current state matches the desired state across all nodes.

## Basic DaemonSet Health Check

Configure a health check for a DaemonSet in your Flux Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: logging
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/logging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: fluentbit
      namespace: logging
```

This tells Flux to wait until the `fluentbit` DaemonSet has all pods running and ready on every eligible node before marking the reconciliation as successful.

## Health Checking Infrastructure DaemonSets

Infrastructure DaemonSets like CNI plugins, CSI drivers, and monitoring agents should be health checked as a group:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: node-infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/node-level
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 15m
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: node-exporter
      namespace: monitoring
    - apiVersion: apps/v1
      kind: DaemonSet
      name: fluentbit
      namespace: logging
    - apiVersion: apps/v1
      kind: DaemonSet
      name: datadog-agent
      namespace: monitoring
```

## Example DaemonSet with Readiness Probe

A well-configured DaemonSet includes a readiness probe that Flux relies on for health checking:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentbit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluentbit
  template:
    metadata:
      labels:
        app: fluentbit
    spec:
      tolerations:
        - operator: Exists
      containers:
        - name: fluentbit
          image: fluent/fluent-bit:3.0
          ports:
            - containerPort: 2020
          readinessProbe:
            httpGet:
              path: /api/v1/health
              port: 2020
            initialDelaySeconds: 10
            periodSeconds: 10
          volumeMounts:
            - name: varlog
              mountPath: /var/log
              readOnly: true
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
```

The readiness probe on port 2020 tells Kubernetes (and by extension Flux) when each Fluent Bit pod is ready to collect logs.

## Setting Timeouts for Large Clusters

DaemonSet rollouts on large clusters take longer because updates happen on one node at a time by default. Calculate the timeout based on your cluster size:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring-agents
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/monitoring
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 30m
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: prometheus-node-exporter
      namespace: monitoring
```

For a 50-node cluster with a DaemonSet using the default `maxUnavailable: 1` rolling update strategy, each pod needing approximately 30 seconds to become ready, you need at least 25 minutes. Add buffer for image pulls and scheduling delays.

## DaemonSets with Node Selectors

When your DaemonSet only targets specific nodes, the health check still works correctly because Flux checks against the desired count, not the total node count:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: gpu-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: gpu-monitor
  template:
    metadata:
      labels:
        app: gpu-monitor
    spec:
      nodeSelector:
        accelerator: nvidia-gpu
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
      containers:
        - name: gpu-monitor
          image: nvidia/dcgm-exporter:3.3.0
          ports:
            - containerPort: 9400
```

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gpu-monitoring
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/gpu-monitoring
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: gpu-monitor
      namespace: monitoring
```

Flux will only wait for the DaemonSet to be ready on nodes with the `accelerator: nvidia-gpu` label.

## Ordering DaemonSets Before Applications

DaemonSets that provide node-level services should be healthy before applications that depend on them deploy:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: csi-driver
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/csi
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: ebs-csi-node
      namespace: kube-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: stateful-apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/stateful
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: csi-driver
  wait: true
  timeout: 15m
```

The CSI driver DaemonSet must be healthy on all nodes before StatefulSets that need persistent volumes are deployed.

## Using wait: true for DaemonSet Kustomizations

When a Kustomization contains only a DaemonSet and its associated resources, using `wait: true` is the simplest approach:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: log-collection
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/logging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 15m
```

## Debugging DaemonSet Health Check Failures

When a DaemonSet health check fails:

```bash
# Check Kustomization status
flux get kustomization logging

# Check DaemonSet status
kubectl get daemonset fluentbit -n logging

# Check for pods not scheduling
kubectl get pods -n logging -l app=fluentbit -o wide

# Look for scheduling issues
kubectl describe daemonset fluentbit -n logging

# Check specific node pods
kubectl get pods -n logging -l app=fluentbit --field-selector spec.nodeName=node-01
```

Common DaemonSet health check failures include:

- Nodes with taints that the DaemonSet does not tolerate
- Insufficient resources on specific nodes
- Image pull failures on nodes without registry access
- Readiness probe failures due to missing host paths or permissions
- DaemonSet pods evicted due to node pressure

## Conclusion

Custom health checks for DaemonSets in Flux Kustomization ensure that your node-level infrastructure is fully deployed before applications that depend on it begin running. By specifying DaemonSets in the `healthChecks` field with appropriate timeouts and using Kustomization dependencies, you create a reliable deployment pipeline that respects the order in which infrastructure and application layers must come up. This is especially important for CNI plugins, storage drivers, and monitoring agents that must be available on every node before workloads can function correctly.
