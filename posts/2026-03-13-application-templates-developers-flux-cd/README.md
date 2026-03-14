# How to Create Application Templates for Developers with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Platform Engineering, Kustomize, Application Templates

Description: Create reusable application templates for developers using Flux CD Kustomizations so teams can bootstrap new services without writing Kubernetes manifests from scratch.

---

## Introduction

One of the most common complaints from developers working with Kubernetes is the amount of boilerplate they must write before deploying a service. Deployments, Services, Ingresses, HorizontalPodAutoscalers, ServiceMonitors — the list grows quickly. Platform engineering teams solve this by providing application templates: curated, opinionated starting points that encode organizational best practices.

Flux CD's Kustomize integration makes it straightforward to build a template library. Developers reference a base template from the platform repository, provide a handful of values through Kustomize patches, and Flux reconciles the rest. The platform team updates templates centrally, and all applications that reference them pick up improvements automatically.

In this guide you will build a layered template system with a generic web application base, environment-specific overlays, and a developer workflow that requires minimal Kubernetes knowledge.

## Prerequisites

- Flux CD v2 bootstrapped into your cluster
- A platform Git repository with source of truth manifests
- Developers have access to submit PRs to a team application repository
- kubectl and the Flux CLI installed

## Step 1: Design the Template Directory Structure

Organize templates in a dedicated directory within the platform repository.

```
platform-gitops/
└── templates/
    ├── web-app/
    │   ├── base/
    │   │   ├── kustomization.yaml
    │   │   ├── deployment.yaml
    │   │   ├── service.yaml
    │   │   ├── hpa.yaml
    │   │   └── ingress.yaml
    │   └── overlays/
    │       ├── dev/
    │       └── production/
    ├── worker/
    │   └── base/
    └── cronjob/
        └── base/
```

## Step 2: Build the Web App Base Template

```yaml
# templates/web-app/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app           # Overridden by developer patch
  labels:
    app: app
    version: latest
spec:
  replicas: 2
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
        version: latest
    spec:
      containers:
        - name: app
          image: nginx:latest   # Overridden by developer patch
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
```

```yaml
# templates/web-app/base/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

```yaml
# templates/web-app/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - hpa.yaml
  - ingress.yaml
```

## Step 3: Create Environment Overlays

```yaml
# templates/web-app/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - patch: |-
      - op: replace
        path: /spec/replicas
        value: 3
      - op: replace
        path: /spec/template/spec/containers/0/resources/requests/memory
        value: 256Mi
    target:
      kind: Deployment
  - patch: |-
      - op: replace
        path: /spec/minReplicas
        value: 3
      - op: replace
        path: /spec/maxReplicas
        value: 20
    target:
      kind: HorizontalPodAutoscaler
```

## Step 4: Developer Application Overlay

Developers create a thin overlay in their team repository referencing the platform template base.

```yaml
# team-alpha-apps/deploy/my-service/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  # Reference the platform template via remote URL
  - https://github.com/acme/platform-gitops//templates/web-app/overlays/production?ref=v1.3.0
patches:
  - patch: |-
      - op: replace
        path: /metadata/name
        value: my-service
      - op: replace
        path: /spec/template/spec/containers/0/image
        value: ghcr.io/acme/my-service:v2.1.0
      - op: replace
        path: /spec/template/spec/containers/0/name
        value: my-service
    target:
      kind: Deployment
  - patch: |-
      - op: replace
        path: /spec/rules/0/host
        value: my-service.acme.example.com
    target:
      kind: Ingress
namePrefix: ""
namespace: team-alpha
```

## Step 5: Wire the Flux Kustomization

The team's Flux Kustomization points at their deploy directory, which now references the platform template.

```yaml
# tenants/overlays/team-alpha/kustomization-my-service.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha-my-service
  namespace: team-alpha
spec:
  interval: 5m
  path: ./deploy/my-service
  prune: true
  sourceRef:
    kind: GitRepository
    name: team-alpha-apps
  targetNamespace: team-alpha
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: team-alpha-vars   # Team-specific variable substitutions
```

## Step 6: Version and Release Templates

Tag template versions so teams can pin to a stable release and opt in to upgrades.

```bash
# Platform team releases a new template version
git tag -a v1.4.0 -m "web-app: add PodDisruptionBudget to base template"
git push origin v1.4.0

# Teams update their kustomization.yaml reference
# From: ?ref=v1.3.0
# To:   ?ref=v1.4.0
# Then open a PR — Flux picks it up on merge
```

## Best Practices

- Pin template references to Git tags, not branches, to prevent unexpected updates
- Provide a changelog for template versions so developers understand what changed
- Use `namePrefix` or `nameSuffix` in templates to avoid naming collisions
- Include default `PodDisruptionBudget` resources in production overlays
- Validate templates with `kustomize build` in CI before merging platform changes
- Document which fields developers are expected to patch versus which are managed by the platform

## Conclusion

Application templates combined with Flux CD remove the majority of Kubernetes complexity from developers while keeping platform teams in control of organizational defaults. Developers reference a versioned template, apply a handful of patches for their service-specific values, and merge a PR — Flux handles everything else. As your platform matures, templates become the primary lever for rolling out operational improvements across every team simultaneously.
