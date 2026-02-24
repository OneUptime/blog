# How to Configure Istiod High Availability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Istiod, High Availability, Kubernetes, Reliability

Description: How to configure istiod for high availability with multiple replicas, pod disruption budgets, anti-affinity rules, and proper resource allocation.

---

By default, Istio installs a single istiod replica. That is fine for development but completely unacceptable for production. If that one replica goes down, new pods cannot get sidecars injected, configuration changes are not propagated, and certificate rotation stops. The data plane keeps running with its existing configuration, but the control plane is effectively dead.

Setting up istiod for high availability is straightforward, but there are several pieces that need to work together.

## Running Multiple Replicas

The simplest and most important change is running multiple istiod replicas:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
```

Or with Helm:

```bash
helm install istiod istio/istiod \
  --namespace istio-system \
  --set pilot.replicaCount=3
```

With multiple replicas, proxies connect to different istiod instances (load balanced by the Kubernetes service). If one replica goes down, proxies reconnect to the remaining replicas.

How many replicas do you need? For most production clusters, 3 is the sweet spot. 2 gives you basic redundancy, but during a rolling update you temporarily drop to 1. With 3 replicas, you always have at least 2 available.

## Pod Disruption Budget

A PodDisruptionBudget prevents Kubernetes from evicting too many istiod pods at once during node maintenance or cluster autoscaling:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istiod
  namespace: istio-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: istiod
```

If you run 3 replicas, you can use `minAvailable: 2` to keep more capacity during disruptions:

```yaml
spec:
  minAvailable: 2
```

With IstioOperator, you can set this in the spec:

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

## Pod Anti-Affinity

Spreading istiod pods across different nodes prevents a single node failure from taking down the entire control plane:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        affinity:
          podAntiAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: istiod
                topologyKey: kubernetes.io/hostname
```

Use `preferredDuringSchedulingIgnoredDuringExecution` instead of `requiredDuringSchedulingIgnoredDuringExecution` to avoid scheduling failures when nodes are scarce. The preferred version tries to spread pods across nodes but will co-locate them if necessary.

For even better availability, spread across availability zones:

```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchLabels:
            app: istiod
        topologyKey: topology.kubernetes.io/zone
```

## Resource Allocation

Under-provisioned istiod replicas hurt availability because they crash under load or respond slowly. Size your replicas based on mesh size:

**Small mesh (up to 100 pods):**
```yaml
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: "1"
    memory: 2Gi
```

**Medium mesh (100-1000 pods):**
```yaml
resources:
  requests:
    cpu: "1"
    memory: 2Gi
  limits:
    cpu: "2"
    memory: 4Gi
```

**Large mesh (1000+ pods):**
```yaml
resources:
  requests:
    cpu: "2"
    memory: 4Gi
  limits:
    cpu: "4"
    memory: 8Gi
```

Set requests equal to limits for critical workloads. This gives istiod a Guaranteed QoS class, meaning it will not be evicted under memory pressure:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: "2"
            memory: 4Gi
          limits:
            cpu: "2"
            memory: 4Gi
```

## Horizontal Pod Autoscaler

For clusters with variable load, use an HPA to scale istiod replicas based on CPU:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: istiod
  namespace: istio-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: istiod
  minReplicas: 3
  maxReplicas: 7
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

Or configure it through IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        hpaSpec:
          minReplicas: 3
          maxReplicas: 7
          metrics:
          - type: Resource
            resource:
              name: cpu
              target:
                type: Utilization
                averageUtilization: 70
```

## Health Checks

Istiod exposes health endpoints that Kubernetes uses for liveness and readiness probes. The default configuration is usually fine, but you can tune the timing:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 1
          periodSeconds: 3
          failureThreshold: 3
        livenessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 1
          periodSeconds: 3
          failureThreshold: 3
```

The readiness probe determines when istiod is ready to receive traffic. A failing readiness probe removes the pod from the service endpoints, which means proxies stop sending xDS requests to it.

## Graceful Shutdown

When an istiod replica is shutting down, it should stop accepting new connections but finish processing existing ones. Istio handles this through the `terminationGracePeriodSeconds` setting:

```yaml
spec:
  components:
    pilot:
      k8s:
        deployment:
          spec:
            template:
              spec:
                terminationGracePeriodSeconds: 60
```

The default is 30 seconds. Increase it if you have many proxies connected to a single replica, as they need time to reconnect to other replicas.

## Multi-Cluster HA

For true high availability, run istiod in multiple clusters with a shared root CA. This way, if one cluster's control plane is completely down, the other cluster can serve as a backup.

With Istio multi-primary setup, each cluster runs its own istiod:

```yaml
# Cluster 1
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: my-mesh
      multiCluster:
        clusterName: cluster1
      network: network1

# Cluster 2
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: my-mesh
      multiCluster:
        clusterName: cluster2
      network: network2
```

## Testing HA

Verify your HA setup by killing an istiod replica and checking that the mesh keeps working:

```bash
# Note the current pod
kubectl get pods -n istio-system -l app=istiod

# Kill one replica
kubectl delete pod -n istio-system istiod-abc123

# Verify proxies reconnect
istioctl proxy-status

# Apply a config change to verify pushes still work
kubectl apply -f test-virtualservice.yaml
```

The mesh should continue working without interruption. Proxies that were connected to the killed replica will reconnect to another one within a few seconds.

Istiod HA is not a nice-to-have for production. It is a requirement. The combination of multiple replicas, PDB, anti-affinity, and proper resourcing ensures your mesh control plane stays available through node failures, upgrades, and unexpected issues.
