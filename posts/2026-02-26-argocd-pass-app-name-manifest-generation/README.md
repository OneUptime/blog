# How to Pass ARGOCD_APP_NAME to Manifest Generation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Manifest Generation

Description: Learn how to pass the ARGOCD_APP_NAME environment variable to Helm, Kustomize, and custom plugins during manifest generation for dynamic resource naming.

---

The `ARGOCD_APP_NAME` environment variable contains the name of the ArgoCD Application that is being synced. Passing this value into your manifest generation process lets you dynamically name resources, add tracking labels, create application-specific configurations, and implement logic that adapts based on which application is being deployed. This is particularly useful when you have a single chart or Kustomize base that serves multiple applications.

## Why Pass ARGOCD_APP_NAME?

Consider a scenario where you have one Helm chart used by ten different microservices. Each microservice is a separate ArgoCD Application pointing to the same chart with different values. By passing `ARGOCD_APP_NAME`, your chart can automatically derive the service name, configure monitoring labels, and set up service discovery without requiring each application to manually specify its name in every values file.

Another common use case is auditing. When you include the ArgoCD Application name in pod annotations or ConfigMaps, you can easily trace any running pod back to the ArgoCD Application that manages it.

## Passing ARGOCD_APP_NAME to Helm

ArgoCD does not automatically pass build environment variables to Helm. You need to explicitly map them in the Application spec:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-service-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/helm-charts.git
    path: charts/microservice
    targetRevision: main
    helm:
      parameters:
        # Pass ARGOCD_APP_NAME as a Helm value
        - name: argocd.appName
          value: $ARGOCD_APP_NAME
      valueFiles:
        - values.yaml
        - ../../environments/production/user-service.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

The `$ARGOCD_APP_NAME` syntax tells ArgoCD to substitute the variable's value. In this example, it would be replaced with `user-service-production`.

Now use it in your Helm templates:

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "microservice.fullname" . }}
  labels:
    {{- include "microservice.labels" . | nindent 4 }}
    argocd-app: {{ .Values.argocd.appName | default "unknown" }}
  annotations:
    argocd.argoproj.io/managed-by: {{ .Values.argocd.appName | default "unknown" }}
spec:
  selector:
    matchLabels:
      {{- include "microservice.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "microservice.selectorLabels" . | nindent 8 }}
        argocd-app: {{ .Values.argocd.appName | default "unknown" }}
      annotations:
        argocd-app-name: {{ .Values.argocd.appName | default "unknown" }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          env:
            # Make the app name available to the running application
            - name: ARGOCD_APP_NAME
              value: {{ .Values.argocd.appName | default "unknown" | quote }}
```

## Deriving Configuration from the App Name

You can parse the ArgoCD Application name to derive other configuration values. A common naming convention is `<service>-<environment>`:

```yaml
# templates/_helpers.tpl
{{- define "microservice.environment" -}}
{{- if .Values.argocd.appName -}}
{{- .Values.argocd.appName | splitList "-" | last -}}
{{- else -}}
unknown
{{- end -}}
{{- end -}}

{{- define "microservice.serviceName" -}}
{{- if .Values.argocd.appName -}}
{{- $parts := splitList "-" .Values.argocd.appName -}}
{{- $parts = without $parts (last $parts) -}}
{{- join "-" $parts -}}
{{- else -}}
{{ include "microservice.fullname" . }}
{{- end -}}
{{- end -}}
```

Use these helpers in your templates:

```yaml
# templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ include "microservice.serviceName" . }}
  labels:
    environment: {{ include "microservice.environment" . }}
```

## Passing to Kustomize via CMP

Kustomize does not natively support environment variable substitution. To pass `ARGOCD_APP_NAME` to Kustomize, use a Config Management Plugin:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kustomize-with-env-plugin
  namespace: argocd
data:
  plugin.yaml: |
    apiVersion: argoproj.io/v1alpha1
    kind: ConfigManagementPlugin
    metadata:
      name: kustomize-with-env
    spec:
      version: v1.0
      generate:
        command: ["/bin/bash", "-c"]
        args:
          - |
            # Build with Kustomize, then substitute environment variables
            kustomize build . | envsubst
```

In your Kustomize manifests, use shell-style variable references:

```yaml
# base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: deploy-metadata
data:
  MANAGED_BY_APP: "${ARGOCD_APP_NAME}"
  SOURCE_PATH: "${ARGOCD_APP_SOURCE_PATH}"
```

Configure your ArgoCD Application to use the plugin:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/app-config.git
    path: apps/my-app/overlays/production
    plugin:
      name: kustomize-with-env
```

## Using with ApplicationSets

When combined with ApplicationSets, `ARGOCD_APP_NAME` becomes even more powerful. Each generated application gets its own name, and your manifests adapt automatically:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservices
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - service: user-service
            env: production
          - service: order-service
            env: production
          - service: payment-service
            env: production
  template:
    metadata:
      name: '{{service}}-{{env}}'  # This becomes ARGOCD_APP_NAME
    spec:
      source:
        repoURL: https://github.com/myorg/helm-charts.git
        path: charts/microservice
        helm:
          parameters:
            - name: argocd.appName
              value: $ARGOCD_APP_NAME  # Each app gets its own name
            - name: service.name
              value: '{{service}}'
          valueFiles:
            - values.yaml
            - '../../environments/{{env}}/{{service}}.yaml'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{env}}'
```

Each generated application (`user-service-production`, `order-service-production`, etc.) passes its unique name to the Helm chart, enabling the chart to create appropriately named and labeled resources.

## Monitoring Labels Based on App Name

Use the app name to generate consistent monitoring labels:

```yaml
# templates/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: {{ include "microservice.serviceName" . }}
  labels:
    argocd-app: {{ .Values.argocd.appName | default "unknown" }}
spec:
  selector:
    matchLabels:
      app: {{ include "microservice.serviceName" . }}
  endpoints:
    - port: metrics
      interval: 30s
      metricRelabelings:
        - sourceLabels: [__name__]
          targetLabel: argocd_app
          replacement: {{ .Values.argocd.appName | default "unknown" }}
```

This lets you filter metrics by ArgoCD Application name in Prometheus and Grafana:

```promql
# Query metrics for a specific ArgoCD application
rate(http_requests_total{argocd_app="user-service-production"}[5m])
```

## Creating Application-Specific Network Policies

Generate network policies that are scoped to the specific application:

```yaml
# templates/networkpolicy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ .Values.argocd.appName | default (include "microservice.fullname" .) }}-policy
spec:
  podSelector:
    matchLabels:
      argocd-app: {{ .Values.argocd.appName | default "unknown" }}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              argocd-app: {{ .Values.argocd.appName | default "unknown" }}
      ports:
        - port: 8080
```

## Troubleshooting

If `ARGOCD_APP_NAME` is not being substituted, check these common issues:

1. **Missing dollar sign**: The syntax is `$ARGOCD_APP_NAME`, not `ARGOCD_APP_NAME` or `${ARGOCD_APP_NAME}` in the Application spec.

2. **Not enabled for Helm**: Helm requires explicit parameter mapping. The variable is not automatically available in Helm templates.

3. **Plugin not using the variable**: For CMPs, verify the variable is referenced in your generate command:

```bash
# Test the variable is available
argocd app manifests my-app-production | grep -i "argocd"
```

4. **Default values missing**: Always provide a default in your templates to handle cases where the variable is not set:

```yaml
# Good - provides a fallback
value: {{ .Values.argocd.appName | default "unknown" }}

# Bad - will fail if appName is not set
value: {{ .Values.argocd.appName }}
```

## Best Practices

Always provide default values in your templates. During local development or testing outside of ArgoCD, build environment variables will not be set. Defaults prevent template rendering failures.

Use a consistent naming convention for your ArgoCD Applications. Since `ARGOCD_APP_NAME` feeds into resource names and labels, inconsistent naming leads to messy resources. Stick to a pattern like `<service>-<environment>`.

Do not use `ARGOCD_APP_NAME` in immutable fields like label selectors on Deployments. If the ArgoCD Application is ever renamed, the selector change will fail because Kubernetes does not allow modifying selectors on existing resources.

Passing `ARGOCD_APP_NAME` to manifest generation is a small configuration step that unlocks significant benefits for resource tracking, monitoring, and multi-application chart reuse. Combined with ApplicationSets, it creates a powerful pattern where a single chart template serves many services with automatically customized resources.
