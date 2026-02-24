# How to Set Up Istio Resource Budgets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Resource Budgets, Kubernetes, Capacity Planning, ResourceQuota

Description: How to plan and enforce resource budgets for Istio components including control plane allocation, sidecar overhead, and namespace-level resource quotas.

---

Every Istio component consumes cluster resources, and without a budget, that consumption can grow unchecked. Resource budgets help you plan how much of your cluster's capacity goes to Istio versus your actual workloads. This includes the control plane, the sidecar proxies in every pod, and the telemetry infrastructure.

This guide covers how to calculate your Istio resource budget and enforce it using Kubernetes resource management features.

## Calculating the Total Istio Resource Budget

To figure out your total Istio overhead, add up these components:

### Control Plane

```bash
# Check current control plane resource requests
kubectl get pods -n istio-system -o json | jq '
  [.items[].spec.containers[].resources.requests // {} |
    {cpu: (.cpu // "0"), memory: (.memory // "0")}
  ] | {
    total_cpu: [.[].cpu] | join(", "),
    total_memory: [.[].memory] | join(", ")
  }'
```

### Sidecar Overhead

Sidecar overhead is per-pod. To calculate total:

```bash
# Count pods with sidecars
SIDECAR_COUNT=$(kubectl get pods -A -o json | jq '[.items[] | select(.spec.containers[]?.name == "istio-proxy")] | length')

# If each sidecar requests 100m CPU and 128Mi memory:
echo "Total sidecar CPU request: ${SIDECAR_COUNT} * 100m"
echo "Total sidecar memory request: ${SIDECAR_COUNT} * 128Mi"
```

For example, a cluster with 1000 pods and Istio sidecars requesting 100m CPU and 128Mi memory each uses:
- CPU: 1000 * 100m = 100 CPU cores just for sidecars
- Memory: 1000 * 128Mi = 128 GiB just for sidecars

This is a significant chunk of cluster capacity.

## Setting Resource Quotas Per Namespace

Use Kubernetes ResourceQuotas to limit how much resource Istio components can consume in each namespace:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: istio-system-quota
  namespace: istio-system
spec:
  hard:
    requests.cpu: "8"
    requests.memory: "16Gi"
    limits.cpu: "16"
    limits.memory: "32Gi"
    pods: "50"
```

This caps the total resources available to all pods in istio-system, preventing the control plane from consuming more than the budgeted amount.

## Controlling Sidecar Resource Overhead

The most impactful part of your Istio resource budget is the per-pod sidecar overhead. Set global defaults that align with your budget:

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
            cpu: 200m
            memory: 128Mi
```

These are aggressive limits suited for budget-conscious clusters. Adjust based on your workload patterns.

## Using LimitRange for Sidecar Defaults

LimitRange can provide default resource values for containers that do not specify them. This acts as a safety net:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: sidecar-limits
  namespace: api-services
spec:
  limits:
  - type: Container
    default:
      cpu: 200m
      memory: 128Mi
    defaultRequest:
      cpu: 50m
      memory: 64Mi
    max:
      cpu: "1"
      memory: 512Mi
    min:
      cpu: 10m
      memory: 32Mi
```

## Budgeting for Different Environments

Different environments need different budgets:

### Development Environment

Minimize Istio overhead to save costs:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 200m
            memory: 512Mi
          limits:
            cpu: 500m
            memory: 1Gi
        replicaCount: 1
    ingressGateways:
    - name: istio-ingressgateway
      k8s:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
        replicaCount: 1
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 25m
            memory: 64Mi
          limits:
            cpu: 100m
            memory: 128Mi
```

### Production Environment

Allocate enough for reliability:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 1
            memory: 4Gi
          limits:
            cpu: 4
            memory: 8Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
    ingressGateways:
    - name: istio-ingressgateway
      k8s:
        resources:
          requests:
            cpu: 1
            memory: 512Mi
          limits:
            cpu: 4
            memory: 2Gi
        hpaSpec:
          minReplicas: 3
          maxReplicas: 20
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

## PodDisruptionBudgets for the Control Plane

Protect Istio components from disruption during maintenance:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istiod-pdb
  namespace: istio-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: istiod
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ingressgateway-pdb
  namespace: istio-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: istio-ingressgateway
```

## Priority Classes for Budget Enforcement

Make sure Istio components are not evicted when the cluster is under resource pressure:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: istio-control-plane-critical
value: 1000000
globalDefault: false
description: "For Istio control plane components"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: istio-gateway-high
value: 900000
globalDefault: false
description: "For Istio gateways"
```

Apply these to the Istio installation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        priorityClassName: istio-control-plane-critical
    ingressGateways:
    - name: istio-ingressgateway
      k8s:
        priorityClassName: istio-gateway-high
```

## Tracking Budget Compliance

Monitor whether your namespaces are staying within budget:

```bash
# Check ResourceQuota usage
kubectl get resourcequota -n istio-system

# Check actual vs budgeted resources for sidecars
kubectl top pods -A --containers | grep istio-proxy | \
  awk '{cpu_sum+=$3; mem_sum+=$4; count++} END {
    print "Sidecars:", count;
    print "Total CPU:", cpu_sum, "m";
    print "Total Memory:", mem_sum, "Mi";
    print "Avg CPU per sidecar:", cpu_sum/count, "m";
    print "Avg Memory per sidecar:", mem_sum/count, "Mi"
  }'
```

## Creating a Resource Budget Report

Build a quick script to generate a resource budget summary:

```bash
#!/bin/bash
echo "=== Istio Resource Budget Report ==="

echo ""
echo "--- Control Plane ---"
kubectl top pods -n istio-system --no-headers

echo ""
echo "--- Sidecar Summary ---"
SIDECAR_PODS=$(kubectl get pods -A -o json | jq '[.items[] | select(.spec.containers[]?.name == "istio-proxy")] | length')
echo "Total pods with sidecars: $SIDECAR_PODS"

echo ""
echo "--- Namespace Quotas ---"
kubectl get resourcequota -A --no-headers 2>/dev/null || echo "No resource quotas found"

echo ""
echo "--- Top 10 Memory-Consuming Sidecars ---"
kubectl top pods -A --containers --no-headers | grep istio-proxy | sort -k4 -rn | head -10
```

## Reducing the Budget

If you need to reduce Istio's resource footprint:

1. Lower sidecar resource requests across the board
2. Use Sidecar resources to restrict configuration scope (reduces memory)
3. Reduce Envoy concurrency to 1 (saves CPU)
4. Disable access logging where not needed
5. Consider disabling sidecar injection for workloads that do not benefit from the mesh

```yaml
# Example: opt-out specific namespaces from injection
kubectl label namespace batch-jobs istio-injection-
```

## Summary

Setting up an Istio resource budget involves calculating the total overhead (control plane plus per-pod sidecar cost), setting ResourceQuotas to enforce limits, choosing appropriate resource requests and limits for each environment, and monitoring compliance over time. The per-pod sidecar overhead is the biggest factor because it scales linearly with pod count. In large clusters, even small per-sidecar savings multiply into significant cluster-wide impact.
