# How to Pass ARGOCD_APP_NAME to Manifest Generation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Manifest Generation, Build Variables

Description: Learn how to pass and use the ARGOCD_APP_NAME environment variable during manifest generation in ArgoCD for dynamic configuration based on application identity.

---

The `ARGOCD_APP_NAME` environment variable contains the name of the ArgoCD Application that is currently being rendered. This variable is available during manifest generation on the repo server and is one of the most useful build environment variables for creating dynamic, reusable manifests.

This guide shows you how to use `ARGOCD_APP_NAME` across different config management tools in ArgoCD.

## What ARGOCD_APP_NAME Contains

When ArgoCD renders manifests for an Application, the `ARGOCD_APP_NAME` variable is set to the Application's metadata.name value:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api-production    # This becomes ARGOCD_APP_NAME
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/config-repo.git
    targetRevision: main
    path: apps/backend-api
```

In this example, `ARGOCD_APP_NAME` is `backend-api-production`.

## Using ARGOCD_APP_NAME in Helm

### As a Parameter

Pass the app name as a Helm parameter:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api-production
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/helm-charts.git
    targetRevision: main
    path: charts/backend-api
    helm:
      parameters:
        - name: argocdAppName
          value: $ARGOCD_APP_NAME
  destination:
    server: https://kubernetes.default.svc
    namespace: backend-api
```

Then use it in your Helm templates:

```yaml
# charts/backend-api/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "backend-api.fullname" . }}
  labels:
    {{- include "backend-api.labels" . | nindent 4 }}
  annotations:
    argocd.argoproj.io/app-name: {{ .Values.argocdAppName | default "unknown" | quote }}
spec:
  template:
    metadata:
      labels:
        {{- include "backend-api.selectorLabels" . | nindent 8 }}
      annotations:
        argocd.argoproj.io/app-name: {{ .Values.argocdAppName | default "unknown" | quote }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          env:
            # Pass the ArgoCD app name to the application as an env var
            - name: ARGOCD_APP_NAME
              value: {{ .Values.argocdAppName | default "unknown" | quote }}
```

### In Values for Dynamic Naming

Use the app name to derive resource names:

```yaml
# values.yaml
argocdAppName: ""    # Will be overridden by $ARGOCD_APP_NAME

# templates/service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: {{ .Values.argocdAppName | default .Release.Name }}-monitor
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: {{ include "backend-api.name" . }}
  endpoints:
    - port: metrics
      interval: 30s
```

## Using ARGOCD_APP_NAME in Custom Plugins

Custom Config Management Plugins have direct access to all build environment variables:

```yaml
# plugin.yaml (sidecar configuration)
apiVersion: argoproj.io/v1alpha1
kind: ConfigManagementPlugin
metadata:
  name: dynamic-generator
spec:
  version: v1.0
  generate:
    command:
      - sh
      - -c
      - |
        echo "Generating manifests for app: $ARGOCD_APP_NAME"

        # Extract environment from app name
        # e.g., backend-api-production -> production
        ENV=$(echo "$ARGOCD_APP_NAME" | rev | cut -d'-' -f1 | rev)

        # Extract service name from app name
        # e.g., backend-api-production -> backend-api
        SERVICE=$(echo "$ARGOCD_APP_NAME" | sed "s/-${ENV}$//")

        # Generate manifests based on the app name
        cat <<MANIFEST
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: ${SERVICE}
          labels:
            app: ${SERVICE}
            environment: ${ENV}
            managed-by: ${ARGOCD_APP_NAME}
        spec:
          selector:
            matchLabels:
              app: ${SERVICE}
          template:
            metadata:
              labels:
                app: ${SERVICE}
                environment: ${ENV}
            spec:
              containers:
                - name: ${SERVICE}
                  image: myorg/${SERVICE}:latest
        MANIFEST
```

## Using ARGOCD_APP_NAME with Jsonnet

Jsonnet can access environment variables through the `std.extVar` function. First, configure the Application to pass it:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api-staging
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/config-repo.git
    targetRevision: main
    path: apps/backend-api
    directory:
      jsonnet:
        extVars:
          - name: argocdAppName
            value: $ARGOCD_APP_NAME
```

In your Jsonnet file:

```jsonnet
// main.jsonnet
local appName = std.extVar('argocdAppName');
local parts = std.split(appName, '-');
local env = parts[std.length(parts) - 1];

{
  deployment: {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: appName,
      labels: {
        app: appName,
        environment: env,
      },
    },
    spec: {
      replicas: if env == 'production' then 3 else 1,
      selector: {
        matchLabels: {
          app: appName,
        },
      },
      template: {
        metadata: {
          labels: {
            app: appName,
          },
        },
        spec: {
          containers: [{
            name: 'app',
            image: 'myorg/%s:latest' % appName,
          }],
        },
      },
    },
  },
}
```

## Practical Use Cases for ARGOCD_APP_NAME

### Unique Resource Naming Across Environments

When the same base manifests are used for multiple environments, the app name helps create unique resource names:

```yaml
# ApplicationSet that creates per-environment apps
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: backend-api
spec:
  generators:
    - list:
        elements:
          - env: dev
          - env: staging
          - env: production
  template:
    metadata:
      name: 'backend-api-{{env}}'
    spec:
      source:
        repoURL: https://github.com/myorg/config-repo.git
        targetRevision: main
        path: apps/backend-api
        helm:
          parameters:
            - name: argocdAppName
              value: $ARGOCD_APP_NAME
            - name: environment
              value: '{{env}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: 'backend-api-{{env}}'
```

### Monitoring and Alerting Labels

Use the app name in monitoring labels so alerts include the ArgoCD application context:

```yaml
# templates/deployment.yaml
metadata:
  labels:
    argocd-app: {{ .Values.argocdAppName | quote }}
```

Then in your Prometheus alerting rules:

```yaml
groups:
  - name: deployment-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          rate(http_errors_total[5m]) > 0.1
        labels:
          severity: critical
        annotations:
          summary: "High error rate in {{ $labels.argocd_app }}"
```

### Logging Context

Pass the app name to your application so it appears in logs:

```yaml
containers:
  - name: backend
    env:
      - name: ARGOCD_APP
        value: {{ .Values.argocdAppName | quote }}
```

In your application code:

```python
import os
import logging

logger = logging.getLogger(__name__)
app_name = os.environ.get('ARGOCD_APP', 'unknown')

logger.info(f"Starting application managed by ArgoCD app: {app_name}")
```

### Conditional Resource Creation

Create resources conditionally based on the app name:

```yaml
# Only create HPA for production apps
{{- if contains "production" .Values.argocdAppName }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "backend-api.fullname" . }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "backend-api.fullname" . }}
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
{{- end }}
```

## Debugging ARGOCD_APP_NAME

If the variable is not being substituted correctly:

1. Check that you are using the `$ARGOCD_APP_NAME` syntax (with the dollar sign) in parameter values
2. Verify the Application has a `metadata.name` field set
3. For custom plugins, check the repo server logs for the variable value:

```bash
kubectl logs -n argocd deployment/argocd-repo-server | grep "ARGOCD_APP_NAME"
```

4. Test your plugin locally by setting the environment variable manually:

```bash
ARGOCD_APP_NAME=test-app python3 generate.py
```

## Summary

The `ARGOCD_APP_NAME` variable is a simple but powerful tool for creating dynamic, context-aware manifests in ArgoCD. Pass it as a Helm parameter, access it directly in custom plugins, or use it in Jsonnet external variables. Common uses include resource naming, monitoring labels, logging context, and conditional resource creation based on the application identity. This variable enables you to write reusable manifest templates that adapt their behavior based on which ArgoCD Application is rendering them.
