# How to Use Helm Template Functions like toYaml, tpl, and include for Dynamic Rendering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, Templates

Description: Master Helm's powerful template functions including toYaml, tpl, and include to create flexible, reusable charts that handle complex configuration scenarios.

---

Helm templates become powerful when you leverage built-in functions like toYaml, tpl, and include. These functions let you dynamically render YAML, evaluate templates stored in values, and reuse template blocks across your chart. Understanding how to use them effectively separates basic charts from production-ready ones.

## Understanding toYaml for Complex Structures

The toYaml function converts Go data structures into YAML format. This is essential when you want users to provide complex configuration without manually formatting it in templates.

Without toYaml, you would need to manually iterate and format nested structures. With it, you can pass entire objects from values.yaml directly into your templates.

```yaml
# values.yaml
resources:
  limits:
    cpu: 1000m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

extraEnvVars:
  - name: DATABASE_URL
    value: postgres://localhost:5432/db
  - name: CACHE_ENABLED
    value: "true"
  - name: LOG_LEVEL
    value: info
```

Use toYaml to render these structures cleanly in your templates.

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
spec:
  template:
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
        resources:
          {{- toYaml .Values.resources | nindent 10 }}
        env:
          {{- toYaml .Values.extraEnvVars | nindent 10 }}
```

The toYaml function handles the conversion and nindent ensures correct indentation. The dash in {{- removes whitespace before the expression, keeping your YAML clean.

## Handling Optional Fields with toYaml

When fields might be undefined, combine toYaml with conditional logic to avoid rendering empty sections.

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: app
        {{- if .Values.securityContext }}
        securityContext:
          {{- toYaml .Values.securityContext | nindent 10 }}
        {{- end }}
        {{- if .Values.livenessProbe }}
        livenessProbe:
          {{- toYaml .Values.livenessProbe | nindent 10 }}
        {{- end }}
        {{- if .Values.readinessProbe }}
        readinessProbe:
          {{- toYaml .Values.readinessProbe | nindent 10 }}
        {{- end }}
```

This pattern keeps templates clean and avoids rendering empty YAML keys when optional values are not provided.

## Using tpl for Dynamic Template Evaluation

The tpl function evaluates template strings stored in values.yaml. This allows users to inject dynamic content that gets processed at render time.

```yaml
# values.yaml
podAnnotations:
  timestamp: "{{ now | date \"2006-01-02T15:04:05Z07:00\" }}"
  chart-version: "{{ .Chart.Version }}"
  release-name: "{{ .Release.Name }}"

configMapData:
  app.conf: |
    server {
      name = {{ .Release.Name }}-server
      namespace = {{ .Release.Namespace }}
      replicas = {{ .Values.replicaCount }}
    }
```

Process these template strings using tpl in your templates.

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  annotations:
    {{- range $key, $value := .Values.podAnnotations }}
    {{ $key }}: {{ tpl $value $ | quote }}
    {{- end }}
```

The tpl function takes two arguments: the template string and the context (usually $ for root context). This evaluates the template expressions within the annotation values.

## Creating ConfigMaps with tpl

ConfigMaps often contain configuration files that need access to Helm values. The tpl function makes this possible.

```yaml
# values.yaml
config:
  database.conf: |
    host = {{ .Values.database.host }}
    port = {{ .Values.database.port }}
    name = {{ .Values.database.name }}
    pool_size = {{ .Values.database.poolSize }}

  nginx.conf: |
    server {
      listen 8080;
      server_name {{ .Release.Name }}.{{ .Release.Namespace }}.svc.cluster.local;

      location / {
        proxy_pass http://{{ .Values.backend.service }}:{{ .Values.backend.port }};
      }
    }

database:
  host: postgres-service
  port: 5432
  name: myapp
  poolSize: 20

backend:
  service: backend-svc
  port: 8080
```

Render the configuration with template evaluation.

```yaml
# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "myapp.fullname" . }}-config
data:
  {{- range $filename, $content := .Values.config }}
  {{ $filename }}: |
    {{- tpl $content $ | nindent 4 }}
  {{- end }}
```

This creates a ConfigMap where each file's content is processed as a template, substituting values at render time.

## Mastering include for Template Reuse

The include function calls named templates and returns their output as a string. Unlike the template action, include allows you to pipe the result to other functions.

Define reusable template blocks in a helpers file.

```yaml
# templates/_helpers.tpl
{{/*
Generate full name for resources
*/}}
{{- define "myapp.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Generate common labels
*/}}
{{- define "myapp.labels" -}}
app.kubernetes.io/name: {{ include "myapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ include "myapp.chart" . }}
{{- end }}

{{/*
Generate selector labels
*/}}
{{- define "myapp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "myapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Generate name
*/}}
{{- define "myapp.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Generate chart name and version
*/}}
{{- define "myapp.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}
```

Use include to call these templates and pipe the output.

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
```

The include function returns the rendered template as a string, which you can then indent correctly using nindent.

## Combining toYaml and include

Merge default values with user-provided values using include and toYaml together.

```yaml
# templates/_helpers.tpl
{{/*
Generate merged environment variables
*/}}
{{- define "myapp.envVars" -}}
{{- $defaultEnv := list
  (dict "name" "APP_NAME" "value" .Chart.Name)
  (dict "name" "APP_VERSION" "value" .Chart.AppVersion)
  (dict "name" "RELEASE_NAME" "value" .Release.Name)
  (dict "name" "NAMESPACE" "value" .Release.Namespace)
-}}
{{- $customEnv := .Values.extraEnvVars | default list -}}
{{- concat $defaultEnv $customEnv | toYaml }}
{{- end }}
```

Use this helper in your deployment.

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: app
        env:
          {{- include "myapp.envVars" . | nindent 10 }}
```

This pattern ensures certain environment variables are always present while allowing users to add their own.

## Advanced tpl Patterns

Create complex configuration templates that reference other templates.

```yaml
# values.yaml
monitoring:
  enabled: true
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
    custom.annotation: '{{ include "myapp.fullname" . }}-metrics'

serviceMesh:
  enabled: true
  config: |
    apiVersion: v1
    kind: Service
    metadata:
      name: {{ include "myapp.fullname" . }}-mesh
      labels:
        {{- include "myapp.labels" . | nindent 4 }}
    spec:
      ports:
      - port: {{ .Values.service.port }}
        targetPort: http
```

Render these nested templates correctly.

```yaml
# templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ include "myapp.fullname" . }}
  {{- if .Values.monitoring.enabled }}
  annotations:
    {{- range $key, $value := .Values.monitoring.annotations }}
    {{ $key }}: {{ tpl $value $ | quote }}
    {{- end }}
  {{- end }}
```

## Dynamic Resource Generation

Generate multiple resources from a list using include and toYaml.

```yaml
# values.yaml
additionalServices:
  - name: cache
    port: 6379
    targetPort: 6379
    type: ClusterIP
  - name: metrics
    port: 9090
    targetPort: metrics
    type: ClusterIP
```

Create a template that generates services from this list.

```yaml
# templates/_helpers.tpl
{{- define "myapp.service" -}}
apiVersion: v1
kind: Service
metadata:
  name: {{ include "myapp.fullname" . }}-{{ .name }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  type: {{ .type }}
  ports:
  - port: {{ .port }}
    targetPort: {{ .targetPort }}
    protocol: TCP
  selector:
    {{- include "myapp.selectorLabels" . | nindent 4 }}
{{- end }}
```

Render multiple services.

```yaml
# templates/additional-services.yaml
{{- range .Values.additionalServices }}
---
{{ include "myapp.service" (merge (dict "name" .name "port" .port "targetPort" .targetPort "type" .type) $) }}
{{- end }}
```

## Error Handling in Templates

Add validation using fail and required functions combined with tpl.

```yaml
# templates/_helpers.tpl
{{- define "myapp.validateConfig" -}}
{{- if not .Values.database.host }}
  {{- fail "database.host is required" }}
{{- end }}
{{- if lt (.Values.replicaCount | int) 1 }}
  {{- fail "replicaCount must be at least 1" }}
{{- end }}
{{- if and .Values.ingress.enabled (not .Values.ingress.host) }}
  {{- fail "ingress.host is required when ingress is enabled" }}
{{- end }}
{{- end }}

# Call validation in a template
{{- include "myapp.validateConfig" . }}
```

This prevents users from installing charts with invalid configuration and provides clear error messages.

Template functions like toYaml, tpl, and include transform Helm charts from rigid manifests into flexible, reusable tools. Use toYaml for rendering complex structures, tpl for evaluating template strings in values, and include for template reuse with output manipulation. Master these functions and you can build charts that adapt to diverse deployment scenarios while maintaining clean, maintainable code.
