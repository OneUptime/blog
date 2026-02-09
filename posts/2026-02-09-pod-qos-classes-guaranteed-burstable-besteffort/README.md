# How to Set Pod QoS Classes to Guaranteed, Burstable, and BestEffort

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resources, Performance

Description: Master Kubernetes Quality of Service classes to control pod priority during resource contention. Learn how to configure Guaranteed, Burstable, and BestEffort QoS for optimal resource management.

---

When Kubernetes nodes run low on resources, the cluster must decide which pods to evict. Quality of Service (QoS) classes determine pod priority during resource pressure. Understanding QoS classes helps you protect critical workloads while allowing flexible resource usage for less important pods.

Kubernetes automatically assigns QoS classes based on your resource requests and limits configuration. You cannot set QoS directly, but you control it through how you configure resources. This guide shows you how to achieve each QoS class and when to use each one.

## Understanding QoS Classes

Kubernetes has three QoS classes: Guaranteed, Burstable, and BestEffort. These classes form an eviction order during resource pressure.

Guaranteed pods have the highest priority. They have dedicated resources and are evicted last. Use Guaranteed for critical services that must stay running.

Burstable pods have medium priority. They have minimum resources guaranteed but can use more when available. Use Burstable for most applications that benefit from extra resources but can run with less.

BestEffort pods have the lowest priority and are evicted first. They have no resource guarantees. Use BestEffort for batch jobs and processes that can be safely interrupted.

During resource pressure, Kubernetes evicts pods in this order: BestEffort first, then Burstable, and finally Guaranteed.

## Creating Guaranteed QoS Pods

A pod gets Guaranteed QoS when every container specifies identical CPU and memory requests and limits. Both must be set and must be equal.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: guaranteed-pod
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "512Mi"
        cpu: "500m"
      limits:
        memory: "512Mi"
        cpu: "500m"
```

Check the QoS class:

```bash
kubectl get pod guaranteed-pod -o jsonpath='{.status.qosClass}'
```

Output: `Guaranteed`

This pod will never be evicted due to resource pressure unless all pods have Guaranteed QoS and this pod is using more resources than its limits.

For multi-container pods, all containers must follow the same rule:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: guaranteed-multi
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "512Mi"
        cpu: "500m"
      limits:
        memory: "512Mi"
        cpu: "500m"
  - name: sidecar
    image: busybox
    resources:
      requests:
        memory: "128Mi"
        cpu: "100m"
      limits:
        memory: "128Mi"
        cpu: "100m"
```

All containers have matching requests and limits, so the pod gets Guaranteed QoS.

## Creating Burstable QoS Pods

A pod gets Burstable QoS when at least one container specifies memory or CPU requests or limits, but the criteria for Guaranteed are not met.

Requests less than limits:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: burstable-pod
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
      limits:
        memory: "512Mi"
        cpu: "1000m"
```

This pod can use up to 512Mi memory and 1 CPU, but only 256Mi memory and 0.25 CPU are guaranteed.

Only requests specified:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: burstable-requests-only
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
```

Without limits, the pod can use any available resources but has guaranteed minimums.

Only limits specified:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: burstable-limits-only
spec:
  containers:
  - name: app
    image: nginx
    resources:
      limits:
        memory: "512Mi"
        cpu: "500m"
```

Kubernetes automatically sets requests equal to limits for this configuration, but if you omit one resource type, the pod becomes Burstable.

Mixed container specifications:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: burstable-mixed
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "512Mi"
        cpu: "500m"
      limits:
        memory: "512Mi"
        cpu: "500m"
  - name: worker
    image: worker
    resources:
      requests:
        memory: "128Mi"
      limits:
        memory: "256Mi"
```

The first container has matching requests and limits, but the second container does not specify CPU. The entire pod becomes Burstable.

## Creating BestEffort QoS Pods

A pod gets BestEffort QoS when no container specifies any requests or limits.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: besteffort-pod
spec:
  containers:
  - name: app
    image: nginx
```

No resource specifications mean no guarantees. This pod can use any available resources but will be evicted first during pressure.

Multi-container BestEffort pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: besteffort-multi
spec:
  containers:
  - name: app
    image: nginx
  - name: worker
    image: worker
  - name: logger
    image: logger
```

All containers must omit resource specifications for BestEffort QoS.

## Practical Use Cases for Each QoS Class

Use Guaranteed QoS for critical production services:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: critical-api
  template:
    metadata:
      labels:
        app: critical-api
    spec:
      containers:
      - name: api
        image: critical-api:v1.0.0
        resources:
          requests:
            memory: "1Gi"
            cpu: "1000m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

Use Burstable QoS for typical applications that can handle variable resources:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: app
        image: web-app:v2.0.0
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
```

Use BestEffort QoS for batch jobs and dev/test workloads:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing
spec:
  template:
    spec:
      containers:
      - name: processor
        image: data-processor:latest
        command: ['python', 'process_data.py']
      restartPolicy: Never
```

## QoS Impact on Eviction Order

During memory pressure, the kubelet evicts pods to reclaim resources. Understanding eviction order helps you plan for resource constraints.

Eviction happens in phases:

1. BestEffort pods are evicted first, starting with those using the most memory
2. Burstable pods are evicted next, prioritizing those exceeding their requests most
3. Guaranteed pods are evicted last, only if absolutely necessary

Within each QoS class, pods that exceed their requests more significantly are evicted first.

Example eviction scenario:

```yaml
# This pod will be evicted first (BestEffort)
apiVersion: v1
kind: Pod
metadata:
  name: besteffort-pod
spec:
  containers:
  - name: app
    image: nginx

---
# This pod will be evicted second (Burstable, using more than request)
apiVersion: v1
kind: Pod
metadata:
  name: burstable-pod
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "256Mi"
      limits:
        memory: "1Gi"

---
# This pod will be evicted last (Guaranteed)
apiVersion: v1
kind: Pod
metadata:
  name: guaranteed-pod
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "512Mi"
        cpu: "500m"
      limits:
        memory: "512Mi"
        cpu: "500m"
```

## Monitoring QoS Classes

View QoS classes for all pods:

```bash
kubectl get pods -o custom-columns=NAME:.metadata.name,QOS:.status.qosClass
```

Output:
```
NAME               QOS
guaranteed-pod     Guaranteed
burstable-pod      Burstable
besteffort-pod     BestEffort
```

Filter pods by QoS class:

```bash
kubectl get pods -A -o json | jq -r '.items[] | select(.status.qosClass=="Guaranteed") | .metadata.name'
```

Create alerts for pods with unexpected QoS:

```yaml
# PrometheusRule example
groups:
- name: qos-alerts
  rules:
  - alert: CriticalPodNotGuaranteed
    expr: |
      kube_pod_status_qos_class{pod=~"critical-.*",qos_class!="guaranteed"} > 0
    annotations:
      summary: "Critical pod {{ $labels.pod }} does not have Guaranteed QoS"
```

## Common Mistakes and How to Avoid Them

Mistake: Expecting Guaranteed QoS but getting Burstable.

```yaml
# This is Burstable, not Guaranteed
apiVersion: v1
kind: Pod
metadata:
  name: not-guaranteed
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "512Mi"
        cpu: "500m"
      limits:
        memory: "1Gi"  # Different from request!
        cpu: "500m"
```

Fix: Ensure requests equal limits for all resources:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

Mistake: One container without resources makes entire pod Burstable.

```yaml
# This entire pod is Burstable
apiVersion: v1
kind: Pod
metadata:
  name: mixed-qos
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "512Mi"
        cpu: "500m"
      limits:
        memory: "512Mi"
        cpu: "500m"
  - name: sidecar
    image: sidecar  # No resources specified
```

Fix: Specify resources for all containers:

```yaml
  - name: sidecar
    image: sidecar
    resources:
      requests:
        memory: "128Mi"
        cpu: "100m"
      limits:
        memory: "128Mi"
        cpu: "100m"
```

## Resource Limit Ranges and QoS

LimitRanges can affect QoS by automatically adding requests and limits:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
  - default:
      memory: "512Mi"
      cpu: "500m"
    defaultRequest:
      memory: "256Mi"
      cpu: "250m"
    type: Container
```

Pods without resource specifications will automatically get Burstable QoS (since default requests differ from default limits).

To enforce Guaranteed QoS for a namespace, set equal defaults:

```yaml
spec:
  limits:
  - default:
      memory: "512Mi"
      cpu: "500m"
    defaultRequest:
      memory: "512Mi"
      cpu: "500m"
    type: Container
```

## Optimizing QoS for Your Workloads

For production databases and stateful services, use Guaranteed:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
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
      - name: postgres
        image: postgres:14
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

For web applications with variable load, use Burstable:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
spec:
  replicas: 10
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
    spec:
      containers:
      - name: frontend
        image: frontend:v1.0.0
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

For background jobs that can be interrupted, use BestEffort:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: log-cleanup
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cleanup
            image: cleanup:latest
            command: ['python', 'cleanup_logs.py']
          restartPolicy: OnFailure
```

## Testing QoS Behavior

Test eviction behavior by creating resource pressure:

```bash
# Create a pod that consumes memory
kubectl run memory-eater --image=polinux/stress -- stress --vm 1 --vm-bytes 2G --vm-hang 3600
```

Monitor which pods get evicted:

```bash
kubectl get events --sort-by='.lastTimestamp' | grep Evicted
```

You will see BestEffort pods evicted first, followed by Burstable.

Create test pods with different QoS classes:

```bash
# BestEffort
kubectl run test-besteffort --image=nginx

# Burstable
kubectl run test-burstable --image=nginx --requests=memory=128Mi --limits=memory=256Mi

# Guaranteed
kubectl run test-guaranteed --image=nginx --requests=memory=256Mi,cpu=250m --limits=memory=256Mi,cpu=250m
```

Verify QoS assignments:

```bash
kubectl get pods -o custom-columns=NAME:.metadata.name,QOS:.status.qosClass
```

## Conclusion

QoS classes are a critical component of Kubernetes resource management. Configure Guaranteed QoS for critical services that must never be evicted. Use Burstable QoS for typical applications that benefit from flexible resource allocation. Reserve BestEffort QoS for workloads that can tolerate interruption.

Set resource requests and limits carefully to achieve the desired QoS class. Monitor QoS assignments to ensure critical pods have appropriate priority. Test eviction behavior to understand how your cluster responds to resource pressure.

Master QoS classes to build resilient Kubernetes applications that handle resource contention gracefully and protect critical workloads from eviction.
