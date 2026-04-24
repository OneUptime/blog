# How to Troubleshoot Kubernetes Resource Quota Exceeded in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, ResourceQuota, Troubleshooting, Namespace

Description: Diagnose and resolve Kubernetes ResourceQuota exceeded errors when deploying workloads through Portainer.

## Introduction

ResourceQuota objects limit the total resource consumption within a Kubernetes namespace. When a deployment exceeds these quotas, Kubernetes can reject Pod creation with `Forbidden` errors, and a Deployment may fail to create all of its Pods. Portainer surfaces these errors in the deployment UI, but understanding and resolving them requires knowledge of how quotas work. This guide walks through diagnosing quota issues and balancing resource allocation.

## Understanding ResourceQuota Errors

When you deploy through Portainer and the quota is exceeded, you'll see errors like:

```text
Error creating: pods "my-app-xxx" is forbidden: exceeded quota: team-quota,
requested: cpu=500m, used: cpu=3500m, limited: cpu=4000m
```

Or for object counts:

```text
Error from server (Forbidden): pods "my-app" is forbidden:
exceeded quota: ns-quota, requested: pods=1, used: pods=10, limited: pods=10
```

## Step 1: View Current Quota Usage in Portainer

Navigate to **Kubernetes > Namespaces > [your namespace]** in Portainer. The namespace detail page shows ResourceQuota utilization with usage bars.

```bash
# Via CLI

kubectl get resourcequota -n production
kubectl describe resourcequota team-quota -n production
```

Example output:
```yaml
Name:                   team-quota
Namespace:              production
Resource                Used    Hard
--------                ----    ----
cpu                     3500m   4000m
memory                  6Gi     8Gi
pods                    18      20
requests.storage        45Gi    50Gi
services.loadbalancers  2       3
```

## Step 2: Find Which Workloads Consume the Most Resources

```bash
# View current resource usage by pod
kubectl top pod -n production --sort-by=cpu

# Get requested CPU by pod (not actual usage)
kubectl get pods -n production -o json | python3 -c "
import sys, json
from decimal import Decimal

def parse_cpu(value):
    value = str(value or '0')
    if value.endswith('m'):
        return Decimal(value[:-1])
    return Decimal(value) * 1000

data = json.load(sys.stdin)
pods = []
for pod in data['items']:
    if pod.get('status', {}).get('phase') in ('Succeeded', 'Failed'):
        continue
    pod_spec = pod.get('spec', {})
    pod_requests = pod_spec.get('resources', {}).get('requests', {})
    if 'cpu' in pod_requests:
        cpu_req = parse_cpu(pod_requests['cpu'])
    else:
        containers = pod_spec.get('containers', [])
        init_containers = pod_spec.get('initContainers', [])
        app_cpu = sum((parse_cpu(c.get('resources', {}).get('requests', {}).get('cpu')) for c in containers), Decimal('0'))
        init_cpu = max((parse_cpu(c.get('resources', {}).get('requests', {}).get('cpu')) for c in init_containers), default=Decimal('0'))
        cpu_req = max(app_cpu, init_cpu)
    pods.append((pod['metadata']['name'], cpu_req))

pods.sort(key=lambda x: x[1], reverse=True)
for name, cpu in pods[:10]:
    print(f'{int(cpu)}m\t{name}')
"
```

## Step 3: Identify Pods Without Resource Requests

Pods without explicit resource requests still count against some quota types. If your ResourceQuota covers CPU or memory, new Pods should set those requests or limits directly, or inherit defaults from a LimitRange:

```bash
# Find containers missing CPU or memory requests
kubectl get pods -n production -o json | python3 -c "
import sys, json
data = json.load(sys.stdin)
for pod in data['items']:
    if pod.get('status', {}).get('phase') in ('Succeeded', 'Failed'):
        continue
    for container in pod['spec'].get('containers', []):
        requests = container.get('resources', {}).get('requests', {})
        missing = [resource for resource in ('cpu', 'memory') if resource not in requests]
        if missing:
            print(f\"Pod: {pod['metadata']['name']}, Container: {container['name']} - MISSING: {', '.join(missing)}\")
"
```

## Step 4: Use LimitRange to Set Defaults

If developers aren't setting resource requests, a LimitRange provides defaults:

```yaml
# limitrange-defaults.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
  - default:
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
    type: Container
```

```bash
kubectl apply -f limitrange-defaults.yaml
```

## Step 5: Increase the Quota

If the quota is genuinely too low for your workloads:

```yaml
# Portainer: Kubernetes > Namespaces > Edit ResourceQuota
# Or apply via kubectl:
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: production
spec:
  hard:
    requests.cpu: "8"
    requests.memory: "16Gi"
    limits.cpu: "16"
    limits.memory: "32Gi"
    pods: "50"
    services: "20"
    persistentvolumeclaims: "20"
    requests.storage: "100Gi"
```

```bash
kubectl apply -f quota.yaml
```

## Step 6: Right-Size Existing Workloads

Often the fix is reducing over-allocated resources on existing deployments:

```bash
# Check actual vs requested usage
kubectl top pod -n production

# If a pod requests 1 CPU but uses 50m, it's over-allocated
# Update the deployment
kubectl set resources deployment my-app \
  --requests=cpu=100m,memory=128Mi \
  --limits=cpu=500m,memory=512Mi \
  -n production
```

In Portainer: **Kubernetes > Applications > [App] > Edit > Resource Reservations**

## Step 7: Scale Down Unused Workloads

```bash
# List all deployments with replica counts
kubectl get deployments -n production

# Scale down non-critical workloads temporarily
kubectl scale deployment staging-app --replicas=0 -n production

# Or use a CronJob to auto-scale down at night
```

## Step 8: Quota for Scoped Resources

Advanced quotas can apply to specific priority classes or scopes:

```yaml
# Only count low-priority pods against quota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: low-priority-quota
  namespace: production
spec:
  hard:
    pods: "20"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - "low-priority"
```

## Quick Diagnosis Script

```bash
#!/bin/bash
# quota-check.sh - Comprehensive quota diagnosis
NAMESPACE=${1:-default}

echo "=== ResourceQuota Status ==="
kubectl describe resourcequota -n "$NAMESPACE"

echo ""
echo "=== LimitRange ==="
kubectl describe limitrange -n "$NAMESPACE" 2>/dev/null || echo "No LimitRange set"

echo ""
echo "=== Top Resource Consumers ==="
kubectl top pod -n "$NAMESPACE" --sort-by=cpu 2>/dev/null | head -20

echo ""
echo "=== Recent Quota-Related Events ==="
kubectl get events -n "$NAMESPACE" --field-selector=reason=FailedCreate | grep -i quota
```

## Conclusion

ResourceQuota exceeded errors in Portainer-managed Kubernetes namespaces are resolved by understanding current consumption, identifying over-allocated workloads, applying LimitRange defaults, and either right-sizing requests or increasing quota limits. The systematic approach of viewing quota utilization, finding the largest consumers, and adjusting allocations allows teams to share cluster resources fairly while preventing runaway resource consumption.
