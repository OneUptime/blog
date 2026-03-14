# How to Build a Helm Chart Library for Platform Teams with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Helm, Platform Engineering, Chart Library

Description: Build and manage a Helm chart library for platform teams using Flux CD so application teams can deploy standardized workloads through curated, opinionated Helm charts.

---

## Introduction

Helm remains the dominant packaging format for Kubernetes applications, and for good reason: it handles templating, versioning, and dependency management in a single tool. But raw Helm charts from upstream repositories are often too generic — they expose hundreds of values and require deep Kubernetes knowledge to configure correctly. Platform teams can add value by building a library of opinionated Helm charts that encode organizational defaults and expose only the values developers need.

Flux CD's HelmRelease and HelmRepository resources bring this chart library into the GitOps model. The platform team publishes charts to an internal Helm repository, and Flux deploys them continuously. Developers configure their workloads through a small, curated values interface rather than writing raw Kubernetes manifests.

This guide walks through building an internal Helm chart library, hosting it, and wiring it into Flux for application teams.

## Prerequisites

- Flux CD v2 bootstrapped in your cluster
- A Helm chart repository (OCI registry, ChartMuseum, or GitHub Pages-hosted)
- Helm 3.x installed locally
- Basic familiarity with Helm chart structure

## Step 1: Design the Chart Library Structure

```
helm-charts/
├── charts/
│   ├── platform-app/         # Generic application chart
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   │       ├── deployment.yaml
│   │       ├── service.yaml
│   │       ├── ingress.yaml
│   │       ├── hpa.yaml
│   │       └── pdb.yaml
│   ├── platform-worker/      # Background worker chart
│   ├── platform-cronjob/     # CronJob chart
│   └── platform-db/          # Managed database sidecar chart
└── .github/
    └── workflows/
        └── release-charts.yml
```

## Step 2: Build the Platform App Chart

```yaml
# charts/platform-app/Chart.yaml
apiVersion: v2
name: platform-app
description: Opinionated application chart for ACME platform teams
type: application
version: 1.2.0
appVersion: "1.0"
keywords:
  - platform
  - application
  - acme
maintainers:
  - name: Platform Team
    email: platform@acme.com
```

```yaml
# charts/platform-app/values.yaml
# Minimal interface for developers
image:
  repository: ""         # Required: container image repository
  tag: ""                # Required: image tag
  pullPolicy: IfNotPresent

# Service configuration
service:
  port: 8080

# Ingress
ingress:
  enabled: false
  host: ""
  tls: true

# Scaling
replicas: 2
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

# Resources - sized for a typical microservice
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi

# Health check paths
healthCheck:
  liveness: /healthz
  readiness: /ready

# Environment variables passed by the developer
env: {}

# Platform-managed values (developers should not change these)
_platform:
  podSecurityContext:
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
```

```yaml
# charts/platform-app/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "platform-app.fullname" . }}
  labels:
    {{- include "platform-app.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicas }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "platform-app.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "platform-app.selectorLabels" . | nindent 8 }}
    spec:
      securityContext:
        {{- toYaml .Values._platform.podSecurityContext | nindent 8 }}
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.port }}
          env:
            {{- range $key, $value := .Values.env }}
            - name: {{ $key }}
              value: {{ $value | quote }}
            {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          livenessProbe:
            httpGet:
              path: {{ .Values.healthCheck.liveness }}
              port: {{ .Values.service.port }}
          readinessProbe:
            httpGet:
              path: {{ .Values.healthCheck.readiness }}
              port: {{ .Values.service.port }}
```

## Step 3: Publish the Chart Library via OCI

Use OCI registries to host Helm charts — they support immutability and access control natively.

```yaml
# .github/workflows/release-charts.yml
name: Release Helm Charts

on:
  push:
    tags:
      - "platform-app/v*"

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Install Helm
        uses: azure/setup-helm@v4

      - name: Log in to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | helm registry login ghcr.io \
            --username ${{ github.actor }} \
            --password-stdin

      - name: Package and push chart
        run: |
          CHART="platform-app"
          helm package charts/$CHART
          helm push ${CHART}-*.tgz oci://ghcr.io/acme/helm-charts
```

## Step 4: Register the Chart Repository in Flux

```yaml
# infrastructure/sources/platform-helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: HelmRepository
metadata:
  name: platform-charts
  namespace: flux-system
spec:
  type: oci
  interval: 10m
  url: oci://ghcr.io/acme/helm-charts
  secretRef:
    name: ghcr-credentials
```

## Step 5: Developer HelmRelease Configuration

Developers use a minimal HelmRelease that exposes only the curated values interface.

```yaml
# team-alpha-apps/deploy/api-service/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: api-service
  namespace: team-alpha
spec:
  interval: 5m
  chart:
    spec:
      chart: platform-app
      version: "1.2.x"    # Patch updates are automatic
      sourceRef:
        kind: HelmRepository
        name: platform-charts
        namespace: flux-system
  values:
    image:
      repository: ghcr.io/acme/api-service
      tag: v2.1.0
    ingress:
      enabled: true
      host: api.acme.example.com
    env:
      DATABASE_URL: postgresql://db:5432/api
      LOG_LEVEL: info
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
```

## Step 6: Implement Chart Update Notifications

Alert platform teams when chart updates are available for consumption.

```yaml
# infrastructure/notifications/chart-updates.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: chart-update-available
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSources:
    - kind: HelmRepository
      name: platform-charts
  summary: "New platform chart version available"
```

## Best Practices

- Lock breaking changes behind major version bumps and communicate them clearly in a changelog
- Run `helm lint` and `helm template` with test values in CI for every chart change
- Provide a `values.schema.json` in each chart to validate developer inputs before deployment
- Use Helm unit testing (`helm-unittest`) to verify template logic stays correct over time
- Set `version: "1.x.x"` ranges in HelmReleases so patch updates auto-apply but minor changes require explicit opt-in
- Document every exposed value with a comment explaining its purpose and valid options

## Conclusion

A Helm chart library managed through Flux CD is a force multiplier for platform teams. Developers get a simple, safe interface for deploying their applications; the platform team gets a single place to push security hardening, observability defaults, and reliability patterns to every workload simultaneously. Flux's continuous reconciliation ensures that chart updates flow through to all deployments as teams opt in.
