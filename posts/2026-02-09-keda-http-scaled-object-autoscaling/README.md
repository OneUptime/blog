# How to Use KEDA HTTPScaledObject for HTTP-Based Autoscaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KEDA, HTTP

Description: Configure KEDA HTTPScaledObject to autoscale HTTP services based on request rate and concurrency, enabling scale-to-zero for web applications while maintaining request handling capability.

---

The KEDA HTTP Add-on enables autoscaling HTTP services based on request metrics like request rate and concurrent connections. Unlike traditional HPA that scales based on CPU or memory, HTTP-based scaling responds directly to user traffic patterns. The add-on can even scale services to zero replicas, holding incoming requests until pods are ready.

This approach is perfect for APIs, webhooks, and web services with variable traffic. During quiet periods, services scale to zero to save resources. When requests arrive, KEDA quickly scales up while the HTTP interceptor holds requests to prevent errors during pod startup.

HTTPScaledObject is still documented in the KEDA HTTP Add-on, but it is deprecated in current releases. For new deployments, KEDA recommends the InterceptorRoute API with a separate KEDA ScaledObject.

## Understanding HTTP Add-on Architecture

The KEDA HTTP Add-on consists of three components: the interceptor that handles incoming HTTP traffic, the scaler that monitors request metrics, and the operator that manages HTTPScaledObject resources. The interceptor sits in front of your service, collecting metrics and holding requests during scale-from-zero events.

When traffic arrives and the service is at zero replicas, the interceptor holds requests while signaling KEDA to create pods. As pods become ready, held requests are forwarded to them. This prevents cold-start failures when the backend becomes ready before the configured timeout.

## Installing KEDA HTTP Add-on

Install the HTTP Add-on after KEDA is running.

```bash
# Add the KEDA Helm repository if you have not already
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

# First install KEDA if not already installed
helm install keda kedacore/keda --namespace keda --create-namespace

# Install HTTP Add-on
helm install http-add-on kedacore/keda-add-ons-http --namespace keda

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
  replicas:
    min: 0
    max: 50

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

  replicas:
    min: 2
    max: 100

  scalingMetric:
    concurrency:
      targetValue: 50  # Target 50 concurrent requests per pod
```

This scales based on active concurrent requests, which works better for long-running requests or streaming responses.

## Implementing Scale-to-Zero for HTTP Services

Enable scale-to-zero with cold-start request handling.

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

  replicas:
    min: 0  # Allow scale to zero
    max: 30

  scalingMetric:
    requestRate:
      targetValue: 50
      granularity: 1s

  # Interceptor timeout while waiting for pods during cold starts
  timeouts:
    conditionWait: 30s
```

When the service is at zero replicas, the interceptor holds matching requests while pods start. This prevents request failures during cold starts as long as the backend becomes ready before the timeout.

## Configuring Scale-Down Behavior

Control replica limits and how long the service waits before scaling back to zero.

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

  replicas:
    min: 5
    max: 200

  scalingMetric:
    requestRate:
      targetValue: 200
      granularity: 1s

  # Wait 10 minutes after traffic stops before scaling back to zero
  scaledownPeriod: 600
```

This keeps at least five replicas available and waits longer before scaling back to zero after traffic stops.

## Handling Different URL Paths

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

  replicas:
    min: 3
    max: 100

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
  namespace: keda
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
```

The Ingress should live in the same namespace as the interceptor service, which is `keda` by default. If your Ingress must live in another namespace, create an `ExternalName` Service that points to the interceptor service in the `keda` namespace.

## Monitoring HTTP Scaling Metrics

Track request metrics and scaling behavior.

```bash
# Check HTTPScaledObject status
kubectl get httpscaledobject api-service-scaler -n production

# View detailed information
kubectl describe httpscaledobject api-service-scaler -n production

# Check interceptor logs
kubectl logs -n keda deployment/keda-add-ons-http-interceptor | grep api-service

# View scaler logs
kubectl logs -n keda deployment/keda-add-ons-http-scaler

# Check the generated HPA
kubectl get hpa -n production

# Inspect the current HTTPScaledObject status fields
kubectl get httpscaledobject api-service-scaler -n production -o yaml

# Port-forward interceptor metrics and inspect route metrics
kubectl port-forward -n keda deployment/keda-add-ons-http-interceptor 2223:2223

# In another terminal
curl localhost:2223/metrics | grep api-service
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

  replicas:
    min: 0
    max: 50

  scalingMetric:
    requestRate:
      targetValue: 100
      granularity: 1s

  timeouts:
    conditionWait: 60s  # Allow more time for pods during cold starts
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

## Handling Streaming HTTP Requests

Configure autoscaling for services with long-running HTTP requests.

```yaml
apiVersion: http.keda.sh/v1alpha1
kind: HTTPScaledObject
metadata:
  name: streaming-scaler
  namespace: realtime
spec:
  scaleTargetRef:
    name: streaming-server
    service: streaming-server
    port: 8080

  replicas:
    min: 5  # Keep minimum capacity for long-lived requests
    max: 100

  scalingMetric:
    concurrency:
      targetValue: 1000  # Target 1000 concurrent requests per pod
```

Use concurrency metric for streaming services since requests are long-lived rather than short request/response exchanges.

## Best Practices

Choose the right scaling metric for your workload. Use requestRate for typical HTTP APIs with quick request processing. Use concurrency for long-running requests or streaming responses.

Set targetValue based on load testing results. Measure actual throughput per pod under realistic conditions to determine optimal values.

Configure appropriate replica limits for each workload. Raising the minimum replica count reduces cold start impact for latency-sensitive services.

Configure cold-start timeouts high enough to let pods become ready during scale-up but not so high that request latency becomes unacceptable. Monitor actual request duration and cold-start behavior to tune these values.

Test scale-from-zero behavior under realistic traffic patterns. Verify that the interceptor holds requests appropriately and pods become ready quickly enough to meet your latency requirements.

## Limitations and Considerations

The HTTP Add-on intercepts all traffic, adding slight latency to requests. Measure this impact in your environment to ensure it meets performance requirements.

The interceptor requires stable network connectivity between itself and your service. Network issues can affect request forwarding and metrics collection.

Scale-to-zero only works for HTTP traffic routed through the interceptor. Services receiving traffic through other means (like service mesh sidecars) may need different configurations.

## Conclusion

KEDA's HTTPScaledObject enables sophisticated autoscaling for HTTP services based on actual request patterns rather than resource utilization. By scaling on request rate or concurrency, you create systems that respond directly to user traffic.

The scale-to-zero capability with cold-start request handling makes HTTP-based autoscaling particularly valuable for services with variable or intermittent traffic. Combined with proper configuration of scaling metrics, replica counts, and cooldown periods, HTTPScaledObject helps you build efficient, responsive HTTP services that minimize costs while maintaining performance.
