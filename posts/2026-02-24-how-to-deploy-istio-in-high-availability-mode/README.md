# How to Deploy Istio in High Availability Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, High Availability, Production, Kubernetes, Reliability

Description: How to configure Istio for high availability with multiple control plane replicas, anti-affinity rules, and pod disruption budgets.

---

Running a single instance of istiod in production is asking for trouble. If that one pod goes down for any reason - node failure, OOM kill, rolling update - your entire mesh loses its control plane. Existing proxy configurations keep working (the data plane is decoupled from the control plane), but no new configuration can be pushed, no new certificates can be issued, and new pods will not get their sidecar configured. Here is how to set up Istio for proper high availability.

## What HA Means for Istio

High availability for Istio's control plane means:

- **Multiple istiod replicas** - At least 3, spread across different nodes and availability zones
- **Pod disruption budgets** - Prevent too many replicas from being down simultaneously
- **Horizontal pod autoscaling** - Scale up during high load
- **Graceful upgrades** - Rolling updates that maintain availability throughout

The data plane (Envoy proxies) is inherently highly available because each pod has its own sidecar. If one sidecar crashes, it only affects that one pod.

## Configuring Multiple Istiod Replicas

Start with at least 3 replicas:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-ha
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
```

Apply it:

```bash
istioctl install -f istio-ha.yaml
```

Verify all replicas are running:

```bash
kubectl get pods -n istio-system -l app=istiod
```

## Pod Anti-Affinity

Having 3 replicas on the same node does not help if that node goes down. Pod anti-affinity spreads replicas across nodes:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        affinity:
          podAntiAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: istiod
                topologyKey: kubernetes.io/hostname
            - weight: 50
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: istiod
                topologyKey: topology.kubernetes.io/zone
```

This configuration prefers spreading istiod pods across different nodes (weight 100) and different availability zones (weight 50). Using `preferredDuringSchedulingIgnoredDuringExecution` rather than `required` means pods can still schedule if the ideal spread is not possible.

For strict zone spreading (if you have enough zones):

```yaml
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchLabels:
          app: istiod
      topologyKey: topology.kubernetes.io/zone
```

## Topology Spread Constraints

For even more control over how istiod replicas are distributed, use topology spread constraints:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: istiod
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: istiod
```

This ensures istiod replicas are evenly distributed across both zones and nodes.

## Pod Disruption Budgets

A PodDisruptionBudget (PDB) prevents Kubernetes from evicting too many istiod pods at once during voluntary disruptions (node drains, cluster upgrades):

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istiod-pdb
  namespace: istio-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: istiod
```

With this PDB, Kubernetes will always keep at least 2 istiod pods running. If you have 3 replicas, only 1 can be disrupted at a time.

You can also configure this through IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        podDisruptionBudget:
          minAvailable: 2
```

## Horizontal Pod Autoscaler

Add autoscaling so the control plane scales with load:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        hpaSpec:
          minReplicas: 3
          maxReplicas: 10
          metrics:
          - type: Resource
            resource:
              name: cpu
              target:
                type: Utilization
                averageUtilization: 75
```

This maintains a minimum of 3 replicas but can scale up to 10 during high load (for example, when many pods are restarting simultaneously and requesting certificates).

Verify the HPA is working:

```bash
kubectl get hpa -n istio-system
```

## Ingress Gateway HA

Do not forget about the ingress gateway. It also needs high availability:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        replicaCount: 3
        resources:
          requests:
            cpu: 500m
            memory: 256Mi
          limits:
            cpu: 2000m
            memory: 1Gi
        affinity:
          podAntiAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: istio-ingressgateway
                topologyKey: kubernetes.io/hostname
        hpaSpec:
          minReplicas: 3
          maxReplicas: 10
          metrics:
          - type: Resource
            resource:
              name: cpu
              target:
                type: Utilization
                averageUtilization: 75
        podDisruptionBudget:
          minAvailable: 2
```

## Leader Election

When you have multiple istiod replicas, they use leader election for tasks that should only happen once (like webhook serving). Check leader status:

```bash
kubectl get lease -n istio-system
```

Each istiod replica can serve xDS (config push) independently - they do not need to be the leader for that. Leader election is only for a few coordination tasks.

## Health Checks

Make sure liveness and readiness probes are configured properly. The default Istio installation includes these, but verify:

```bash
kubectl get deployment istiod -n istio-system -o yaml | grep -A10 livenessProbe
kubectl get deployment istiod -n istio-system -o yaml | grep -A10 readinessProbe
```

The readiness probe ensures that traffic (xDS connections from proxies) is only routed to healthy istiod instances.

## Testing HA

Verify your HA setup actually works:

```bash
# Kill one istiod pod and verify the mesh keeps working
kubectl delete pod -n istio-system -l app=istiod --field-selector=metadata.name=istiod-xyz

# Check that proxies reconnect to remaining replicas
istioctl proxy-status

# Apply a config change and verify it propagates
kubectl apply -f test-virtualservice.yaml
istioctl proxy-config routes test-pod -n default
```

Also simulate a node failure:

```bash
# Cordon a node running istiod
kubectl cordon node-xyz

# Verify istiod is still available
kubectl get pods -n istio-system -l app=istiod -o wide
```

## Monitoring HA Health

Set up alerts for HA-related issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-ha-alerts
spec:
  groups:
  - name: istio-ha
    rules:
    - alert: IstiodLowReplicaCount
      expr: |
        count(kube_pod_status_ready{
          namespace="istio-system",
          pod=~"istiod.*",
          condition="true"
        }) < 2
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Fewer than 2 istiod replicas are ready"

    - alert: IstiodPodsNotSpread
      expr: |
        count(distinct(
          kube_pod_info{namespace="istio-system", pod=~"istiod.*"}
        ) by (node)) < 2
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Istiod pods are not spread across multiple nodes"
```

## Complete HA Configuration

Here is the full configuration pulling everything together:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-production-ha
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  components:
    pilot:
      k8s:
        replicaCount: 3
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        affinity:
          podAntiAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: istiod
                topologyKey: kubernetes.io/hostname
            - weight: 50
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: istiod
                topologyKey: topology.kubernetes.io/zone
        hpaSpec:
          minReplicas: 3
          maxReplicas: 10
          metrics:
          - type: Resource
            resource:
              name: cpu
              target:
                type: Utilization
                averageUtilization: 75
        podDisruptionBudget:
          minAvailable: 2
```

## Summary

High availability for Istio requires multiple istiod replicas (minimum 3), pod anti-affinity to spread them across nodes and zones, pod disruption budgets to prevent simultaneous eviction, and horizontal pod autoscaling for elastic capacity. Apply the same principles to your ingress gateways. Test your HA setup by killing pods and draining nodes to make sure failover works as expected. With these configurations in place, your Istio control plane can survive node failures, rolling updates, and traffic spikes without impacting your mesh.
