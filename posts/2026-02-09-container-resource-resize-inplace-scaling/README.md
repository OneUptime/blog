# How to Use Container Resource Resize Policies for In-Place Vertical Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Management, Vertical Scaling

Description: Learn how to configure container resource resize policies in Kubernetes to enable in-place vertical scaling without pod restarts, improving application availability and resource efficiency.

---

Traditional vertical scaling in Kubernetes requires recreating pods with new resource requests and limits, causing downtime and disrupting running applications. The container resource resize feature (introduced as alpha in Kubernetes 1.27, promoted to beta in 1.33, and stable in 1.35) enables in-place resource adjustments for running containers, allowing you to increase or decrease CPU and memory while potentially avoiding pod disruption.

This capability is particularly valuable for applications with variable resource needs, long-running stateful workloads, and environments where avoiding disruption is critical.

## Understanding Resource Resize Policies

The `resizePolicy` field in container specifications controls how Kubernetes handles resource changes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resizable-pod
spec:
  containers:
  - name: app
    image: nginx:1.25
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
      limits:
        memory: "512Mi"
        cpu: "500m"
    # Define resize policies
    resizePolicy:
    - resourceName: cpu
      restartPolicy: NotRequired
    - resourceName: memory
      restartPolicy: RestartContainer
```

The `restartPolicy` can be:
- `NotRequired`: Resource change doesn't require container restart
- `RestartContainer`: Container must be restarted for change to take effect

CPU changes typically don't require restarts, while memory changes often do depending on the container runtime.

## Basic In-Place CPU Scaling

Here's a practical example of scaling CPU without restarts:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-server
spec:
  containers:
  - name: nginx
    image: nginx:1.25
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "200m"
        memory: "256Mi"
    resizePolicy:
    - resourceName: cpu
      restartPolicy: NotRequired
    - resourceName: memory
      restartPolicy: NotRequired
    ports:
    - containerPort: 80
```

Apply this pod, then scale CPU in-place:

```bash
# Apply the pod

kubectl apply -f web-server.yaml

# Wait for it to be running
kubectl wait --for=condition=ready pod/web-server

# Patch to increase CPU through the resize subresource
kubectl patch pod web-server --subresource=resize --type='json' -p='[
  {
    "op": "replace",
    "path": "/spec/containers/0/resources/requests/cpu",
    "value": "200m"
  },
  {
    "op": "replace",
    "path": "/spec/containers/0/resources/limits/cpu",
    "value": "400m"
  }
]'

# Check the actual resources applied to the running container
kubectl get pod web-server -o jsonpath='{.status.containerStatuses[0].resources}'
```

The container continues running with updated CPU allocation, no restart needed.

## Memory Resize with Container Restart

Memory changes often require container restart because the runtime needs to adjust memory limits at the cgroup level:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: memory-intensive-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: memory-app
  template:
    metadata:
      labels:
        app: memory-app
    spec:
      containers:
      - name: app
        image: java-app:1.0
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        resizePolicy:
        - resourceName: memory
          restartPolicy: RestartContainer
        - resourceName: cpu
          restartPolicy: NotRequired
        env:
        - name: JAVA_OPTS
          value: "-Xmx1536m"
```

Scale memory:

```bash
# Find a pod managed by the Deployment
POD=$(kubectl get pod -l app=memory-app -o jsonpath='{.items[0].metadata.name}')

# Increase memory allocation for that running pod
kubectl patch pod "$POD" --subresource=resize --type='json' -p='[
  {
    "op": "replace",
    "path": "/spec/containers/0/resources/requests/memory",
    "value": "2Gi"
  },
  {
    "op": "replace",
    "path": "/spec/containers/0/resources/limits/memory",
    "value": "4Gi"
  }
]'

# Watch the container restart to apply the new memory resources
kubectl get pod "$POD" -w
```

Because the restart policy is `RestartContainer`, Kubernetes restarts containers in place without recreating the entire pod, preserving pod IP addresses and mounted volumes.

## Using with Vertical Pod Autoscaler

The Vertical Pod Autoscaler (VPA) can automatically adjust resources using in-place updates. In VPA 1.7.0, `InPlace` mode is alpha and requires Kubernetes 1.33 or later with the `InPlacePodVerticalScaling` feature gate enabled, plus the `InPlace` feature gate enabled on the VPA updater and admission controller:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: scalable-app
  updatePolicy:
    updateMode: "InPlace"  # Use in-place updates instead of recreation
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: "100m"
        memory: "128Mi"
      maxAllowed:
        cpu: "2000m"
        memory: "4Gi"
      mode: Auto
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scalable-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: scalable-app
  template:
    metadata:
      labels:
        app: scalable-app
    spec:
      containers:
      - name: app
        image: resource-variable-app:1.0
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "2Gi"
        resizePolicy:
        - resourceName: cpu
          restartPolicy: NotRequired
        - resourceName: memory
          restartPolicy: RestartContainer
```

VPA monitors resource usage and automatically adjusts requests/limits without recreating pods.

## StatefulSet with Gradual Scaling

StatefulSets benefit significantly from in-place resize, especially for databases:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-cluster
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgresql
        image: postgres:15
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        resizePolicy:
        - resourceName: cpu
          restartPolicy: NotRequired
        - resourceName: memory
          restartPolicy: RestartContainer
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
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

Scale individual pods:

```bash
# Scale just the primary pod
kubectl patch pod postgres-cluster-0 --subresource=resize --type='json' -p='[
  {
    "op": "replace",
    "path": "/spec/containers/0/resources/requests/cpu",
    "value": "2000m"
  },
  {
    "op": "replace",
    "path": "/spec/containers/0/resources/limits/cpu",
    "value": "4000m"
  }
]'

# Verify resize happened without pod recreation
kubectl get pod postgres-cluster-0 -o jsonpath='{.status.containerStatuses[0].restartCount}'
```

## Monitoring Resize Operations

Check resize status in pod conditions:

```bash
# View resize status
kubectl get pod web-server -o json | jq '.status.conditions[] | select(.type == "PodResizePending" or .type == "PodResizeInProgress")'

# Output example:
# {
#   "type": "PodResizeInProgress",
#   "status": "True",
#   "reason": "InProgress"
# }
```

Possible resize states:
- `PodResizeInProgress`: Resize is accepted and being applied
- `PodResizePending` with `reason: Deferred`: Resize cannot be applied now, will retry
- `PodResizePending` with `reason: Infeasible`: Requested resources exceed node capacity

Watch for resize events:

```bash
kubectl get events --field-selector involvedObject.name=web-server --watch
```

Create a monitoring script:

```python
#!/usr/bin/env python3
from kubernetes import client, config
import time

config.load_kube_config()
v1 = client.CoreV1Api()

def monitor_resize(namespace, pod_name):
    """Monitor pod resize operations."""
    while True:
        pod = v1.read_namespaced_pod(pod_name, namespace)

        # Check resize status conditions
        for condition in pod.status.conditions or []:
            if condition.type in ("PodResizePending", "PodResizeInProgress"):
                print(f"Resize status for {pod_name}: {condition.type}")
                print(f"  reason: {condition.reason}")
                print(f"  message: {condition.message}")

        # Check resources applied to the running containers
        for container in pod.status.container_statuses or []:
            if hasattr(container, 'resources'):
                print(f"Container {container.name} resources:")
                print(f"  {container.resources}")

        time.sleep(10)

if __name__ == "__main__":
    monitor_resize("default", "web-server")
```

## Handling Resize Failures

If a resize fails or is deferred, you can check why:

```bash
# Get detailed pod status
kubectl get pod web-server -o yaml | grep -A 10 PodResize

# Check if node has capacity
kubectl describe node <node-name> | grep -A 10 "Allocated resources"
```

Handle infeasible resize requests:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: smart-resizer
spec:
  containers:
  - name: app
    image: myapp:1.0
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "500m"   # Don't request more than node capacity
        memory: "1Gi"  # Be realistic about max needs
    resizePolicy:
    - resourceName: cpu
      restartPolicy: NotRequired
    - resourceName: memory
      restartPolicy: NotRequired
```

## Advanced Pattern: Progressive Scaling

Implement progressive scaling for multi-replica deployments:

```bash
#!/bin/bash
# scale-progressive.sh

DEPLOYMENT="web-app"
NAMESPACE="production"
NEW_CPU_REQUEST="400m"
NEW_CPU_LIMIT="800m"

# Get all pods in deployment
PODS=$(kubectl get pods -n $NAMESPACE -l app=$DEPLOYMENT -o name)

# Scale one pod at a time
for POD in $PODS; do
    echo "Scaling $POD..."

    kubectl patch -n $NAMESPACE $POD --subresource=resize --type='json' -p="[
      {
        \"op\": \"replace\",
        \"path\": \"/spec/containers/0/resources/requests/cpu\",
        \"value\": \"$NEW_CPU_REQUEST\"
      },
      {
        \"op\": \"replace\",
        \"path\": \"/spec/containers/0/resources/limits/cpu\",
        \"value\": \"$NEW_CPU_LIMIT\"
      }
    ]"

    # Wait for the running container to report the new CPU resources
    until kubectl get -n $NAMESPACE $POD -o jsonpath='{.status.containerStatuses[0].resources.requests.cpu}' | grep -q "$NEW_CPU_REQUEST"; do
        sleep 5
    done

    echo "Scaled $POD successfully"
    sleep 30  # Pause between pods
done
```

## Best Practices

Enable resize policies only when you need them. Not all workloads benefit from in-place scaling.

Set `restartPolicy: NotRequired` for CPU when possible. CPU changes are usually safe without restart and avoid disruption.

For memory, understand your application's behavior. Some apps handle memory limit changes gracefully, others need restarts to avoid OOM issues.

Test resize operations in development first. Verify your application handles resource changes correctly.

Monitor resource usage before and after resize. Ensure the scaling achieves the intended effect.

Use VPA's recommendations but verify before applying. Automatic scaling should be tested thoroughly.

Document your resize policies in deployment manifests:

```yaml
metadata:
  annotations:
    resize-policy: "CPU can be resized in-place, memory requires restart"
```

Keep requests and limits proportional. Requests drive scheduling, while limits define enforcement and can still cause throttling or out-of-memory kills.

Plan for node capacity. Resize operations fail if nodes don't have sufficient resources.

In-place container resource resizing reduces disruption and enables more dynamic resource management in Kubernetes, making it easier to right-size applications without compromising availability.
