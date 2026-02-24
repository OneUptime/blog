# How to Configure Istio with Kubernetes Namespace Quotas

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Resource Quotas, Namespaces, Capacity Planning

Description: How to configure Kubernetes ResourceQuotas and LimitRanges correctly when using Istio, accounting for sidecar proxy resource consumption and injection overhead.

---

Kubernetes ResourceQuotas and LimitRanges help you control resource consumption per namespace. But when Istio injects a sidecar into every pod, each pod suddenly uses more CPU, memory, and counts as having additional containers. If your quotas do not account for this extra overhead, pods will fail to schedule because they exceed the namespace limits.

This guide shows how to properly size your quotas and limits when running Istio.

## Understanding the Sidecar Overhead

Every pod with Istio sidecar injection has at least one extra container (`istio-proxy`) and potentially an init container (`istio-init`). The default sidecar resource requests are:

```
istio-proxy:
  CPU request: 100m (default)
  Memory request: 128Mi (default)
  CPU limit: 2000m (default)
  Memory limit: 1Gi (default)
```

These defaults can vary by Istio version and installation profile. Check your actual defaults:

```bash
kubectl get configmap istio-sidecar-injector -n istio-system -o yaml | \
  grep -A 20 "resources"
```

## How Quotas Are Calculated

ResourceQuotas sum up resource requests and limits across all pods in a namespace. With Istio, each pod's total is:

```
Pod CPU request = App CPU request + Sidecar CPU request
Pod Memory request = App Memory request + Sidecar Memory request
```

If your app requests 200m CPU and 256Mi memory, and the sidecar requests 100m CPU and 128Mi memory, each pod actually needs 300m CPU and 384Mi memory from the quota.

For 10 replicas:
- Without Istio: 2000m CPU, 2560Mi memory
- With Istio: 3000m CPU, 3840Mi memory

That is a 50% increase in this example.

## Setting ResourceQuotas with Istio

Account for the sidecar overhead when defining quotas:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
    pods: "100"
    count/deployments.apps: "20"
```

To calculate the right values, estimate your workload needs and add the sidecar overhead:

```
Total CPU requests = (App CPU per pod + Sidecar CPU per pod) * Expected pod count
Total Memory requests = (App Memory per pod + Sidecar Memory per pod) * Expected pod count
```

## Configuring LimitRanges

LimitRanges set default and maximum resources per container or per pod. With Istio, you need to make sure the limits accommodate the sidecar:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: production-limits
  namespace: production
spec:
  limits:
  - type: Container
    default:
      cpu: 500m
      memory: 512Mi
    defaultRequest:
      cpu: 100m
      memory: 128Mi
    max:
      cpu: "4"
      memory: 4Gi
    min:
      cpu: 50m
      memory: 64Mi
  - type: Pod
    max:
      cpu: "8"
      memory: 8Gi
```

The per-container limits must allow the sidecar's resource requirements. If your LimitRange sets a maximum container CPU of 200m but the sidecar requests 100m and can burst to 2000m, the sidecar will violate the limit and the pod will fail to create.

Make sure the Container max limits are high enough to accommodate the sidecar's limits:

```yaml
# The sidecar's default CPU limit is 2000m
# Your LimitRange max must be >= 2000m
limits:
- type: Container
  max:
    cpu: "4"       # Must be >= sidecar CPU limit
    memory: 4Gi    # Must be >= sidecar memory limit
```

## Reducing Sidecar Resource Requests

If the default sidecar resources are too high for your quota budget, reduce them globally:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

Or per-deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "50m"
        sidecar.istio.io/proxyCPULimit: "500m"
        sidecar.istio.io/proxyMemory: "64Mi"
        sidecar.istio.io/proxyMemoryLimit: "256Mi"
```

Be careful with setting requests too low. If the sidecar does not have enough CPU, it becomes a bottleneck and adds latency to every request. If it does not have enough memory, it gets OOMKilled.

## Handling Quota Exceeded Errors

When a pod fails to schedule due to quota limits, you will see an error like:

```
Error creating: pods "my-app-xyz" is forbidden: exceeded quota: production-quota,
requested: requests.cpu=300m, used: requests.cpu=19800m, limited: requests.cpu=20
```

To debug this, check current quota usage:

```bash
kubectl describe resourcequota production-quota -n production
```

Output:

```
Name:            production-quota
Namespace:       production
Resource         Used    Hard
--------         ----    ----
limits.cpu       35      40
limits.memory    70Gi    80Gi
pods             95      100
requests.cpu     19.8    20
requests.memory  38Gi    40Gi
```

If the sidecar overhead pushed you over the limit, you have a few options:
1. Increase the quota
2. Reduce sidecar resource requests
3. Reduce application resource requests
4. Reduce the number of replicas

## Monitoring Quota Usage

Set up alerts for quota usage approaching limits:

```yaml
# Prometheus alert rule
groups:
- name: quota-alerts
  rules:
  - alert: NamespaceQuotaNearLimit
    expr: |
      kube_resourcequota{type="used"}
      /
      kube_resourcequota{type="hard"}
      > 0.85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Namespace {{ $labels.namespace }} quota {{ $labels.resource }} at {{ $value | humanizePercentage }}"
```

## Planning for Scale

When planning quota sizes, create a spreadsheet or calculation:

```
Namespace: production
Services: 5
Replicas per service: 3-10

Per pod:
  App CPU request: 200m
  App Memory request: 256Mi
  Sidecar CPU request: 50m
  Sidecar Memory request: 64Mi
  Total CPU request: 250m
  Total Memory request: 320Mi

Max pods: 50 (5 services * 10 replicas)
Max CPU request: 12.5 (50 * 250m)
Max Memory request: 15.6Gi (50 * 320Mi)

Quota (with 30% headroom):
  CPU request: 16
  Memory request: 20Gi
```

Add headroom for:
- HPA scaling spikes
- Rolling update surge pods
- New service deployments

## Namespace-Level Sidecar Configuration

Use the Sidecar resource to limit the scope of the sidecar, which can reduce memory usage:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: production
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "database/*"
```

This tells sidecars in the production namespace to only know about services in their own namespace, istio-system, and the database namespace. This reduces the memory footprint of each sidecar because it does not need to track endpoints for the entire mesh.

## Wrapping Up

Getting ResourceQuotas right with Istio is a math problem. Every pod consumes more resources than your application alone because of the sidecar overhead. Calculate the per-pod total (app + sidecar), multiply by expected pod count, add headroom for scaling and deployments, and set your quotas accordingly. Reduce sidecar resource requests where possible, use Sidecar resources to limit the proxy scope, and monitor quota usage to catch problems before they cause deployment failures.
