# How to Set Resource Limits for Istio Control Plane

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Resource Limits, Kubernetes, Control Plane, Performance

Description: How to properly set CPU and memory resource requests and limits for Istio control plane components including istiod, gateways, and more.

---

The Istio control plane consumes real CPU and memory on your cluster, and getting the resource limits right matters. Set them too low and istiod crashes or becomes unresponsive. Set them too high and you waste cluster resources that could be used by your actual workloads. The right values depend on the size of your mesh, the number of services, and how frequently your configuration changes.

This guide covers practical resource limit settings for each Istio control plane component.

## Understanding Istio Control Plane Components

The main resource consumers in Istio's control plane are:

- **istiod (Pilot)**: The brain of the mesh. It watches Kubernetes for changes, computes Envoy configurations, and pushes them to all sidecars. Memory usage scales with the number of services and endpoints.
- **Ingress Gateway**: Handles incoming traffic from outside the mesh. Resource usage scales with traffic volume.
- **Egress Gateway** (optional): Handles outbound traffic from the mesh. Similar scaling characteristics to the ingress gateway.

## Setting Resource Limits via IstioOperator

The recommended way to set resource limits is through the IstioOperator resource:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-control-plane
  namespace: istio-system
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 2
            memory: 4Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
          metrics:
          - type: Resource
            resource:
              name: cpu
              target:
                type: Utilization
                averageUtilization: 80
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 256Mi
          limits:
            cpu: 2
            memory: 1Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 10
          metrics:
          - type: Resource
            resource:
              name: cpu
              target:
                type: Utilization
                averageUtilization: 75
    egressGateways:
    - name: istio-egressgateway
      enabled: true
      k8s:
        resources:
          requests:
            cpu: 250m
            memory: 128Mi
          limits:
            cpu: 1
            memory: 512Mi
```

## Setting Resource Limits via Helm

If you use Helm to install Istio:

```bash
helm install istiod istio/istiod -n istio-system \
  --set pilot.resources.requests.cpu=500m \
  --set pilot.resources.requests.memory=2Gi \
  --set pilot.resources.limits.cpu=2 \
  --set pilot.resources.limits.memory=4Gi
```

Or using a values file:

```yaml
# values-production.yaml
pilot:
  resources:
    requests:
      cpu: 500m
      memory: 2Gi
    limits:
      cpu: 2
      memory: 4Gi
  autoscaleEnabled: true
  autoscaleMin: 2
  autoscaleMax: 5

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

```bash
helm install istiod istio/istiod -n istio-system -f values-production.yaml
```

## Sizing Guidelines by Cluster Size

Here are practical starting points based on cluster size:

### Small Clusters (up to 50 services, 200 pods)

```yaml
pilot:
  resources:
    requests:
      cpu: 200m
      memory: 512Mi
    limits:
      cpu: 1
      memory: 1Gi
```

### Medium Clusters (50-500 services, 2000 pods)

```yaml
pilot:
  resources:
    requests:
      cpu: 500m
      memory: 2Gi
    limits:
      cpu: 2
      memory: 4Gi
```

### Large Clusters (500+ services, 5000+ pods)

```yaml
pilot:
  resources:
    requests:
      cpu: 1
      memory: 4Gi
    limits:
      cpu: 4
      memory: 8Gi
```

These are starting points. Monitor actual usage and adjust accordingly.

## Checking Current Resource Usage

Before changing limits, check what the control plane is actually using:

```bash
# Current resource usage for istiod
kubectl top pods -n istio-system -l app=istiod

# Current resource usage for gateways
kubectl top pods -n istio-system -l app=istio-ingressgateway

# Detailed resource info
kubectl describe pod -n istio-system -l app=istiod | grep -A 5 "Requests\|Limits"
```

## Setting Limits for Istiod

Istiod is the most important component to get right. Its memory usage is primarily driven by:

- Number of services and endpoints in the mesh
- Number of Istio configuration objects (VirtualServices, DestinationRules, etc.)
- Number of connected sidecars
- Frequency of configuration changes

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 2
            memory: 4Gi
        env:
        - name: PILOT_ENABLE_CONFIG_DISTRIBUTION_TRACKING
          value: "false"
        - name: PILOT_PUSH_THROTTLE
          value: "100"
```

The `PILOT_PUSH_THROTTLE` environment variable limits how many xDS pushes istiod performs concurrently. In large clusters, this prevents CPU spikes during mass configuration updates.

## Setting Limits for Ingress Gateway

The ingress gateway's resource needs depend on traffic volume:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
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
          metrics:
          - type: Resource
            resource:
              name: cpu
              target:
                type: Utilization
                averageUtilization: 70
```

For high-traffic gateways, set the CPU limit higher and let the HPA scale horizontally.

## Setting Pod Disruption Budgets

Protect the control plane during node drains and upgrades:

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
  minAvailable: 1
  selector:
    matchLabels:
      app: istio-ingressgateway
```

## Priority Classes

Give the Istio control plane a higher priority than regular workloads so it does not get evicted:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: istio-control-plane
value: 1000000
globalDefault: false
description: "Priority class for Istio control plane components"
---
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        priorityClassName: istio-control-plane
    ingressGateways:
    - name: istio-ingressgateway
      k8s:
        priorityClassName: istio-control-plane
```

## Verifying Resource Limits

After applying changes, verify they took effect:

```bash
# Check istiod resource settings
kubectl get deployment istiod -n istio-system -o jsonpath='{.spec.template.spec.containers[0].resources}'

# Check gateway resource settings
kubectl get deployment istio-ingressgateway -n istio-system -o jsonpath='{.spec.template.spec.containers[0].resources}'
```

## Common Mistakes

One common mistake is setting memory limits too close to requests. Istiod has periodic memory spikes during large configuration pushes, and if the limit is too close to the request, it can get OOMKilled during those spikes. Give it at least 2x headroom between request and limit.

Another mistake is not enabling HPA for istiod. A single istiod instance might handle a small cluster fine during steady state, but during a large rolling deployment (where hundreds of pods start simultaneously), it can get overwhelmed. HPA ensures additional instances spin up during these peaks.

## Summary

Setting resource limits for the Istio control plane is about matching the allocation to your cluster's size and traffic patterns. Start with the sizing guidelines based on your cluster size, monitor actual usage with `kubectl top`, and adjust from there. Always run at least two istiod replicas in production, use HPA for both istiod and gateways, and set PodDisruptionBudgets to prevent all instances from going down simultaneously.
