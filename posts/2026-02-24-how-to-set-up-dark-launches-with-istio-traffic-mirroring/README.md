# How to Set Up Dark Launches with Istio Traffic Mirroring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Mirroring, Dark Launch, Kubernetes, Testing

Description: Learn how to use Istio's traffic mirroring feature to test new service versions with real production traffic without affecting actual users.

---

Dark launching is testing a new version of your service with real production traffic without any users seeing the results. The idea is that production traffic patterns are impossible to replicate in staging. No matter how good your load testing is, production is always different - different request patterns, different data sizes, different edge cases.

Istio's traffic mirroring (also called shadowing) copies live traffic to a secondary service. The primary service handles the actual request and returns the response to the user. The mirrored copy goes to the new version, which processes it, but the response gets thrown away. Users never see the new version's responses.

This lets you validate that the new version handles production traffic correctly, performs well under real load, and doesn't crash on edge cases - all without any risk.

## How Traffic Mirroring Works

When you enable mirroring in a VirtualService, Istio's Envoy proxy does the following:

1. Receives the incoming request
2. Forwards it to the primary destination (as normal)
3. Sends an asynchronous copy to the mirror destination
4. Returns the primary destination's response to the caller
5. Discards the mirror destination's response

The mirrored request is fire-and-forget. If the mirror service is slow or crashes, it doesn't affect the primary request at all.

Istio appends `-shadow` to the `Host` header of mirrored requests, so the mirror service can identify them if needed.

## Setting Up the Mirror

Deploy your current and new versions:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service-v1
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
      version: v1
  template:
    metadata:
      labels:
        app: payment-service
        version: v1
    spec:
      containers:
      - name: payment
        image: myregistry/payment:1.0.0
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service-v2
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
      version: v2
  template:
    metadata:
      labels:
        app: payment-service
        version: v2
    spec:
      containers:
      - name: payment
        image: myregistry/payment:2.0.0
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: default
spec:
  selector:
    app: payment-service
  ports:
  - port: 8080
    targetPort: 8080
```

Create the DestinationRule with subsets:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-dr
  namespace: default
spec:
  host: payment-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Enabling Traffic Mirroring

Now configure the VirtualService to mirror traffic from v1 to v2:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service-vs
  namespace: default
spec:
  hosts:
  - payment-service
  http:
  - route:
    - destination:
        host: payment-service
        subset: v1
    mirror:
      host: payment-service
      subset: v2
    mirrorPercentage:
      value: 100.0
```

Apply it:

```bash
kubectl apply -f payment-mirror.yaml
```

Now 100% of traffic to the payment service is mirrored to v2. Users still get responses from v1 only.

## Mirroring a Percentage of Traffic

Mirroring 100% of production traffic might be too much load for your test version, especially if the service gets heavy traffic. Reduce the mirror percentage:

```yaml
http:
- route:
  - destination:
      host: payment-service
      subset: v1
  mirror:
    host: payment-service
    subset: v2
  mirrorPercentage:
    value: 10.0
```

This mirrors only 10% of traffic. Start low and increase as you verify that v2 handles the load.

## Monitoring the Mirrored Service

The whole point of dark launching is to observe how the new version behaves. Check the v2 pods for errors:

```bash
# Check v2 pod logs for errors
kubectl logs -l app=payment-service,version=v2 -n default --tail=100

# Check Envoy proxy logs for the mirror traffic
kubectl logs -l app=payment-service,version=v2 -c istio-proxy -n default --tail=100
```

Compare metrics between v1 and v2 in Prometheus:

```bash
# Error rate comparison
rate(istio_requests_total{destination_workload="payment-service-v2",response_code=~"5.."}[5m])

# Latency comparison
histogram_quantile(0.99, rate(istio_request_duration_milliseconds_bucket{destination_workload="payment-service-v2"}[5m]))

# Compare with v1
histogram_quantile(0.99, rate(istio_request_duration_milliseconds_bucket{destination_workload="payment-service-v1"}[5m]))
```

Look for:
- Higher error rates in v2 compared to v1
- Increased latency in v2
- Memory or CPU usage differences
- Any panics or crashes in v2 pods

## Handling Stateful Operations

Traffic mirroring has a critical caveat: mirrored requests are real requests. If your service writes to a database, the mirrored request will also write to the database. This causes duplicate data.

There are several approaches to handle this:

**Separate database**: Point v2 at a separate test database:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service-v2
spec:
  template:
    spec:
      containers:
      - name: payment
        image: myregistry/payment:2.0.0
        env:
        - name: DATABASE_URL
          value: "postgresql://user:pass@test-db:5432/payments_shadow"
```

**Read-only mode**: Configure v2 to process requests but skip database writes:

```yaml
env:
- name: SHADOW_MODE
  value: "true"
```

Your application checks this environment variable and skips write operations when running in shadow mode.

**Detect mirrored requests**: Since Istio appends `-shadow` to the Host header of mirrored requests, your application can detect them:

```python
def handle_request(request):
    host = request.headers.get('Host', '')
    is_shadow = host.endswith('-shadow')

    if is_shadow:
        # Process but don't write to database
        result = process_request(request, dry_run=True)
    else:
        result = process_request(request, dry_run=False)

    return result
```

## Comparing Responses

Since mirrored responses are discarded by Istio, you need another mechanism to compare responses. One approach is to log the response body in v2 and compare it with v1's responses:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service-v2
spec:
  template:
    spec:
      containers:
      - name: payment
        image: myregistry/payment:2.0.0
        env:
        - name: LOG_RESPONSE_BODY
          value: "true"
        - name: LOG_REQUEST_ID
          value: "true"
```

Both v1 and v2 log the request ID and response body. You can then write a comparison job that matches responses by request ID and flags any differences.

## Mirroring to a Different Service

You can mirror traffic to a completely different service, not just a different version:

```yaml
http:
- route:
  - destination:
      host: payment-service
  mirror:
    host: payment-audit-service
  mirrorPercentage:
    value: 100.0
```

This is useful for audit logging, security analysis, or feeding real traffic into a testing pipeline.

## Transitioning from Dark Launch to Live

Once you're satisfied with v2's behavior, transition from mirroring to live traffic:

1. Start canary routing at 5%:

```yaml
http:
- route:
  - destination:
      host: payment-service
      subset: v1
    weight: 95
  - destination:
      host: payment-service
      subset: v2
    weight: 5
```

2. Gradually increase v2's traffic percentage
3. Reach 100% on v2
4. Decommission v1

## Common Pitfalls

**Doubled load**: Mirroring effectively doubles your traffic. Make sure your infrastructure can handle it. If you're mirroring at 100%, your cluster needs enough capacity for the additional pods.

**External API calls**: If your service calls external APIs (payment processors, email services), the mirrored request will also call them. Either mock external dependencies in v2 or use shadow mode to skip external calls.

**Request ordering**: Mirrored requests are asynchronous and might arrive at v2 out of order compared to v1. If your service depends on request ordering, keep this in mind when comparing behavior.

**Large request bodies**: Mirroring copies the entire request, including the body. For services that handle large uploads, this can consume significant bandwidth.

Dark launching with traffic mirroring is one of the safest ways to test new code in production. You get real traffic patterns, real data shapes, and real load characteristics without any user-facing risk. Combined with good monitoring and response comparison, it gives you high confidence before you start routing actual user traffic to the new version.
