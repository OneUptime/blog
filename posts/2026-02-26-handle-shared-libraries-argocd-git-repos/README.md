# How to Handle Shared Libraries in ArgoCD Git Repos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Shared Libraries, Kustomize

Description: Learn how to share common Kubernetes manifests and Helm charts across ArgoCD-managed repositories without duplicating configuration.

---

Every organization eventually has Kubernetes configuration that should be shared across services - monitoring dashboards, network policies, security contexts, resource templates. Without a strategy for sharing, teams copy-paste YAML between repos, and configurations drift apart over time. Here is how to build shared libraries that work well with ArgoCD.

## The Duplication Problem

Imagine you have 30 services, each with their own config repo. Every service needs:

- A ServiceMonitor for Prometheus scraping
- A NetworkPolicy with standard ingress rules
- Pod security contexts
- Standard labels and annotations
- Resource request/limit templates

Without shared libraries, you have 30 copies of each configuration. When you need to update the Prometheus scraping interval, you update 30 repos. When you add a new security header, 30 PRs. This does not scale.

## Approach 1: Kustomize Remote Bases

The simplest approach is Kustomize remote bases. You point directly at a remote Git repository in your kustomization.yaml:

```yaml
# service-config/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  # Remote shared resources pinned to a specific version
  - https://github.com/myorg/shared-k8s-configs//monitoring/service-monitor?ref=v1.5.0
  - https://github.com/myorg/shared-k8s-configs//network-policies/standard?ref=v1.5.0
```

The double-slash (`//`) separates the repo URL from the path within the repo. The `ref` parameter pins to a Git tag.

The shared repo structure:

```text
shared-k8s-configs/
├── monitoring/
│   └── service-monitor/
│       ├── kustomization.yaml
│       └── service-monitor.yaml
├── network-policies/
│   └── standard/
│       ├── kustomization.yaml
│       └── network-policy.yaml
├── security/
│   └── pod-security/
│       ├── kustomization.yaml
│       └── security-context.yaml
└── templates/
    └── web-service/
        ├── kustomization.yaml
        ├── deployment.yaml
        ├── service.yaml
        └── hpa.yaml
```

A shared ServiceMonitor template:

```yaml
# shared-k8s-configs/monitoring/service-monitor/service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: service-monitor
  labels:
    monitoring: enabled
spec:
  selector:
    matchLabels:
      monitoring: enabled
  endpoints:
    - port: http
      interval: 30s
      path: /metrics
  namespaceSelector:
    matchNames:
      - default  # Overridden by consuming services
```

Services customize the shared resource using Kustomize patches:

```yaml
# service-config/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

patches:
  # Customize the shared ServiceMonitor for this service
  - target:
      kind: ServiceMonitor
      name: service-monitor
    patch: |
      - op: replace
        path: /metadata/name
        value: backend-api-monitor
      - op: replace
        path: /spec/selector/matchLabels/app.kubernetes.io~1name
        value: backend-api
      - op: replace
        path: /spec/namespaceSelector/matchNames/0
        value: production
```

## Approach 2: Shared Helm Library Charts

Helm library charts define reusable templates that other charts include as dependencies. Unlike regular Helm charts, library charts cannot be deployed directly - they only provide template functions.

Create the library chart:

```yaml
# shared-helm-lib/Chart.yaml
apiVersion: v2
name: shared-lib
description: Shared Kubernetes resource templates
version: 1.5.0
type: library  # This makes it a library chart
```

Define reusable templates:

```yaml
# shared-helm-lib/templates/_deployment.tpl
{{- define "shared-lib.deployment" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.name }}
  labels:
    app.kubernetes.io/name: {{ .Values.name }}
    app.kubernetes.io/managed-by: argocd
spec:
  replicas: {{ .Values.replicas | default 1 }}
  selector:
    matchLabels:
      app.kubernetes.io/name: {{ .Values.name }}
  template:
    metadata:
      labels:
        app.kubernetes.io/name: {{ .Values.name }}
    spec:
      securityContext:
        runAsNonRoot: true
        fsGroup: 1000
      containers:
        - name: {{ .Values.name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports:
            - containerPort: {{ .Values.port | default 8080 }}
          resources:
            requests:
              cpu: {{ .Values.resources.requests.cpu | default "100m" }}
              memory: {{ .Values.resources.requests.memory | default "128Mi" }}
            limits:
              cpu: {{ .Values.resources.limits.cpu | default "500m" }}
              memory: {{ .Values.resources.limits.memory | default "512Mi" }}
          readinessProbe:
            httpGet:
              path: {{ .Values.healthCheck.path | default "/healthz" }}
              port: {{ .Values.port | default 8080 }}
          livenessProbe:
            httpGet:
              path: {{ .Values.healthCheck.path | default "/healthz" }}
              port: {{ .Values.port | default 8080 }}
            initialDelaySeconds: 15
{{- end -}}
```

Services reference the library as a dependency:

```yaml
# backend-api-chart/Chart.yaml
apiVersion: v2
name: backend-api
version: 2.3.1
dependencies:
  - name: shared-lib
    version: "1.5.0"
    repository: "https://myorg.github.io/helm-charts"
```

Use the library template in your service chart:

```yaml
# backend-api-chart/templates/deployment.yaml
{{ include "shared-lib.deployment" . }}
```

## Approach 3: ArgoCD Multiple Sources

ArgoCD 2.6+ supports multiple sources per Application. This lets you combine resources from different repos without submodules or subtrees:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api
  namespace: argocd
spec:
  project: default
  sources:
    # Service-specific manifests
    - repoURL: https://github.com/myorg/backend-api-config
      targetRevision: main
      path: overlays/production
    # Shared monitoring configs
    - repoURL: https://github.com/myorg/shared-k8s-configs
      targetRevision: v1.5.0
      path: monitoring/backend-api
    # Shared network policies
    - repoURL: https://github.com/myorg/shared-k8s-configs
      targetRevision: v1.5.0
      path: network-policies/standard
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

Multiple sources also support Helm with values from a different repo:

```yaml
spec:
  sources:
    # Helm chart from chart repo
    - repoURL: https://myorg.github.io/helm-charts
      chart: backend-api
      targetRevision: 2.3.1
      helm:
        valueFiles:
          - $values/production/values.yaml
    # Values files from config repo
    - repoURL: https://github.com/myorg/backend-api-config
      targetRevision: main
      ref: values  # Referenced as $values above
```

## Approach 4: Kustomize Components

Kustomize components (alpha feature) are reusable configuration units that can be included in any overlay:

```yaml
# shared-k8s-configs/components/observability/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

resources:
  - service-monitor.yaml

patches:
  - target:
      kind: Deployment
    patch: |
      - op: add
        path: /spec/template/metadata/annotations/prometheus.io~1scrape
        value: "true"
      - op: add
        path: /spec/template/metadata/annotations/prometheus.io~1port
        value: "8080"
```

Services include components in their overlays:

```yaml
# service-config/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

components:
  - https://github.com/myorg/shared-k8s-configs//components/observability?ref=v1.5.0
  - https://github.com/myorg/shared-k8s-configs//components/security?ref=v1.5.0
```

Components are more powerful than plain resources because they can include patches, transformers, and generators.

## Versioning Shared Libraries

Always version your shared libraries. Use Git tags for Kustomize remote bases and semantic versioning for Helm charts:

```bash
# Tag a new release of shared configs
cd shared-k8s-configs
git tag v1.6.0
git push origin v1.6.0
```

Services pin to specific versions:

```yaml
# Pin to exact version
- https://github.com/myorg/shared-k8s-configs//monitoring?ref=v1.5.0

# Pin to major version (if using branch-based versioning)
- https://github.com/myorg/shared-k8s-configs//monitoring?ref=v1
```

Never use `main` or `HEAD` as the ref in production configs. You want reproducible deployments.

## Updating Shared Libraries Across Services

When you release a new version of a shared library, services need to update their references. Automate this with Renovate or Dependabot:

```json
// renovate.json in each service repo
{
  "extends": ["config:base"],
  "customManagers": [
    {
      "customType": "regex",
      "fileMatch": ["kustomization\\.yaml$"],
      "matchStrings": [
        "https://github\\.com/myorg/shared-k8s-configs//.*\\?ref=(?<currentValue>v[\\d\\.]+)"
      ],
      "datasourceTemplate": "github-tags",
      "depNameTemplate": "myorg/shared-k8s-configs"
    }
  ]
}
```

This creates automated PRs when the shared library releases a new version.

## Summary

Shared libraries prevent configuration duplication across ArgoCD-managed repos. Kustomize remote bases are the simplest option for YAML resources. Helm library charts work well for teams already using Helm. ArgoCD multiple sources let you combine repos without modifying your config structure. Kustomize components offer the most flexibility for reusable config patches. Regardless of approach, always version your shared libraries and automate updates with tools like Renovate to keep all services current.
