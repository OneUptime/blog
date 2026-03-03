# How to Organize Istio Configuration Files

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Configuration, GitOps, Kubernetes, Best Practices

Description: Practical patterns for organizing Istio configuration files in a way that scales with your team and makes reviews and troubleshooting easier.

---

Once you get past a handful of Istio resources, file organization starts to matter a lot. I have seen repos where all Istio YAML files are dumped into a single directory with no naming convention. Finding the VirtualService for a specific service becomes a treasure hunt. When you need to review a change or roll something back, good organization saves you real time.

There is no single right way to organize Istio config files, but there are patterns that work well in practice. The right choice depends on your team size, the number of services, and how you deploy (Argo CD, Flux, plain kubectl, etc.).

## Pattern 1: Organize by Namespace

This is the most common pattern and works well for multi-team setups:

```text
istio-config/
  base/
    mesh-config.yaml
    peer-authentication.yaml
  namespaces/
    production/
      gateway.yaml
      virtual-services/
        order-service-vs.yaml
        payment-service-vs.yaml
        catalog-service-vs.yaml
      destination-rules/
        order-service-dr.yaml
        payment-service-dr.yaml
        catalog-service-dr.yaml
      authorization-policies/
        order-service-authz.yaml
        payment-service-authz.yaml
        default-deny.yaml
    staging/
      gateway.yaml
      virtual-services/
        order-service-vs.yaml
        payment-service-vs.yaml
      destination-rules/
        order-service-dr.yaml
        payment-service-dr.yaml
      authorization-policies/
        default-deny.yaml
```

Apply a specific namespace:

```bash
kubectl apply -f istio-config/namespaces/production/ -R
```

## Pattern 2: Organize by Service

When each team owns a set of services, group all Istio config for a service together:

```text
services/
  order-service/
    k8s/
      deployment.yaml
      service.yaml
    istio/
      virtual-service.yaml
      destination-rule.yaml
      authorization-policy.yaml
  payment-service/
    k8s/
      deployment.yaml
      service.yaml
    istio/
      virtual-service.yaml
      destination-rule.yaml
      authorization-policy.yaml
  shared/
    istio/
      gateway.yaml
      peer-authentication.yaml
      mesh-telemetry.yaml
```

This pattern works great when services are in separate repos or owned by different teams. Each team's Istio config lives right next to their application manifests.

## Pattern 3: Organize by Resource Type

For platform teams that manage all Istio config centrally:

```text
istio-config/
  gateways/
    production-gateway.yaml
    staging-gateway.yaml
  virtual-services/
    production/
      order-service.yaml
      payment-service.yaml
    staging/
      order-service.yaml
  destination-rules/
    production/
      order-service.yaml
      payment-service.yaml
    staging/
      order-service.yaml
  authorization-policies/
    mesh-wide/
      default-deny.yaml
    production/
      order-service.yaml
      payment-service.yaml
  peer-authentications/
    mesh-wide.yaml
    production.yaml
  telemetry/
    mesh-telemetry.yaml
    production-telemetry.yaml
```

## Naming Conventions

Consistent naming makes grep and find operations much easier. Here are conventions that work well:

```text
# Pattern: <service-name>-<resource-type-abbreviation>.yaml
order-service-vs.yaml        # VirtualService
order-service-dr.yaml        # DestinationRule
order-service-authz.yaml     # AuthorizationPolicy
order-service-pa.yaml        # PeerAuthentication
order-service-se.yaml        # ServiceEntry
order-service-sidecar.yaml   # Sidecar
```

Or use full names if abbreviations are not clear in your team:

```text
order-service-virtual-service.yaml
order-service-destination-rule.yaml
order-service-authorization-policy.yaml
```

## Separating Mesh-Wide vs Namespace Config

Always separate mesh-wide configuration (applied in `istio-system`) from namespace-level configuration:

```yaml
# base/peer-authentication.yaml
# This applies mesh-wide
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

```yaml
# base/mesh-telemetry.yaml
# This applies mesh-wide
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

Keep these in a `base/` or `mesh-wide/` directory that only the platform team can modify.

## One Resource Per File vs Multiple Resources

Putting one resource per file is generally better:

Pros:
- Cleaner git diffs
- Easier to find specific resources
- Can apply/delete individual resources
- Better for code review

The main exception is when resources are tightly coupled. For example, a VirtualService and its corresponding DestinationRule might belong together:

```yaml
# order-service-routing.yaml
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
---
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

## Using a README for Each Directory

Add a README to each directory explaining what is in it and who owns it:

```text
istio-config/namespaces/production/README.md

# Production Istio Configuration

Owner: Platform Team
Reviewers: @platform-team

This directory contains all Istio resources for the production namespace.

## Structure
- gateway.yaml - Ingress gateway configuration
- virtual-services/ - Traffic routing rules per service
- destination-rules/ - Load balancing and connection pool settings
- authorization-policies/ - Access control rules

## Deployment
Applied automatically via Argo CD. Do not apply manually.
```

## Integrating with Kustomize

Kustomize works well for managing environment-specific variations:

```text
istio-config/
  base/
    kustomization.yaml
    virtual-service.yaml
    destination-rule.yaml
    authorization-policy.yaml
  overlays/
    staging/
      kustomization.yaml
      virtual-service-patch.yaml
    production/
      kustomization.yaml
      virtual-service-patch.yaml
```

Base kustomization:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - virtual-service.yaml
  - destination-rule.yaml
  - authorization-policy.yaml
```

Production overlay:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - path: virtual-service-patch.yaml
namespace: production
```

```yaml
# overlays/production/virtual-service-patch.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service
spec:
  http:
    - timeout: 30s
      retries:
        attempts: 3
        perTryTimeout: 10s
      route:
        - destination:
            host: order-service
```

Build and apply:

```bash
kubectl apply -k istio-config/overlays/production/
```

## Validation in CI

Add a CI step that validates Istio config before merging:

```bash
#!/bin/bash
# validate-istio-config.sh

ERRORS=0

# Validate YAML syntax
for FILE in $(find istio-config -name "*.yaml" -type f); do
  if ! kubectl apply --dry-run=client -f "$FILE" 2>/dev/null; then
    echo "INVALID: $FILE"
    ERRORS=$((ERRORS + 1))
  fi
done

# Run istioctl analyze
istioctl analyze istio-config/ --recursive 2>&1
ANALYZE_EXIT=$?
if [ $ANALYZE_EXIT -ne 0 ]; then
  ERRORS=$((ERRORS + ANALYZE_EXIT))
fi

if [ $ERRORS -gt 0 ]; then
  echo "Validation failed with $ERRORS errors"
  exit 1
fi

echo "All Istio configuration is valid"
```

Good file organization is one of those investments that pays compound interest. The time you spend setting up a clear structure now saves exponentially more time as your mesh grows. Pick a pattern that matches how your teams work, enforce it with CI checks, and document it so new team members do not have to guess.
