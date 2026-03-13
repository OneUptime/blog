# How to Fine-Tune Rolling Update maxSurge and maxUnavailable Parameters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployments, Zero Downtime

Description: Learn how to configure maxSurge and maxUnavailable in Kubernetes rolling updates to control deployment speed, resource usage, and availability during application updates.

---

Kubernetes rolling updates gradually replace old pods with new ones, but how quickly this happens and how many pods can be unavailable depends on the `maxSurge` and `maxUnavailable` parameters. These settings determine the deployment strategy's aggressiveness, balancing between update speed, resource consumption, and application availability.

Fine-tuning these parameters is essential for optimizing deployments across different application types and cluster resource constraints.

## Understanding maxSurge and maxUnavailable

Both parameters are found in the deployment's rolling update strategy:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2        # Can be absolute number or percentage
      maxUnavailable: 1  # Can be absolute number or percentage
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: app
        image: myapp:2.0
```

**maxSurge**: Maximum number of pods that can be created above the desired replica count during update.
**maxUnavailable**: Maximum number of pods that can be unavailable during update.

Values can be absolute numbers (like `2`) or percentages (like `25%`).

## Conservative Update Strategy

For critical applications that must maintain availability:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-api
spec:
  replicas: 20
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1           # Add only 1 pod at a time
      maxUnavailable: 0     # Never allow any downtime
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
        image: api:v2.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
```

This configuration:
- Updates one pod at a time
- Ensures zero unavailable pods
- Provides maximum safety but slowest updates
- Requires extra cluster capacity (maxSurge pods)

## Aggressive Update Strategy

For development environments or non-critical services:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dev-app
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 50%         # Add up to 5 extra pods
      maxUnavailable: 50%   # Up to 5 pods can be down
  selector:
    matchLabels:
      app: dev-app
  template:
    metadata:
      labels:
        app: dev-app
    spec:
      containers:
      - name: app
        image: dev-app:latest
```

This configuration:
- Updates very quickly
- Can handle up to 50% capacity reduction
- Uses more resources temporarily
- Suitable for non-production environments

## Balanced Production Strategy

For most production applications:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 12
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%         # Add up to 3 extra pods (25% of 12)
      maxUnavailable: 25%   # Up to 3 pods can be unavailable
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: nginx
        image: web-app:v2.0
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
        readinessProbe:
          httpGet:
            path: /healthz
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 3
          failureThreshold: 2
```

This provides good balance between speed and safety.

## Resource-Constrained Cluster

When cluster capacity is limited:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resource-aware-app
spec:
  replicas: 8
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 0           # Don't create extra pods
      maxUnavailable: 2     # Allow 2 pods down at a time
  selector:
    matchLabels:
      app: resource-aware-app
  template:
    metadata:
      labels:
        app: resource-aware-app
    spec:
      containers:
      - name: app
        image: app:v2.0
        resources:
          requests:
            memory: "2Gi"    # Large memory footprint
            cpu: "1000m"
```

This configuration:
- Doesn't require extra cluster capacity
- Updates by replacing pods in-place
- Slower than having maxSurge > 0
- Ideal when resources are tight

## High Availability Configuration

For services requiring maximum uptime:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ha-service
spec:
  replicas: 15
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 3
      maxUnavailable: 0
  selector:
    matchLabels:
      app: ha-service
  template:
    metadata:
      labels:
        app: ha-service
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: ha-service
              topologyKey: kubernetes.io/hostname
      containers:
      - name: service
        image: ha-service:v2.0
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 2
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ha-service-pdb
spec:
  minAvailable: 12  # Always keep at least 80% available
  selector:
    matchLabels:
      app: ha-service
```

## Monitoring Rolling Updates

Track update progress:

```bash
# Watch rollout status
kubectl rollout status deployment/my-app

# Detailed rollout history
kubectl rollout history deployment/my-app

# View replica set scaling during update
kubectl get rs -w -l app=my-app
```

Monitor with metrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rollout-alerts
data:
  alerts.yaml: |
    groups:
    - name: deployments
      rules:
      - alert: RolloutStuck
        expr: kube_deployment_status_replicas_updated !=
              kube_deployment_spec_replicas
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Deployment {{ $labels.deployment }} rollout stuck"

      - alert: RolloutProgressing
        expr: kube_deployment_status_condition{condition="Progressing",status="false"} == 1
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Deployment {{ $labels.deployment }} not progressing"
```

## Calculating Optimal Values

Calculate based on desired behavior:

```python
#!/usr/bin/env python3

def calculate_rollout_parameters(replicas, desired_update_speed, min_available_percent):
    """
    Calculate optimal maxSurge and maxUnavailable.

    Args:
        replicas: Number of replicas
        desired_update_speed: 'fast', 'medium', or 'slow'
        min_available_percent: Minimum availability required (0-100)
    """
    max_unavailable_count = replicas - int(replicas * min_available_percent / 100)

    if desired_update_speed == 'fast':
        max_surge = max(2, int(replicas * 0.5))
        max_unavailable = max(1, max_unavailable_count)
    elif desired_update_speed == 'medium':
        max_surge = max(1, int(replicas * 0.25))
        max_unavailable = max(1, min(2, max_unavailable_count))
    else:  # slow
        max_surge = 1
        max_unavailable = min(1, max_unavailable_count)

    print(f"Replicas: {replicas}")
    print(f"Speed: {desired_update_speed}")
    print(f"Min Available: {min_available_percent}%")
    print(f"Recommended maxSurge: {max_surge}")
    print(f"Recommended maxUnavailable: {max_unavailable}")
    print(f"Max concurrent updates: {max_surge + max_unavailable}")
    print(f"Guaranteed available: {replicas - max_unavailable}")

if __name__ == "__main__":
    calculate_rollout_parameters(replicas=20, desired_update_speed='medium', min_available_percent=80)
```

## Testing Different Strategies

Create test deployments to compare strategies:

```bash
#!/bin/bash
# test-rollout-strategies.sh

NAMESPACE="rollout-test"
kubectl create namespace $NAMESPACE

# Strategy 1: Conservative
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: conservative
  namespace: $NAMESPACE
spec:
  replicas: 10
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: test
      strategy: conservative
  template:
    metadata:
      labels:
        app: test
        strategy: conservative
    spec:
      containers:
      - name: app
        image: nginx:1.24
EOF

# Time the rollout
echo "Testing conservative strategy..."
time kubectl set image deployment/conservative app=nginx:1.25 -n $NAMESPACE
kubectl rollout status deployment/conservative -n $NAMESPACE

# Repeat for other strategies...
```

## Best Practices

Never set both maxSurge and maxUnavailable to 0. This makes updates impossible.

For critical services, prefer `maxUnavailable: 0` with appropriate maxSurge to maintain availability.

Use percentages for large deployments (>10 replicas). Absolute numbers work better for small deployments.

Consider cluster capacity when setting maxSurge. Ensure nodes can accommodate extra pods.

Test rollout strategies in staging before production. Verify update speed and availability.

Combine with proper health checks. ReadinessProbe prevents traffic to unhealthy new pods.

Use Pod Disruption Budgets for additional protection:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 75%  # Complements maxUnavailable setting
  selector:
    matchLabels:
      app: my-app
```

Monitor resource usage during rollouts. Ensure cluster has capacity for surge pods.

Document your strategy choice. Explain why specific values were selected for each deployment.

Fine-tuning maxSurge and maxUnavailable allows you to optimize deployment speed, resource usage, and availability for your specific application requirements and cluster constraints.
