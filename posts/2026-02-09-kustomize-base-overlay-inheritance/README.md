# How to implement Kustomize base and overlay inheritance patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Design Patterns

Description: Master Kustomize base and overlay inheritance patterns to build scalable, maintainable configuration hierarchies for complex multi-environment Kubernetes deployments.

---

The base and overlay pattern is fundamental to Kustomize's design, enabling configuration reuse across multiple environments while maintaining environment-specific customizations. Understanding how to structure these inheritance hierarchies effectively determines whether your Kustomize setup scales gracefully or becomes a maintenance burden.

Well-designed inheritance patterns keep configurations DRY (Don't Repeat Yourself) while making environment differences explicit and easy to understand. This balance is critical for teams managing deployments across development, staging, production, and multiple regions.

## Basic base and overlay structure

The simplest pattern has one base and multiple overlays:

```
myapp/
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
└── overlays/
    ├── development/
    │   └── kustomization.yaml
    ├── staging/
    │   └── kustomization.yaml
    └── production/
        └── kustomization.yaml
```

The base contains resources shared across all environments:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- service.yaml
- configmap.yaml

commonLabels:
  app: myapp
```

Each overlay references the base and applies environment-specific changes:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

namespace: production

replicas:
- name: myapp-deployment
  count: 10

images:
- name: myapp
  newTag: v2.1.0
```

This structure works well for simple applications with straightforward environment differences.

## Multi-layer inheritance for shared configurations

Complex deployments benefit from intermediate layers:

```
platform/
├── base/
│   └── common resources
├── shared/
│   ├── monitoring/
│   │   └── kustomization.yaml
│   └── security/
│       └── kustomization.yaml
└── environments/
    ├── dev/
    ├── staging/
    └── production/
```

The shared layer contains configurations used by multiple environments but not all:

```yaml
# shared/monitoring/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- servicemonitor.yaml
- prometheusrule.yaml

commonAnnotations:
  prometheus.io/scrape: "true"
```

Production includes monitoring while development might not:

```yaml
# environments/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base
- ../../shared/monitoring
- ../../shared/security

namespace: production
```

```yaml
# environments/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

namespace: dev
```

This pattern reduces duplication when some environments need additional resources.

## Component-based composition

Kustomize components provide optional, reusable functionality:

```
myapp/
├── base/
│   └── kustomization.yaml
├── components/
│   ├── tls/
│   │   ├── kustomization.yaml
│   │   └── patches.yaml
│   ├── high-availability/
│   │   ├── kustomization.yaml
│   │   └── patches.yaml
│   └── monitoring/
│       ├── kustomization.yaml
│       └── servicemonitor.yaml
└── overlays/
    └── production/
        └── kustomization.yaml
```

Components define optional features:

```yaml
# components/high-availability/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

patches:
- target:
    kind: Deployment
  patch: |-
    - op: add
      path: /spec/template/spec/affinity
      value:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - topologyKey: kubernetes.io/hostname
            labelSelector:
              matchLabels:
                app: myapp
```

Overlays selectively include components:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

components:
- ../../components/tls
- ../../components/high-availability
- ../../components/monitoring
```

Development skips these components, keeping the deployment simple.

## Regional deployment inheritance

Organize configurations by region with shared production settings:

```
infrastructure/
├── base/
├── production/
│   ├── shared/
│   │   └── kustomization.yaml
│   ├── us-east/
│   │   └── kustomization.yaml
│   ├── eu-west/
│   │   └── kustomization.yaml
│   └── ap-south/
│       └── kustomization.yaml
```

Shared production configurations apply to all regions:

```yaml
# production/shared/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

commonLabels:
  environment: production

replicas:
- name: myapp-deployment
  count: 5

patches:
- target:
    kind: Deployment
  patch: |-
    - op: add
      path: /spec/template/spec/containers/0/resources
      value:
        requests:
          cpu: "500m"
          memory: "1Gi"
```

Regional overlays add region-specific settings:

```yaml
# production/us-east/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../shared

namespace: prod-us-east

commonLabels:
  region: us-east

replicas:
- name: myapp-deployment
  count: 15  # Higher traffic in US East
```

This pattern scales to many regions while maintaining consistency through shared configuration.

## Application family inheritance

Related applications share common base configurations:

```
platform/
├── app-base/
│   ├── kustomization.yaml
│   └── common templates
├── api-service/
│   ├── base/
│   └── overlays/
├── worker-service/
│   ├── base/
│   └── overlays/
└── web-frontend/
    ├── base/
    └── overlays/
```

The app-base provides organization-wide standards:

```yaml
# app-base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- service.yaml

commonLabels:
  company: example-corp
  managed-by: platform-team

patches:
- target:
    kind: Deployment
  patch: |-
    - op: add
      path: /spec/template/spec/securityContext
      value:
        runAsNonRoot: true
        runAsUser: 1000
```

Individual applications extend the app-base:

```yaml
# api-service/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../app-base

commonLabels:
  app: api-service

resources:
- api-specific-resources.yaml
```

Changes to app-base propagate to all applications automatically.

## Patch inheritance and composition

Patches apply in order from base to overlay, allowing refinement:

```yaml
# base/kustomization.yaml
patches:
- target:
    kind: Deployment
  patch: |-
    - op: add
      path: /spec/template/spec/containers/0/resources
      value:
        requests:
          cpu: "100m"
          memory: "128Mi"
```

```yaml
# overlays/production/kustomization.yaml
bases:
- ../../base

patches:
- target:
    kind: Deployment
  patch: |-
    - op: replace
      path: /spec/template/spec/containers/0/resources/requests/cpu
      value: "500m"
    - op: replace
      path: /spec/template/spec/containers/0/resources/requests/memory
      value: "1Gi"
```

The base sets defaults and production overrides specific values. Both patches apply, with production values taking precedence.

## Generator inheritance

Generators compose across inheritance layers:

```yaml
# base/kustomization.yaml
configMapGenerator:
- name: app-config
  literals:
  - LOG_LEVEL=info
  - CACHE_ENABLED=true
```

```yaml
# overlays/production/kustomization.yaml
bases:
- ../../base

configMapGenerator:
- name: app-config
  behavior: merge
  literals:
  - LOG_LEVEL=warn  # Override base value
  - METRICS_ENABLED=true  # Add new value
```

The merge behavior combines generators, with overlay values overriding base values for matching keys.

## Avoiding inheritance anti-patterns

Deep inheritance hierarchies become difficult to understand:

```
# Anti-pattern: Too many layers
base -> shared -> environment-base -> region-base -> cluster -> overlay
```

Keep hierarchies shallow. Three levels (base -> shared -> overlay) usually suffice:

```
# Better: Flatter structure
base -> production-shared -> us-east-overlay
```

Avoid circular dependencies between bases. Each base should have a clear parent relationship without loops.

Don't use bases as a template system. Kustomize is not a templating engine. Keep bases simple and use overlays for variations.

## Testing inheritance chains

Validate that overlays produce expected results:

```bash
#!/bin/bash
# test-overlays.sh

EXPECTED_REPLICAS=(
  "dev:1"
  "staging:3"
  "production:10"
)

for entry in "${EXPECTED_REPLICAS[@]}"; do
  IFS=: read env replicas <<< "$entry"

  actual=$(kustomize build overlays/$env | \
    yq eval '.spec.replicas' - | \
    grep -v null | \
    head -1)

  if [ "$actual" == "$replicas" ]; then
    echo "✓ $env has expected replicas: $replicas"
  else
    echo "✗ $env has $actual replicas, expected $replicas"
    exit 1
  fi
done
```

Run tests in CI to catch inheritance issues early.

## Documentation for complex hierarchies

Document inheritance relationships:

```yaml
# overlays/production/kustomization.yaml
# Inheritance chain:
# 1. base/ - Shared application resources
# 2. shared/monitoring/ - Common monitoring setup
# 3. production/shared/ - Prod defaults (5 replicas, resource limits)
# 4. production/us-east/ (this file) - Region-specific overrides

apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../shared
```

Clear documentation helps others understand why configurations are structured as they are.

## Migrating from flat to hierarchical structure

When scaling from flat structure to hierarchies, migrate incrementally:

```bash
# Step 1: Create base from existing production
mkdir -p base
cp overlays/production/*.yaml base/

# Step 2: Create new production overlay referencing base
cat > overlays/production/kustomization.yaml <<EOF
bases:
- ../../base
# Production-specific overrides here
EOF

# Step 3: Test
kustomize build overlays/production

# Step 4: Repeat for other environments
```

Verify each environment independently before committing changes.

## Best practices for inheritance

Keep bases generic and overlays specific. Bases should contain resources that work in any environment. Overlays add environment-specific values.

Use components for optional features rather than creating separate bases. Components compose better and avoid duplication.

Limit inheritance depth to three levels. Deeper hierarchies become difficult to debug and understand.

Make inheritance relationships explicit through clear directory names and documentation. Future maintainers should easily understand the structure.

Test overlay outputs thoroughly. Inheritance can produce unexpected results if patches conflict or apply in unintended order.

## Conclusion

Well-designed Kustomize base and overlay inheritance patterns enable scalable, maintainable configuration management across complex Kubernetes deployments. By keeping bases generic, using appropriate inheritance depth, and leveraging components for optional functionality, you create configurations that are both DRY and understandable.

The key is finding the right balance between reuse and clarity. Too little reuse leads to duplication, while excessive abstraction through deep hierarchies creates confusion. Start simple with single-level inheritance and add layers only when clear benefits emerge. This pragmatic approach ensures your Kustomize configurations scale as your infrastructure grows while remaining accessible to your entire team.
