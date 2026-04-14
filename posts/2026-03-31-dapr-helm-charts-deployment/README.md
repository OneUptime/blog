# How to Use Helm Charts for Dapr Application Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Helm, Deployment, Kubernetes, DevOps

Description: Learn how to package and deploy Dapr applications using Helm charts, including Dapr annotation templates, component inclusion, and multi-environment values files.

---

Helm charts are the standard packaging format for Kubernetes applications. When deploying Dapr applications with Helm, the chart must include Dapr sidecar annotations, Dapr component definitions, and Configuration resources alongside standard Kubernetes workload manifests.

## Chart Structure

```bash
dapr-app/
├── Chart.yaml
├── values.yaml
├── values-staging.yaml
├── values-production.yaml
└── templates/
    ├── _helpers.tpl
    ├── deployment.yaml
    ├── service.yaml
    ├── components/
    │   ├── pubsub.yaml
    │   └── state-store.yaml
    └── config/
        └── dapr-config.yaml
```

## Chart.yaml

```yaml
apiVersion: v2
name: order-service
description: Order service with Dapr sidecar
type: application
version: 1.0.0
appVersion: "2.1.0"
dependencies:
- name: dapr
  version: "1.13.0"
  repository: "https://dapr.github.io/helm-charts/"
  condition: dapr.enabled
```

## Deployment Template with Dapr Annotations

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "order-service.fullname" . }}
  labels:
    {{- include "order-service.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "order-service.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "order-service.selectorLabels" . | nindent 8 }}
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: {{ .Values.dapr.appId | quote }}
        dapr.io/app-port: {{ .Values.dapr.appPort | quote }}
        dapr.io/config: {{ .Values.dapr.configName | quote }}
        dapr.io/log-level: {{ .Values.dapr.logLevel | quote }}
        {{- if .Values.dapr.metricsEnabled }}
        dapr.io/enable-metrics: "true"
        dapr.io/metrics-port: "9090"
        {{- end }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
        ports:
        - containerPort: {{ .Values.dapr.appPort }}
        resources:
          {{- toYaml .Values.resources | nindent 10 }}
```

## Dapr Component Template

```yaml
# templates/components/pubsub.yaml
{{- if .Values.components.pubsub.enabled }}
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: {{ .Values.components.pubsub.name }}
  namespace: {{ .Release.Namespace }}
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: {{ .Values.components.pubsub.redisHost | quote }}
  - name: redisPassword
    secretKeyRef:
      name: {{ .Values.components.pubsub.secretName }}
      key: password
scopes:
{{- range .Values.components.pubsub.scopes }}
- {{ . }}
{{- end }}
{{- end }}
```

## Values Files

```yaml
# values.yaml (defaults)
replicaCount: 1
image:
  repository: myrepo/order-service
  tag: ""

dapr:
  appId: order-service
  appPort: 8080
  configName: dapr-config
  logLevel: info
  metricsEnabled: true

components:
  pubsub:
    enabled: true
    name: pubsub
    redisHost: localhost:6379
    secretName: redis-credentials
    scopes:
    - order-service
```

```yaml
# values-production.yaml
replicaCount: 3
dapr:
  logLevel: warn
components:
  pubsub:
    redisHost: prod-redis.production.svc.cluster.local:6379
    secretName: redis-prod-credentials
```

## Deploying with Helm

```bash
# Install with development defaults
helm install order-service ./dapr-app -n development

# Install with production values
helm install order-service ./dapr-app \
  -n production \
  -f values-production.yaml \
  --set image.tag=v2.1.0

# Upgrade
helm upgrade order-service ./dapr-app \
  -n production \
  -f values-production.yaml \
  --set image.tag=v2.2.0

# Rollback
helm rollback order-service 1 -n production
```

## Summary

Helm charts for Dapr applications should include templates for Dapr annotations in the Deployment, separate templates for Dapr Component resources, and Dapr Configuration resources. Use values files for environment-specific overrides like Redis host addresses and replica counts. Helm's built-in rollback capability makes it easy to revert failed Dapr application deployments.
