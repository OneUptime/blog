# How to Implement Proportional Autoscaling During Canary Rollouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Autoscaling, Canary

Description: Learn how to implement proportional autoscaling during canary rollouts to ensure both stable and canary versions scale appropriately based on their traffic share for optimal resource usage.

---

During a canary rollout with traffic routing, your stable version can handle 90% of traffic while the canary handles 10%. If the rollout keeps the stable ReplicaSet at full size while also creating canary pods, the canary can sit underused while the stable version still carries most of the load.

Proportional autoscaling adjusts pod counts based on traffic distribution, ensuring efficient resource use during rollouts.

## The Autoscaling Problem

Standard HPA scales based on metrics for all pods:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 5
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

During canary:
- Stable pods: 90% traffic, high CPU
- Canary pods: 10% traffic, low CPU
- HPA sees the average CPU across the pods selected by its scale target and updates one desired replica count

This wastes resources on underutilized canary pods.

## Argo Rollouts Dynamic Stable Scale

Argo Rollouts can scale stable and canary independently:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web-app
spec:
  replicas: 10
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: myregistry.io/web-app:v1.0.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
  strategy:
    canary:
      canaryService: web-app-canary
      stableService: web-app-stable
      trafficRouting:
        istio:
          virtualService:
            name: web-app
            routes:
            - primary
      # Enable dynamic scaling of stable version
      dynamicStableScale: true
      steps:
      - setWeight: 10
      - pause: {duration: 5m}
      - setWeight: 25
      - pause: {duration: 5m}
      - setWeight: 50
      - pause: {duration: 5m}
      - setWeight: 75
      - pause: {duration: 5m}
```

With `dynamicStableScale: true`:
- At 10% canary with 10 desired replicas: stable has about 9 pods, canary has about 1 pod
- At 25% canary with 10 desired replicas: stable has about 7-8 pods, canary has about 2-3 pods
- At 50% canary with 10 desired replicas: stable has about 5 pods, canary has about 5 pods

`dynamicStableScale` is only available when a Rollout uses traffic routing, such as Istio, Traefik, NGINX, ALB, or another supported traffic router.

## Separate HPAs for Stable and Canary

If you manage stable and canary as separate workloads, create separate HPAs for each version. Do not attach HPAs directly to ReplicaSets owned by an Argo Rollout; for Rollouts, target the Rollout object and let the Rollouts controller manage ReplicaSets.

```yaml
# HPA for stable version

apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-stable
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app-stable
  minReplicas: 5
  maxReplicas: 20
  metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
---
# HPA for canary version
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-canary
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app-canary
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
```

## Traffic-Based Scaling

Scale based on actual traffic received:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app
spec:
  scaleTargetRef:
    apiVersion: argoproj.io/v1alpha1
    kind: Rollout
    name: web-app
  minReplicas: 1
  maxReplicas: 20
  metrics:
  # Scale based on requests per pod
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
        selector:
          matchLabels:
            version: canary
      target:
        type: AverageValue
        averageValue: "100"
  # Also consider CPU
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

Export metrics with version labels:

```javascript
// Metrics exporter
const promClient = require('prom-client');

const httpRequests = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['version', 'status']
});

app.use((req, res, next) => {
  const version = process.env.VERSION || 'unknown';

  res.on('finish', () => {
    httpRequests.inc({
      version: version,
      status: res.statusCode
    });
  });

  next();
});
```

## KEDA Proportional Scaling

Use KEDA for advanced scaling logic:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: web-app
spec:
  scaleTargetRef:
    apiVersion: argoproj.io/v1alpha1
    kind: Rollout
    name: web-app
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
  # Scale based on Prometheus metrics
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: http_requests_per_second
      query: |
        sum(rate(http_requests_total{
          rollout="web-app",
          version="canary"
        }[1m]))
      threshold: "100"
  # Scale based on queue depth
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: queue_depth
      query: |
        sum(queue_depth{
          version="canary"
        })
      threshold: "10"
```

## Predictive Scaling During Canary

Scale up canary before traffic increases:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-predictive
spec:
  scaleTargetRef:
    apiVersion: argoproj.io/v1alpha1
    kind: Rollout
    name: web-app
  minReplicas: 1
  maxReplicas: 20
  metrics:
  - type: External
    external:
      metric:
        name: predicted_load
        selector:
          matchLabels:
            version: canary
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleUp:
      # Scale up quickly before traffic increases
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      selectPolicy: Max
```

## Custom Scaling Controller

Build a custom controller for proportional scaling when you need to calculate replica counts directly. HPA metrics adapters should expose metric values, not desired replica counts; a controller can calculate the desired count and update the Rollout's `/scale` subresource.

```javascript
// Track traffic distribution
const trafficDistribution = {
  stable: 0.9,
  canary: 0.1
};

// Update traffic distribution based on Istio metrics
async function updateTrafficDistribution() {
  const stableTraffic = await getPrometheusMetric(
    'sum(rate(istio_requests_total{destination_version="stable"}[1m]))'
  );

  const canaryTraffic = await getPrometheusMetric(
    'sum(rate(istio_requests_total{destination_version="canary"}[1m]))'
  );

  const total = stableTraffic + canaryTraffic;

  if (total > 0) {
    trafficDistribution.stable = stableTraffic / total;
    trafficDistribution.canary = canaryTraffic / total;
  }
}

// Calculate proportional replica count
function calculateReplicas(version, totalReplicas, currentLoad) {
  const trafficShare = trafficDistribution[version];
  const baseReplicas = Math.ceil(totalReplicas * trafficShare);

  // Adjust for load
  const loadFactor = currentLoad / 100; // 100 is target RPS per pod
  const scaledReplicas = Math.ceil(baseReplicas * loadFactor);

  return Math.max(1, Math.min(20, scaledReplicas));
}

// Update the Rollout scale subresource from a controller loop
async function applyReplicaCount(version) {
  const totalReplicas = 10;
  const currentLoad = await getCurrentLoad(version);
  const replicas = calculateReplicas(version, totalReplicas, currentLoad);

  await patchRolloutScale('web-app', {
    apiVersion: 'autoscaling/v1',
    kind: 'Scale',
    spec: {
      replicas
    }
  });
}

setInterval(updateTrafficDistribution, 10000);
setInterval(() => applyReplicaCount('canary'), 30000);
```

## Monitoring Proportional Scaling

Track scaling efficiency:

```promql
# Replica count by version
count(kube_pod_info{rollout="web-app"}) by (version)

# Traffic share by version
sum(rate(http_requests_total[1m])) by (version)
  /
sum(rate(http_requests_total[1m]))

# Efficiency: traffic share vs replica share
(
  sum(rate(http_requests_total{version="canary"}[1m]))
  /
  sum(rate(http_requests_total[1m]))
)
/
(
  count(kube_pod_info{rollout="web-app",version="canary"})
  /
  count(kube_pod_info{rollout="web-app"})
)
```

Alert on inefficient scaling:

```yaml
groups:
- name: proportional_scaling
  rules:
  - alert: CanaryOverProvisioned
    expr: |
      (
        count(kube_pod_info{rollout="web-app",version="canary"})
        /
        count(kube_pod_info{rollout="web-app"})
      )
      >
      (
        sum(rate(http_requests_total{version="canary"}[5m]))
        /
        sum(rate(http_requests_total[5m]))
      ) * 1.5
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Canary has too many pods for its traffic share"
```

## Gradual Scaling During Rollout

Coordinate scaling with rollout progression:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web-app
spec:
  replicas: 10
  strategy:
    canary:
      canaryService: web-app-canary
      stableService: web-app-stable
      trafficRouting:
        istio:
          virtualService:
            name: web-app
            routes:
            - primary
      dynamicStableScale: true
      steps:
      # Step 1: 10% traffic, scale canary to 2 pods
      - setWeight: 10
      - setCanaryScale:
          replicas: 2
      - pause: {duration: 5m}

      # Step 2: 25% traffic, scale canary to 3 pods
      - setWeight: 25
      - setCanaryScale:
          replicas: 3
      - pause: {duration: 5m}

      # Step 3: 50% traffic, scale canary to 5 pods
      - setWeight: 50
      - setCanaryScale:
          replicas: 5
      - pause: {duration: 5m}

      # Let HPA take over at higher weights
      - setWeight: 75
      - pause: {duration: 5m}
```

## Best Practices

**Use dynamicStableScale**. Let Argo Rollouts handle proportional scaling automatically.

**Set appropriate min/max replicas**. Canary needs at least 1 pod, stable needs enough for its traffic share.

**Monitor efficiency**. Track whether replica distribution matches traffic distribution.

**Scale up quickly, down slowly**. Prevent thrashing during rollout.

**Consider startup time**. Scale up before traffic increases to avoid latency spikes.

**Test scaling behavior**. Verify scaling works correctly at each canary step.

## Conclusion

Proportional autoscaling during canary rollouts optimizes resource usage by scaling each version based on its traffic share. Instead of wasting resources on underutilized canary pods or overloading stable pods, you maintain the right number of pods for each version's load.

Use Argo Rollouts' dynamic stable scale for automatic proportional scaling, or implement custom logic for more sophisticated scenarios. Combined with traffic-based metrics and predictive scaling, you ensure both versions handle their traffic efficiently throughout the rollout.
