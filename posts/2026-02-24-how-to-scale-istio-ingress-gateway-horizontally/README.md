# How to Scale Istio Ingress Gateway Horizontally

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Scaling, Gateway, Kubernetes, Performance

Description: How to horizontally scale your Istio Ingress Gateway to handle more traffic with HPA, resource tuning, and production best practices.

---

A single Istio ingress gateway pod can handle a surprising amount of traffic, but at some point you will need more. Scaling the ingress gateway horizontally means running multiple gateway pods behind a load balancer so traffic gets distributed across them. The process is straightforward, but there are some details around resource allocation, autoscaling, and connection handling that matter for production workloads.

## Default Gateway Deployment

The default Istio installation creates an ingress gateway Deployment with just one or two replicas. Check your current setup:

```bash
kubectl get deploy istio-ingressgateway -n istio-system
```

Look at the current replica count, resource limits, and HPA (Horizontal Pod Autoscaler) configuration:

```bash
kubectl get hpa -n istio-system
```

## Manual Scaling

The simplest way to scale is to increase the replica count:

```bash
kubectl scale deploy istio-ingressgateway -n istio-system --replicas=3
```

Verify all pods are running:

```bash
kubectl get pods -n istio-system -l istio=ingressgateway
```

## Autoscaling with HPA

For production, set up a Horizontal Pod Autoscaler that scales based on CPU or memory:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: istio-ingressgateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
```

This HPA configuration:
- Keeps a minimum of 2 replicas for redundancy
- Scales up to 10 replicas maximum
- Targets 70% CPU utilization
- Scales up quickly (2 pods per minute)
- Scales down slowly (1 pod per minute with a 5-minute stabilization window)

Apply it:

```bash
kubectl apply -f hpa.yaml
```

## Setting Resource Limits

Before autoscaling works properly, you need appropriate resource requests and limits on the gateway pods:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 256Mi
          limits:
            cpu: 2000m
            memory: 1Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 10
          metrics:
          - type: Resource
            resource:
              name: cpu
              targetAverageUtilization: 70
```

Or patch the existing deployment:

```bash
kubectl patch deploy istio-ingressgateway -n istio-system --type='json' -p='[
  {
    "op": "replace",
    "path": "/spec/template/spec/containers/0/resources",
    "value": {
      "requests": {"cpu": "500m", "memory": "256Mi"},
      "limits": {"cpu": "2000m", "memory": "1Gi"}
    }
  }
]'
```

## Tuning for High Traffic

For high-traffic scenarios, tune the Envoy proxy configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        resources:
          requests:
            cpu: "2"
            memory: 1Gi
          limits:
            cpu: "4"
            memory: 2Gi
        env:
        - name: ISTIO_META_ROUTER_MODE
          value: sni-dnat
```

You can also increase the number of Envoy worker threads. By default, Envoy creates one worker thread per CPU core. If your pods have 4 CPU cores, Envoy creates 4 worker threads.

## Pod Disruption Budget

To ensure availability during rolling updates and node maintenance:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istio-ingressgateway-pdb
  namespace: istio-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      istio: ingressgateway
```

This ensures at least one gateway pod is always running. For larger deployments, use a percentage:

```yaml
spec:
  minAvailable: "50%"
```

## Pod Anti-Affinity

Spread gateway pods across different nodes for resilience:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        affinity:
          podAntiAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                  - key: istio
                    operator: In
                    values:
                    - ingressgateway
                topologyKey: kubernetes.io/hostname
```

This tells Kubernetes to prefer scheduling gateway pods on different nodes, so a single node failure does not take down all your gateways.

## Topology Spread Constraints

For more precise distribution across zones:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        overlays:
        - kind: Deployment
          name: istio-ingressgateway
          patches:
          - path: spec.template.spec.topologySpreadConstraints
            value:
            - maxSkew: 1
              topologyKey: topology.kubernetes.io/zone
              whenUnsatisfiable: DoNotSchedule
              labelSelector:
                matchLabels:
                  istio: ingressgateway
```

## Monitoring Scaling

Keep an eye on these metrics to know when to adjust scaling parameters:

```bash
# Check current HPA status
kubectl get hpa istio-ingressgateway -n istio-system

# Watch scaling events
kubectl describe hpa istio-ingressgateway -n istio-system

# Check pod resource usage
kubectl top pods -n istio-system -l istio=ingressgateway
```

Key metrics to monitor in Prometheus:

- `envoy_server_concurrency` - Number of Envoy worker threads
- `envoy_server_total_connections` - Total active connections
- `istio_requests_total` - Request rate through the gateway
- `container_cpu_usage_seconds_total` - CPU usage per pod
- `container_memory_working_set_bytes` - Memory usage per pod

## Connection Draining During Scale-Down

When a gateway pod is terminated, it needs to drain existing connections gracefully. Istio configures a termination grace period:

```bash
kubectl get deploy istio-ingressgateway -n istio-system \
  -o jsonpath='{.spec.template.spec.terminationGracePeriodSeconds}'
```

The default is 30 seconds. For long-lived connections (WebSocket, gRPC streaming), increase this:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        overlays:
        - kind: Deployment
          name: istio-ingressgateway
          patches:
          - path: spec.template.spec.terminationGracePeriodSeconds
            value: 120
```

## Scaling Performance Benchmarks

As a rough guide for the default Envoy configuration:

| Gateway Pods | Approximate Throughput | Good For |
|---|---|---|
| 1 | ~5,000 RPS | Development, small apps |
| 2-3 | ~10,000-15,000 RPS | Small production |
| 5-10 | ~25,000-50,000 RPS | Medium production |
| 10+ | 50,000+ RPS | High-traffic production |

Actual numbers vary wildly based on request size, TLS overhead, routing complexity, and hardware. Always load test your specific workload.

## Load Testing

Before deciding on scaling parameters, run load tests:

```bash
# Using hey
hey -z 60s -c 200 -q 500 \
  -host "app.example.com" \
  "http://$GATEWAY_IP/"

# Using k6
k6 run --vus 200 --duration 60s load-test.js
```

Watch the gateway pod resources during the test:

```bash
kubectl top pods -n istio-system -l istio=ingressgateway --containers
```

Scaling the Istio ingress gateway horizontally is mostly about setting up proper HPA policies, resource limits, and pod distribution rules. The Envoy proxy itself is very efficient, so the main bottleneck is usually CPU for TLS termination or memory for large routing tables. Start with a reasonable baseline, monitor under real traffic, and let the HPA handle the rest.
