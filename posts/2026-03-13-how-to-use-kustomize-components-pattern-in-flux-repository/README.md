# How to Use Kustomize Components Pattern in Flux Repository

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Kustomize, Components, Repository Structure, DRY Patterns

Description: Learn how to use Kustomize components in your Flux repository to create reusable, composable configuration fragments that can be selectively applied across environments.

---

## What Are Kustomize Components

Kustomize components are reusable pieces of configuration that can be selectively included in different overlays. Unlike bases which define complete resources, components define modifications (patches, transformers, generators) that can be mixed and matched. This is ideal for optional features like monitoring sidecars, debug configurations, or security policies that only apply to certain environments.

## Repository Structure

```
flux-repo/
├── clusters/
│   ├── staging/
│   │   └── apps.yaml
│   └── production/
│       └── apps.yaml
├── base/
│   └── web-app/
│       ├── kustomization.yaml
│       ├── deployment.yaml
│       └── service.yaml
├── components/
│   ├── debug-logging/
│   │   └── kustomization.yaml
│   ├── prometheus-sidecar/
│   │   └── kustomization.yaml
│   ├── resource-limits-high/
│   │   └── kustomization.yaml
│   ├── network-policy/
│   │   └── kustomization.yaml
│   └── pod-disruption-budget/
│       └── kustomization.yaml
└── environments/
    ├── staging/
    │   └── kustomization.yaml
    └── production/
        └── kustomization.yaml
```

## Defining a Component

A component uses `kind: Component` instead of `kind: Kustomization`:

```yaml
# components/prometheus-sidecar/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component
patches:
  - target:
      kind: Deployment
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: not-used
      spec:
        template:
          metadata:
            annotations:
              prometheus.io/scrape: "true"
              prometheus.io/port: "9090"
          spec:
            containers:
              - name: prometheus-exporter
                image: prom/node-exporter:v1.7.0
                ports:
                  - containerPort: 9090
                    name: metrics
                resources:
                  requests:
                    cpu: 10m
                    memory: 32Mi
                  limits:
                    cpu: 50m
                    memory: 64Mi
```

```yaml
# components/debug-logging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component
patches:
  - target:
      kind: Deployment
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: not-used
      spec:
        template:
          spec:
            containers:
              - name: app
                env:
                  - name: LOG_LEVEL
                    value: debug
                  - name: DEBUG
                    value: "true"
```

```yaml
# components/resource-limits-high/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component
patches:
  - target:
      kind: Deployment
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: not-used
      spec:
        template:
          spec:
            containers:
              - name: app
                resources:
                  requests:
                    cpu: 500m
                    memory: 512Mi
                  limits:
                    cpu: "2"
                    memory: 2Gi
```

```yaml
# components/network-policy/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component
resources:
  - network-policy.yaml
```

```yaml
# components/pod-disruption-budget/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component
resources:
  - pdb.yaml
```

## Composing Components in Overlays

Staging uses debug logging but skips the network policy and PDB:

```yaml
# environments/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/web-app
components:
  - ../../components/debug-logging
  - ../../components/prometheus-sidecar
images:
  - name: myregistry/web-app
    newTag: staging-latest
```

Production uses high resource limits, network policies, and PDBs but skips debug logging:

```yaml
# environments/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/web-app
components:
  - ../../components/resource-limits-high
  - ../../components/prometheus-sidecar
  - ../../components/network-policy
  - ../../components/pod-disruption-budget
images:
  - name: myregistry/web-app
    newTag: v2.1.0
```

## Components vs Bases vs Patches

Understanding when to use each approach:

- **Bases**: Use for complete resource definitions shared across environments. Every environment includes them.
- **Components**: Use for optional, composable features. Different environments can pick different components.
- **Patches**: Use for small, environment-specific adjustments applied inline in the overlay.

Components are ideal when you have features that are needed in some environments but not others, or when the same modification needs to be applied to multiple different bases.

## Flux Kustomization Integration

Point Flux at the environment overlays:

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 1h
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./environments/production
  prune: true
```

## Validating Component Composition

Verify what gets generated by each environment:

```bash
# See what staging renders
kustomize build environments/staging

# See what production renders
kustomize build environments/production

# Compare the two
diff <(kustomize build environments/staging) \
     <(kustomize build environments/production)
```

## Conclusion

Kustomize components provide a powerful way to create reusable, composable configuration fragments in your Flux repository. They allow you to build a library of optional features that can be mixed and matched across environments, reducing duplication and making it easy to add or remove capabilities without modifying base resource definitions. This pattern works naturally with Flux, as each environment overlay can include exactly the components it needs.
