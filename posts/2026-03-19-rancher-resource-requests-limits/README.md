# How to Set Resource Requests and Limits in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Workload

Description: Learn how to configure CPU and memory resource requests and limits for workloads in Rancher to ensure proper resource allocation and cluster stability.

Resource requests and limits are fundamental to running stable Kubernetes workloads. Requests define the minimum resources a container needs, while limits set the maximum it can consume. Properly configuring these values prevents resource starvation, ensures fair scheduling, and protects your cluster from runaway containers. This guide shows you how to set resource requests and limits in Rancher.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster registered in Rancher
- Access to a project and namespace

## Understanding Requests vs. Limits

**Requests** are the resources a container asks for. The Kubernetes scheduler uses requests to decide which node can fit the pod. If a node does not have enough allocatable resources available to satisfy those requests, the pod will not be scheduled there.

**Limits** are the maximum resources a container can use. If a container exceeds its memory limit, it is killed (OOMKilled). If it exceeds its CPU limit, it is throttled.

| Resource | Request | Limit |
|----------|---------|-------|
| CPU | Requested amount used for scheduling | Maximum allowed (throttled if exceeded) |
| Memory | Requested amount used for scheduling | Maximum allowed (OOMKilled if exceeded) |

## Step 1: Navigate to Workload Configuration

In the Rancher dashboard, click **☰ > Cluster Management**, open your cluster with **Explore**, and then go to **Workload**. Select **Deployment** (or another workload type). Click **Create** for a new workload, or click the three-dot menu and select **Edit Config** for an existing one.

## Step 2: Set Resource Requests and Limits via the UI

In the workload creation or edit form:

1. Scroll to the **Resources** section of the container configuration
2. You will see fields for:
   - **CPU Reservation (Request)**: Enter a value like `100m` (100 millicores, or 0.1 CPU)
   - **CPU Limit**: Enter a value like `500m` (0.5 CPU)
   - **Memory Reservation (Request)**: Enter a value like `128Mi`
   - **Memory Limit**: Enter a value like `256Mi`

### CPU Units

CPU is measured in millicores (m):

- `100m` = 0.1 CPU core
- `250m` = 0.25 CPU core
- `1000m` = 1 full CPU core
- `1` = 1 full CPU core (same as 1000m)

### Memory Units

Memory uses binary or decimal units:

- `128Mi` = 128 mebibytes (134,217,728 bytes)
- `256Mi` = 256 mebibytes
- `1Gi` = 1 gibibyte (1,073,741,824 bytes)
- `512M` = 512 megabytes (decimal, 512,000,000 bytes)

## Step 3: Apply via YAML

For more precise control, use YAML:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-web-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-web-app
  template:
    metadata:
      labels:
        app: my-web-app
    spec:
      containers:
        - name: web
          image: nginx:latest
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
        - name: sidecar
          image: fluentd:latest
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
```

Each container in a pod can have its own resource requests and limits.

## Step 4: Set Namespace-Level Defaults with LimitRanges

LimitRanges set default requests and limits for all containers in a namespace that do not specify their own values.

Navigate to your namespace in Rancher, or apply via YAML:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: default
spec:
  limits:
    - type: Container
      default:
        cpu: 250m
        memory: 256Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: 2000m
        memory: 2Gi
      min:
        cpu: 50m
        memory: 64Mi
```

This sets default requests of 100m CPU and 128Mi memory, default limits of 250m CPU and 256Mi memory, and enforces per-container minimums of 50m CPU and 64Mi memory and maximums of 2 CPU and 2Gi memory.

## Step 5: Set Namespace-Level Quotas with ResourceQuotas

ResourceQuotas limit the total resources consumed by all pods in a namespace:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: default
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"
```

In Rancher, you can set project-level resource quotas by going to **☰ > Cluster Management**, opening your cluster with **Explore**, and then selecting **Cluster > Projects/Namespaces**. In **Group by Project** view, choose your project, click **Edit Config**, and configure **Resource Quotas**.

## Guidelines for Setting Values

### Right-Sizing Requests

1. Start with conservative requests based on expected usage
2. Monitor actual usage over time using Rancher's monitoring tools
3. Adjust requests to match the P95 (95th percentile) of actual usage

### Right-Sizing Limits

1. Set limits higher than requests to allow for traffic spikes
2. A common ratio is limits = 2x requests for CPU
3. For memory, be cautious since exceeding limits causes OOMKill
4. Some teams set memory limits equal to requests for predictability

### Common Patterns by Workload Type

**Web servers (nginx, Node.js):**

```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

**Application servers (Java, .NET):**

```yaml
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 2000m
    memory: 2Gi
```

**Background workers:**

```yaml
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

## Monitoring Resource Usage

Rancher provides built-in monitoring when the `rancher-monitoring` chart is installed:

1. Click **☰ > Cluster Management**, open your cluster with **Explore**, and then go to **Monitoring > Grafana**
2. Look at a built-in pod compute resources dashboard, such as **Kubernetes / Compute Resources / Pod**
3. Compare actual usage against requests and limits

Using kubectl:

```bash
kubectl top pod -n default
kubectl top node
```

Check if any pods have been OOMKilled:

```bash
kubectl get pods -n default -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[*].lastState.terminated.reason}{"\n"}{end}'
```

## QoS Classes

Kubernetes assigns a Quality of Service class to each pod based on its resource configuration:

- **Guaranteed**: All containers have equal requests and limits for both CPU and memory
- **Burstable**: At least one container has a request or limit set, but they are not all equal
- **BestEffort**: No requests or limits set on any container

When the node is under memory pressure, BestEffort pods are evicted first, then Burstable, and Guaranteed pods last.

## Summary

Setting resource requests and limits is essential for cluster stability and efficient resource utilization. Rancher makes it easy to configure these values through its UI for individual workloads, and supports LimitRanges and ResourceQuotas for namespace and project-level controls. Monitor actual usage over time and adjust your values to find the right balance between resource efficiency and application performance.
