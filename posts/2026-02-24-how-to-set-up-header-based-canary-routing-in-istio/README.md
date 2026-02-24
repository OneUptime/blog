# How to Set Up Header-Based Canary Routing in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Canary Routing, Header Routing, Traffic Management

Description: Configure header-based canary routing in Istio to direct specific users or test traffic to canary deployments using HTTP headers for targeted testing.

---

Header-based canary routing lets you send specific requests to the canary version based on HTTP headers. Unlike percentage-based routing where random users hit the canary, header-based routing gives you control over exactly who sees the new version. QA teams can test in production, beta users can get early access, and developers can verify changes with real traffic before broader rollout.

This approach is especially useful when you need to test a new version with specific user accounts, specific client applications, or specific test scenarios.

## Basic Header-Based Routing

The simplest setup routes requests with a specific header value to the canary:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: production
spec:
  hosts:
  - my-app.production.svc.cluster.local
  http:
  - match:
    - headers:
        x-version:
          exact: canary
    route:
    - destination:
        host: my-app.production.svc.cluster.local
        subset: canary
  - route:
    - destination:
        host: my-app.production.svc.cluster.local
        subset: stable
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app
  namespace: production
spec:
  host: my-app.production.svc.cluster.local
  subsets:
  - name: stable
    labels:
      version: v1
  - name: canary
    labels:
      version: v2
```

Test it:

```bash
# This goes to stable
curl http://my-app.production:80/api/resource

# This goes to canary
curl -H "x-version: canary" http://my-app.production:80/api/resource
```

## Routing by User ID

Route specific users to the canary based on a user ID header. This is great for internal testing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: production
spec:
  hosts:
  - my-app
  http:
  - match:
    - headers:
        x-user-id:
          regex: "^(user-123|user-456|user-789)$"
    route:
    - destination:
        host: my-app
        subset: canary
  - route:
    - destination:
        host: my-app
        subset: stable
```

This sends users 123, 456, and 789 to the canary. Everyone else gets the stable version. As your confidence grows, add more user IDs to the regex.

## Routing by Client Version

If different client applications send version information in headers, you can route newer clients to the canary:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: production
spec:
  hosts:
  - my-app
  http:
  - match:
    - headers:
        x-client-version:
          prefix: "3."
    route:
    - destination:
        host: my-app
        subset: canary
  - route:
    - destination:
        host: my-app
        subset: stable
```

Clients sending `x-client-version: 3.0.0` or `x-client-version: 3.1.2` get routed to the canary. Clients with version 2.x get the stable version.

## Combining Header and Weight-Based Routing

You can combine header-based routing with percentage-based canary for a layered approach:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: production
spec:
  hosts:
  - my-app
  http:
  # Rule 1: Internal testers always get canary
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: my-app
        subset: canary
  # Rule 2: Regular traffic gets percentage-based split
  - route:
    - destination:
        host: my-app
        subset: stable
      weight: 90
    - destination:
        host: my-app
        subset: canary
      weight: 10
```

Internal testers always see the canary (via the header), and 10% of regular traffic also goes to the canary. This gives testers a consistent experience while still getting real-world data from the percentage split.

## Multi-Header Matching

Match on multiple headers for more specific routing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: production
spec:
  hosts:
  - my-app
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
        x-team:
          exact: "backend"
    route:
    - destination:
        host: my-app
        subset: canary
  - route:
    - destination:
        host: my-app
        subset: stable
```

Both headers must be present and match for the request to be routed to the canary. This lets you be very specific about which traffic goes where.

## Gateway-Level Header Routing

For traffic coming from outside the cluster through an Istio ingress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: production
spec:
  hosts:
  - my-app.example.com
  gateways:
  - my-gateway
  http:
  - match:
    - headers:
        cookie:
          regex: ".*canary=true.*"
    route:
    - destination:
        host: my-app
        subset: canary
  - route:
    - destination:
        host: my-app
        subset: stable
```

This routes users who have a `canary=true` cookie to the canary version. You can set this cookie through your frontend, a feature flag service, or manually in the browser devtools.

## Propagating Headers Through the Mesh

If your canary service calls other services, and those services also have canary versions, you need header propagation. Istio doesn't automatically propagate custom headers. Your application needs to forward them.

For a request chain: Frontend -> API -> Backend, if you want the canary header to propagate through all three services, each service must read the incoming `x-canary` header and include it in outgoing requests.

In your application code:

```python
# Python/Flask example
from flask import request
import requests

@app.route('/api/data')
def get_data():
    # Forward the canary header to downstream services
    headers = {}
    if 'x-canary' in request.headers:
        headers['x-canary'] = request.headers['x-canary']

    response = requests.get('http://backend-service/data', headers=headers)
    return response.json()
```

Or use Istio's `HeaderOperations` to inject headers:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
spec:
  hosts:
  - my-app
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: my-app
        subset: canary
      headers:
        request:
          set:
            x-routed-to: canary
```

## Setting Up the Deployment

Make sure your deployments have version labels that match the DestinationRule subsets:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-v1
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
      version: v1
  template:
    metadata:
      labels:
        app: my-app
        version: v1
    spec:
      containers:
      - name: app
        image: my-app:1.0.0
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-v2
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
      version: v2
  template:
    metadata:
      labels:
        app: my-app
        version: v2
    spec:
      containers:
      - name: app
        image: my-app:2.0.0
```

The canary deployment can start with fewer replicas since it only receives targeted traffic.

## Monitoring Header-Routed Traffic

Track traffic split by version:

```promql
# Requests per version
sum(rate(istio_requests_total{
  destination_workload="my-app",
  destination_version=~"v1|v2"
}[5m])) by (destination_version)

# Error rate by version
sum(rate(istio_requests_total{
  destination_workload="my-app",
  response_code=~"5.*"
}[5m])) by (destination_version)

# Latency by version
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_workload="my-app"
  }[5m])) by (le, destination_version)
)
```

## Cleaning Up After Testing

When the canary is ready for full promotion:

```bash
# Update the stable deployment to the new version
kubectl set image deployment/my-app-v1 app=my-app:2.0.0 -n production

# Remove the canary deployment
kubectl delete deployment my-app-v2 -n production

# Simplify the VirtualService
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: production
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
        subset: stable
EOF
```

Header-based canary routing gives you surgical precision over which traffic sees the new version. It's the safest way to test in production because you control exactly who's affected. Start with your internal team, expand to beta users, and only then move to percentage-based routing for the general audience.
