# How to Control Access Based on Service Account in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Service Accounts, Security, Kubernetes, MTLS

Description: How to use Kubernetes service accounts with Istio authorization policies to implement fine-grained, identity-based access control between services.

---

Service account-based access control is the most precise form of identity-based authorization in Istio. While namespace-based policies give you team-level boundaries, service account policies let you control access at the individual service level. Service A can talk to Service B, but Service C in the same namespace cannot - even though they share the same network.

This is what zero-trust networking looks like in practice. Every service proves its identity through mTLS certificates, and Istio's authorization policies verify that identity before allowing traffic through.

## How Service Account Identity Works

Every pod in Kubernetes runs under a service account. When Istio injects a sidecar, it requests a certificate from the Istio CA that encodes the pod's service account identity in SPIFFE format:

```text
spiffe://cluster.local/ns/<namespace>/sa/<service-account>
```

For example, a pod running under the `order-processor` service account in the `backend` namespace gets this identity:

```text
spiffe://cluster.local/ns/backend/sa/order-processor
```

This identity is cryptographically verified through mTLS. You can't spoof it, which makes it a solid foundation for access control.

## Setting Up Service Accounts

First, make sure your workloads use dedicated service accounts instead of the `default` one:

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
  name: payment-service
  namespace: backend
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: notification-service
  namespace: backend
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: backend
spec:
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      serviceAccountName: order-service
      containers:
        - name: order-service
          image: myregistry/order-service:latest
          ports:
            - containerPort: 8080
```

Never leave workloads on the `default` service account in production. If everything uses `default`, you can't distinguish between services in your authorization policies.

## Basic Service Account Policy

Allow only the order-service to call the payment-service:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-access
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
```

The `principals` field takes the full SPIFFE identity. Only pods running as the `order-service` service account in the `backend` namespace can reach the payment service.

## Multiple Allowed Service Accounts

List multiple service accounts to allow traffic from several services:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: database-proxy-access
  namespace: backend
spec:
  selector:
    matchLabels:
      app: database-proxy
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/backend/sa/order-service"
              - "cluster.local/ns/backend/sa/user-service"
              - "cluster.local/ns/backend/sa/inventory-service"
```

Only these three services can talk to the database proxy. Everything else is blocked.

## Cross-Namespace Service Account Policies

Service accounts work across namespaces. A frontend service in one namespace can be allowed to call a backend service in another:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-access
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-gateway
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/frontend/sa/web-app"
              - "cluster.local/ns/frontend/sa/mobile-bff"
              - "cluster.local/ns/monitoring/sa/prometheus"
```

This allows the web app and mobile BFF from the `frontend` namespace and Prometheus from `monitoring` to reach the API gateway in `backend`.

## Wildcard Matching with Principals

You can use prefix and suffix wildcards in principal matching:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-all-backend-sas
  namespace: backend
spec:
  selector:
    matchLabels:
      app: shared-cache
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/backend/sa/*"
```

The `*` matches any service account in the `backend` namespace. This is equivalent to a namespace-based policy but uses the principals field.

## Combining Service Account with Operations

Restrict what each service account can do, not just whether it can connect:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: order-service-access
  namespace: backend
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
    # Frontend can read orders
    - from:
        - source:
            principals: ["cluster.local/ns/frontend/sa/web-app"]
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/orders/*"]
    # Payment service can update order status (webhook callback)
    - from:
        - source:
            principals: ["cluster.local/ns/backend/sa/payment-service"]
      to:
        - operation:
            methods: ["PUT", "PATCH"]
            paths: ["/api/orders/*/status"]
    # Admin service has full access
    - from:
        - source:
            principals: ["cluster.local/ns/admin/sa/admin-service"]
```

Each service gets exactly the access it needs - no more, no less.

## Microservice Communication Graph

Here's a practical example of a complete communication policy for an e-commerce system:

```yaml
# Order service can call payment and inventory
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-policy
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
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: inventory-policy
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
              - "cluster.local/ns/backend/sa/warehouse-service"
---
# Notification service can be called by order and payment
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: notification-policy
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
```

## Denying Specific Service Accounts

Use DENY policies to block specific service accounts:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-deprecated-service
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-gateway
  action: DENY
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/backend/sa/legacy-service"
```

This blocks the legacy service from accessing the API gateway, even if other ALLOW policies would permit it.

## Verifying Service Account Identity

Check what service account a pod is running under:

```bash
# Check the service account
kubectl get pod -n backend -l app=order-service -o jsonpath='{.items[0].spec.serviceAccountName}'

# Check the SPIFFE identity in the sidecar certificate
istioctl proxy-config secret deploy/order-service -n backend -o json | jq '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain'
```

## Testing Service Account Policies

```bash
# Test from the allowed service account
kubectl exec -n backend deploy/order-service -- curl -s -o /dev/null -w "%{http_code}" http://payment-service:8080/api/charge

# Test from a denied service account
kubectl exec -n backend deploy/notification-service -- curl -s -o /dev/null -w "%{http_code}" http://payment-service:8080/api/charge

# Check RBAC logs for denied requests
kubectl logs -n backend deploy/payment-service -c istio-proxy | grep "rbac"
```

## mTLS Requirement

Service account-based policies require mutual TLS. Without mTLS, the sidecar can't verify the caller's identity. Make sure mTLS is enforced:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: backend
spec:
  mtls:
    mode: STRICT
```

In `PERMISSIVE` mode, plaintext connections bypass identity verification, which means your principal-based policies won't protect against non-mesh traffic.

Service account-based authorization is the gold standard for service-to-service access control in Istio. It gives you cryptographic identity verification without any changes to your application code. Combined with mTLS, it provides a strong security foundation that's hard to bypass.
