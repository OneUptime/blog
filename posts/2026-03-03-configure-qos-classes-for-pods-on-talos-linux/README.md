# How to Configure QoS Classes for Pods on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, QoS Classes, Kubernetes, Resource Management, Pod Scheduling, Performance

Description: Understand and configure Kubernetes Quality of Service classes on Talos Linux for proper pod prioritization during resource contention.

---

Quality of Service (QoS) classes in Kubernetes determine how the scheduler and kubelet handle pods when the node is under resource pressure. Every pod is automatically assigned one of three QoS classes based on its resource configuration: Guaranteed, Burstable, or BestEffort. Understanding these classes and intentionally configuring them is important for ensuring that your critical workloads survive resource contention while less important workloads are the first to be affected.

On Talos Linux, QoS classes are particularly relevant because the minimal OS footprint means more of each node's resources are available for pods, making proper QoS configuration the primary mechanism for resource prioritization.

## The Three QoS Classes

### Guaranteed

A pod gets the Guaranteed class when every container has both CPU and memory requests set, and the requests equal the limits:

```yaml
# guaranteed-pod.yaml
# This pod receives Guaranteed QoS
apiVersion: v1
kind: Pod
metadata:
  name: critical-database
  namespace: production
spec:
  containers:
    - name: postgres
      image: postgres:16
      resources:
        requests:
          cpu: "2"
          memory: "4Gi"
        limits:
          cpu: "2"        # Must equal request
          memory: "4Gi"   # Must equal request
```

Guaranteed pods get:
- Highest priority during resource contention
- Last to be evicted when the node is under memory pressure
- OOM score of -997 (very unlikely to be killed by OOM killer)
- With static CPU manager policy, dedicated CPU cores

### Burstable

A pod gets the Burstable class when at least one container has a resource request or limit set, but the pod does not qualify for Guaranteed:

```yaml
# burstable-pod.yaml
# This pod receives Burstable QoS
apiVersion: v1
kind: Pod
metadata:
  name: web-frontend
  namespace: production
spec:
  containers:
    - name: nginx
      image: nginx:latest
      resources:
        requests:
          cpu: "250m"
          memory: "256Mi"
        limits:
          cpu: "1"         # Different from request - Burstable
          memory: "512Mi"  # Different from request - Burstable
```

Burstable pods get:
- Medium priority during contention
- Can burst above requests up to limits when resources are available
- Evicted before Guaranteed pods but after BestEffort pods
- OOM score between 2 and 999 based on memory request ratio

### BestEffort

A pod gets the BestEffort class when no container has any resource requests or limits:

```yaml
# besteffort-pod.yaml
# This pod receives BestEffort QoS (not recommended for production)
apiVersion: v1
kind: Pod
metadata:
  name: batch-job
  namespace: development
spec:
  containers:
    - name: processor
      image: batch-processor:latest
      # No resources specified at all
```

BestEffort pods get:
- Lowest priority during contention
- First to be evicted under memory pressure
- OOM score of 1000 (first to be killed by OOM killer)
- Can use any available resources but have no guarantees

## How QoS Affects Eviction on Talos Linux

When a Talos Linux node experiences memory pressure, the kubelet evicts pods in this order:

1. **BestEffort** pods that exceed no resource limits (they have none)
2. **Burstable** pods that exceed their memory requests
3. **Guaranteed** pods (only if they exceed their limits, which equals their requests)

Configure the kubelet eviction behavior in the Talos machine config:

```yaml
# talos-eviction-qos.yaml
# Eviction settings that work with QoS classes
machine:
  kubelet:
    extraArgs:
      # Start evicting when memory drops below 750Mi
      eviction-hard: "memory.available<750Mi,nodefs.available<10%"
      # Soft eviction with grace period
      eviction-soft: "memory.available<1.5Gi,nodefs.available<15%"
      eviction-soft-grace-period: "memory.available=1m30s,nodefs.available=2m"
      # How much to reclaim during eviction
      eviction-minimum-reclaim: "memory.available=500Mi"
```

## Designing QoS for Different Workload Types

Here is a practical guide for assigning QoS classes based on workload characteristics:

### Tier 1: Business-Critical Services (Guaranteed)

```yaml
# tier1-guaranteed.yaml
# Payment processing service - must never be evicted
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
        tier: critical
    spec:
      containers:
        - name: payment
          image: payment-service:v2.1
          resources:
            requests:
              cpu: "1"
              memory: "2Gi"
            limits:
              cpu: "1"
              memory: "2Gi"
          # Health checks are critical for Guaranteed pods
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Tier 2: Important Services (Burstable with High Requests)

```yaml
# tier2-burstable-high.yaml
# API gateway - important but can tolerate brief disruption
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
spec:
  replicas: 4
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        tier: important
    spec:
      containers:
        - name: gateway
          image: api-gateway:v3.0
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2"
              memory: "2Gi"
```

### Tier 3: Standard Services (Burstable with Moderate Requests)

```yaml
# tier3-burstable-standard.yaml
# Background worker - useful but not user-facing
apiVersion: apps/v1
kind: Deployment
metadata:
  name: email-worker
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: email-worker
  template:
    metadata:
      labels:
        app: email-worker
        tier: standard
    spec:
      containers:
        - name: worker
          image: email-worker:v1.5
          resources:
            requests:
              cpu: "100m"
              memory: "256Mi"
            limits:
              cpu: "1"
              memory: "1Gi"
```

### Tier 4: Non-Critical Workloads (BestEffort or Low Burstable)

```yaml
# tier4-low-priority.yaml
# Development tool - can be evicted freely
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dev-dashboard
  namespace: development
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dev-dashboard
  template:
    metadata:
      labels:
        app: dev-dashboard
        tier: low-priority
    spec:
      containers:
        - name: dashboard
          image: dev-dashboard:latest
          resources:
            requests:
              cpu: "10m"
              memory: "64Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
```

## Enforcing QoS Standards

Use Kyverno to enforce QoS requirements per namespace:

```yaml
# require-guaranteed-qos.yaml
# Require Guaranteed QoS for pods in the critical namespace
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-guaranteed-qos-critical
spec:
  validationFailureAction: Enforce
  rules:
    - name: guaranteed-in-critical
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - critical-services
      validate:
        message: "Pods in the critical-services namespace must have Guaranteed QoS (requests must equal limits for all containers)"
        foreach:
          - list: "request.object.spec.containers"
            deny:
              conditions:
                any:
                  - key: "{{ element.resources.requests.cpu }}"
                    operator: NotEquals
                    value: "{{ element.resources.limits.cpu }}"
                  - key: "{{ element.resources.requests.memory }}"
                    operator: NotEquals
                    value: "{{ element.resources.limits.memory }}"

---
# prevent-besteffort.yaml
# Prevent BestEffort pods in production namespaces
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: prevent-besteffort-production
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-resource-requests
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - production
                - staging
      validate:
        message: "All containers must have CPU and memory requests set. BestEffort QoS is not allowed in production."
        foreach:
          - list: "request.object.spec.containers"
            deny:
              conditions:
                any:
                  - key: "{{ element.resources.requests.cpu || '' }}"
                    operator: Equals
                    value: ""
                  - key: "{{ element.resources.requests.memory || '' }}"
                    operator: Equals
                    value: ""
```

## Monitoring QoS Distribution

Track the QoS distribution across your cluster:

```bash
# View QoS class for all pods
kubectl get pods -A -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
QOS:.status.qosClass | sort -k3

# Count pods by QoS class
kubectl get pods -A -o json | jq -r '
  [.items[].status.qosClass] | group_by(.) |
  map({class: .[0], count: length}) | .[]'
```

Create a Prometheus metric for QoS monitoring:

```yaml
# qos-monitoring.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: qos-monitoring
  namespace: monitoring
spec:
  groups:
    - name: qos.monitoring
      rules:
        - alert: TooManyBestEffortPods
          expr: >
            count(kube_pod_status_qos_class{qos_class="BestEffort"}) > 10
          for: 1h
          labels:
            severity: info
          annotations:
            summary: "More than 10 BestEffort pods running in the cluster"
```

## Summary

QoS classes are the primary mechanism Kubernetes uses to decide which pods survive when resources are scarce. On Talos Linux, where the OS overhead is minimal and predictable, QoS configuration is your main tool for workload prioritization. Use Guaranteed QoS for business-critical services that must never be evicted, Burstable QoS for services that need flexibility, and avoid BestEffort in production. Enforce QoS standards through policies and monitor the distribution across your cluster to ensure your most important workloads always have the resources they need.
