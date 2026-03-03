# How to Use Kustomize with Istio Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kustomize, Kubernetes, GitOps, Configuration

Description: How to use Kustomize to manage Istio configuration across multiple environments with reusable base templates and environment-specific patches.

---

Managing Istio configuration across staging, production, and other environments usually means maintaining nearly identical YAML files with small differences. Timeout values might be higher in production. Retry counts might differ. Canary traffic splits only exist in production. Without a tool to handle these variations, you end up copy-pasting YAML and hoping nothing drifts.

Kustomize solves this by letting you define a base configuration and then layer environment-specific patches on top. It is built into kubectl (no extra tools needed), works with any Kubernetes resource including Istio CRDs, and keeps your configuration DRY.

## Setting Up the Directory Structure

The standard Kustomize layout for Istio config:

```text
istio/
  base/
    kustomization.yaml
    virtual-service.yaml
    destination-rule.yaml
    authorization-policy.yaml
    peer-authentication.yaml
  overlays/
    staging/
      kustomization.yaml
      patches/
        virtual-service-patch.yaml
        destination-rule-patch.yaml
    production/
      kustomization.yaml
      patches/
        virtual-service-patch.yaml
        destination-rule-patch.yaml
        authorization-policy-patch.yaml
```

## Defining the Base Configuration

The base contains the common configuration shared across all environments:

```yaml
# istio/base/virtual-service.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
    - order-service
  http:
    - route:
        - destination:
            host: order-service
            port:
              number: 8080
      timeout: 10s
      retries:
        attempts: 2
        perTryTimeout: 5s
        retryOn: 5xx,reset,connect-failure
```

```yaml
# istio/base/destination-rule.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: order-service
spec:
  host: order-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

```yaml
# istio/base/authorization-policy.yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: order-service
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces:
              - default
```

```yaml
# istio/base/peer-authentication.yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
spec:
  mtls:
    mode: STRICT
```

```yaml
# istio/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - virtual-service.yaml
  - destination-rule.yaml
  - authorization-policy.yaml
  - peer-authentication.yaml
```

## Creating Environment Overlays

### Staging Overlay

In staging, you might want shorter timeouts and no outlier detection (to catch bugs earlier):

```yaml
# istio/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: staging
patches:
  - path: patches/virtual-service-patch.yaml
  - path: patches/destination-rule-patch.yaml
```

```yaml
# istio/overlays/staging/patches/virtual-service-patch.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service
spec:
  http:
    - route:
        - destination:
            host: order-service
            port:
              number: 8080
      timeout: 5s
      retries:
        attempts: 1
        perTryTimeout: 3s
        retryOn: 5xx
```

```yaml
# istio/overlays/staging/patches/destination-rule-patch.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: order-service
spec:
  host: order-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 50
```

### Production Overlay

Production gets canary routing, higher connection limits, and stricter authorization:

```yaml
# istio/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: production
patches:
  - path: patches/virtual-service-patch.yaml
  - path: patches/destination-rule-patch.yaml
  - path: patches/authorization-policy-patch.yaml
commonLabels:
  environment: production
```

```yaml
# istio/overlays/production/patches/virtual-service-patch.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service
spec:
  http:
    - route:
        - destination:
            host: order-service
            subset: stable
            port:
              number: 8080
          weight: 95
        - destination:
            host: order-service
            subset: canary
            port:
              number: 8080
          weight: 5
      timeout: 30s
      retries:
        attempts: 3
        perTryTimeout: 10s
        retryOn: 5xx,reset,connect-failure,retriable-4xx
```

```yaml
# istio/overlays/production/patches/destination-rule-patch.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: order-service
spec:
  host: order-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
      http:
        http1MaxPendingRequests: 500
        http2MaxRequests: 500
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 60s
  subsets:
    - name: stable
      labels:
        version: v1
    - name: canary
      labels:
        version: v2
```

```yaml
# istio/overlays/production/patches/authorization-policy-patch.yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: order-service
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/production/sa/api-gateway"
              - "cluster.local/ns/production/sa/web-frontend"
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/v1/*"]
```

## Building and Previewing

Preview what Kustomize generates before applying:

```bash
# Preview staging config
kubectl kustomize istio/overlays/staging/

# Preview production config
kubectl kustomize istio/overlays/production/

# Apply to staging
kubectl apply -k istio/overlays/staging/

# Apply to production
kubectl apply -k istio/overlays/production/
```

## Using Strategic Merge Patches

For more complex modifications, use strategic merge patches. This is the default patch strategy in Kustomize:

```yaml
# istio/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: production
patches:
  - target:
      group: networking.istio.io
      version: v1
      kind: VirtualService
      name: order-service
    patch: |
      - op: add
        path: /metadata/annotations
        value:
          external-dns.alpha.kubernetes.io/hostname: orders.example.com
      - op: replace
        path: /spec/http/0/timeout
        value: 30s
```

## Using JSON Patches for Precise Edits

When you need to modify specific array elements or deeply nested fields, JSON patches give you exact control:

```yaml
# istio/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: production
patches:
  - target:
      group: networking.istio.io
      version: v1
      kind: VirtualService
      name: order-service
    patch: |
      - op: replace
        path: /spec/http/0/retries/attempts
        value: 5
      - op: add
        path: /spec/http/0/fault
        value:
          delay:
            percentage:
              value: 0.1
            fixedDelay: 5s
```

## Adding Environment-Specific Resources

Some environments need resources that do not exist in the base. Add them directly in the overlay:

```yaml
# istio/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - gateway.yaml
  - rate-limit-envoyfilter.yaml
namespace: production
patches:
  - path: patches/virtual-service-patch.yaml
```

```yaml
# istio/overlays/production/gateway.yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: order-service-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: order-service-tls
      hosts:
        - orders.example.com
```

## Validating Kustomize Output

Add validation to your CI pipeline:

```bash
#!/bin/bash
ERRORS=0

for ENV in staging production; do
  echo "Validating $ENV..."

  # Build and validate
  OUTPUT=$(kubectl kustomize "istio/overlays/$ENV/" 2>&1)
  if [ $? -ne 0 ]; then
    echo "FAIL: Kustomize build failed for $ENV"
    echo "$OUTPUT"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Dry-run apply
  echo "$OUTPUT" | kubectl apply --dry-run=client -f - 2>&1
  if [ $? -ne 0 ]; then
    echo "FAIL: Dry-run apply failed for $ENV"
    ERRORS=$((ERRORS + 1))
  fi

  # Run istioctl analyze on the output
  echo "$OUTPUT" | istioctl analyze --use-kube=false -f - 2>&1
done

exit $ERRORS
```

Kustomize is a natural fit for Istio configuration management. It keeps your base configuration clean and makes environment differences explicit and reviewable. Combined with a GitOps tool like Argo CD or Flux that understands Kustomize natively, you get a solid workflow for managing Istio config across environments.
