# VPA Recommender Cost Optimization with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, VPA, Kubernetes, Cost Optimization, GitOps

Description: Learn how to use the VPA Recommender component with Flux CD to identify over-provisioned workloads and systematically reduce cloud infrastructure costs through data-driven resource right-sizing.

---

## Introduction

Over-provisioning is one of the most common sources of unnecessary cloud spending in Kubernetes. Teams often set conservative resource requests to avoid out-of-memory kills and CPU throttling, but the result is significant idle resource capacity that translates directly to wasted money. The VPA Recommender provides the data needed to make informed, evidence-based decisions about reducing resource requests.

Combining VPA Recommender insights with Flux CD creates a cost optimization workflow: the Recommender identifies over-provisioned workloads, engineers review and approve resource reductions, and Flux applies the changes through a controlled GitOps pipeline. This approach provides cost savings without sacrificing the stability that conservative resource allocation was meant to provide.

This guide covers using VPA Recommender for cost optimization with Flux CD.

## Prerequisites

- Kubernetes cluster with VPA Recommender deployed
- Flux CD installed and configured
- Git repository for Flux manifests
- Access to cluster cost metrics (optional but recommended)

## Step 1: Deploy VPA Recommender via Flux

Manage the VPA Recommender installation with Flux for consistent lifecycle management.

```yaml
# clusters/production/vpa/kustomization.yaml - VPA components via Flux
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: vpa-system
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/vpa
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
  - apiVersion: apps/v1
    kind: Deployment
    name: vpa-recommender
    namespace: kube-system
```

```yaml
# infrastructure/vpa/vpa-recommender-config.yaml - recommender tuning
apiVersion: v1
kind: ConfigMap
metadata:
  name: vpa-recommender-config
  namespace: kube-system
data:
  # Keep 30 days of history for more accurate recommendations
  recommendation-margin-fraction: "0.15"
  pod-recommendation-min-cpu-millicores: "25"
  pod-recommendation-min-memory-mb: "64"
```

## Step 2: Deploy VPA Objects in Off Mode for All Services

Enable cost analysis for all production workloads without risking disruption.

```yaml
# apps/production/vpa/all-services-vpa.yaml - VPA for all production services
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: frontend-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  updatePolicy:
    updateMode: "Off"
---
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: backend-api-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-api
  updatePolicy:
    updateMode: "Off"
---
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: worker-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker
  updatePolicy:
    updateMode: "Off"
```

## Step 3: Generate a Cost Optimization Report

Identify workloads with the highest potential for resource reduction.

```bash
#!/bin/bash
# cost-optimization-report.sh - identify over-provisioned workloads

echo "=== Cost Optimization Report ==="
echo "Comparing current requests vs VPA recommendations"
echo ""

kubectl get vpa -n production -o json | python3 -c "
import json, sys

data = json.load(sys.stdin)
savings = []

for item in data['items']:
    name = item['metadata']['name']
    recs = item.get('status', {}).get('recommendation', {}).get('containerRecommendations', [])
    for r in recs:
        target = r.get('target', {})
        savings.append({
            'vpa': name,
            'container': r['containerName'],
            'recommended_cpu': target.get('cpu', 'N/A'),
            'recommended_mem': target.get('memory', 'N/A'),
        })

for s in sorted(savings, key=lambda x: x['vpa']):
    print(f'  {s[\"vpa\"]}/{s[\"container\"]}:')
    print(f'    Recommended CPU: {s[\"recommended_cpu\"]}')
    print(f'    Recommended Memory: {s[\"recommended_mem\"]}')
"
```

## Step 4: Apply Cost Optimizations Through Flux GitOps

Implement resource reductions as tracked Git commits.

```bash
# Example: reduce over-provisioned frontend Deployment
# Review VPA recommendation first
kubectl get vpa frontend-vpa -n production \
  -o jsonpath='{.status.recommendation.containerRecommendations[0]}'

# Update the deployment resource requests in Git
# Apply a conservative reduction (use upper bound, not target, for safety)
cat apps/production/frontend/deployment.yaml | \
  python3 -c "
import sys, yaml
data = yaml.safe_load(sys.stdin)
# Update resource requests to VPA upper bound (conservative)
data['spec']['template']['spec']['containers'][0]['resources']['requests'] = {
    'cpu': '200m',  # Reduced from 500m based on VPA recommendation
    'memory': '256Mi'  # Reduced from 512Mi based on VPA recommendation
}
print(yaml.dump(data))
" > /tmp/deployment-updated.yaml

# Review the change and commit to Git
diff apps/production/frontend/deployment.yaml /tmp/deployment-updated.yaml
cp /tmp/deployment-updated.yaml apps/production/frontend/deployment.yaml
git add apps/production/frontend/deployment.yaml
git commit -m "cost: reduce frontend resource requests per VPA recommendation - estimated 40% CPU savings"
git push
```

## Step 5: Monitor Cost Metrics After Optimization

Track the cost impact of resource request reductions.

```bash
# Check pod scheduling efficiency after resource reduction
kubectl top pods -n production

# Verify no OOM kills occurred after resource reduction
kubectl get events -n production | grep OOMKilled

# Check if HPA (if configured) is scaling appropriately with new resource requests
kubectl get hpa -n production

# Monitor VPA recommendations after changes - should stabilize
kubectl get vpa -n production -o wide
```

## Best Practices

- Start with the largest workloads for maximum cost impact per change
- Use VPA's upper bound (not target) for initial reductions to reduce OOM risk
- Apply resource reductions incrementally - reduce by 20-30% per iteration
- Monitor CPU throttling metrics after reductions (container_cpu_throttled_seconds_total)
- Schedule optimization reviews monthly using the VPA recommendation report script

## Conclusion

VPA Recommender with Flux CD provides a systematic, evidence-based approach to Kubernetes cost optimization. By analyzing real workload patterns, identifying over-provisioned resources, and applying reductions through GitOps pipelines with full audit trails, you can reduce infrastructure costs without sacrificing reliability. The typical organization can reduce cloud spend by 20-40% by right-sizing Kubernetes workloads based on VPA Recommender data.
