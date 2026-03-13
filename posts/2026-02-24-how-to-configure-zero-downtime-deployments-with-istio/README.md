# How to Configure Zero-Downtime Deployments with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Zero Downtime, Deployments, Kubernetes, Rolling Updates

Description: Complete configuration guide for achieving truly zero-downtime deployments using Istio service mesh with proper drain, retry, and health check settings.

---

Zero-downtime deployments sound simple on paper. Old pods go away, new pods come up, and nobody notices. In practice, especially with Istio, there are about a dozen things that can go wrong during the transition. A single 503 error during a deployment technically means you had downtime. Getting to actual zero means every piece of the puzzle needs to fit together: deployment strategy, readiness probes, preStop hooks, drain settings, retries, and connection pool configuration.

## The Complete Configuration

Rather than explaining each piece in isolation, here's the full setup that achieves zero-downtime deployments. We'll break down why each part matters afterward.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-api
  namespace: production
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: payment-api
  template:
    metadata:
      labels:
        app: payment-api
        version: v2
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 15s
          holdApplicationUntilProxyStarts: true
    spec:
      terminationGracePeriodSeconds: 35
      containers:
      - name: payment-api
        image: payment-api:v2
        ports:
        - containerPort: 8080
          name: http
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 3
          failureThreshold: 1
          successThreshold: 2
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
          failureThreshold: 3
        lifecycle:
          preStop:
            exec:
              command:
              - "/bin/sh"
              - "-c"
              - "sleep 5"
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

## Why maxUnavailable: 0

With `maxUnavailable: 0`, Kubernetes guarantees that a new pod is fully ready before an old pod starts terminating. This means:

- The service always has at least 3 healthy pods (your replica count)
- Temporarily, during the update, you have 4 pods (3 existing + 1 new)
- Only after the new pod passes readiness probes does an old pod begin shutdown

Without this, Kubernetes might kill an old pod before the replacement is ready, reducing your capacity and potentially overloading the remaining pods.

## Why holdApplicationUntilProxyStarts

This setting prevents a race condition during pod startup. Without it, the application container starts immediately, potentially before the sidecar is ready. Any requests the app tries to make during startup fail because there's no proxy to handle them.

With `holdApplicationUntilProxyStarts: true`, the startup sequence is:

1. Init containers run (including istio-init for iptables setup)
2. Sidecar container starts and becomes ready
3. Application container starts
4. Application's readiness probe is checked
5. Pod is added to endpoints

## The Retry Safety Net

Configure retries on all client services that call the payment API:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-api
  namespace: production
spec:
  hosts:
  - payment-api.production.svc.cluster.local
  http:
  - route:
    - destination:
        host: payment-api.production.svc.cluster.local
        port:
          number: 8080
    retries:
      attempts: 3
      perTryTimeout: 5s
      retryOn: connect-failure,refused-stream,unavailable
    timeout: 20s
```

The retry covers the small window where a client sidecar hasn't received the endpoint update yet and sends a request to a draining pod. The `connect-failure` condition catches the case where the pod has already closed its listener. The next retry goes to a healthy pod.

Note: the `timeout` of 20 seconds is the total timeout including all retries. With 3 attempts at 5 seconds each, the maximum time is 15 seconds, which fits within the 20-second total.

## Connection Pool Configuration

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-api-dr
  namespace: production
spec:
  host: payment-api.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 5s
      http:
        maxRequestsPerConnection: 100
        h2UpgradePolicy: DO_NOT_UPGRADE
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 15s
      maxEjectionPercent: 33
```

`maxRequestsPerConnection: 100` ensures connections cycle regularly. When a connection is reopened, it uses the latest endpoint list. Outlier detection ejects pods that return errors, which catches draining pods that still appear in the endpoint list.

`maxEjectionPercent: 33` prevents outlier detection from ejecting too many pods at once. With 3 replicas, this means at most 1 pod can be ejected.

## PodDisruptionBudget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-api-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: payment-api
```

This protects against node drains and other voluntary disruptions removing too many pods at once. Combined with the deployment strategy, it ensures capacity is always maintained.

## Testing Zero Downtime

The proof is in the testing. Run a sustained load test through an entire deployment cycle:

```bash
# Start the load test (10 concurrent connections, 100 QPS, 5 minutes)
kubectl run loadtest --image=fortio/fortio --rm -it -- \
  load -c 10 -qps 100 -t 300s \
  http://payment-api.production.svc.cluster.local:8080/health
```

While the load test is running, trigger a deployment:

```bash
kubectl set image deploy/payment-api \
  payment-api=payment-api:v3 -n production
```

Check the fortio output. You should see:

```text
Code 200 : XXXX (100.0 %)
```

If any non-200 responses appear, something in the configuration needs adjustment.

## Advanced: Blue-Green with Istio

For even more control, use Istio traffic shifting for a blue-green deployment pattern:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-api-bg
  namespace: production
spec:
  hosts:
  - payment-api.production.svc.cluster.local
  http:
  - route:
    - destination:
        host: payment-api.production.svc.cluster.local
        subset: blue
      weight: 100
    - destination:
        host: payment-api.production.svc.cluster.local
        subset: green
      weight: 0
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-api-bg-dr
  namespace: production
spec:
  host: payment-api.production.svc.cluster.local
  subsets:
  - name: blue
    labels:
      version: v2
  - name: green
    labels:
      version: v3
```

Deploy the new version as the green subset, run tests against it, then shift traffic:

```bash
# Gradually shift traffic
kubectl patch virtualservice payment-api-bg -n production --type merge -p '
spec:
  http:
  - route:
    - destination:
        host: payment-api.production.svc.cluster.local
        subset: blue
      weight: 50
    - destination:
        host: payment-api.production.svc.cluster.local
        subset: green
      weight: 50'
```

When everything looks good, shift all traffic to green:

```bash
kubectl patch virtualservice payment-api-bg -n production --type merge -p '
spec:
  http:
  - route:
    - destination:
        host: payment-api.production.svc.cluster.local
        subset: green
      weight: 100'
```

## Deployment Checklist

Before every production deployment, verify:

1. New pod image is accessible and starts correctly
2. ReadinessProbe passes within the expected time
3. `terminationGracePeriodSeconds` > `preStop sleep` + `terminationDrainDuration`
4. Retry policy is configured on all calling services
5. PodDisruptionBudget is in place
6. Load test passes with zero errors during rolling update
7. Monitoring alerts are set for error rate spikes

Zero-downtime deployments with Istio aren't magic. They're the result of getting a bunch of small configurations right so they work together as a system. Miss one piece and you'll see occasional errors. Get them all right and deployments become a non-event.
