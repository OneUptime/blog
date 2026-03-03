# How to Configure Resource Limits for Pods on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Resource Limits, Pod Configuration, Cluster Management

Description: A practical guide to setting CPU and memory resource limits for pods running on Talos Linux Kubernetes clusters.

---

Running Kubernetes workloads without resource limits is like giving every tenant in an apartment building unlimited access to electricity and water. Eventually, one noisy neighbor will consume everything and bring the whole building down. In a Talos Linux cluster, properly configuring resource requests and limits for your pods is essential for stability, performance, and fair resource sharing.

Talos Linux, as an immutable and minimal operating system built for Kubernetes, gives you a clean foundation. But the OS itself does not enforce pod-level resource constraints. That responsibility falls on Kubernetes resource management, and getting it right takes some thought.

## Requests vs. Limits

Before jumping into configuration, it helps to understand the difference between resource requests and resource limits.

**Requests** are what the scheduler uses to decide where to place a pod. When you set a CPU request of 250m, the scheduler finds a node with at least 250 millicores of allocatable capacity. The pod is guaranteed to have access to that amount.

**Limits** are the maximum a pod can consume. If a container tries to use more CPU than its limit, it gets throttled. If it tries to use more memory than its limit, it gets killed (OOMKilled).

The relationship between requests and limits determines your Quality of Service (QoS) class:

- **Guaranteed** - Requests equal limits for all containers in the pod
- **Burstable** - At least one container has a request or limit set, but they are not equal
- **BestEffort** - No requests or limits set at all

## Setting Resource Limits on a Pod

Here is a basic example of a deployment with resource requests and limits:

```yaml
# web-app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web-app
        image: myregistry/web-app:v1.2.0
        ports:
        - containerPort: 8080
        resources:
          # Minimum guaranteed resources
          requests:
            cpu: "250m"        # 0.25 CPU cores
            memory: "256Mi"    # 256 megabytes
          # Maximum allowed resources
          limits:
            cpu: "500m"        # 0.5 CPU cores
            memory: "512Mi"    # 512 megabytes
```

For CPU, the unit "m" stands for millicores. 1000m equals 1 full CPU core. For memory, you can use Mi (mebibytes), Gi (gibibytes), or plain bytes.

## Understanding CPU Throttling on Talos

When a container hits its CPU limit on a Talos Linux node, the kernel's CFS (Completely Fair Scheduler) throttles it. The container does not get killed, but it slows down. This is important to understand because CPU throttling can cause latency spikes that are hard to debug.

You can check if a container is being throttled by looking at its cgroup stats:

```bash
# Find the pod's cgroup on the node (via talosctl)
talosctl -n 192.168.1.10 read /sys/fs/cgroup/cpu/kubepods/burstable/pod<pod-uid>/cpu.stat

# Look for nr_throttled and throttled_time values
# High values indicate the container is hitting its CPU limit
```

A good practice is to set CPU limits generously or consider not setting CPU limits at all if your cluster has adequate capacity. Many teams set CPU requests (to help with scheduling) but leave CPU limits unset to avoid throttling.

## Setting Memory Limits Carefully

Memory limits are stricter than CPU limits. When a container exceeds its memory limit, the kernel OOM killer terminates it. This results in a pod restart, which can be disruptive.

```yaml
# memory-intensive-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-processor
spec:
  replicas: 2
  selector:
    matchLabels:
      app: data-processor
  template:
    metadata:
      labels:
        app: data-processor
    spec:
      containers:
      - name: processor
        image: myregistry/data-processor:latest
        resources:
          requests:
            # Set request close to actual usage
            memory: "1Gi"
            cpu: "500m"
          limits:
            # Give headroom above request for spikes
            memory: "2Gi"
            cpu: "1000m"
        env:
        - name: JAVA_OPTS
          # For JVM apps, set heap size below container limit
          value: "-Xmx1536m -Xms512m"
```

For JVM-based applications, always set the heap size below your memory limit. The JVM uses memory beyond the heap for thread stacks, class metadata, and native allocations. A good rule of thumb is to set the heap at about 75% of the container memory limit.

## Using LimitRange for Namespace Defaults

Instead of setting resource limits on every single pod, you can create a LimitRange in a namespace. This sets default requests and limits for any pod that does not specify them.

```yaml
# limit-range.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
  - default:
      # Default limits if not specified in pod
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:
      # Default requests if not specified in pod
      cpu: "100m"
      memory: "128Mi"
    max:
      # Maximum limits any pod can request
      cpu: "4"
      memory: "8Gi"
    min:
      # Minimum limits any pod must request
      cpu: "50m"
      memory: "64Mi"
    type: Container
```

Apply it with kubectl:

```bash
# Apply the LimitRange to the namespace
kubectl apply -f limit-range.yaml

# Verify it was created
kubectl describe limitrange default-limits -n production
```

Now any pod deployed to the production namespace without explicit resource settings will automatically get the defaults.

## Using ResourceQuota for Namespace Budgets

While LimitRange controls individual pods, ResourceQuota controls the total resource consumption across an entire namespace:

```yaml
# resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    # Total CPU and memory across all pods
    requests.cpu: "20"
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
    # Maximum number of pods
    pods: "100"
```

```bash
# Apply the quota
kubectl apply -f resource-quota.yaml

# Check current usage against the quota
kubectl describe resourcequota production-quota -n production
```

## Talos Linux Node Capacity

Talos Linux reserves some resources for system components. When planning your resource limits, you need to account for the allocatable capacity, not the total node capacity. Check what is available:

```bash
# Check the allocatable resources on each node
kubectl describe node talos-worker-1 | grep -A 6 Allocatable

# Example output:
# Allocatable:
#   cpu:                4
#   ephemeral-storage:  95Gi
#   hugepages-1Gi:      0
#   hugepages-2Mi:      0
#   memory:             15897Mi
#   pods:               110
```

Talos reserves CPU and memory for the kubelet, container runtime, and system services. The exact amounts depend on the node's total resources. You can customize these reservations in the Talos machine configuration:

```yaml
# Customize kubelet resource reservations
machine:
  kubelet:
    extraConfig:
      systemReserved:
        cpu: "500m"
        memory: "1Gi"
      kubeReserved:
        cpu: "500m"
        memory: "1Gi"
      evictionHard:
        memory.available: "500Mi"
        nodefs.available: "10%"
```

## Monitoring Resource Usage

Setting limits is only half the battle. You need to monitor actual usage to know if your limits are too tight or too generous:

```bash
# View current resource usage per pod
kubectl top pods -n production

# View node-level resource usage
kubectl top nodes

# Check for OOMKilled events
kubectl get events -n production --field-selector reason=OOMKilling
```

If you see pods frequently getting OOMKilled, your memory limits are too low. If you see high CPU throttling, your CPU limits might be too restrictive.

## Best Practices for Talos Linux Clusters

Start by observing your application's actual resource usage before setting limits. Deploy without limits in a staging environment, monitor with kubectl top and metrics-server, then set requests at the P50 usage and limits at the P99 usage.

Always set memory limits. Memory is an incompressible resource, and a single memory leak can take down a node. CPU limits are more debatable, and some teams choose to set only CPU requests.

Use Guaranteed QoS class for critical workloads like databases and control plane components. Use Burstable for typical applications. Avoid BestEffort in production since those pods are the first to be evicted under pressure.

By thoughtfully configuring resource limits on your Talos Linux cluster, you protect against noisy neighbors, enable efficient scheduling, and keep your cluster stable under varying loads.
