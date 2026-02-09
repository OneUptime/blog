# How to implement ArgoCD with Kustomize components for dynamic configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Kustomize, Kubernetes, GitOps, Configuration

Description: Learn how to use ArgoCD with Kustomize components to create reusable, composable configuration modules that enable dynamic feature toggling and environment-specific customizations in Kubernetes deployments.

---

Kustomize components provide a way to create reusable configuration pieces that you can selectively include in your deployments. Unlike bases and overlays, components let you compose features dynamically, enabling clean separation of concerns and flexible environment configurations. This guide shows you how to leverage Kustomize components with ArgoCD for sophisticated deployment patterns.

## Understanding Kustomize Components

Kustomize components differ from traditional base-overlay patterns. While bases and overlays create inheritance hierarchies, components act as optional, composable building blocks. You can mix multiple components into a single overlay, enabling feature flags and modular configurations.

A component contains partial Kustomize configurations that you can include in multiple places without creating tight coupling or inheritance chains.

## Basic Component Structure

Create a simple component for monitoring integration:

```yaml
# components/monitoring/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

# Resources to add when this component is enabled
resources:
  - servicemonitor.yaml

# Patches to apply
patches:
  - path: prometheus-annotations.yaml
    target:
      kind: Deployment

# ConfigMap generator for monitoring config
configMapGenerator:
  - name: monitoring-config
    literals:
      - metrics.enabled=true
      - metrics.port=9090
```

The component adds a ServiceMonitor, patches deployments with Prometheus annotations, and generates monitoring configuration.

Create the ServiceMonitor resource:

```yaml
# components/monitoring/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: app-metrics
spec:
  selector:
    matchLabels:
      app: demo
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

Add the Prometheus annotations patch:

```yaml
# components/monitoring/prometheus-annotations.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: not-important
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
```

## Using Components in Overlays

Include components selectively in environment overlays:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Reference the base application
resources:
  - ../../base

# Include components for production
components:
  - ../../components/monitoring
  - ../../components/security
  - ../../components/backup

# Production-specific patches
patches:
  - path: replica-count.yaml
  - path: resource-limits.yaml

# Production namespace
namespace: production
```

Development might exclude expensive components:

```yaml
# overlays/development/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

# Only include monitoring, skip security and backup
components:
  - ../../components/monitoring

namespace: development

# Development-specific patches
patches:
  - path: debug-mode.yaml
```

This approach lets you share components across environments while maintaining flexibility.

## Creating a Security Component

Build a component that adds security features:

```yaml
# components/security/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

resources:
  - networkpolicy.yaml
  - podsecuritypolicy.yaml

# Patch deployments with security context
patches:
  - path: security-context.yaml
    target:
      kind: Deployment

# Add security-related labels
commonLabels:
  security.enabled: "true"
```

Define the security context patch:

```yaml
# components/security/security-context.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: not-important
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: app
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
```

Add a network policy:

```yaml
# components/security/networkpolicy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-network-policy
spec:
  podSelector:
    matchLabels:
      app: demo
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 5432
```

## ArgoCD Application with Components

Configure ArgoCD to deploy an application using Kustomize components:

```yaml
# argocd-app-with-components.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: demo-app-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/manifests
    targetRevision: main
    path: overlays/production  # Points to overlay that includes components
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

ArgoCD automatically detects and processes Kustomize components when building manifests from the specified path.

## Feature Flag Component

Create a component that toggles features based on configuration:

```yaml
# components/feature-flags/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

configMapGenerator:
  - name: feature-flags
    literals:
      - FEATURE_NEW_UI=true
      - FEATURE_BETA_API=true
      - FEATURE_ADVANCED_ANALYTICS=false

patches:
  - path: feature-env.yaml
    target:
      kind: Deployment
```

Inject feature flags as environment variables:

```yaml
# components/feature-flags/feature-env.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: not-important
spec:
  template:
    spec:
      containers:
        - name: app
          envFrom:
            - configMapRef:
                name: feature-flags
```

Different environments can enable different features by including or excluding this component, or by creating environment-specific variants.

## Database Migration Component

Build a component that adds database migration resources:

```yaml
# components/database-migration/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

resources:
  - migration-job.yaml
  - migration-sa.yaml

# Add migration-related annotations
commonAnnotations:
  migration.enabled: "true"
```

Define the migration job:

```yaml
# components/database-migration/migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      serviceAccountName: migration-sa
      restartPolicy: Never
      containers:
        - name: migrate
          image: migrate/migrate:v4.15.2
          command:
            - sh
            - -c
            - |
              migrate -path /migrations \
                -database "$DATABASE_URL" \
                up
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: url
          volumeMounts:
            - name: migrations
              mountPath: /migrations
      volumes:
        - name: migrations
          configMap:
            name: database-migrations
```

Include this component only in environments where you manage database migrations through Kubernetes.

## Observability Component

Create a comprehensive observability component:

```yaml
# components/observability/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

resources:
  - servicemonitor.yaml
  - grafana-dashboard.yaml
  - alertrules.yaml

patches:
  - path: logging-sidecar.yaml
    target:
      kind: Deployment
  - path: tracing-config.yaml
    target:
      kind: Deployment

configMapGenerator:
  - name: observability-config
    files:
      - otel-config.yaml
```

Add a logging sidecar:

```yaml
# components/observability/logging-sidecar.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: not-important
spec:
  template:
    spec:
      containers:
        - name: log-shipper
          image: fluent/fluent-bit:2.0
          volumeMounts:
            - name: varlog
              mountPath: /var/log
            - name: config
              mountPath: /fluent-bit/etc/
      volumes:
        - name: varlog
          emptyDir: {}
        - name: config
          configMap:
            name: fluent-bit-config
```

This component bundles all observability concerns into a single, reusable module.

## Multi-Component Composition

Combine multiple components for complex scenarios:

```yaml
# overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

# Stack multiple components
components:
  - ../../components/monitoring
  - ../../components/security
  - ../../components/feature-flags
  - ../../components/observability
  # Exclude database-migration for staging
  # Exclude backup for staging

namespace: staging

# Staging-specific overrides
patches:
  - path: staging-replicas.yaml
  - path: staging-resources.yaml

configMapGenerator:
  - name: environment-config
    literals:
      - ENVIRONMENT=staging
      - LOG_LEVEL=debug
```

Components compose cleanly without conflicts, unlike traditional overlay hierarchies.

## ArgoCD ApplicationSet with Components

Use ApplicationSets to deploy multiple environments with different component combinations:

```yaml
# applicationset-with-components.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: multi-env-app
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: development
            components: "monitoring"
          - env: staging
            components: "monitoring,security,observability"
          - env: production
            components: "monitoring,security,observability,backup"
  template:
    metadata:
      name: 'demo-app-{{env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/your-org/manifests
        targetRevision: main
        path: 'overlays/{{env}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{env}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

Each environment automatically gets the appropriate component set based on the generator configuration.

## Testing Component Configurations

Test component combinations locally before deploying:

```bash
# Build with all components
kustomize build overlays/production > production-manifests.yaml

# Verify resources
kubectl apply --dry-run=client -f production-manifests.yaml

# Compare development vs production
diff <(kustomize build overlays/development) \
     <(kustomize build overlays/production)

# Validate with ArgoCD
argocd app diff demo-app-production \
  --local overlays/production
```

This ensures component compositions produce expected results before syncing to clusters.

## Component Versioning Strategy

Organize components with versioning for controlled rollouts:

```
components/
├── monitoring/
│   ├── v1/
│   │   └── kustomization.yaml
│   └── v2/
│       └── kustomization.yaml
├── security/
│   └── v1/
│       └── kustomization.yaml
└── observability/
    └── v1/
        └── kustomization.yaml
```

Reference specific versions in overlays:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

components:
  - ../../components/monitoring/v2      # Use newer monitoring
  - ../../components/security/v1        # Keep stable security
  - ../../components/observability/v1
```

This approach enables gradual component upgrades across environments.

## Conditional Component Loading

Create wrapper overlays that conditionally include components:

```yaml
# overlays/production-with-backup/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../production  # Inherit production overlay

components:
  - ../../components/backup  # Add backup on top
```

Use separate ArgoCD applications for different component combinations:

```yaml
# Standard production
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: app-production
spec:
  source:
    path: overlays/production
---
# Production with backup (for critical services)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: critical-app-production
spec:
  source:
    path: overlays/production-with-backup
```

## Best Practices

Keep components focused on single concerns. A monitoring component should only handle monitoring resources and configurations.

Design components to be order-independent. Components should work regardless of inclusion order.

Use descriptive component names that clearly indicate their purpose: observability, security-hardened, database-migration.

Test component combinations thoroughly. Not all components may work together without conflicts.

Document component dependencies. If a component requires another component, document this clearly.

Version components when making breaking changes. This allows gradual adoption across environments.

Avoid deep component hierarchies. Components should not include other components; keep the structure flat.

Use components for cross-cutting concerns like monitoring, security, and backups. Use overlays for environment-specific configurations.

## Conclusion

Kustomize components with ArgoCD provide powerful composition capabilities for Kubernetes configurations. By creating reusable, optional configuration modules, you build flexible deployment systems that adapt to different environments and requirements. Components eliminate configuration duplication while maintaining clear separation of concerns, making your GitOps repository more maintainable and your deployment patterns more sophisticated. This composable approach scales from simple applications to complex multi-environment deployments with diverse feature requirements.
