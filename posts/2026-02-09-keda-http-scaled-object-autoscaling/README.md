# How to Use KEDA HTTPScaledObject for HTTP-Based Autoscaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KEDA, HTTP

Description: Configure KEDA HTTPScaledObject to autoscale HTTP services based on request rate and concurrency, enabling scale-to-zero for web applications while maintaining request handling capability.

---

The KEDA HTTP Add-on enables autoscaling HTTP services based on request metrics like request rate and concurrent connections. Unlike traditional HPA that scales based on CPU or memory, HTTP-based scaling responds directly to user traffic patterns. The add-on can even scale services to zero replicas, queuing incoming requests until pods are ready.

This approach is perfect for APIs, webhooks, and web services with variable traffic. During quiet periods, services scale to zero to save resources. When requests arrive, KEDA quickly scales up while the HTTP interceptor queues requests to prevent errors during pod startup.

## Understanding HTTP Add-on Architecture

The KEDA HTTP Add-on consists of three components: the interceptor that handles incoming HTTP traffic, the scaler that monitors request metrics, and the operator that manages HTTPScaledObject resources. The interceptor sits in front of your service, collecting metrics and queuing requests during scale-from-zero events.

When traffic arrives and the service is at zero replicas, the interceptor queues requests while signaling KEDA to create pods. As pods become ready, queued requests are forwarded to them. This ensures no requests fail during cold starts.

## Installing KEDA HTTP Add-on

Install the HTTP Add-on after KEDA is running.

```bash
# First install KEDA if not already installed
helm install keda kedacore/keda --namespace keda --create-namespace

# Install HTTP Add-on
helm install http-add-on kedacore/keda-add-on-http \
  --namespace keda \
  --set interceptor.replicas=3 \
  --set scaler.replicas=2

# Verify installation
kubectl get pods -n keda
```

The interceptor runs with multiple replicas for high availability, and the scaler monitors request metrics.

## Basic HTTPScaledObject Configuration

Configure HTTP-based autoscaling for a web service.

```yaml
apiVersion: http.keda.sh/v1alpha1
kind: HTTPScaledObject
metadata:
  name: api-service-scaler
  namespace: production
spec:
  # Target deployment
  scaleTargetRef:
    name: api-service
    service: api-service
    port: 8080

  # Replica configuration
  minReplicaCount: 0
  maxReplicaCount: 50
  replicas: 3  # Initial replicas on activation from zero

  # Scaling metric
  scalingMetric:
    requestRate:
      targetValue: 100  # Target 100 requests per second per pod
      granularity: 1s
```

This configuration scales the api-service deployment based on request rate, maintaining approximately 100 requests per second per pod.

## Scaling Based on Concurrent Requests

Use concurrent request count instead of request rate.

```yaml
apiVersion: http.keda.sh/v1alpha1
kind: HTTPScaledObject
metadata:
  name: concurrent-requests-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: web-app
    service: web-app
    port: 3000

  minReplicaCount: 2
  maxReplicaCount: 100

  scalingMetric:
    concurrency:
      targetValue: 50  # Target 50 concurrent requests per pod
      granularity: 1s
```

This scales based on active concurrent requests, which works better for long-running requests or WebSocket connections.

## Implementing Scale-to-Zero for HTTP Services

Enable scale-to-zero with request queuing.

```yaml
apiVersion: http.keda.sh/v1alpha1
kind: HTTPScaledObject
metadata:
  name: webhook-handler-scaler
  namespace: webhooks
spec:
  scaleTargetRef:
    name: webhook-handler
    service: webhook-handler
    port: 8080

  minReplicaCount: 0  # Allow scale to zero
  maxReplicaCount: 30
  replicas: 5  # Create 5 pods when activating from zero

  scalingMetric:
    requestRate:
      targetValue: 50
      granularity: 1s

  # Interceptor settings
  targetPendingRequests: 200  # Queue up to 200 requests during scale-up
```

When the service is at zero replicas, the interceptor queues up to 200 requests while pods start. This prevents request failures during cold starts.

## Configuring Advanced Scaling Behavior

Control how aggressively the service scales.

```yaml
apiVersion: http.keda.sh/v1alpha1
kind: HTTPScaledObject
metadata:
  name: api-gateway-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: api-gateway
    service: api-gateway
    port: 8080
    apiVersion: apps/v1
    kind: Deployment

  minReplicaCount: 5
  maxReplicaCount: 200

  scalingMetric:
    requestRate:
      targetValue: 200
      granularity: 1s

  # Advanced HPA configuration
  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleUp:
          stabilizationWindowSeconds: 30
          policies:
          - type: Percent
            value: 100
            periodSeconds: 60
          - type: Pods
            value: 20
            periodSeconds: 60
          selectPolicy: Max

        scaleDown:
          stabilizationWindowSeconds: 300
          policies:
          - type: Percent
            value: 10
            periodSeconds: 120
```

This allows doubling capacity or adding 20 pods per minute during scale-up, while limiting scale-down to 10% every 2 minutes.

## Handling Different HTTP Methods

Configure path-based routing to the interceptor.

```yaml
apiVersion: http.keda.sh/v1alpha1
kind: HTTPScaledObject
metadata:
  name: rest-api-scaler
  namespace: api
spec:
  scaleTargetRef:
    name: rest-api
    service: rest-api
    port: 8080

  minReplicaCount: 3
  maxReplicaCount: 100

  scalingMetric:
    requestRate:
      targetValue: 150
      granularity: 1s

  # Path configuration
  pathPrefixes:
  - /api/v1/users
  - /api/v1/orders
  - /api/v1/products
```

Only requests matching these path prefixes count toward scaling metrics and get routed through the interceptor.

## Exposing the Interceptor Service

Configure ingress to route traffic through the KEDA HTTP interceptor.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            # Route to KEDA interceptor, not directly to your service
            name: keda-add-ons-http-interceptor-proxy
            port:
              number: 8080
---
# Service for the interceptor needs to be configured with your service details
apiVersion: v1
kind: Service
metadata:
  name: keda-add-ons-http-interceptor-proxy
  namespace: production
spec:
  ports:
  - port: 8080
    targetPort: 8080
  selector:
    app: keda-add-ons-http-interceptor
```

All external traffic flows through the interceptor, which forwards requests to your service while collecting metrics.

## Monitoring HTTP Scaling Metrics

Track request metrics and scaling behavior.

```bash
# Check HTTPScaledObject status
kubectl get httpscaledobject api-service-scaler -n production

# View detailed information
kubectl describe httpscaledobject api-service-scaler -n production

# Check interceptor metrics
kubectl logs -n keda deployment/keda-add-ons-http-interceptor | grep api-service

# View scaler logs
kubectl logs -n keda deployment/keda-add-ons-http-scaler

# Check the generated HPA
kubectl get hpa -n production

# Monitor request queue depth
kubectl get httpscaledobject api-service-scaler -n production -o json | \
  jq '.status.pendingRequests'
```

Monitor these metrics to ensure the interceptor handles traffic appropriately and scaling responds to load changes.

## Optimizing for Cold Start Performance

Reduce latency during scale-from-zero events.

```yaml
apiVersion: http.keda.sh/v1alpha1
kind: HTTPScaledObject
metadata:
  name: fast-startup-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: fast-api
    service: fast-api
    port: 8080

  minReplicaCount: 0
  maxReplicaCount: 50
  replicas: 10  # Create many pods immediately on activation

  scalingMetric:
    requestRate:
      targetValue: 100
      granularity: 1s

  targetPendingRequests: 500  # Queue more requests during startup

  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleUp:
          stabilizationWindowSeconds: 0  # No delay
          policies:
          - type: Pods
            value: 10
            periodSeconds: 15  # Add pods quickly
```

Pair this with fast-starting containers and proper readiness probes.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fast-api
  namespace: production
spec:
  replicas: 0
  selector:
    matchLabels:
      app: fast-api
  template:
    metadata:
      labels:
        app: fast-api
    spec:
      containers:
      - name: api
        image: fast-api:latest
        ports:
        - containerPort: 8080

        # Fast readiness probe
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 1
          periodSeconds: 1
          failureThreshold: 2

        # Resource requests for fast scheduling
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
```

## Handling WebSocket Connections

Configure autoscaling for WebSocket services.

```yaml
apiVersion: http.keda.sh/v1alpha1
kind: HTTPScaledObject
metadata:
  name: websocket-scaler
  namespace: realtime
spec:
  scaleTargetRef:
    name: websocket-server
    service: websocket-server
    port: 8080

  minReplicaCount: 5  # Keep minimum for persistent connections
  maxReplicaCount: 100

  scalingMetric:
    concurrency:
      targetValue: 1000  # Target 1000 concurrent WebSocket connections per pod
      granularity: 1s
```

Use concurrency metric for WebSocket services since connections are long-lived rather than request/response.

## Best Practices

Choose the right scaling metric for your workload. Use requestRate for typical HTTP APIs with quick request processing. Use concurrency for long-running requests, streaming responses, or WebSocket connections.

Set targetValue based on load testing results. Measure actual throughput per pod under realistic conditions to determine optimal values.

Configure appropriate replicas count for scale-from-zero activation. Creating multiple pods immediately reduces cold start impact compared to starting with a single pod.

Set targetPendingRequests high enough to queue requests during scale-up but not so high that request latency becomes unacceptable. Monitor actual queue depths to tune this value.

Test scale-from-zero behavior under realistic traffic patterns. Verify that the interceptor queues requests appropriately and pods become ready quickly enough to meet your latency requirements.

## Limitations and Considerations

The HTTP Add-on intercepts all traffic, adding slight latency to requests. Measure this impact in your environment to ensure it meets performance requirements.

The interceptor requires stable network connectivity between itself and your service. Network issues can affect request forwarding and metrics collection.

Scale-to-zero only works for HTTP traffic routed through the interceptor. Services receiving traffic through other means (like service mesh sidecars) may need different configurations.

## Conclusion

KEDA's HTTPScaledObject enables sophisticated autoscaling for HTTP services based on actual request patterns rather than resource utilization. By scaling on request rate or concurrency, you create systems that respond directly to user traffic.

The scale-to-zero capability with request queuing makes HTTP-based autoscaling particularly valuable for services with variable or intermittent traffic. Combined with proper configuration of scaling metrics, replica counts, and scaling policies, HTTPScaledObject helps you build efficient, responsive HTTP services that minimize costs while maintaining performance.
