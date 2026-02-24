# How to Set Up Istio for Strangler Fig Pattern

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Strangler Fig, Migration, Service Mesh, Architecture, Kubernetes

Description: Implement the strangler fig pattern with Istio to incrementally replace a legacy system by routing traffic to new services while the old system gradually shrinks.

---

The strangler fig pattern is named after a type of vine that grows around a tree, eventually replacing it. In software, it means building new functionality around an existing legacy system, gradually routing traffic away from the old system until the legacy code can be decommissioned entirely. Unlike a big-bang rewrite, the strangler fig approach is incremental and reversible at every step.

Istio is a natural fit for this pattern because its traffic routing capabilities let you intercept requests and redirect them to new services without modifying the legacy system at all. The legacy system does not need to know about the new services. The routing layer handles everything.

## The Pattern in Practice

The strangler fig pattern works like this:

1. Place a routing layer (Istio) in front of the legacy system
2. Build a new service that handles a slice of functionality
3. Route that slice of traffic to the new service
4. Repeat until the legacy system handles nothing
5. Decommission the legacy system

## Setting Up the Routing Facade

The first step is getting the legacy system behind Istio. If it is not already in Kubernetes, you can represent it as a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: legacy-system
  namespace: production
spec:
  hosts:
  - legacy.internal.example.com
  location: MESH_EXTERNAL
  ports:
  - number: 80
    name: http
    protocol: HTTP
  resolution: DNS
  endpoints:
  - address: 10.0.1.50
    ports:
      http: 8080
```

If the legacy system is already in Kubernetes, just use a standard Service with Istio sidecar injection.

Now create the routing facade that sends all traffic to the legacy system initially:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-routing
  namespace: production
spec:
  hosts:
  - app.example.com
  gateways:
  - app-gateway
  http:
  - route:
    - destination:
        host: legacy.internal.example.com
        port:
          number: 80
```

At this point, nothing has changed from the user's perspective. All traffic goes to the legacy system as before. But now you have a routing layer you can manipulate.

## Building the First Replacement Service

Identify a bounded context in the legacy system to extract. Good candidates are:

- Features with clear API boundaries
- Functionality that changes frequently
- Components with performance issues
- Parts that need different scaling characteristics

Deploy the new service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notifications-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: notifications-service
  template:
    metadata:
      labels:
        app: notifications-service
    spec:
      containers:
      - name: notifications
        image: my-registry/notifications-service:1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: LEGACY_URL
          value: "http://legacy.internal.example.com"
---
apiVersion: v1
kind: Service
metadata:
  name: notifications-service
  namespace: production
spec:
  selector:
    app: notifications-service
  ports:
  - port: 80
    targetPort: 8080
```

## Redirecting Traffic to the New Service

Update the VirtualService to intercept notification-related requests:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-routing
  namespace: production
spec:
  hosts:
  - app.example.com
  gateways:
  - app-gateway
  http:
  # Strangled: notifications go to new service
  - match:
    - uri:
        prefix: /api/notifications
    route:
    - destination:
        host: notifications-service
        port:
          number: 80
  # Everything else goes to legacy
  - route:
    - destination:
        host: legacy.internal.example.com
        port:
          number: 80
```

The notifications endpoint is now "strangled" - requests go to the new service, and the legacy system no longer handles them.

## Gradual Strangling with Traffic Splitting

Instead of an instant cutover, use traffic splitting to gradually move traffic:

```yaml
  http:
  - match:
    - uri:
        prefix: /api/notifications
    route:
    - destination:
        host: notifications-service
        port:
          number: 80
      weight: 20
    - destination:
        host: legacy.internal.example.com
        port:
          number: 80
      weight: 80
```

20% goes to the new service, 80% to legacy. Monitor for errors and increase the percentage over time.

## Using Traffic Mirroring for Validation

Before routing any live traffic, validate with mirroring:

```yaml
  http:
  - match:
    - uri:
        prefix: /api/notifications
    route:
    - destination:
        host: legacy.internal.example.com
        port:
          number: 80
    mirror:
      host: notifications-service
    mirrorPercentage:
      value: 100.0
```

All notification requests go to the legacy system (users see legacy responses), but copies go to the new service. Compare the responses from both to verify the new service produces correct results.

## Handling the Anti-Corruption Layer

The new service might use different data models than the legacy system. An anti-corruption layer translates between the two. This is often implemented in the new service itself:

```python
# notifications-service/app.py
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)
LEGACY_URL = "http://legacy.internal.example.com"

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    # New service handles this natively
    notifications = db.query_notifications(request.args.get('user_id'))
    return jsonify(notifications)

@app.route('/api/notifications/legacy-data', methods=['GET'])
def get_legacy_data():
    # Anti-corruption layer: translate legacy data format
    legacy_response = requests.get(f"{LEGACY_URL}/old-api/notifs")
    legacy_data = legacy_response.json()

    # Transform legacy format to new format
    transformed = [
        {
            "id": item["notification_id"],
            "message": item["msg_text"],
            "created_at": item["create_date"],
            "read": item["is_read"] == 1,
        }
        for item in legacy_data["notifications_list"]
    ]
    return jsonify(transformed)
```

## Strangling Multiple Services Over Time

As you extract more services, the VirtualService grows:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-routing
  namespace: production
spec:
  hosts:
  - app.example.com
  gateways:
  - app-gateway
  http:
  # Strangled services
  - match:
    - uri:
        prefix: /api/notifications
    route:
    - destination:
        host: notifications-service
        port:
          number: 80
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
        prefix: /api/payments
    route:
    - destination:
        host: payment-service
        port:
          number: 80
  # Remaining legacy traffic
  - route:
    - destination:
        host: legacy.internal.example.com
        port:
          number: 80
```

Each new line represents another piece of functionality extracted from the monolith. The legacy system's catch-all route at the bottom handles everything that has not been migrated yet.

## Monitoring the Migration Progress

Track how much traffic still goes to the legacy system:

```
# Percentage of traffic still going to legacy
sum(rate(istio_requests_total{destination_service="legacy.internal.example.com"}[5m])) /
sum(rate(istio_requests_total{destination_service=~".*"}[5m])) * 100
```

Create a dashboard showing traffic distribution across all services. As you extract more functionality, the legacy system's share should steadily decrease.

## Handling Shared State

During migration, both the legacy system and new services might need access to shared data. Common approaches:

**Event-driven sync**: The legacy system publishes events that the new services consume to build their own data stores.

**Shared database with bounded access**: Both systems access the same database, but with clear ownership boundaries. Use Istio to enforce that only the correct service can reach each database.

**API calls back to legacy**: The new service calls the legacy system for data it does not own yet:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: legacy-internal
  namespace: production
spec:
  hosts:
  - legacy.internal.example.com
  http:
  - route:
    - destination:
        host: legacy.internal.example.com
        port:
          number: 80
    timeout: 10s
    retries:
      attempts: 2
      perTryTimeout: 4s
```

## When to Decommission the Legacy System

The legacy system is ready for decommissioning when:

1. No routes in the VirtualService point to it
2. No services call it internally
3. All data has been migrated to new services
4. The legacy traffic metric shows zero requests

At that point, remove the ServiceEntry and the legacy system can be shut down.

## Summary

The strangler fig pattern with Istio works by placing a routing facade in front of the legacy system, then incrementally routing traffic to new services. Start with a VirtualService that sends everything to legacy. Extract services one at a time, using traffic mirroring for validation and traffic splitting for gradual cutover. Build anti-corruption layers in the new services to handle data format differences. Monitor the traffic split to track migration progress. When the legacy system handles no more traffic, decommission it. Istio makes every step reversible - if a new service has problems, route traffic back to legacy instantly.
