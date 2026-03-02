# How to Handle Rolling Update Drain in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rolling Update, Drain, Kubernetes, Deployment

Description: Configure rolling update strategies with proper connection draining in Istio to achieve zero-downtime deployments for your services.

---

Rolling updates are the default deployment strategy in Kubernetes. Old pods get replaced by new ones, one at a time (or a few at a time). With Istio, each pod has a sidecar proxy that also needs to participate in this process. If the drain behavior during rolling updates isn't configured properly, you'll see intermittent errors every time you deploy. And if you're deploying multiple times a day, that adds up to a lot of unhappy users.

## How Rolling Updates Interact with Istio

During a rolling update, Kubernetes creates new pods and terminates old ones based on the `maxSurge` and `maxUnavailable` settings. For each old pod being terminated:

1. Kubernetes marks the pod as Terminating
2. The pod is removed from the Service's endpoints
3. istiod pushes an updated endpoint list to all Envoy sidecars
4. The terminating pod's sidecar starts draining

Steps 2-3 involve propagation delays. The endpoint removal has to go from the Kubernetes API server to istiod, and then from istiod to every sidecar in the mesh. This can take several seconds, during which other pods still think the old pod is available.

## Deployment Strategy Settings

Start with the right deployment strategy. For zero-downtime updates with Istio, use:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
  namespace: production
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 15s
          holdApplicationUntilProxyStarts: true
    spec:
      terminationGracePeriodSeconds: 35
      containers:
      - name: web-api
        image: web-api:v2
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 3
          failureThreshold: 1
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]
```

The key settings:

- `maxUnavailable: 0` ensures a new pod is fully ready before an old one starts terminating. This prevents capacity loss.
- `maxSurge: 1` allows one extra pod during the update. This gives the new pod time to become ready.
- `holdApplicationUntilProxyStarts: true` ensures the app container doesn't start until the sidecar is ready, preventing startup failures.

## PodDisruptionBudget for Extra Protection

A PodDisruptionBudget (PDB) prevents too many pods from being unavailable simultaneously:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-api-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: web-api
```

With 3 replicas and `minAvailable: 2`, only one pod can be down at a time. This protects against both voluntary disruptions (rolling updates, node drains) and involuntary ones (node failures).

## Retry Configuration for the Rolling Update Window

Even with perfect drain configuration, there's a small window where requests might fail. Configure retries on the client side to handle this:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: web-api
  namespace: production
spec:
  hosts:
  - web-api.production.svc.cluster.local
  http:
  - route:
    - destination:
        host: web-api.production.svc.cluster.local
        port:
          number: 8080
    retries:
      attempts: 3
      perTryTimeout: 5s
      retryOn: connect-failure,refused-stream,unavailable,cancelled
```

The `connect-failure` retry handles the case where a request is sent to a pod that has already closed its listeners. The `refused-stream` handles HTTP/2 GOAWAY responses from a draining sidecar.

## Connection Pool Settings for Smooth Drain

DestinationRules control how the client-side sidecar manages connections to the server:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: web-api-dr
  namespace: production
spec:
  host: web-api.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
      http:
        maxRequestsPerConnection: 50
        h2UpgradePolicy: DO_NOT_UPGRADE
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 15s
      maxEjectionPercent: 33
```

`maxRequestsPerConnection: 50` forces the client to periodically close and reopen connections. When a connection is reopened, it goes to the current endpoint list, which won't include the draining pod. This naturally shifts traffic away from draining pods.

The outlier detection settings eject pods that start returning errors. During a rolling update, if a draining pod returns errors, it gets ejected quickly so subsequent requests go to healthy pods.

## Canary Deployment Pattern with Drain

For more controlled rollouts, combine Istio traffic splitting with proper drain configuration:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: web-api-canary
  namespace: production
spec:
  hosts:
  - web-api.production.svc.cluster.local
  http:
  - route:
    - destination:
        host: web-api.production.svc.cluster.local
        subset: stable
      weight: 90
    - destination:
        host: web-api.production.svc.cluster.local
        subset: canary
      weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: web-api-subsets
  namespace: production
spec:
  host: web-api.production.svc.cluster.local
  subsets:
  - name: stable
    labels:
      version: v1
  - name: canary
    labels:
      version: v2
```

When you shift traffic from stable to canary, the drain happens naturally. Pods in the stable subset continue serving their existing connections while new requests go to canary pods. Once you're confident in the canary, you update the stable deployment and remove the canary routing.

## Monitoring Rolling Update Health

Track the health of rolling updates using Istio metrics:

```bash
# Watch error rates during deployment
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'sum(rate(istio_requests_total{destination_service="web-api.production.svc.cluster.local",response_code=~"5.."}[1m])) / sum(rate(istio_requests_total{destination_service="web-api.production.svc.cluster.local"}[1m]))'

# Check connection resets
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'sum(rate(istio_tcp_connections_closed_total{destination_service="web-api.production.svc.cluster.local",connection_security_policy="mutual_tls"}[1m]))'
```

If you see error rate spikes that correlate with deployment times, your drain configuration needs adjustment.

## Automated Rollback on Drain Failures

Combine Istio metrics with Kubernetes rollback for automated safety:

```bash
#!/bin/bash
# deploy-with-safety.sh

# Start the rollout
kubectl set image deploy/web-api web-api=web-api:v3 -n production

# Monitor error rate for 60 seconds
for i in $(seq 1 12); do
  ERROR_RATE=$(kubectl exec -n istio-system deploy/prometheus -- \
    promtool query instant http://localhost:9090 \
    'sum(rate(istio_requests_total{destination_service="web-api.production.svc.cluster.local",response_code=~"5.."}[30s])) / sum(rate(istio_requests_total{destination_service="web-api.production.svc.cluster.local"}[30s]))' \
    2>/dev/null | grep -oP '[\d.]+$')

  if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
    echo "Error rate too high ($ERROR_RATE), rolling back"
    kubectl rollout undo deploy/web-api -n production
    exit 1
  fi
  sleep 5
done

echo "Deployment successful"
```

## Tuning for Fast vs. Safe Deployments

If speed matters more than absolute zero-downtime (like in staging):

```yaml
strategy:
  rollingUpdate:
    maxSurge: 2
    maxUnavailable: 1
# Shorter drain
terminationDrainDuration: 5s
terminationGracePeriodSeconds: 15
```

If safety matters more than speed (production):

```yaml
strategy:
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
# Longer drain
terminationDrainDuration: 20s
terminationGracePeriodSeconds: 45
```

The production configuration takes longer to complete a full rollout, but each pod transition is carefully managed to prevent request failures. Pick the right tradeoff for each environment.

Rolling updates with Istio require coordination between the deployment strategy, sidecar drain settings, retry policies, and monitoring. Get all four pieces right and your deployments become boring, which is exactly what you want.
