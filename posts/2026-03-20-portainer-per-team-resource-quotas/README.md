# How to Configure Per-Team Resource Quotas in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Resource Quota, Team, Multi-Tenancy, Business Edition, Kubernetes

Description: Learn how to configure per-team resource quotas in Portainer Business Edition for Docker and Kubernetes environments to prevent resource overconsumption.

---

Resource quotas prevent a single team from monopolizing CPU, memory, or storage on a shared infrastructure. In Portainer Business Edition, quotas are configured per Kubernetes namespace. For Docker environments, use Portainer access control together with per-service or per-container resource limits.

## Portainer Business Edition Resource Quotas

Portainer BE exposes namespace-level quota controls for Kubernetes. In Docker environments, Portainer can restrict access by team and apply resource limits on individual services or containers, but not aggregate per-team quotas across the entire environment.

### Kubernetes Namespace Quotas

In Kubernetes environments, give each team access to its own namespace and apply a ResourceQuota:

```yaml
# Apply a ResourceQuota for Team A's namespace

apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-a-quota
  namespace: team-a
spec:
  hard:
    requests.cpu: "4"        # Total CPU requests capped at 4 cores
    requests.memory: 8Gi     # Total memory requests capped at 8 GiB
    limits.cpu: "8"          # Total CPU limits capped at 8 cores
    limits.memory: 16Gi      # Total memory limits capped at 16 GiB
    pods: "20"               # Maximum 20 pods
    services: "10"           # Maximum 10 services
    persistentvolumeclaims: "5"  # Maximum 5 PVCs
```

Apply this with kubectl, or configure equivalent namespace quotas from Portainer's namespace UI:

```bash
kubectl apply -f team-a-quota.yaml
```

View the quota status in Portainer by opening **Namespaces**, selecting `team-a`, and checking the **Resource Quota** section.

### LimitRange for Default Container Limits

Prevent containers without resource specifications from using unlimited resources:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: team-a-limits
  namespace: team-a
spec:
  limits:
    - type: Container
      default:
        cpu: "500m"
        memory: 256Mi
      defaultRequest:
        cpu: "100m"
        memory: 64Mi
      max:
        cpu: "2"
        memory: 2Gi
```

This ensures every container in the namespace has limits, even if the developer didn't specify them.

## Docker Stack Resource Limits

For Docker Standalone environments, Portainer does not provide aggregate per-team quotas. Instead, enforce limits on each service in tenant stacks:

```yaml
version: "3.8"

services:
  api:
    image: my-api:latest
    cpus: "1.0"
    mem_limit: 512M
    mem_reservation: 128M
```

## Portainer BE: Namespace-Level Resource Quotas

Portainer Business Edition lets you set these quotas directly on Kubernetes namespaces:

1. Go to **Namespaces** and select the namespace.
2. Under **Resource Quota**, toggle **Resource assignment** on and set CPU and memory limits.
3. Optionally configure storage quotas in the same namespace settings.

## Monitoring Resource Usage per Team

Track actual resource usage against quotas:

```bash
# Kubernetes: check quota usage
kubectl describe quota team-a-quota -n team-a

# Output shows current vs limit:
# Name: team-a-quota
# Namespace: team-a
# Resource          Used   Hard
# --------          ----   ----
# limits.cpu        2      8
# limits.memory     3Gi    16Gi
# pods              8      20
```

For Docker environments, review CPU and memory usage per container in Portainer under **Containers > [container] > Stats**.

## Alerting on Quota Approach

Set up alerts when a team approaches their quota:

```bash
#!/bin/bash
# check-quota-usage.sh

kubectl get resourcequota -A -o json | jq -r '
  .items[] |
  .metadata.namespace as $ns |
  .status.hard as $hard |
  .status.used as $used |
  (.status.used["limits.memory"] // "0") as $used_mem |
  (.status.hard["limits.memory"] // "0") as $hard_mem |
  {namespace: $ns, used_memory: $used_mem, hard_memory: $hard_mem}
' | jq -r '. | "\(.namespace): \(.used_memory) / \(.hard_memory)"'
```

Use OneUptime to monitor these values and alert when usage exceeds 80% of the quota.
