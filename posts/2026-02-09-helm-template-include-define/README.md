# How to Implement Helm Template Include and Define for Nested Template Reuse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, DevOps

Description: Master Helm's include and define actions to create reusable nested templates that reduce duplication, improve maintainability, and enable sophisticated template composition patterns.

---

Helm's template system becomes truly powerful when you leverage the `define` and `include` actions to create reusable template snippets. These actions allow you to build sophisticated template hierarchies where complex logic gets encapsulated in named blocks that you can invoke throughout your chart. Unlike the older `template` action, `include` enables you to pipe output through additional functions, making it the preferred choice for modern Helm charts.

## Define vs. Template vs. Include

The `define` action creates a named template block. The `template` action renders a defined template in place. The `include` action also renders a defined template but returns the output as a string that you can pipe to other functions.

Here's a simple comparison:

```yaml
{{- define "myapp.name" -}}
{{ .Chart.Name }}
{{- end -}}

# Using template (cannot pipe)
{{ template "myapp.name" . }}

# Using include (can pipe to other functions)
{{ include "myapp.name" . | upper | quote }}
```

The `include` function provides greater flexibility because it integrates with Helm's function pipeline system.

## Creating Basic Named Templates

Named templates typically live in `_helpers.tpl`, though you can define them in any template file. Create a helpers file with common patterns:

```yaml
{{/*
Generate the full name for resources
*/}}
{{- define "myapp.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{/*
Generate the chart label
*/}}
{{- define "myapp.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}
```

These templates handle common naming requirements and enforce Kubernetes naming constraints.

## Building Nested Label Templates

Labels appear on every resource, making them perfect candidates for template reuse. Create a hierarchy of label templates:

```yaml
{{/*
Selector labels - used for matching pods to services
*/}}
{{- define "myapp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "myapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Common labels - includes selector labels plus metadata
*/}}
{{- define "myapp.labels" -}}
helm.sh/chart: {{ include "myapp.chart" . }}
{{ include "myapp.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Pod labels - includes common labels plus custom pod labels
*/}}
{{- define "myapp.podLabels" -}}
{{ include "myapp.labels" . }}
{{- with .Values.podLabels }}
{{ toYaml . }}
{{- end }}
{{- end -}}
```

Notice how templates build on each other. The selector labels form the foundation, common labels extend them, and pod labels extend further. Use them in your resources:

```yaml
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
        {{- include "myapp.podLabels" . | nindent 8 }}
```

## Creating Templates with Parameters

Pass custom contexts to templates using the `dict` function. This enables templates that work with different data:

```yaml
{{/*
Generate a resource name with a suffix
Usage: include "myapp.resourceName" (dict "suffix" "cache" "context" $)
*/}}
{{- define "myapp.resourceName" -}}
{{- $fullname := include "myapp.fullname" .context -}}
{{- printf "%s-%s" $fullname .suffix | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Generate a container with standard settings
Usage: include "myapp.container" (dict "name" "app" "image" .Values.image "context" $)
*/}}
{{- define "myapp.container" -}}
name: {{ .name }}
image: "{{ .image.repository }}:{{ .image.tag | default .context.Chart.AppVersion }}"
imagePullPolicy: {{ .image.pullPolicy }}
ports:
{{- range .ports }}
- name: {{ .name }}
  containerPort: {{ .port }}
  protocol: {{ .protocol | default "TCP" }}
{{- end }}
resources:
  {{- toYaml .resources | nindent 2 }}
{{- end -}}
```

Use these parameterized templates:

```yaml
spec:
  containers:
  - {{- include "myapp.container" (dict "name" "app" "image" .Values.app.image "ports" .Values.app.ports "resources" .Values.app.resources "context" $) | nindent 4 }}
  - {{- include "myapp.container" (dict "name" "sidecar" "image" .Values.sidecar.image "ports" .Values.sidecar.ports "resources" .Values.sidecar.resources "context" $) | nindent 4 }}
```

## Building Volume Mount Templates

Create reusable patterns for volume mounts and volumes:

```yaml
{{/*
Generate volume mounts for a container
Usage: include "myapp.volumeMounts" .
*/}}
{{- define "myapp.volumeMounts" -}}
{{- if .Values.persistence.enabled }}
- name: data
  mountPath: {{ .Values.persistence.mountPath }}
  {{- if .Values.persistence.subPath }}
  subPath: {{ .Values.persistence.subPath }}
  {{- end }}
{{- end }}
{{- if .Values.configMap.enabled }}
- name: config
  mountPath: /etc/config
  readOnly: true
{{- end }}
{{- with .Values.extraVolumeMounts }}
{{- toYaml . }}
{{- end }}
{{- end -}}

{{/*
Generate volumes for a pod
Usage: include "myapp.volumes" .
*/}}
{{- define "myapp.volumes" -}}
{{- if .Values.persistence.enabled }}
- name: data
  persistentVolumeClaim:
    claimName: {{ include "myapp.fullname" . }}
{{- end }}
{{- if .Values.configMap.enabled }}
- name: config
  configMap:
    name: {{ include "myapp.fullname" . }}-config
{{- end }}
{{- with .Values.extraVolumes }}
{{- toYaml . }}
{{- end }}
{{- end -}}
```

Use them together in your deployment:

```yaml
spec:
  template:
    spec:
      containers:
      - name: {{ .Chart.Name }}
        volumeMounts:
        {{- include "myapp.volumeMounts" . | nindent 8 }}
      volumes:
      {{- include "myapp.volumes" . | nindent 6 }}
```

## Creating Security Context Templates

Standardize security contexts across your workloads:

```yaml
{{/*
Pod security context
*/}}
{{- define "myapp.podSecurityContext" -}}
{{- if .Values.podSecurityContext.enabled }}
runAsNonRoot: true
runAsUser: {{ .Values.podSecurityContext.runAsUser | default 1000 }}
runAsGroup: {{ .Values.podSecurityContext.runAsGroup | default 1000 }}
fsGroup: {{ .Values.podSecurityContext.fsGroup | default 1000 }}
{{- if .Values.podSecurityContext.fsGroupChangePolicy }}
fsGroupChangePolicy: {{ .Values.podSecurityContext.fsGroupChangePolicy }}
{{- end }}
{{- if semverCompare ">=1.22-0" .Capabilities.KubeVersion.GitVersion }}
seccompProfile:
  type: {{ .Values.podSecurityContext.seccompProfile | default "RuntimeDefault" }}
{{- end }}
{{- end }}
{{- end -}}

{{/*
Container security context
*/}}
{{- define "myapp.securityContext" -}}
{{- if .Values.securityContext.enabled }}
allowPrivilegeEscalation: false
capabilities:
  drop:
  - ALL
  {{- if .Values.securityContext.addCapabilities }}
  add:
  {{- toYaml .Values.securityContext.addCapabilities | nindent 2 }}
  {{- end }}
readOnlyRootFilesystem: {{ .Values.securityContext.readOnlyRootFilesystem | default true }}
runAsNonRoot: true
runAsUser: {{ .Values.securityContext.runAsUser | default 1000 }}
{{- end }}
{{- end -}}
```

## Building Environment Variable Templates

Create flexible environment variable generation:

```yaml
{{/*
Generate environment variables from various sources
*/}}
{{- define "myapp.env" -}}
{{- range $key, $value := .Values.env }}
- name: {{ $key }}
  value: {{ $value | quote }}
{{- end }}
{{- range .Values.envFromSecret }}
- name: {{ .name }}
  valueFrom:
    secretKeyRef:
      name: {{ .secretName }}
      key: {{ .key }}
{{- end }}
{{- range .Values.envFromConfigMap }}
- name: {{ .name }}
  valueFrom:
    configMapKeyRef:
      name: {{ .configMapName }}
      key: {{ .key }}
{{- end }}
{{- end -}}
```

## Creating Service Port Templates

Generate service ports from container configurations:

```yaml
{{/*
Generate service ports from container ports
Usage: include "myapp.servicePorts" .
*/}}
{{- define "myapp.servicePorts" -}}
{{- range .Values.service.ports }}
- name: {{ .name }}
  port: {{ .port }}
  targetPort: {{ .targetPort | default .name }}
  protocol: {{ .protocol | default "TCP" }}
  {{- if and (eq $.Values.service.type "NodePort") .nodePort }}
  nodePort: {{ .nodePort }}
  {{- end }}
{{- end }}
{{- end -}}
```

## Building Ingress Rule Templates

Create reusable ingress rules:

```yaml
{{/*
Generate ingress rules
*/}}
{{- define "myapp.ingressRules" -}}
{{- $fullName := include "myapp.fullname" . -}}
{{- $svcPort := .Values.service.port -}}
{{- range .Values.ingress.hosts }}
- host: {{ .host | quote }}
  http:
    paths:
    {{- range .paths }}
    - path: {{ .path }}
      {{- if $.Capabilities.APIVersions.Has "networking.k8s.io/v1" }}
      pathType: {{ .pathType | default "Prefix" }}
      backend:
        service:
          name: {{ $fullName }}
          port:
            {{- if kindIs "string" $svcPort }}
            name: {{ $svcPort }}
            {{- else }}
            number: {{ $svcPort }}
            {{- end }}
      {{- else }}
      backend:
        serviceName: {{ $fullName }}
        servicePort: {{ $svcPort }}
      {{- end }}
    {{- end }}
{{- end }}
{{- end -}}
```

## Conditional Template Inclusion

Control when templates get included:

```yaml
{{/*
Generate monitoring annotations if enabled
*/}}
{{- define "myapp.monitoringAnnotations" -}}
{{- if .Values.metrics.enabled }}
prometheus.io/scrape: "true"
prometheus.io/port: {{ .Values.metrics.port | quote }}
prometheus.io/path: {{ .Values.metrics.path | default "/metrics" | quote }}
{{- end }}
{{- end -}}
```

Use with conditional inclusion:

```yaml
metadata:
  annotations:
    {{- $monitoring := include "myapp.monitoringAnnotations" . | trim -}}
    {{- if $monitoring }}
    {{- $monitoring | nindent 4 }}
    {{- end }}
    {{- with .Values.podAnnotations }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
```

## Testing Template Output

Test your templates to ensure they generate correct YAML:

```bash
# Render all templates
helm template myapp ./mychart -f values.yaml

# Render specific templates
helm template myapp ./mychart -f values.yaml -s templates/deployment.yaml

# Test with different values
helm template myapp ./mychart --set podSecurityContext.enabled=true

# Debug template rendering
helm template myapp ./mychart --debug
```

The combination of `define` and `include` transforms your Helm charts from simple configurations into sophisticated, maintainable infrastructure code. By building hierarchies of reusable templates, you reduce duplication and create consistent patterns across all your resources.
