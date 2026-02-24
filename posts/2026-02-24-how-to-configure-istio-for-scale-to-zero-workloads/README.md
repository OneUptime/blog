# How to Configure Istio for Scale-to-Zero Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Scale-to-Zero, Knative, KEDA, Kubernetes, Serverless

Description: How to configure Istio to work correctly with scale-to-zero workloads using Knative, KEDA, and custom activator patterns in Kubernetes.

---

Scale-to-zero is the idea that when no traffic is coming in, a service should have zero running pods to save resources. When a request arrives, the system spins up pods to handle it. This is a core feature of serverless platforms, but making it work with Istio requires careful configuration because the sidecar proxy adds complexity to the startup and routing flow.

## The Scale-to-Zero Challenge with Istio

When a service has zero pods and a request arrives, something needs to intercept that request, trigger a scale-up, buffer the request until a pod is ready, and then forward it. With Istio in the picture, the sidecar needs to be ready before the application can receive traffic, which adds to the cold start latency.

The main challenges are:

1. Request routing when no backend pods exist
2. Sidecar startup time adding to cold start latency
3. Health check timing between the sidecar and the application
4. Connection timeouts during the scale-up window

## Using Knative with Istio for Scale-to-Zero

Knative Serving is the most mature option for scale-to-zero on Kubernetes. With Istio as the networking layer, Knative manages the activator component that buffers requests during scale-up.

Deploy a Knative service that scales to zero:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-function
  namespace: default
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "10"
        autoscaling.knative.dev/target: "100"
        autoscaling.knative.dev/scale-down-delay: "30s"
    spec:
      containers:
      - image: my-function:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
```

The `minScale: "0"` annotation enables scale-to-zero. The `scale-down-delay` gives the system a buffer before scaling down, preventing flapping when traffic is intermittent.

When traffic arrives and there are zero pods:

1. The request hits the Istio ingress gateway.
2. The gateway routes to the Knative activator (which is always running).
3. The activator tells the autoscaler to scale up.
4. The autoscaler creates pods.
5. The pods start, sidecars initialize, readiness probes pass.
6. The activator forwards the buffered request to the now-running pod.
7. Subsequent requests go directly to the pods, bypassing the activator.

## Configuring Knative Autoscaler for Istio

Knative's autoscaler has several settings that affect scale-to-zero behavior:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-autoscaler
  namespace: knative-serving
data:
  enable-scale-to-zero: "true"
  scale-to-zero-grace-period: "30s"
  scale-to-zero-pod-retention-period: "0s"
  stable-window: "60s"
  panic-window-percentage: "10.0"
  panic-threshold-percentage: "200.0"
  max-scale-up-rate: "1000.0"
  max-scale-down-rate: "2.0"
  target-burst-capacity: "200"
```

Key settings:

- `scale-to-zero-grace-period`: How long to wait after the last request before scaling to zero. Set this based on your traffic patterns. If requests come in bursts every few minutes, a longer grace period avoids unnecessary cold starts.
- `target-burst-capacity`: How much burst capacity to maintain. Setting this to a positive value means the activator stays in the request path even when pods are running, which allows faster handling of sudden traffic spikes.
- `max-scale-up-rate`: How fast pods can scale up. A higher value means faster response to traffic but potentially more resource usage.

## Using KEDA for Scale-to-Zero with Istio

KEDA (Kubernetes Event-Driven Autoscaler) provides another way to achieve scale-to-zero, with support for various event sources:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: my-service-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: my-service
  pollingInterval: 10
  cooldownPeriod: 120
  idleReplicaCount: 0
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus.monitoring:9090
      metricName: istio_requests_per_second
      query: sum(rate(istio_requests_total{destination_service_name="my-service",destination_service_namespace="default"}[1m]))
      threshold: "1"
      activationThreshold: "0.5"
```

The `idleReplicaCount: 0` enables scale-to-zero. KEDA monitors the Prometheus metric (in this case, Istio's request rate) and scales the deployment accordingly.

However, KEDA doesn't include a request buffer like Knative's activator. When the deployment has zero pods and a request arrives, that request will fail because there's no pod to handle it. You need an additional component to buffer requests.

## Building a Request Queue for KEDA

One approach is to use a message queue that KEDA monitors. Instead of direct HTTP requests, put work items in a queue:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: queue-processor
  namespace: default
spec:
  scaleTargetRef:
    name: queue-processor
  pollingInterval: 5
  cooldownPeriod: 60
  idleReplicaCount: 0
  minReplicaCount: 1
  maxReplicaCount: 50
  triggers:
  - type: rabbitmq
    metadata:
      host: amqp://rabbitmq.default:5672
      queueName: work-queue
      queueLength: "5"
```

The queue acts as the buffer, and KEDA scales the processor pods based on queue depth.

## Istio Configuration for Scale-to-Zero

When using scale-to-zero with Istio, configure the VirtualService to handle the case where no pods are running:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-function-route
  namespace: default
spec:
  hosts:
  - my-function
  http:
  - route:
    - destination:
        host: my-function
    timeout: 60s
    retries:
      attempts: 3
      perTryTimeout: 20s
      retryOn: 503,connect-failure,reset
```

The generous timeout and retry configuration gives pods time to start up before the request fails. The `retryOn` setting includes 503 and connect-failure, which are the errors you'll see when there are no backend pods.

## DestinationRule Configuration

Configure the DestinationRule to handle the scaling dynamics:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-function-dr
  namespace: default
spec:
  host: my-function
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 10s
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 10
      interval: 30s
      baseEjectionTime: 10s
      maxEjectionPercent: 50
```

Increase `connectTimeout` to allow for pod startup time. Set `outlierDetection` thresholds high enough that pods aren't ejected during the startup phase when they might return a few errors.

## Sidecar Startup Optimization

To minimize cold start latency, optimize the sidecar configuration:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      holdApplicationUntilProxyStarts: true
      terminationDrainDuration: 2s
    sidecar.istio.io/proxyCPU: "50m"
    sidecar.istio.io/proxyMemory: "64Mi"
```

The `holdApplicationUntilProxyStarts` annotation prevents race conditions where the application starts before the sidecar is ready. While this adds a small amount to startup time, it prevents the more disruptive scenario where the application tries to make outbound calls and fails because Envoy isn't configured yet.

## Monitoring Scale-to-Zero Performance

Track cold start metrics to understand the impact:

```bash
# Check how long pods take to start
kubectl get events -n default --field-selector reason=Started --sort-by='.lastTimestamp'

# Check Knative revision readiness
kubectl get revisions -n default

# Check KEDA scaler activity
kubectl get scaledobjects -n default
kubectl describe scaledobject my-service-scaler -n default
```

In Prometheus, track the time from request arrival to response:

```promql
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name="my-function"}[5m])) by (le))
```

Cold start requests will show as outliers in the latency distribution.

## PeerAuthentication Considerations

If you're using strict mTLS, scale-to-zero can cause issues because the Knative activator or other request buffers might not have the right certificates. Use PERMISSIVE mode for namespaces with scale-to-zero services:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: PERMISSIVE
```

Or apply it only to the specific services that scale to zero.

Scale-to-zero with Istio is achievable, but it requires coordination between the autoscaler, the request buffer, and the sidecar proxy. Knative provides the most integrated experience, while KEDA gives you more flexibility with event sources. Either way, tuning timeouts, retries, and sidecar startup behavior is essential for a smooth cold start experience.
