# How to Use Spot Instances with Dapr on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Spot Instance, Kubernetes, Cost, High Availability

Description: Run Dapr workloads on Kubernetes spot or preemptible instances to reduce compute costs by up to 80% while maintaining reliability through anti-affinity rules and graceful shutdown handling.

---

## Why Spot Instances Work Well with Dapr

Dapr's resiliency features - automatic retries, circuit breakers, and pub/sub redelivery - make it well-suited for spot instance workloads. When a spot node is preempted, Dapr's retry policies and the underlying message queue's durability ensure in-flight work is not lost.

## Setting Up Spot Node Pools

For AWS EKS:

```bash
eksctl create nodegroup \
  --cluster my-cluster \
  --name spot-workers \
  --instance-types m5.large,m5a.large,m4.large \
  --nodes-min 2 \
  --nodes-max 20 \
  --spot \
  --node-labels "node.kubernetes.io/lifecycle=spot"
```

For GKE:

```bash
gcloud container node-pools create spot-pool \
  --cluster my-cluster \
  --machine-type n2-standard-2 \
  --spot \
  --num-nodes 3 \
  --node-labels "cloud.google.com/gke-spot=true"
```

## Scheduling Dapr Workloads on Spot Nodes

Use node selectors and tolerations to schedule Dapr-enabled apps on spot nodes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: orders-api
  template:
    metadata:
      labels:
        app: orders-api
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "orders-api"
    spec:
      nodeSelector:
        node.kubernetes.io/lifecycle: spot
      tolerations:
      - key: "spot"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: orders-api
            topologyKey: kubernetes.io/hostname
```

The `podAntiAffinity` ensures pods spread across different nodes, so a single spot node preemption doesn't take down all replicas.

## Handling Graceful Shutdown

Configure Dapr to drain connections gracefully when a spot node receives a preemption signal:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/graceful-shutdown-seconds: "30"
```

This gives the sidecar 30 seconds to complete in-flight requests before terminating.

Also set a `preStop` hook:

```yaml
spec:
  containers:
  - name: orders-api
    lifecycle:
      preStop:
        exec:
          command: ["/bin/sh", "-c", "sleep 5"]
```

The 5-second sleep ensures the Kubernetes service removes the pod from load balancer endpoints before the container stops.

## Keeping Dapr Control Plane on On-Demand Nodes

The Dapr control plane should run on stable on-demand nodes:

```yaml
# Ensure control plane stays on on-demand nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dapr-operator
  namespace: dapr-system
spec:
  template:
    spec:
      nodeSelector:
        node.kubernetes.io/lifecycle: on-demand
```

Apply this patch during Dapr installation:

```bash
helm upgrade dapr dapr/dapr -n dapr-system \
  --set global.nodeSelector."node\\.kubernetes\\.io/lifecycle"=on-demand
```

## Configure Resiliency for Spot Disruptions

Apply aggressive retry policies to handle transient failures from spot preemptions:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: spot-resiliency
spec:
  policies:
    retries:
      spotRetry:
        policy: exponential
        duration: 1s
        maxInterval: 30s
        maxRetries: 10
  targets:
    apps:
      orders-api:
        retry: spotRetry
```

## Summary

Running Dapr workloads on spot instances achieves 60-80% compute cost savings. Ensure reliability by spreading replicas across multiple spot nodes with anti-affinity rules, configuring graceful shutdown with `dapr.io/graceful-shutdown-seconds`, keeping the Dapr control plane on stable on-demand nodes, and applying generous retry policies to handle transient failures from spot preemptions transparently.
