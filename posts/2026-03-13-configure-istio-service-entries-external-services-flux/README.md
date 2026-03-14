# How to Configure Istio Service Entries for External Services with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Istio, ServiceEntry, External Services, Service Mesh, Egress

Description: Manage Istio ServiceEntry resources for external services using Flux CD to control and observe egress traffic to external APIs and databases.

---

## Introduction

Istio's ServiceEntry extends the service mesh's service registry to include external services - APIs, databases, SaaS platforms, and other systems outside the Kubernetes cluster. Once registered, external services benefit from the same Istio features: mTLS, retries, circuit breaking, timeouts, and observability, along with controlled egress routing.

Managing ServiceEntry resources through Flux CD means your external service registrations are version-controlled. Adding a new third-party API dependency or changing egress routing for an existing service goes through pull request review.

This guide covers configuring Istio ServiceEntry resources for external HTTPS services, external databases, and internal external services using Flux CD.

## Prerequisites

- Kubernetes cluster with Istio installed
- Flux CD v2 bootstrapped to your Git repository
- Istio's egress traffic policy set (REGISTRY_ONLY blocks all unknown external traffic)

## Step 1: Set Registry-Only Egress Policy

First, configure Istio to block all unregistered external traffic:

```yaml
# clusters/my-cluster/istio-egress/mesh-config-patch.yaml
# Patch istiod ConfigMap to enable REGISTRY_ONLY mode
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |
    accessLogFile: /dev/stdout
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY  # Block all external traffic not in ServiceEntry
```

## Step 2: Register an External HTTPS API

```yaml
# clusters/my-cluster/istio-egress/service-entries.yaml
# Register the Stripe payment API
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: production
spec:
  hosts:
    - api.stripe.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
---
# Register the SendGrid email API
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: sendgrid-api
  namespace: production
spec:
  hosts:
    - api.sendgrid.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
---
# Register a MongoDB Atlas cluster
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: mongodb-atlas
  namespace: production
spec:
  hosts:
    - "*.mongodb.net"
  ports:
    - number: 27017
      name: mongo
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
```

## Step 3: Add DestinationRules for TLS Origination

```yaml
# clusters/my-cluster/istio-egress/destination-rules.yaml
# Configure TLS origination for external HTTPS services
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: stripe-api-tls
  namespace: production
spec:
  host: api.stripe.com
  trafficPolicy:
    tls:
      mode: SIMPLE  # TLS origination (not mTLS)
    connectionPool:
      tcp:
        connectTimeout: 5s
      http:
        http1MaxPendingRequests: 100
        h2UpgradePolicy: UPGRADE
    outlierDetection:
      # Circuit breaking for Stripe API
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

## Step 4: Use VirtualService for Retries and Timeouts

```yaml
# clusters/my-cluster/istio-egress/virtual-services.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: stripe-api-routing
  namespace: production
spec:
  hosts:
    - api.stripe.com
  http:
    - route:
        - destination:
            host: api.stripe.com
            port:
              number: 443
      # Retry failed Stripe API calls
      retries:
        attempts: 3
        perTryTimeout: 10s
        retryOn: "5xx,reset,connect-failure"
      # Overall timeout for Stripe calls
      timeout: 30s
```

## Step 5: Register an Internal Service in Another Namespace

```yaml
# clusters/my-cluster/istio-egress/internal-service-entry.yaml
# Register a service running outside the mesh (e.g., legacy VM)
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: legacy-crm
  namespace: production
spec:
  hosts:
    - legacy-crm.internal.example.com
  addresses:
    - 10.100.50.20/32
  ports:
    - number: 8080
      name: http
      protocol: HTTP
  location: MESH_EXTERNAL
  resolution: STATIC
  endpoints:
    - address: 10.100.50.20
      ports:
        http: 8080
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/my-cluster/istio-egress/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - service-entries.yaml
  - destination-rules.yaml
  - virtual-services.yaml
  - internal-service-entry.yaml
---
# clusters/my-cluster/flux-kustomization-istio-egress.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio-service-entries
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: istio
  path: ./clusters/my-cluster/istio-egress
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Validate External Service Access

```bash
# Apply Flux reconciliation
flux reconcile kustomization istio-service-entries

# List ServiceEntries
kubectl get serviceentry -n production

# Test access to registered external service
kubectl exec -n production deploy/payment-service -- \
  curl -sv https://api.stripe.com/v1/charges \
  -H "Authorization: Bearer sk_test_..."

# Test that unregistered external access is blocked
kubectl exec -n production deploy/api-service -- \
  curl -sv https://unknown-api.example.com/
# Expected: failed to connect (blocked by REGISTRY_ONLY policy)

# Check Istio access logs for external traffic
kubectl logs -n production deploy/payment-service -c istio-proxy \
  | grep "stripe"
```

## Best Practices

- Enable `REGISTRY_ONLY` outbound traffic policy as a security baseline - it forces teams to declare all external dependencies via ServiceEntry, creating an auditable egress registry.
- Apply DestinationRules with connection pool limits and circuit breaking for external APIs to prevent a slow or failing third-party from cascading into your services.
- Use VirtualService retries with `retryOn: "5xx,connect-failure"` for idempotent external API calls to handle transient failures automatically.
- Group ServiceEntries by domain ownership (e.g., `payment-service-entries.yaml`, `email-service-entries.yaml`) rather than in a single file to make ownership and review clear.
- Monitor external service egress with Istio's access logs and Prometheus `istio_tcp_connections_opened_total` metric to detect unexpected external dependencies.

## Conclusion

Managing Istio ServiceEntry resources through Flux CD creates an auditable, version-controlled registry of all external service dependencies. Security and platform teams gain visibility into egress traffic, can enforce REGISTRY_ONLY egress policies, and can apply retry, circuit-breaking, and timeout policies to external services - all through the GitOps pull request workflow.
