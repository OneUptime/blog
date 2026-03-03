# How to Create Custom Helm Charts for Talos Linux Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Helm, Kubernetes, Helm Charts, DevOps, Packaging

Description: Learn how to create, structure, and publish custom Helm charts optimized for deploying applications on Talos Linux clusters.

---

When the community Helm charts do not fit your needs, or you have internal applications that need a standardized deployment process, building custom Helm charts is the way to go. On Talos Linux, custom charts let you bake in the right security contexts, storage configurations, and network settings that your immutable infrastructure requires.

This guide walks through creating a Helm chart from scratch, writing templates that work well on Talos Linux, and packaging it for distribution.

## Creating a New Chart

Helm provides a scaffolding command to get started:

```bash
# Create a new chart called my-app
helm create my-app

# This generates the following structure:
# my-app/
#   Chart.yaml
#   values.yaml
#   charts/
#   templates/
#     deployment.yaml
#     service.yaml
#     serviceaccount.yaml
#     ingress.yaml
#     hpa.yaml
#     NOTES.txt
#     _helpers.tpl
#     tests/
#       test-connection.yaml
```

The scaffolded chart is a working NGINX deployment. We will customize it for our application.

## Chart.yaml - Chart Metadata

```yaml
# Chart.yaml
apiVersion: v2
name: my-app
description: A custom application chart optimized for Talos Linux deployments
type: application
version: 0.1.0      # Chart version (bumped with chart changes)
appVersion: "1.0.0"  # Application version
maintainers:
  - name: Platform Team
    email: platform@example.com
keywords:
  - web
  - api
  - talos
home: https://github.com/myorg/my-app
sources:
  - https://github.com/myorg/my-app
```

## values.yaml - Default Configuration

Write defaults that work well on Talos Linux:

```yaml
# values.yaml
replicaCount: 2

image:
  repository: myorg/my-app
  pullPolicy: IfNotPresent
  tag: ""  # Defaults to Chart.appVersion

imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""

serviceAccount:
  create: true
  annotations: {}
  name: ""

# Security context suitable for Talos Linux
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  fsGroup: 1000
  seccompProfile:
    type: RuntimeDefault

containerSecurityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL

service:
  type: ClusterIP
  port: 80
  targetPort: 3000

ingress:
  enabled: false
  className: nginx
  annotations: {}
  hosts:
    - host: app.example.com
      paths:
        - path: /
          pathType: Prefix
  tls: []

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 75

persistence:
  enabled: false
  storageClass: ""
  accessMode: ReadWriteOnce
  size: 5Gi

config:
  # Application configuration as key-value pairs
  LOG_LEVEL: "info"
  PORT: "3000"

secrets:
  # Secret references (do not put actual secrets here)
  existingSecret: ""

probes:
  liveness:
    path: /health
    initialDelaySeconds: 10
    periodSeconds: 15
  readiness:
    path: /ready
    initialDelaySeconds: 5
    periodSeconds: 5

nodeSelector: {}
tolerations: []
affinity: {}

topologySpreadConstraints: []
```

## Template Helpers

The `_helpers.tpl` file contains reusable template functions:

```yaml
# templates/_helpers.tpl
{{- define "my-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "my-app.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "my-app.labels" -}}
helm.sh/chart: {{ include "my-app.chart" . }}
{{ include "my-app.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "my-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "my-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "my-app.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "my-app.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "my-app.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
```

## Deployment Template

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-app.fullname" . }}
  labels:
    {{- include "my-app.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "my-app.selectorLabels" . | nindent 6 }}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
      labels:
        {{- include "my-app.selectorLabels" . | nindent 8 }}
    spec:
      serviceAccountName: {{ include "my-app.serviceAccountName" . }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
        - name: {{ .Chart.Name }}
          securityContext:
            {{- toYaml .Values.containerSecurityContext | nindent 12 }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.targetPort }}
              protocol: TCP
          envFrom:
            - configMapRef:
                name: {{ include "my-app.fullname" . }}-config
          {{- if .Values.secrets.existingSecret }}
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.secrets.existingSecret }}
                  key: password
          {{- end }}
          livenessProbe:
            httpGet:
              path: {{ .Values.probes.liveness.path }}
              port: http
            initialDelaySeconds: {{ .Values.probes.liveness.initialDelaySeconds }}
            periodSeconds: {{ .Values.probes.liveness.periodSeconds }}
          readinessProbe:
            httpGet:
              path: {{ .Values.probes.readiness.path }}
              port: http
            initialDelaySeconds: {{ .Values.probes.readiness.initialDelaySeconds }}
            periodSeconds: {{ .Values.probes.readiness.periodSeconds }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          {{- if .Values.persistence.enabled }}
          volumeMounts:
            - name: data
              mountPath: /data
          {{- end }}
      {{- if .Values.persistence.enabled }}
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: {{ include "my-app.fullname" . }}-data
      {{- end }}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.topologySpreadConstraints }}
      topologySpreadConstraints:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

## ConfigMap Template

```yaml
# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "my-app.fullname" . }}-config
  labels:
    {{- include "my-app.labels" . | nindent 4 }}
data:
  {{- range $key, $value := .Values.config }}
  {{ $key }}: {{ $value | quote }}
  {{- end }}
```

## Testing Your Chart

Before packaging, validate your chart:

```bash
# Lint the chart for errors
helm lint ./my-app

# Render the templates to see the output
helm template test-release ./my-app -f values-test.yaml

# Dry run against the cluster
helm install test-release ./my-app \
  --namespace test \
  --dry-run --debug

# Run the built-in tests
helm test test-release --namespace test
```

## Packaging and Distribution

```bash
# Package the chart into a .tgz file
helm package ./my-app

# This creates my-app-0.1.0.tgz

# Generate a repository index
helm repo index . --url https://charts.example.com

# Push to a chart repository
helm cm-push my-app-0.1.0.tgz my-private-repo

# Or push to an OCI registry
helm push my-app-0.1.0.tgz oci://registry.example.com/charts
```

## Installing Your Custom Chart

```bash
# Install from the packaged file
helm install my-release ./my-app-0.1.0.tgz \
  --namespace production \
  --create-namespace \
  -f production-values.yaml

# Install from a repository
helm install my-release myrepo/my-app \
  --namespace production \
  --create-namespace \
  -f production-values.yaml
```

## Summary

Building custom Helm charts for Talos Linux gives you full control over how applications are deployed on your immutable infrastructure. By setting secure defaults in your values file, using proper security contexts, and making storage configuration optional, you create charts that work well on Talos from day one. Package your charts into a private repository and you have a reusable, versioned deployment mechanism that the whole team can rely on.
