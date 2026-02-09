# How to Use ConfigMap Generators in Helm with Rolling Hash Suffixes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Helm, ConfigMaps

Description: Learn how to implement ConfigMap generators in Helm charts with automatic hash suffixes for zero-downtime configuration updates and safe rollbacks.

---

Helm charts typically create ConfigMaps with static names. When you update configuration, Helm updates the ConfigMap in place, but pods don't restart automatically. This leaves you with pods running old config and new config simultaneously, creating inconsistent behavior and potential bugs.

Adding hash suffixes to ConfigMap names solves this. When configuration changes, a new ConfigMap is created with a new hash, deployments reference the new ConfigMap, and Kubernetes performs a rolling restart. Old ConfigMaps remain until the rollout completes, enabling safe rollbacks.

In this guide, you'll learn how to implement hash-based ConfigMap naming in Helm, automate suffix generation, handle references, and manage cleanup of old ConfigMaps.

## The Problem with Static Names

Standard Helm approach:

```yaml
# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-config
data:
  app.conf: |
    {{ .Values.config.app | nindent 4 }}
---
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  template:
    spec:
      containers:
      - name: app
        volumeMounts:
        - name: config
          mountPath: /etc/config
      volumes:
      - name: config
        configMap:
          name: {{ .Release.Name }}-config  # Static name
```

When you update values.yaml and run `helm upgrade`, the ConfigMap changes but pods don't restart.

## Implementing Hash Suffixes

Generate hash from ConfigMap data:

```yaml
# templates/configmap.yaml
{{- $configData := .Values.config | toYaml }}
{{- $configHash := $configData | sha256sum | trunc 10 }}
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-config-{{ $configHash }}
  labels:
    app: {{ .Release.Name }}
    config-version: {{ $configHash }}
data:
  app.conf: |
    {{ .Values.config.app | nindent 4 }}
  database.conf: |
    {{ .Values.config.database | nindent 4 }}
---
# templates/deployment.yaml
{{- $configData := .Values.config | toYaml }}
{{- $configHash := $configData | sha256sum | trunc 10 }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  template:
    metadata:
      annotations:
        config-hash: {{ $configHash }}  # Triggers restart on change
    spec:
      containers:
      - name: app
        volumeMounts:
        - name: config
          mountPath: /etc/config
      volumes:
      - name: config
        configMap:
          name: {{ .Release.Name }}-config-{{ $configHash }}
```

Now when configuration changes:
1. New hash is computed
2. New ConfigMap is created
3. Deployment references new ConfigMap
4. Kubernetes triggers rolling update

## Using Helm Helper Functions

Create a reusable helper for hash generation:

```yaml
# templates/_helpers.tpl
{{/*
Generate config hash from values
*/}}
{{- define "mychart.configHash" -}}
{{- .Values.config | toYaml | sha256sum | trunc 10 -}}
{{- end -}}

{{/*
Generate full ConfigMap name with hash
*/}}
{{- define "mychart.configMapName" -}}
{{ .Release.Name }}-config-{{ include "mychart.configHash" . }}
{{- end -}}
```

Use in templates:

```yaml
# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "mychart.configMapName" . }}
data:
  app.conf: |
    {{ .Values.config.app | nindent 4 }}
---
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  template:
    spec:
      volumes:
      - name: config
        configMap:
          name: {{ include "mychart.configMapName" . }}
```

## Multiple ConfigMaps with Hashes

Handle multiple ConfigMaps with different content:

```yaml
# templates/_helpers.tpl
{{- define "mychart.appConfigHash" -}}
{{- .Values.appConfig | toYaml | sha256sum | trunc 10 -}}
{{- end -}}

{{- define "mychart.nginxConfigHash" -}}
{{- .Values.nginxConfig | toYaml | sha256sum | trunc 10 -}}
{{- end -}}

{{- define "mychart.appConfigMapName" -}}
{{ .Release.Name }}-app-config-{{ include "mychart.appConfigHash" . }}
{{- end -}}

{{- define "mychart.nginxConfigMapName" -}}
{{ .Release.Name }}-nginx-config-{{ include "mychart.nginxConfigHash" . }}
{{- end -}}
```

Templates:

```yaml
# templates/configmap-app.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "mychart.appConfigMapName" . }}
data:
  config.yaml: |
    {{ .Values.appConfig | toYaml | nindent 4 }}
---
# templates/configmap-nginx.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "mychart.nginxConfigMapName" . }}
data:
  nginx.conf: |
    {{ .Values.nginxConfig.conf | nindent 4 }}
---
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  template:
    spec:
      containers:
      - name: app
        volumeMounts:
        - name: app-config
          mountPath: /etc/app
        - name: nginx-config
          mountPath: /etc/nginx
      volumes:
      - name: app-config
        configMap:
          name: {{ include "mychart.appConfigMapName" . }}
      - name: nginx-config
        configMap:
          name: {{ include "mychart.nginxConfigMapName" . }}
```

## Automatic Cleanup Hook

Clean up old ConfigMaps during helm upgrade:

```yaml
# templates/cleanup-hook.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ .Release.Name }}-cleanup-{{ now | date "20060102150405" }}
  annotations:
    "helm.sh/hook": pre-upgrade,pre-rollback
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  template:
    spec:
      serviceAccountName: {{ .Release.Name }}-cleanup
      restartPolicy: Never
      containers:
      - name: cleanup
        image: bitnami/kubectl:latest
        command:
        - /bin/bash
        - -c
        - |
          # Current hash
          CURRENT_HASH="{{ include "mychart.configHash" . }}"

          # Delete old ConfigMaps (keep current + 2 previous versions)
          kubectl get configmap -n {{ .Release.Namespace }} \
            -l app={{ .Release.Name }} \
            -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | \
            grep "{{ .Release.Name }}-config-" | \
            grep -v "${CURRENT_HASH}" | \
            sort -r | \
            tail -n +3 | \
            xargs -r kubectl delete configmap -n {{ .Release.Namespace }}
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {{ .Release.Name }}-cleanup
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: {{ .Release.Name }}-cleanup
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: {{ .Release.Name }}-cleanup
subjects:
- kind: ServiceAccount
  name: {{ .Release.Name }}-cleanup
roleRef:
  kind: Role
  name: {{ .Release.Name }}-cleanup
  apiGroup: rbac.authorization.k8s.io
```

## Real-World Example: Multi-Component Application

Complete Helm chart with hash suffixes:

```yaml
# values.yaml
appConfig:
  server:
    port: 8080
    timeout: 30
  logging:
    level: info
    format: json
  features:
    darkMode: true
    analytics: false

databaseConfig:
  host: postgres.example.com
  port: 5432
  pool_size: 20
  ssl: true

nginxConfig:
  conf: |
    worker_processes auto;
    events {
      worker_connections 1024;
    }
    http {
      upstream backend {
        server localhost:8080;
      }
    }
```

Helpers:

```yaml
# templates/_helpers.tpl
{{- define "myapp.name" -}}
{{ .Chart.Name }}
{{- end -}}

{{- define "myapp.appConfigHash" -}}
{{- .Values.appConfig | toYaml | sha256sum | trunc 10 -}}
{{- end -}}

{{- define "myapp.databaseConfigHash" -}}
{{- .Values.databaseConfig | toYaml | sha256sum | trunc 10 -}}
{{- end -}}

{{- define "myapp.nginxConfigHash" -}}
{{- .Values.nginxConfig | toYaml | sha256sum | trunc 10 -}}
{{- end -}}

{{- define "myapp.appConfigMapName" -}}
{{ .Release.Name }}-app-config-{{ include "myapp.appConfigHash" . }}
{{- end -}}

{{- define "myapp.databaseConfigMapName" -}}
{{ .Release.Name }}-database-config-{{ include "myapp.databaseConfigHash" . }}
{{- end -}}

{{- define "myapp.nginxConfigMapName" -}}
{{ .Release.Name }}-nginx-config-{{ include "myapp.nginxConfigHash" . }}
{{- end -}}
```

ConfigMaps:

```yaml
# templates/configmap-app.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "myapp.appConfigMapName" . }}
  labels:
    app: {{ include "myapp.name" . }}
    component: app-config
data:
  config.yaml: |
    {{ .Values.appConfig | toYaml | nindent 4 }}
---
# templates/configmap-database.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "myapp.databaseConfigMapName" . }}
  labels:
    app: {{ include "myapp.name" . }}
    component: database-config
data:
  database.yaml: |
    {{ .Values.databaseConfig | toYaml | nindent 4 }}
---
# templates/configmap-nginx.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "myapp.nginxConfigMapName" . }}
  labels:
    app: {{ include "myapp.name" . }}
    component: nginx-config
data:
  nginx.conf: |
    {{ .Values.nginxConfig.conf | nindent 4 }}
```

Deployment:

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ include "myapp.name" . }}
  template:
    metadata:
      labels:
        app: {{ include "myapp.name" . }}
      annotations:
        app-config-hash: {{ include "myapp.appConfigHash" . }}
        database-config-hash: {{ include "myapp.databaseConfigHash" . }}
        nginx-config-hash: {{ include "myapp.nginxConfigHash" . }}
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx
      - name: app
        image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
        volumeMounts:
        - name: app-config
          mountPath: /etc/app
        - name: database-config
          mountPath: /etc/database
      volumes:
      - name: app-config
        configMap:
          name: {{ include "myapp.appConfigMapName" . }}
      - name: database-config
        configMap:
          name: {{ include "myapp.databaseConfigMapName" . }}
      - name: nginx-config
        configMap:
          name: {{ include "myapp.nginxConfigMapName" . }}
```

## Testing Hash Generation

Test your hash implementation:

```bash
# Install with specific config
helm install myapp ./mychart --set appConfig.logging.level=debug

# Check generated ConfigMap name
kubectl get configmap -l app=myapp

# Update configuration
helm upgrade myapp ./mychart --set appConfig.logging.level=info

# Verify new ConfigMap created
kubectl get configmap -l app=myapp

# Check deployment updated
kubectl get deployment myapp -o yaml | grep config
```

## Best Practices

1. **Use consistent hash length**: Standardize on 10 characters for all hashes.

2. **Include hash in labels**: Add config hash to labels for easy identification.

3. **Add annotations**: Include hash in pod template annotations to trigger restarts.

4. **Implement cleanup**: Use hooks to remove old ConfigMaps automatically.

5. **Keep old versions**: Retain 2-3 previous ConfigMap versions for rollbacks.

6. **Document helpers**: Comment your _helpers.tpl functions clearly.

7. **Test rollbacks**: Verify that Helm rollback works correctly with hash-based naming.

8. **Use semantic versioning**: Consider including version in ConfigMap metadata for tracking.

ConfigMap hash suffixes in Helm enable zero-downtime configuration updates through Kubernetes native rolling updates. By automatically generating unique names when configuration changes, you ensure pods always use consistent config and eliminate the manual coordination required with static ConfigMap names. Combined with automated cleanup, this approach provides a complete solution for configuration lifecycle management in Helm charts.
