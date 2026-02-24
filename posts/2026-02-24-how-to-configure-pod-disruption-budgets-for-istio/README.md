# How to Configure Pod Disruption Budgets for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, PDB, Kubernetes, Reliability, High Availability

Description: Learn how to configure Pod Disruption Budgets for Istio control plane and data plane components to prevent outages during cluster maintenance and upgrades.

---

Pod Disruption Budgets (PDBs) tell Kubernetes how many pods it can safely take down at once during voluntary disruptions. Without PDBs, a cluster upgrade or node drain can evict all your istiod replicas simultaneously, leaving the mesh without a control plane. Or it can evict all your ingress gateway pods, making your entire application unreachable.

This guide covers PDB configuration for every Istio component that needs protection.

## How PDBs Work

A PDB specifies either a minimum number of pods that must be available (`minAvailable`) or a maximum number of pods that can be unavailable (`maxUnavailable`) during voluntary disruptions. Voluntary disruptions include:

- Node drains (`kubectl drain`)
- Cluster autoscaler removing underutilized nodes
- Kubernetes version upgrades
- Node maintenance

PDBs do not protect against involuntary disruptions like hardware failures or kernel crashes. For those, you need multiple replicas and anti-affinity rules.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: example-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: my-service
```

When you run `kubectl drain`, Kubernetes checks all PDBs before evicting pods. If evicting a pod would violate a PDB, the drain waits until it is safe to proceed.

## PDB for istiod (Control Plane)

The istiod control plane is the most critical component to protect. Without istiod, new pods cannot get their sidecar configuration, certificates cannot rotate, and configuration changes do not propagate.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istiod
  namespace: istio-system
  labels:
    app: istiod
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: istiod
```

If you run 3 istiod replicas, `minAvailable: 1` means Kubernetes can evict up to 2 replicas during a drain, always keeping at least 1 running. For more conservative environments:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istiod
  namespace: istio-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: istiod
```

With `minAvailable: 2` and 3 replicas, only 1 istiod pod can be evicted at a time. This is safer but makes node drains slower because Kubernetes has to wait for each evicted pod to come back before evicting the next one.

You can also use `maxUnavailable` for percentage-based control:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istiod
  namespace: istio-system
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: istiod
```

`maxUnavailable: 1` means at most 1 istiod pod can be down at any time. This is equivalent to `minAvailable: N-1` where N is the current replica count, but it adapts automatically if you scale the deployment.

## PDB for Ingress Gateway

The ingress gateway handles all external traffic. Losing all gateway pods means a complete outage for external clients.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istio-ingressgateway
  namespace: istio-system
  labels:
    app: istio-ingressgateway
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: istio-ingressgateway
```

With 3 gateway replicas and `minAvailable: 2`, Kubernetes can only evict 1 gateway pod at a time. Given that the gateway is the entry point for all traffic, this is the right level of protection.

For high-traffic gateways where you cannot afford any capacity reduction during drains:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  maxUnavailable: 0
  selector:
    matchLabels:
      app: istio-ingressgateway
```

`maxUnavailable: 0` means no gateway pods can be evicted. This effectively blocks node drains until you manually scale up the gateway first or temporarily relax the PDB. This is extreme but appropriate for very high-traffic gateways.

## PDB for Egress Gateway

If you use an egress gateway for outbound traffic:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istio-egressgateway
  namespace: istio-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: istio-egressgateway
```

## PDB for Application Workloads in the Mesh

It is not just Istio components that need PDBs. Your application services in the mesh also benefit from PDBs, especially during cluster upgrades:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-service
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: payment-service
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: order-service
  namespace: production
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: order-service
```

For a service with 5 replicas, `maxUnavailable: 1` lets Kubernetes drain nodes one at a time while keeping at least 4 pods running. Combined with Istio's load balancing, clients do not notice the disruption.

## Configuring PDBs Through IstioOperator

You can configure PDBs for Istio system components directly through the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        podDisruptionBudget:
          minAvailable: 1
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          replicaCount: 3
          podDisruptionBudget:
            minAvailable: 2
    egressGateways:
      - name: istio-egressgateway
        enabled: true
        k8s:
          replicaCount: 2
          podDisruptionBudget:
            minAvailable: 1
```

This is cleaner than creating separate PDB manifests because the PDBs are managed alongside the deployments.

## Common Pitfalls

### PDB Blocking Node Drains

If your PDB is too restrictive and you do not have enough replicas, node drains will hang indefinitely. For example:

```yaml
# BAD: Only 2 replicas with minAvailable: 2
# This PDB will block ALL drains
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istiod
  namespace: istio-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: istiod
```

If istiod has only 2 replicas and `minAvailable: 2`, Kubernetes can never evict any istiod pod. Node drains that target nodes running istiod will hang until the drain timeout.

The fix is to make sure your replica count is always at least `minAvailable + 1`:

```
replicas = 3, minAvailable = 2  -> OK (1 can be evicted)
replicas = 3, minAvailable = 1  -> OK (2 can be evicted)
replicas = 2, minAvailable = 2  -> BROKEN (nothing can be evicted)
replicas = 2, minAvailable = 1  -> OK (1 can be evicted)
```

### PDB with maxUnavailable: 0

A PDB with `maxUnavailable: 0` will completely block voluntary disruptions. Use this only for the most critical components and have a procedure for temporarily relaxing it during maintenance:

```bash
# Temporarily increase gateway replicas before maintenance
kubectl scale deployment istio-ingressgateway -n istio-system --replicas=5

# Or temporarily patch the PDB
kubectl patch pdb istio-ingressgateway -n istio-system --type=merge -p '{"spec":{"maxUnavailable":1}}'

# Perform maintenance...

# Restore PDB
kubectl patch pdb istio-ingressgateway -n istio-system --type=merge -p '{"spec":{"maxUnavailable":0}}'
```

### Matching Labels Incorrectly

The PDB selector must exactly match the pod labels. A common mistake is using deployment labels instead of pod template labels:

```bash
# Verify which pods the PDB selects
kubectl get pods -n istio-system -l app=istiod

# Verify the PDB status
kubectl get pdb -n istio-system
```

The PDB status shows `ALLOWED DISRUPTIONS`. If this is 0, no pods can be evicted.

## Verifying PDB Configuration

After creating PDBs, verify they work correctly:

```bash
# List all PDBs and their status
kubectl get pdb -A

# Check a specific PDB
kubectl describe pdb istiod -n istio-system
```

The output shows:

```
Status:
    Conditions:
      ...
    Current Healthy:   3
    Desired Healthy:   2
    Disruptions Allowed:  1
    Expected Pods:     3
```

`Disruptions Allowed: 1` means Kubernetes can safely evict 1 pod. Test by draining a node that runs an istiod pod:

```bash
# Find which node runs istiod
kubectl get pods -n istio-system -l app=istiod -o wide

# Drain the node (this should succeed)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
```

The drain should proceed, evicting the istiod pod on that node while keeping the other replicas running.

## Summary

Pod Disruption Budgets are a simple but essential safeguard for Istio components. At minimum, create PDBs for istiod and the ingress gateway. Set `minAvailable` to at least 1 for istiod and at least 2 for the ingress gateway (or use `maxUnavailable: 1`). Make sure your replica count is always greater than `minAvailable` to avoid blocking node drains. Configure PDBs through IstioOperator for clean management, and verify the PDB status before any cluster maintenance event.
