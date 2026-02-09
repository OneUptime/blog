# How to Create Helm Named Templates with Template Functions for Complex Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, DevOps

Description: Learn how to create reusable named templates in Helm charts with template functions to handle complex logic, reduce duplication, and build maintainable Kubernetes configurations.

---

Helm charts often contain repetitive YAML configurations across multiple resource definitions. Named templates provide a powerful mechanism to encapsulate complex logic into reusable functions that you can call throughout your chart. This approach reduces duplication, improves maintainability, and makes your charts easier to understand.

## Understanding Named Templates

Named templates in Helm are defined using the `define` action and invoked using either `template` or `include`. They act like functions in programming languages, allowing you to encapsulate logic and reuse it across multiple places in your chart.

The key difference between `template` and `include` is that `include` allows you to pipe the output to other template functions, making it more flexible for complex transformations.

## Creating Basic Named Templates

Let's start by creating a simple named template in the `_helpers.tpl` file, which is the conventional location for template definitions:

```yaml
{{/*
Generate the full name for resources
*/}}
{{- define "myapp.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}
```

This template generates a full name for your resources, handling various configuration scenarios and ensuring the name stays within Kubernetes' 63-character limit.

## Building Label Templates

Labels are applied across multiple resources in a chart. Create a named template to standardize them:

```yaml
{{/*
Common labels
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
Selector labels
*/}}
{{- define "myapp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "myapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Chart name and version
*/}}
{{- define "myapp.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}
```

Notice how templates can call other templates, creating a hierarchy of reusable components.

## Using Named Templates in Resources

Once defined, use these templates in your deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
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
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
```

The `nindent` function properly indents the included template output, ensuring valid YAML.

## Creating Templates with Parameters

Named templates can accept parameters through the context. Here's a template that generates environment variables from a map:

```yaml
{{/*
Generate environment variables from a map
Usage: include "myapp.envVars" (dict "envVars" .Values.env "context" $)
*/}}
{{- define "myapp.envVars" -}}
{{- range $key, $value := .envVars }}
- name: {{ $key }}
  value: {{ $value | quote }}
{{- end }}
{{- end -}}
```

Use it in your deployment:

```yaml
spec:
  containers:
  - name: {{ .Chart.Name }}
    env:
      {{- include "myapp.envVars" (dict "envVars" .Values.env "context" $) | nindent 6 }}
```

## Building Complex Conditional Logic

Named templates can contain sophisticated conditional logic. Here's a template that generates volume mounts based on various conditions:

```yaml
{{/*
Generate volume mounts for the application
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
{{- if .Values.secrets.enabled }}
- name: secrets
  mountPath: /etc/secrets
  readOnly: true
{{- end }}
{{- with .Values.extraVolumeMounts }}
{{- toYaml . }}
{{- end }}
{{- end -}}
```

## Creating Resource Request Templates

Generate resource requests and limits based on preset profiles:

```yaml
{{/*
Generate resource requirements based on size
*/}}
{{- define "myapp.resources" -}}
{{- $size := .Values.resources.preset | default "medium" -}}
{{- if eq $size "small" }}
requests:
  memory: "256Mi"
  cpu: "250m"
limits:
  memory: "512Mi"
  cpu: "500m"
{{- else if eq $size "medium" }}
requests:
  memory: "512Mi"
  cpu: "500m"
limits:
  memory: "1Gi"
  cpu: "1000m"
{{- else if eq $size "large" }}
requests:
  memory: "1Gi"
  cpu: "1000m"
limits:
  memory: "2Gi"
  cpu: "2000m"
{{- else }}
{{- toYaml .Values.resources.custom }}
{{- end }}
{{- end -}}
```

Use it in your container spec:

```yaml
containers:
- name: {{ .Chart.Name }}
  resources:
    {{- include "myapp.resources" . | nindent 4 }}
```

## Building Service Account Templates

Create a template that intelligently handles service account creation:

```yaml
{{/*
Create the name of the service account to use
*/}}
{{- define "myapp.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "myapp.fullname" .) .Values.serviceAccount.name }}
{{- else -}}
{{- default "default" .Values.serviceAccount.name }}
{{- end -}}
{{- end -}}

{{/*
Service account annotations
*/}}
{{- define "myapp.serviceAccountAnnotations" -}}
{{- if .Values.serviceAccount.annotations }}
{{- toYaml .Values.serviceAccount.annotations }}
{{- end }}
{{- if .Values.serviceAccount.awsRoleArn }}
eks.amazonaws.com/role-arn: {{ .Values.serviceAccount.awsRoleArn }}
{{- end }}
{{- end -}}
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
fsGroup: {{ .Values.podSecurityContext.fsGroup | default 1000 }}
seccompProfile:
  type: {{ .Values.podSecurityContext.seccompProfile | default "RuntimeDefault" }}
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
readOnlyRootFilesystem: {{ .Values.securityContext.readOnlyRootFilesystem | default true }}
{{- end }}
{{- end -}}
```

## Advanced Template Composition

You can compose multiple templates together to build complex structures:

```yaml
{{/*
Generate ingress rules from a list of hosts
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
      pathType: {{ .pathType | default "Prefix" }}
      backend:
        service:
          name: {{ $fullName }}
          port:
            number: {{ $svcPort }}
    {{- end }}
{{- end }}
{{- end -}}
```

## Testing Named Templates

Test your templates by rendering them with different values:

```bash
# Create a test values file
cat > test-values.yaml <<EOF
replicaCount: 3
resources:
  preset: large
serviceAccount:
  create: true
  awsRoleArn: arn:aws:iam::123456789:role/my-role
EOF

# Render the template
helm template myapp ./mychart -f test-values.yaml

# Check specific templates
helm template myapp ./mychart -f test-values.yaml -s templates/deployment.yaml
```

## Best Practices for Named Templates

Keep templates focused on a single responsibility. Break complex logic into smaller, composable templates. Always document your templates with comments explaining their purpose and expected inputs.

Use consistent naming conventions, typically `<chartname>.<function>`. Leverage the `include` function instead of `template` when you need to apply additional transformations. Validate your template output with different value combinations to ensure they work correctly.

Named templates transform your Helm charts from simple configurations into powerful, reusable infrastructure code. They enable you to build sophisticated deployment patterns while keeping your charts maintainable and easy to understand.
