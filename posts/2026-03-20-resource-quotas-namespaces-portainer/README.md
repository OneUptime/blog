# How to Set Resource Quotas on Namespaces in Portainer - Namespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Resource Quota, Namespace, Governance

Description: Learn how to configure CPU, memory, and object count quotas on Kubernetes namespaces in Portainer.

## Why Set Resource Quotas?

Without quotas, a single team or workload can request or limit all cluster CPU and memory, starving other namespaces. Resource quotas enforce fair sharing by limiting:

- Total CPU and memory requested or limited by all pods in a namespace.
- Number of Kubernetes objects (pods, services, PVCs).
- Number of LoadBalancer services (which may cost money).

## Setting Quotas When Creating a Namespace

In Portainer:

1. Go to **Namespaces** and click **Add with form**.
2. Enable the **Resource assignment** section.
3. Set CPU and memory limits.
4. Click **Create namespace**.

## Setting Quotas on an Existing Namespace

1. Click on a namespace in Portainer's namespace list.
2. Scroll to **Resource Quota**.
3. Update the values.
4. Click **Update namespace**.

## Comprehensive Resource Quota Example

```yaml
# Full resource quota for a production namespace

apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    # CPU limits
    requests.cpu: "8"          # Total CPU requests cannot exceed 8 cores
    limits.cpu: "16"           # Total CPU limits cannot exceed 16 cores

    # Memory limits
    requests.memory: 16Gi      # Total memory requests
    limits.memory: 32Gi        # Total memory limits

    # Storage limits
    requests.storage: 100Gi    # Total PVC storage requests
    persistentvolumeclaims: "20"  # Max number of PVCs

    # Object count limits
    pods: "50"                 # Max 50 pods
    services: "20"             # Max 20 services
    secrets: "50"              # Max 50 secrets
    configmaps: "50"           # Max 50 ConfigMaps

    # Service type limits
    services.loadbalancers: "2"   # Max 2 LoadBalancer services (costly!)
    services.nodeports: "5"       # Max 5 NodePort services
```

## Applying via CLI

```bash
# Apply the resource quota
kubectl apply -f production-quota.yaml

# Check quota usage in a namespace
kubectl describe resourcequota production-quota --namespace=production

# Watch quota usage change as resources are created
kubectl get resourcequota --namespace=production --watch
```

## Setting LimitRange for Default Per-Container Limits

Quotas work best with LimitRanges that provide default requests and limits for pods that do not declare them:

```yaml
# Without defaults, pods that omit requests or limits can be rejected by compute ResourceQuotas
apiVersion: v1
kind: LimitRange
metadata:
  name: require-resources
  namespace: production
spec:
  limits:
    - type: Container
      default:
        cpu: 200m
        memory: 256Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
```

## Diagnosing Quota Issues

```bash
# If a deployment fails to create pods, check quota
kubectl get events --namespace=production | grep -i quota

# Check current usage vs. limits
kubectl get resourcequota --namespace=production -o yaml
```

## Conclusion

Resource quotas are essential for multi-team Kubernetes clusters. Portainer simplifies setting CPU and memory quotas through its namespace UI, preventing any single team from accidentally consuming all cluster resources.
