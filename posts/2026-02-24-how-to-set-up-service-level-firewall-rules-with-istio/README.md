# How to Set Up Service-Level Firewall Rules with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Firewall Rules, AuthorizationPolicy, Kubernetes

Description: Build service-level firewall rules in Istio using AuthorizationPolicy to control which services can communicate with each other in your mesh.

---

Traditional firewalls work at the network level, filtering packets based on IP addresses and ports. In a Kubernetes environment with dynamic pod IPs and ephemeral workloads, network-level firewalling is not enough. You need firewall rules that understand service identity, not just IP addresses. That is exactly what Istio's AuthorizationPolicy gives you: a service-level firewall that operates on workload identities, HTTP paths, methods, and headers.

## Service Firewall vs. Network Firewall

A network firewall says: "Allow traffic from 10.0.1.0/24 to 10.0.2.0/24 on port 8080."

A service firewall says: "Allow traffic from order-service to payment-service on POST /api/charge."

The service firewall is more precise because it uses identity (service accounts) instead of IPs, and it can match on application-layer attributes like HTTP method and path.

## Building Blocks

Istio service firewall rules are built with:

- **PeerAuthentication** - Ensures mutual TLS so service identities are verified
- **AuthorizationPolicy** - Defines allow/deny rules based on identity and request attributes
- **ServiceAccount** - Provides the identity for each service

## Step 1: Assign Unique Service Accounts

Each service needs its own ServiceAccount for fine-grained identification:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: frontend-sa
  namespace: default
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service-sa
  namespace: default
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payment-service-sa
  namespace: default
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: inventory-service-sa
  namespace: default
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: notification-service-sa
  namespace: default
```

Reference them in your deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    spec:
      serviceAccountName: order-service-sa
      containers:
        - name: order-service
          image: my-registry/order-service:1.0
```

```bash
kubectl apply -f service-accounts.yaml
```

## Step 2: Enable STRICT mTLS

For firewall rules to work reliably, you need STRICT mTLS. Without it, services could send plaintext traffic that bypasses identity verification:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default-strict
  namespace: default
spec:
  mtls:
    mode: STRICT
```

```bash
kubectl apply -f peer-auth.yaml
```

## Step 3: Define Your Firewall Rules

Think of each AuthorizationPolicy as a firewall rule. Start by defining your service communication map:

```
frontend -> order-service (GET, POST /api/orders/*)
order-service -> payment-service (POST /api/charge)
order-service -> inventory-service (GET, PUT /api/inventory/*)
order-service -> notification-service (POST /api/notify)
payment-service -> notification-service (POST /api/notify)
```

Now translate each arrow into an AuthorizationPolicy.

### Default Deny (the base firewall rule)

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: default-deny
  namespace: default
spec: {}
```

### Frontend Firewall Rules

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: frontend-firewall
  namespace: default
spec:
  selector:
    matchLabels:
      app: frontend
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account"]
```

The frontend only accepts traffic from the ingress gateway.

### Order Service Firewall Rules

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: order-service-firewall
  namespace: default
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/frontend-sa"]
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/orders/*"]
```

Only the frontend can call the order service, and only on specific methods and paths.

### Payment Service Firewall Rules

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-service-firewall
  namespace: default
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/order-service-sa"]
      to:
        - operation:
            methods: ["POST"]
            paths: ["/api/charge"]
```

Only the order service can call the payment service, and only POST to `/api/charge`.

### Inventory Service Firewall Rules

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: inventory-service-firewall
  namespace: default
spec:
  selector:
    matchLabels:
      app: inventory-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/order-service-sa"]
      to:
        - operation:
            methods: ["GET", "PUT"]
            paths: ["/api/inventory/*"]
```

### Notification Service Firewall Rules

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: notification-service-firewall
  namespace: default
spec:
  selector:
    matchLabels:
      app: notification-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/default/sa/order-service-sa"
              - "cluster.local/ns/default/sa/payment-service-sa"
      to:
        - operation:
            methods: ["POST"]
            paths: ["/api/notify"]
```

Both order-service and payment-service can send notifications.

## Adding Monitoring Exceptions

Monitoring tools need access to metrics endpoints on all services. Add a policy for Prometheus:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-prometheus
  namespace: default
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/monitoring/sa/prometheus-sa"]
      to:
        - operation:
            methods: ["GET"]
            paths: ["/metrics", "/stats/prometheus"]
```

This applies to all services in the namespace (no selector) and allows Prometheus to scrape metrics.

## Port-Based Rules

You can also restrict by port:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: db-proxy-firewall
  namespace: default
spec:
  selector:
    matchLabels:
      app: db-proxy
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/order-service-sa"]
      to:
        - operation:
            ports: ["5432"]
```

Only order-service can connect to the database proxy on port 5432.

## Visualizing the Firewall

Kiali provides a visual representation of your service communication. After applying your firewall rules, you can see which connections are allowed and which are blocked:

```bash
istioctl dashboard kiali
```

In the graph view, edges between services show allowed traffic. Missing edges indicate blocked communication paths.

## Auditing and Logging

Enable access logging to track all allowed and denied requests:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-logging
  namespace: default
spec:
  accessLogging:
    - providers:
        - name: envoy
```

Denied requests appear in the access log with response code 403 and the RBAC filter flag:

```bash
kubectl logs deploy/payment-service -c istio-proxy | grep "response_code\":403"
```

## Testing the Firewall

Test each allowed path:

```bash
# frontend -> order-service (allowed)
kubectl exec deploy/frontend -c frontend -- curl -s -o /dev/null -w "%{http_code}" -X GET http://order-service.default.svc.cluster.local/api/orders/list
# Expected: 200

# order-service -> payment-service (allowed)
kubectl exec deploy/order-service -c order-service -- curl -s -o /dev/null -w "%{http_code}" -X POST http://payment-service.default.svc.cluster.local/api/charge
# Expected: 200
```

Test blocked paths:

```bash
# frontend -> payment-service (blocked)
kubectl exec deploy/frontend -c frontend -- curl -s -o /dev/null -w "%{http_code}" http://payment-service.default.svc.cluster.local/api/charge
# Expected: 403

# order-service -> payment-service GET (wrong method, blocked)
kubectl exec deploy/order-service -c order-service -- curl -s -o /dev/null -w "%{http_code}" -X GET http://payment-service.default.svc.cluster.local/api/charge
# Expected: 403
```

## Maintaining the Firewall

As your services evolve, keep your firewall rules updated:

- When a new service is added, it is blocked by default (good)
- When a new communication path is needed, add an AuthorizationPolicy
- When a path is removed, delete the corresponding policy
- Review policies periodically to remove stale rules
- Use `istioctl analyze` after every change to catch configuration errors

```bash
istioctl analyze -n default
```

## Summary

Service-level firewall rules in Istio provide fine-grained access control that network-level firewalls cannot match. By combining default-deny with specific ALLOW policies per service, you create an explicit map of allowed communication. Each rule specifies the source identity (service account), destination service, allowed HTTP methods, and allowed paths. This gives you a firewall that understands your application architecture and enforces it at the infrastructure level.
