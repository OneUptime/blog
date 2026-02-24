# How to Configure Istio for Monolith-to-Microservices Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Microservices, Migration, Service Mesh, Kubernetes, Architecture

Description: A practical guide to using Istio for incremental monolith-to-microservices migration with traffic routing, feature extraction, and safe cutover strategies.

---

Breaking apart a monolith is one of the most common reasons teams adopt a service mesh. The migration rarely happens all at once. You extract one service at a time, validate it works correctly, then move on to the next. Istio is perfect for this incremental approach because it lets you control exactly which requests go to the monolith and which go to the new microservice, without changing application code or DNS.

The core idea is to put both the monolith and the new microservices behind Istio, then use VirtualService routing rules to gradually shift traffic from the monolith to the extracted services. If something goes wrong, you route traffic back to the monolith instantly.

## The Starting Point

Assume you have a monolith that handles everything: users, orders, products, notifications. It runs in Kubernetes with Istio sidecar injection:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monolith
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: monolith
  template:
    metadata:
      labels:
        app: monolith
    spec:
      containers:
      - name: monolith
        image: my-registry/monolith:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: monolith
  namespace: production
spec:
  selector:
    app: monolith
  ports:
  - port: 80
    targetPort: 8080
```

All traffic goes to the monolith through a single VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-routing
  namespace: production
spec:
  hosts:
  - api.example.com
  gateways:
  - api-gateway
  http:
  - route:
    - destination:
        host: monolith
        port:
          number: 80
```

## Step 1: Extract a Service

Say you are extracting the user service first. Deploy it as a new microservice:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: my-registry/user-service:1.0.0
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: production
spec:
  selector:
    app: user-service
  ports:
  - port: 80
    targetPort: 8080
```

## Step 2: Route Traffic Incrementally

Update the VirtualService to send user-related traffic to the new service while everything else stays with the monolith:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-routing
  namespace: production
spec:
  hosts:
  - api.example.com
  gateways:
  - api-gateway
  http:
  # User endpoints go to the new service
  - match:
    - uri:
        prefix: /api/users
    route:
    - destination:
        host: user-service
        port:
          number: 80
  # Everything else stays with the monolith
  - route:
    - destination:
        host: monolith
        port:
          number: 80
```

At this point, all user API calls go to the new user-service and everything else goes to the monolith. No DNS changes, no load balancer reconfiguration, no client updates needed.

## Step 3: Canary the New Service

Instead of switching 100% of user traffic at once, do a canary rollout:

```yaml
  http:
  - match:
    - uri:
        prefix: /api/users
    route:
    - destination:
        host: user-service
        port:
          number: 80
      weight: 10
    - destination:
        host: monolith
        port:
          number: 80
      weight: 90
```

10% of user requests go to the new service. Monitor error rates, latency, and correctness. If things look good, increase to 25%, 50%, and eventually 100%.

## Step 4: Handle Internal Service Communication

The monolith might call user functionality internally. For example, the order processing code in the monolith might call `getUserById()`. During migration, these internal calls also need to route to the new user service.

If the monolith makes HTTP calls internally, configure it to call the user-service through the mesh:

```python
# Before: internal function call
user = get_user_from_database(user_id)

# After: HTTP call through the mesh
response = requests.get(f"http://user-service/api/users/{user_id}")
user = response.json()
```

Istio routing handles the rest. The monolith's sidecar proxy routes the request to the user-service.

## Step 5: Mirror Traffic for Validation

Before routing any real traffic to the new service, use Istio mirroring to validate it with production traffic:

```yaml
  http:
  - match:
    - uri:
        prefix: /api/users
    route:
    - destination:
        host: monolith
        port:
          number: 80
    mirror:
      host: user-service
    mirrorPercentage:
      value: 100.0
```

All user requests still go to the monolith (and users get the monolith's response), but a copy goes to the user-service. Compare responses, check for errors in the new service logs, and validate data consistency.

## Step 6: Timeout and Retry Configuration

The new microservice might have different performance characteristics than the monolith. Configure appropriate timeouts and retries:

```yaml
  http:
  - match:
    - uri:
        prefix: /api/users
    route:
    - destination:
        host: user-service
        port:
          number: 80
    timeout: 5s
    retries:
      attempts: 2
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure
```

This gives the user-service 5 seconds total with 2 retry attempts. If the service is not performing well, the retries add resilience while you investigate.

## Step 7: Circuit Breaking for the New Service

Add circuit breaking to protect against the new service being unstable:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-service
  namespace: production
spec:
  host: user-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 25
        http2MaxRequests: 50
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

If the user-service starts returning errors, unhealthy pods get ejected from the pool. During migration, this prevents a buggy new service from causing widespread failures.

## Handling Database Migration

The hardest part of monolith decomposition is usually the database. During migration, both the monolith and the new service might need access to the same data. Common patterns:

**Shared database (temporary)**: Both services read from the same database. This is the easiest to start with but creates coupling.

**Database per service with sync**: The new service has its own database, and a synchronization process keeps data in sync.

**API-based access**: The monolith accesses user data through the user-service API instead of directly from the database.

Istio does not manage databases directly, but it manages the traffic between services that access those databases. The routing rules you set up ensure that once you switch to the new service, all user data operations go through the user-service API.

## Extracting the Next Service

Once the user-service is stable and handling 100% of traffic, move on to the next service. Say you extract orders next:

```yaml
  http:
  - match:
    - uri:
        prefix: /api/users
    route:
    - destination:
        host: user-service
        port:
          number: 80
  - match:
    - uri:
        prefix: /api/orders
    route:
    - destination:
        host: order-service
        port:
          number: 80
      weight: 10
    - destination:
        host: monolith
        port:
          number: 80
      weight: 90
  - route:
    - destination:
        host: monolith
        port:
          number: 80
```

The pattern repeats. Each service gets extracted, canary tested, and fully migrated before the next one starts.

## Rollback Plan

If the new service has issues, roll back instantly by updating the VirtualService:

```bash
kubectl patch virtualservice api-routing -n production --type='json' \
  -p='[
    {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 0},
    {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 100}
  ]'
```

Traffic goes back to the monolith within seconds. No redeployment needed.

## Summary

Istio makes monolith-to-microservices migration manageable by giving you fine-grained traffic control at every step. Start by deploying both the monolith and new microservices in the mesh. Use VirtualService path-based routing to send specific API paths to new services. Use traffic mirroring to validate before cutting over. Use canary routing to gradually shift traffic. Add circuit breaking for safety, and keep the monolith running as a fallback until each new service is proven stable. The migration is incremental, reversible, and transparent to your clients.
