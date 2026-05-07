# How to Apply Resource Quotas in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Resource Quota, Kubernetes, Governance, DevOps

Description: Learn how to apply CPU, memory, and object count quotas to Portainer environments and namespaces to prevent resource exhaustion.

Resource Quotas in Docker Environments

For Docker standalone and Swarm environments, Portainer does not use Kubernetes-style namespace ResourceQuotas. Instead, it lets you apply resource reservations and limits to individual containers or services through its deployment and configuration forms.

Resource Quotas in Kubernetes Environments

Kubernetes environments support namespace-level ResourceQuotas. Portainer exposes these through the namespace management UI.

## Setting Quotas During Namespace Creation

1. Go to **Namespaces > Add with form**.
2. Enable **Resource assignment**.
3. Configure:
   - **CPU limit**: Maximum CPU across all pods in the namespace.
   - **Memory limit**: Maximum memory across all pods.
4. If your cluster setup allows external load balancers, enable **Load Balancer quota** and set the maximum number of LoadBalancer services.
5. Click **Create namespace**.

### Setting Quotas on Existing Namespaces

1. Click on a namespace in the namespace list.
2. Scroll to **Resource assignment**.
3. Update the quota values.
4. Click **Update namespace**.

## YAML-Based Resource Quota

For more granular control, apply a ResourceQuota manifest directly:

```yaml
# Comprehensive namespace quota

apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    # Compute resources
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi

    # Storage resources
    requests.storage: 100Gi
    persistentvolumeclaims: "20"

    # Object count limits
    pods: "100"
    services: "30"
    secrets: "100"
    configmaps: "100"
    replicationcontrollers: "0"   # Disallow legacy RC

    # Service type limits (controls cloud costs)
    services.loadbalancers: "3"
    services.nodeports: "10"
```

## LimitRange for Default Resource Requests

Pair ResourceQuota with LimitRange to ensure containers get default resource requests and limits when they are omitted from pod specs:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    - type: Container
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      default:
        cpu: 250m
        memory: 256Mi
      max:
        cpu: "4"
        memory: 8Gi
      min:
        cpu: 10m
        memory: 32Mi
```

## Checking Quota Usage

```bash
# Check current quota usage in a namespace
kubectl describe resourcequota production-quota --namespace=production

# Get selected quota usage and limits as JSON
kubectl get resourcequota production-quota \
  --namespace=production -o json | \
  jq '{
    cpu_used: .status.used["requests.cpu"],
    cpu_limit: .status.hard["requests.cpu"],
    mem_used: .status.used["requests.memory"],
    mem_limit: .status.hard["requests.memory"]
  }'
```

## Setting Resource Quotas per Portainer User Team

For multi-tenant environments, give each team their own namespace with appropriate quotas:

```bash
# Create team namespace with quota
kubectl create namespace team-frontend
kubectl apply -f - <<EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: frontend-quota
  namespace: team-frontend
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 4Gi
    limits.cpu: "4"
    limits.memory: 8Gi
    pods: "20"
EOF
```

## Quota Exceeded Errors

When a deployment fails due to quota:

```bash
# Check for quota-related events
kubectl get events --namespace=production | grep -i quota

# Typical error message:
# Error creating: pods "myapp-xxx" is forbidden:
# exceeded quota: production-quota, requested: limits.memory=512Mi,
# used: limits.memory=31.5Gi, limited: limits.memory=32Gi
```

## Conclusion

Resource quotas are essential for multi-tenant Portainer environments. They prevent any single team or namespace from consuming all cluster resources and ensure fair resource distribution across your organization's workloads.
