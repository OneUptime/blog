# How to Use Goldilocks VPA Recommendations to Right-Size Kubernetes Pod Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Goldilocks, VPA, Resource Optimization, Cost Reduction

Description: Leverage Goldilocks and Vertical Pod Autoscaler to generate accurate resource recommendations and right-size Kubernetes pods, reducing waste and improving cluster efficiency.

---

Setting accurate resource requests and limits is challenging, often resulting in overprovisioned pods that waste money or underprovisioned pods that throttle applications. Goldilocks uses the Vertical Pod Autoscaler to generate recommendations for optimal resource sizing. This guide shows you how to deploy Goldilocks and use its recommendations to right-size your workloads.

## Installing VPA and Goldilocks

First, install the Vertical Pod Autoscaler:

```bash
# Clone VPA repository
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler

# Install VPA
./hack/vpa-up.sh

# Verify VPA components
kubectl get pods -n kube-system | grep vpa
```

Install Goldilocks using Helm:

```bash
# Add Goldilocks repository
helm repo add fairwinds-stable https://charts.fairwinds.com/stable
helm repo update

# Install Goldilocks
helm install goldilocks fairwinds-stable/goldilocks \
  --namespace goldilocks \
  --create-namespace \
  --set dashboard.enabled=true

# Verify installation
kubectl get pods -n goldilocks
```

## Enabling Goldilocks for Namespaces

Label namespaces to enable Goldilocks monitoring:

```bash
# Enable for production namespace
kubectl label namespace production goldilocks.fairwinds.com/enabled=true

# Enable for multiple namespaces
kubectl label namespace staging goldilocks.fairwinds.com/enabled=true
kubectl label namespace development goldilocks.fairwinds.com/enabled=true
```

Goldilocks automatically creates VPA objects in recommendation mode for all deployments in labeled namespaces.

## Accessing the Goldilocks Dashboard

View recommendations through the web interface:

```bash
# Port forward to dashboard
kubectl port-forward -n goldilocks svc/goldilocks-dashboard 8080:80

# Open http://localhost:8080
```

The dashboard shows current resource settings vs VPA recommendations for CPU and memory.

## Understanding VPA Recommendations

VPA provides three types of recommendations:

**Lower Bound**: Minimum resources needed to avoid throttling
**Target**: Recommended resource requests
**Upper Bound**: Maximum resources the pod should need

Example VPA recommendation output:

```yaml
# VPA recommendation structure
recommendation:
  containerRecommendations:
  - containerName: app
    lowerBound:
      cpu: "100m"
      memory: "256Mi"
    target:
      cpu: "250m"
      memory: "512Mi"
    upperBound:
      cpu: "1000m"
      memory: "2Gi"
    uncappedTarget:
      cpu: "300m"
      memory: "600Mi"
```

## Applying Recommendations Manually

Extract and apply recommendations:

```bash
# Get VPA recommendations for a deployment
kubectl get vpa -n production myapp -o jsonpath='{.status.recommendation.containerRecommendations[0].target}' | jq .

# Output:
# {
#   "cpu": "250m",
#   "memory": "512Mi"
# }
```

Update deployment with recommended values:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:v1.0
        resources:
          requests:
            cpu: "250m"      # From VPA target recommendation
            memory: "512Mi"  # From VPA target recommendation
          limits:
            cpu: "500m"      # 2x requests
            memory: "1Gi"    # 2x requests
```

## Automated Recommendation Application

Create a script to batch update deployments:

```bash
#!/bin/bash
# apply-goldilocks-recommendations.sh

NAMESPACE="production"

# Get all deployments
DEPLOYMENTS=$(kubectl get deployments -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}')

for deploy in $DEPLOYMENTS; do
  echo "Processing deployment: $deploy"

  # Get VPA recommendations
  VPA_NAME="${deploy}"
  CPU_TARGET=$(kubectl get vpa $VPA_NAME -n $NAMESPACE \
    -o jsonpath='{.status.recommendation.containerRecommendations[0].target.cpu}' 2>/dev/null)
  MEM_TARGET=$(kubectl get vpa $VPA_NAME -n $NAMESPACE \
    -o jsonpath='{.status.recommendation.containerRecommendations[0].target.memory}' 2>/dev/null)

  if [ -n "$CPU_TARGET" ] && [ -n "$MEM_TARGET" ]; then
    echo "  Recommended CPU: $CPU_TARGET"
    echo "  Recommended Memory: $MEM_TARGET"

    # Update deployment
    kubectl set resources deployment $deploy -n $NAMESPACE \
      --requests=cpu=$CPU_TARGET,memory=$MEM_TARGET

    echo "  ✓ Updated $deploy"
  else
    echo "  ✗ No recommendations available for $deploy"
  fi
done
```

## Calculating Cost Savings

Calculate potential savings from rightsizing:

```python
#!/usr/bin/env python3
# calculate-savings.py

import subprocess
import json
import re

def parse_cpu(cpu_str):
    """Convert CPU string to cores"""
    if cpu_str.endswith('m'):
        return float(cpu_str[:-1]) / 1000
    return float(cpu_str)

def parse_memory(mem_str):
    """Convert memory string to GB"""
    if mem_str.endswith('Mi'):
        return float(mem_str[:-2]) / 1024
    elif mem_str.endswith('Gi'):
        return float(mem_str[:-2])
    return float(mem_str) / (1024**3)

def get_deployment_resources(namespace):
    """Get current deployment resources"""
    cmd = f"kubectl get deployments -n {namespace} -o json"
    result = subprocess.run(cmd.split(), capture_output=True, text=True)
    data = json.loads(result.stdout)

    resources = []
    for item in data['items']:
        name = item['metadata']['name']
        replicas = item['spec']['replicas']
        container = item['spec']['template']['spec']['containers'][0]

        current_cpu = parse_cpu(container['resources']['requests'].get('cpu', '0'))
        current_mem = parse_memory(container['resources']['requests'].get('memory', '0'))

        resources.append({
            'name': name,
            'replicas': replicas,
            'current_cpu': current_cpu * replicas,
            'current_memory': current_mem * replicas
        })

    return resources

def get_vpa_recommendations(namespace):
    """Get VPA recommendations"""
    cmd = f"kubectl get vpa -n {namespace} -o json"
    result = subprocess.run(cmd.split(), capture_output=True, text=True)
    data = json.loads(result.stdout)

    recommendations = {}
    for item in data['items']:
        name = item['metadata']['name']
        if 'recommendation' in item.get('status', {}):
            rec = item['status']['recommendation']['containerRecommendations'][0]['target']
            recommendations[name] = {
                'cpu': parse_cpu(rec.get('cpu', '0')),
                'memory': parse_memory(rec.get('memory', '0'))
            }

    return recommendations

def calculate_savings(namespace, cpu_cost_per_core=30, mem_cost_per_gb=4):
    """Calculate monthly savings from rightsizing"""
    current = get_deployment_resources(namespace)
    recommendations = get_vpa_recommendations(namespace)

    total_current_cost = 0
    total_recommended_cost = 0

    print(f"\n{'Deployment':<30} {'Current':<20} {'Recommended':<20} {'Savings':<10}")
    print("=" * 80)

    for deploy in current:
        name = deploy['name']
        current_cpu = deploy['current_cpu']
        current_mem = deploy['current_memory']

        current_cost = (current_cpu * cpu_cost_per_core) + (current_mem * mem_cost_per_gb)
        total_current_cost += current_cost

        if name in recommendations:
            rec = recommendations[name]
            rec_cpu = rec['cpu'] * deploy['replicas']
            rec_mem = rec['memory'] * deploy['replicas']

            rec_cost = (rec_cpu * cpu_cost_per_core) + (rec_mem * mem_cost_per_gb)
            total_recommended_cost += rec_cost

            savings = current_cost - rec_cost
            savings_pct = (savings / current_cost * 100) if current_cost > 0 else 0

            print(f"{name:<30} ${current_cost:>8.2f} ${rec_cost:>16.2f} ${savings:>8.2f} ({savings_pct:>5.1f}%)")

    print("=" * 80)
    print(f"{'Total':<30} ${total_current_cost:>8.2f} ${total_recommended_cost:>16.2f} ${total_current_cost - total_recommended_cost:>8.2f}")
    print(f"\nMonthly Savings: ${(total_current_cost - total_recommended_cost) * 30:.2f}")
    print(f"Annual Savings: ${(total_current_cost - total_recommended_cost) * 365:.2f}")

if __name__ == '__main__':
    calculate_savings('production')
```

## Gradual Rollout Strategy

Apply recommendations gradually to minimize risk:

```yaml
# Phase 1: Non-production environments
# Apply to dev/staging first

# Phase 2: Production canary
# Update 10% of pods
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  strategy:
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  template:
    spec:
      containers:
      - name: app
        resources:
          requests:
            cpu: "250m"    # New recommendation
            memory: "512Mi"
```

Monitor for issues over 48 hours before proceeding.

## Monitoring Resource Utilization

Track actual vs requested resources:

```promql
# CPU utilization percentage
(
  sum(rate(container_cpu_usage_seconds_total{namespace="production"}[5m])) by (pod)
  /
  sum(kube_pod_container_resource_requests{namespace="production",resource="cpu"}) by (pod)
) * 100

# Memory utilization percentage
(
  sum(container_memory_working_set_bytes{namespace="production"}) by (pod)
  /
  sum(kube_pod_container_resource_requests{namespace="production",resource="memory"}) by (pod)
) * 100
```

Create alerts for underutilization:

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: resource-utilization-alerts
spec:
  groups:
  - name: utilization
    rules:
    - alert: LowCPUUtilization
      expr: |
        (sum(rate(container_cpu_usage_seconds_total[5m])) by (pod, namespace)
        /
        sum(kube_pod_container_resource_requests{resource="cpu"}) by (pod, namespace)) < 0.2
      for: 1h
      annotations:
        summary: "Pod {{ $labels.pod }} CPU utilization below 20%"
```

## Handling Burstable Workloads

For workloads with variable resource needs:

```yaml
# VPA with custom update policy
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: burstable-app
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: burstable-app
  updatePolicy:
    updateMode: "Off"  # Recommendation mode only
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: "100m"
        memory: "128Mi"
      maxAllowed:
        cpu: "2000m"
        memory: "4Gi"
      controlledResources: ["cpu", "memory"]
```

## Conclusion

Goldilocks with VPA provides data-driven recommendations for right-sizing Kubernetes workloads. By implementing these recommendations, organizations typically achieve 30-50% cost reduction on overprovisioned resources while maintaining application performance. Regular review of Goldilocks recommendations should be part of ongoing cost optimization practices.
