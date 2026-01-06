# How to Set Up Helm Charts for Your Kubernetes Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Helm, DevOps, CI/CD, Package Management

Description: A comprehensive guide to creating, managing, and deploying Helm charts, from basic templating to advanced patterns like library charts, hooks, and chart repositories.

---

Helm is the package manager for Kubernetes. It lets you template manifests, manage releases, and share applications. If you're copy-pasting YAML between environments, Helm is the answer.

## Installing Helm

```bash
# macOS
brew install helm

# Linux
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify
helm version
```

## Helm Basics

### Finding Charts

```bash
# Add common repos
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Search for charts
helm search repo nginx
helm search hub postgresql  # Search Artifact Hub
```

### Installing a Chart

```bash
# Basic install
helm install my-nginx ingress-nginx/ingress-nginx

# With namespace
helm install my-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace

# With custom values
helm install my-nginx ingress-nginx/ingress-nginx -f values.yaml

# Override specific values
helm install my-nginx ingress-nginx/ingress-nginx --set controller.replicaCount=3
```

### Managing Releases

```bash
# List releases
helm list -A

# Check release status
helm status my-nginx -n ingress-nginx

# Upgrade release
helm upgrade my-nginx ingress-nginx/ingress-nginx -f values.yaml

# Rollback
helm rollback my-nginx 1

# Uninstall
helm uninstall my-nginx -n ingress-nginx
```

## Creating Your First Chart

### Generate Chart Scaffold

```bash
helm create myapp

# Structure:
# myapp/
# ├── Chart.yaml          # Chart metadata
# ├── values.yaml         # Default values
# ├── templates/          # Template files
# │   ├── deployment.yaml
# │   ├── service.yaml
# │   ├── hpa.yaml
# │   ├── ingress.yaml
# │   ├── serviceaccount.yaml
# │   ├── _helpers.tpl    # Template helpers
# │   └── NOTES.txt       # Post-install notes
# └── charts/             # Dependencies
```

### Chart.yaml

```yaml
apiVersion: v2
name: myapp
description: A Helm chart for MyApp
type: application
version: 0.1.0        # Chart version
appVersion: "1.0.0"   # Application version
maintainers:
  - name: Your Name
    email: you@example.com
dependencies:
  - name: postgresql
    version: "12.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
```

### values.yaml

```yaml
# Default values for myapp

replicaCount: 2

image:
  repository: myorg/myapp
  pullPolicy: IfNotPresent
  tag: ""  # Defaults to appVersion

imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""

serviceAccount:
  create: true
  annotations: {}
  name: ""

podAnnotations: {}
podSecurityContext:
  fsGroup: 1000

securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: false
  className: nginx
  annotations: {}
  hosts:
    - host: myapp.local
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
    memory: 256Mi

autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

nodeSelector: {}
tolerations: []
affinity: {}

# Application-specific config
config:
  logLevel: info
  database:
    host: localhost
    port: 5432
    name: myapp

postgresql:
  enabled: true
  auth:
    database: myapp
    username: myapp
```

## Template Syntax

### Basic Templating

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "myapp.serviceAccountName" . }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
        - name: {{ .Chart.Name }}
          securityContext:
            {{- toYaml .Values.securityContext | nindent 12 }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: 8080
              protocol: TCP
          env:
            - name: LOG_LEVEL
              value: {{ .Values.config.logLevel | quote }}
            - name: DB_HOST
              value: {{ .Values.config.database.host | quote }}
          envFrom:
            - secretRef:
                name: {{ include "myapp.fullname" . }}-secrets
          livenessProbe:
            httpGet:
              path: /healthz
              port: http
          readinessProbe:
            httpGet:
              path: /ready
              port: http
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

### Helper Templates

```yaml
# templates/_helpers.tpl

{{/*
Expand the name of the chart.
*/}}
{{- define "myapp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "myapp.fullname" -}}
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

{{/*
Common labels
*/}}
{{- define "myapp.labels" -}}
helm.sh/chart: {{ include "myapp.chart" . }}
{{ include "myapp.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "myapp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "myapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account
*/}}
{{- define "myapp.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "myapp.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
```

### Conditional Resources

```yaml
# templates/ingress.yaml
{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
  {{- with .Values.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  {{- if .Values.ingress.className }}
  ingressClassName: {{ .Values.ingress.className }}
  {{- end }}
  {{- if .Values.ingress.tls }}
  tls:
    {{- range .Values.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      secretName: {{ .secretName }}
    {{- end }}
  {{- end }}
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ include "myapp.fullname" $ }}
                port:
                  number: {{ $.Values.service.port }}
          {{- end }}
    {{- end }}
{{- end }}
```

## Chart Hooks

### Pre-Install Database Migration

```yaml
# templates/migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "myapp.fullname" . }}-migrate
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          command: ["./migrate.sh"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: {{ include "myapp.fullname" . }}-secrets
                  key: database-url
  backoffLimit: 3
```

### Post-Install Notification

```yaml
# templates/post-install-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "myapp.fullname" . }}-notify
  annotations:
    "helm.sh/hook": post-install
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: notify
          image: curlimages/curl
          command:
            - curl
            - -X
            - POST
            - -d
            - '{"text":"{{ .Release.Name }} deployed to {{ .Release.Namespace }}"}'
            - {{ .Values.slack.webhookUrl }}
```

## Testing Charts

### Lint

```bash
helm lint myapp/
```

### Template Rendering

```bash
# Render templates locally
helm template myapp myapp/

# With specific values
helm template myapp myapp/ -f production-values.yaml

# Debug template issues
helm template myapp myapp/ --debug
```

### Dry Run Install

```bash
helm install myapp myapp/ --dry-run --debug
```

### Chart Testing

```yaml
# templates/tests/test-connection.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "myapp.fullname" . }}-test-connection"
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": test
spec:
  containers:
    - name: wget
      image: busybox
      command: ['wget']
      args: ['{{ include "myapp.fullname" . }}:{{ .Values.service.port }}']
  restartPolicy: Never
```

Run tests:

```bash
helm test myapp
```

## Managing Dependencies

### Add Dependencies

```yaml
# Chart.yaml
dependencies:
  - name: postgresql
    version: "12.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
  - name: redis
    version: "17.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: redis.enabled
```

### Update Dependencies

```bash
helm dependency update myapp/
helm dependency build myapp/
```

### Override Dependency Values

```yaml
# values.yaml
postgresql:
  enabled: true
  auth:
    database: myapp
    username: myapp
  primary:
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
```

## Environment-Specific Values

### values-production.yaml

```yaml
replicaCount: 5

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi

autoscaling:
  enabled: true
  minReplicas: 5
  maxReplicas: 20

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: myapp-tls
      hosts:
        - myapp.example.com

config:
  logLevel: warn
```

### Install with Environment Values

```bash
helm install myapp myapp/ \
  -f values.yaml \
  -f values-production.yaml \
  -n production
```

## Publishing Charts

### Package Chart

```bash
helm package myapp/
# Creates myapp-0.1.0.tgz
```

### Create Chart Repository

```bash
# Generate index
helm repo index . --url https://charts.example.com

# Push to web server/S3/GCS
aws s3 sync . s3://my-helm-charts/
```

### Use OCI Registry

```bash
# Login to registry
helm registry login ghcr.io

# Push chart
helm push myapp-0.1.0.tgz oci://ghcr.io/myorg/charts

# Install from OCI
helm install myapp oci://ghcr.io/myorg/charts/myapp --version 0.1.0
```

## Best Practices

### 1. Use Semantic Versioning

```yaml
# Chart.yaml
version: 1.2.3     # Bump for chart changes
appVersion: "2.0.0" # Track application version
```

### 2. Document Values

```yaml
# values.yaml

# -- Number of replicas for the deployment
replicaCount: 2

# -- Image configuration
image:
  # -- Image repository
  repository: myorg/myapp
  # -- Image pull policy
  pullPolicy: IfNotPresent
  # -- Image tag (defaults to appVersion)
  tag: ""
```

Generate docs with helm-docs:

```bash
helm-docs myapp/
```

### 3. Validate Input

```yaml
# templates/deployment.yaml
{{- if lt (int .Values.replicaCount) 1 }}
{{- fail "replicaCount must be at least 1" }}
{{- end }}
```

### 4. Use NOTES.txt

```
# templates/NOTES.txt
Thank you for installing {{ .Chart.Name }}.

Your release is named {{ .Release.Name }}.

To access the application:
{{- if .Values.ingress.enabled }}
  Visit https://{{ (index .Values.ingress.hosts 0).host }}
{{- else }}
  kubectl port-forward svc/{{ include "myapp.fullname" . }} 8080:{{ .Values.service.port }}
  Then visit http://localhost:8080
{{- end }}
```

---

Helm transforms raw Kubernetes manifests into reusable, configurable packages. Start with the generated scaffold, customize for your application, and iterate. Once you have a working chart, you'll never go back to copy-pasting YAML.
