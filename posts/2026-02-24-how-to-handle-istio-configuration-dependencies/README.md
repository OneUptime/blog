# How to Handle Istio Configuration Dependencies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Configuration, Dependencies, Kubernetes, GitOps

Description: How to manage dependencies between Istio configuration resources to prevent ordering issues and broken configurations during deployments.

---

Istio resources do not exist in isolation. A VirtualService might reference a Gateway that has not been created yet. A DestinationRule might define subsets for a deployment that does not exist. An AuthorizationPolicy might reference a service account that was just renamed. These dependencies between resources create ordering problems during deployment and can leave your mesh in a broken state if not handled carefully.

Understanding which resources depend on which is the first step. Then you need a deployment strategy that respects those dependencies.

## Common Dependency Chains

Here are the most common dependency relationships in Istio:

**VirtualService depends on:**
- Gateway (if using `gateways` field)
- DestinationRule subsets (if using `subset` in routes)
- The actual Kubernetes Service and Deployment

**DestinationRule depends on:**
- The Kubernetes Service it targets
- Deployments with matching labels (for subsets)

**AuthorizationPolicy depends on:**
- The workload it selects (via `selector`)
- Service accounts referenced in `principals`

**RequestAuthentication depends on:**
- The JWKS endpoint being reachable
- The workload it selects

**Gateway depends on:**
- TLS secrets referenced in `credentialName`
- The ingress gateway deployment

## Deploying in the Right Order

When deploying from scratch, apply resources in this order:

```bash
#!/bin/bash
NAMESPACE="production"

echo "Step 1: Namespace and core resources"
kubectl apply -f namespace.yaml

echo "Step 2: PeerAuthentication (mesh-wide mTLS)"
kubectl apply -f istio-config/base/peer-authentication.yaml

echo "Step 3: Secrets (TLS certs, etc.)"
kubectl apply -f istio-config/secrets/

echo "Step 4: Gateways"
kubectl apply -f istio-config/$NAMESPACE/gateways/

echo "Step 5: DestinationRules (create subsets before VirtualServices reference them)"
kubectl apply -f istio-config/$NAMESPACE/destination-rules/

echo "Step 6: VirtualServices"
kubectl apply -f istio-config/$NAMESPACE/virtual-services/

echo "Step 7: AuthorizationPolicies"
kubectl apply -f istio-config/$NAMESPACE/authorization-policies/

echo "Step 8: Telemetry"
kubectl apply -f istio-config/$NAMESPACE/telemetry/
```

## The DestinationRule-Before-VirtualService Rule

This is the most common source of deployment issues. If a VirtualService references a subset that is not defined yet in a DestinationRule, Istio will route traffic to a non-existent subset, causing 503 errors.

Bad order (VirtualService first):

```yaml
# Applied first - references subset "canary" that does not exist yet
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
    - order-service
  http:
    - route:
        - destination:
            host: order-service
            subset: stable
          weight: 90
        - destination:
            host: order-service
            subset: canary
          weight: 10
```

```yaml
# Applied second - too late, traffic was already failing
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: order-service
  namespace: production
spec:
  host: order-service
  subsets:
    - name: stable
      labels:
        version: v1
    - name: canary
      labels:
        version: v2
```

Good order: always apply DestinationRules before VirtualServices.

## Using Argo CD Sync Waves

Argo CD supports sync waves that control the order of resource application:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  mtls:
    mode: STRICT
---
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "2"
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
        credentialName: production-tls
      hosts:
        - "*.example.com"
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: order-service
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "3"
spec:
  host: order-service
  subsets:
    - name: stable
      labels:
        version: v1
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "4"
spec:
  hosts:
    - order-service
  gateways:
    - main-gateway
  http:
    - route:
        - destination:
            host: order-service
            subset: stable
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: order-service
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "5"
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
```

Resources in lower sync waves are applied and synced before resources in higher waves.

## Using Flux Dependencies

Flux supports explicit dependencies between Kustomizations:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio-base
  namespace: flux-system
spec:
  interval: 5m
  path: ./istio-config/base
  prune: true
  sourceRef:
    kind: GitRepository
    name: istio-config
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio-gateways
  namespace: flux-system
spec:
  interval: 5m
  path: ./istio-config/production/gateways
  prune: true
  sourceRef:
    kind: GitRepository
    name: istio-config
  dependsOn:
    - name: istio-base
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio-routing
  namespace: flux-system
spec:
  interval: 5m
  path: ./istio-config/production/routing
  prune: true
  sourceRef:
    kind: GitRepository
    name: istio-config
  dependsOn:
    - name: istio-gateways
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio-security
  namespace: flux-system
spec:
  interval: 5m
  path: ./istio-config/production/security
  prune: true
  sourceRef:
    kind: GitRepository
    name: istio-config
  dependsOn:
    - name: istio-routing
```

## Handling Circular Dependencies

Occasionally you run into circular dependencies. For example, service A's AuthorizationPolicy allows traffic from service B, and service B's AuthorizationPolicy allows traffic from service A. Both need to exist before either can work.

The solution is to apply both AuthorizationPolicies at the same time:

```bash
kubectl apply -f service-a-authz.yaml -f service-b-authz.yaml
```

Or combine them in a single file to ensure atomic application.

## Detecting Missing Dependencies

Build a validation script that checks for missing dependencies before deployment:

```bash
#!/bin/bash
ERRORS=0

# Check that VirtualService gateway references exist
for VS_FILE in $(find istio-config -name "*virtual-service*" -o -name "*vs*"); do
  GATEWAYS=$(yq eval '.spec.gateways[]' "$VS_FILE" 2>/dev/null)
  for GW in $GATEWAYS; do
    if [ "$GW" = "mesh" ]; then continue; fi
    GW_FILE=$(find istio-config -name "*.yaml" -exec grep -l "kind: Gateway" {} \; | \
      xargs grep -l "name: $GW" 2>/dev/null)
    if [ -z "$GW_FILE" ]; then
      echo "ERROR: VirtualService in $VS_FILE references Gateway '$GW' which does not exist"
      ERRORS=$((ERRORS + 1))
    fi
  done
done

# Check that VirtualService subset references have matching DestinationRules
for VS_FILE in $(find istio-config -name "*virtual-service*" -o -name "*vs*"); do
  SUBSETS=$(yq eval '.. | select(has("subset")) | .subset' "$VS_FILE" 2>/dev/null)
  HOST=$(yq eval '.spec.http[0].route[0].destination.host' "$VS_FILE" 2>/dev/null)
  for SUBSET in $SUBSETS; do
    DR_FILE=$(find istio-config -name "*.yaml" -exec grep -l "kind: DestinationRule" {} \; | \
      xargs grep -l "name: $SUBSET" 2>/dev/null)
    if [ -z "$DR_FILE" ]; then
      echo "WARNING: VirtualService $VS_FILE uses subset '$SUBSET' - verify DestinationRule exists"
    fi
  done
done

if [ $ERRORS -gt 0 ]; then
  echo "Found $ERRORS dependency errors"
  exit 1
fi

echo "All dependency checks passed"
```

## Handling Delete Order

Deletion is the reverse of creation. Remove dependent resources first:

```bash
#!/bin/bash
NAMESPACE="production"

echo "Step 1: Remove AuthorizationPolicies"
kubectl delete -f istio-config/$NAMESPACE/authorization-policies/ --ignore-not-found

echo "Step 2: Remove VirtualServices"
kubectl delete -f istio-config/$NAMESPACE/virtual-services/ --ignore-not-found

echo "Step 3: Remove DestinationRules"
kubectl delete -f istio-config/$NAMESPACE/destination-rules/ --ignore-not-found

echo "Step 4: Remove Gateways"
kubectl delete -f istio-config/$NAMESPACE/gateways/ --ignore-not-found

echo "Step 5: Remove PeerAuthentication"
kubectl delete -f istio-config/base/peer-authentication.yaml --ignore-not-found
```

Deleting a Gateway before deleting the VirtualServices that reference it can cause brief routing confusion. The VirtualServices will still exist but reference a gateway that is gone, potentially causing traffic to be dropped.

Dependencies in Istio configuration are a real concern that many teams only discover during their first incident. By documenting the dependency chain, automating ordered deployment, and validating dependencies in CI, you prevent a whole class of deployment-related outages. The extra structure is worth the effort.
