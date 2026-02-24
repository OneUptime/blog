# How to Implement Micro-Segmentation per Service with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Micro-Segmentation, Kubernetes, Security, Authorization

Description: Implement per-service micro-segmentation in Kubernetes with Istio to control exactly which services can communicate and how.

---

Micro-segmentation takes network segmentation down to the individual service level. Instead of drawing broad boundaries around groups of services, you define exactly what each service can and cannot access. Every service gets its own security perimeter. In a Kubernetes cluster running Istio, this is actually practical to implement because Istio gives each workload a cryptographic identity and lets you write fine-grained access policies.

## What Makes Micro-Segmentation Different

Traditional segmentation divides your network into zones (frontend, backend, database tier) and controls traffic between zones. Micro-segmentation goes further. Within the backend zone, the order service can only talk to the inventory service and the payment service. The notification service can only talk to the email gateway. Every allowed communication path is explicitly defined.

This limits the blast radius of a compromise to a single service. If an attacker takes over the notification service, they can reach the email gateway but nothing else. No lateral movement to the payment service, no access to the database.

## Building the Service Communication Map

Before writing any policies, you need to understand how your services actually communicate. If you already have Istio running, Kiali is the fastest way to see your service graph:

```bash
istioctl dashboard kiali
```

If you don't have Kiali, you can query Prometheus for the `istio_requests_total` metric:

```bash
istioctl dashboard prometheus
```

Then run this PromQL query:

```
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (source_workload, source_workload_namespace, destination_workload, destination_workload_namespace)
```

This gives you every active communication path in your mesh. Write these down. This is your baseline for creating policies.

## Creating Per-Service Policies

Each service gets its own AuthorizationPolicy. Start by making sure every service has a dedicated Kubernetes service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: backend
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: inventory-service
  namespace: backend
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payment-service
  namespace: backend
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: notification-service
  namespace: backend
```

Make sure your deployments reference these service accounts:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: backend
spec:
  template:
    spec:
      serviceAccountName: order-service
      containers:
      - name: order-service
        image: myregistry/order-service:v1
```

## Apply Default Deny

Lock everything down first:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: backend
spec:
  {}
```

## Define Per-Service Allow Rules

Now create a policy for each service that specifies exactly who can call it and how.

**Order Service** - called by the frontend and by an internal cron job:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: order-service-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/frontend/sa/web-app"
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/orders", "/api/orders/*"]
  - from:
    - source:
        principals:
        - "cluster.local/ns/backend/sa/order-processor"
    to:
    - operation:
        methods: ["PUT"]
        paths: ["/api/orders/*/status"]
```

**Inventory Service** - called only by the order service:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: inventory-service-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: inventory-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/backend/sa/order-service"
    to:
    - operation:
        methods: ["GET", "PUT"]
        paths: ["/api/inventory/*"]
```

**Payment Service** - called only by the order service with specific constraints:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-service-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/backend/sa/order-service"
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/payments"]
```

**Notification Service** - called by order service and payment service:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: notification-service-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: notification-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/backend/sa/order-service"
        - "cluster.local/ns/backend/sa/payment-service"
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/notifications"]
```

## Adding Conditional Rules

Micro-segmentation can go beyond just "who can call whom." You can add conditions based on request properties:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-api-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: admin-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/frontend/sa/admin-portal"
    to:
    - operation:
        methods: ["GET", "POST", "PUT", "DELETE"]
    when:
    - key: request.auth.claims[role]
      values: ["admin"]
```

This ensures that even though the admin portal can call the admin service, the JWT token must contain an admin role claim. The service identity alone isn't enough.

## Controlling Egress per Service

Micro-segmentation isn't just about who can call your service. It's also about what your service can call externally. Use Istio's Sidecar resource to limit what each service can reach:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: order-service-sidecar
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: order-service
  egress:
  - hosts:
    - "./inventory-service.backend.svc.cluster.local"
    - "./payment-service.backend.svc.cluster.local"
    - "./notification-service.backend.svc.cluster.local"
    - "istio-system/*"
```

This tells the order service's Envoy proxy to only include configuration for the services it actually needs to reach. Any attempt to call a service not in this list will fail. It also improves proxy performance by reducing the configuration size.

## Testing Micro-Segmentation

Test each allowed path to make sure it works:

```bash
# Should succeed - order-service calling inventory-service
kubectl exec deploy/order-service -n backend -c order-service -- \
  curl -s -o /dev/null -w "%{http_code}" http://inventory-service:8080/api/inventory/item-123

# Should fail (403) - notification-service trying to call payment-service
kubectl exec deploy/notification-service -n backend -c notification-service -- \
  curl -s -o /dev/null -w "%{http_code}" http://payment-service:8080/api/payments
```

Test blocked paths too. Every service should only be able to reach what's explicitly allowed.

## Maintaining Micro-Segmentation Over Time

The hardest part of micro-segmentation is keeping it current as services evolve. New API endpoints get added, new services come online, and dependencies change.

A few things that help:

Store your AuthorizationPolicy resources alongside your service code. When developers add a new API endpoint, they update the authorization policy in the same pull request.

Run regular audits by comparing your policies against actual traffic. If a policy allows traffic that never happens, the dependency might have been removed and the rule can be tightened.

```bash
# Check for services that haven't received traffic recently
istioctl proxy-config cluster deploy/order-service -n backend
```

Use CI/CD validation to ensure that new deployments don't break micro-segmentation. You can write integration tests that verify authorization policies allow the expected paths and block everything else.

Micro-segmentation with Istio requires more upfront work than coarse-grained segmentation, but the security benefit is substantial. When every service has its own perimeter, the impact of any single compromise is contained to what that service was allowed to do.
