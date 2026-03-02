# How to Use Helm Templates for Istio Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Helm, Kubernetes, Template, Configuration

Description: How to use Helm charts and templates to manage Istio custom resources with reusable, parameterized configuration across environments.

---

Helm templates bring a level of flexibility to Istio configuration that plain YAML and even Kustomize cannot match. When you need conditional logic, loops over service lists, or computed values, Helm's Go templating makes it possible. If you manage tens or hundreds of services that all need similar Istio resources, Helm templates let you define the pattern once and stamp out resources for each service.

The trade-off is complexity. Helm templates can become hard to read and debug. But for teams that already use Helm for their application deployments, adding Istio resources to the same chart is a natural extension.

## Basic Chart Structure

Create a Helm chart specifically for Istio resources:

```
istio-config/
  Chart.yaml
  values.yaml
  values-staging.yaml
  values-production.yaml
  templates/
    _helpers.tpl
    virtual-service.yaml
    destination-rule.yaml
    authorization-policy.yaml
    gateway.yaml
```

```yaml
# Chart.yaml
apiVersion: v2
name: istio-config
description: Istio configuration for microservices
version: 1.0.0
```

## Defining Values

The values file contains all the parameters that vary between environments and services:

```yaml
# values.yaml (defaults)
global:
  namespace: default
  mtls: STRICT

gateway:
  enabled: false
  hosts: []
  tls:
    enabled: false
    credentialName: ""

services:
  - name: order-service
    port: 8080
    timeout: 10s
    retries:
      attempts: 2
      perTryTimeout: 5s
    routing:
      canary:
        enabled: false
        weight: 0
    authorization:
      allowedPrincipals:
        - "cluster.local/ns/default/sa/api-gateway"
    connectionPool:
      maxConnections: 100
      http1MaxPendingRequests: 100
    outlierDetection:
      enabled: true
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s

  - name: payment-service
    port: 8080
    timeout: 15s
    retries:
      attempts: 3
      perTryTimeout: 5s
    routing:
      canary:
        enabled: false
        weight: 0
    authorization:
      allowedPrincipals:
        - "cluster.local/ns/default/sa/order-service"
    connectionPool:
      maxConnections: 50
      http1MaxPendingRequests: 50
    outlierDetection:
      enabled: true
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 60s
```

## Creating Templates

### Helper Template

```yaml
# templates/_helpers.tpl
{{- define "istio-config.fullname" -}}
{{- printf "%s" .name -}}
{{- end -}}

{{- define "istio-config.labels" -}}
app: {{ .name }}
chart: istio-config
{{- end -}}
```

### VirtualService Template

```yaml
# templates/virtual-service.yaml
{{- range .Values.services }}
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: {{ .name }}
  namespace: {{ $.Values.global.namespace }}
  labels:
    {{- include "istio-config.labels" . | nindent 4 }}
spec:
  hosts:
    - {{ .name }}
  http:
    - route:
        {{- if .routing.canary.enabled }}
        - destination:
            host: {{ .name }}
            subset: stable
            port:
              number: {{ .port }}
          weight: {{ sub 100 (int .routing.canary.weight) }}
        - destination:
            host: {{ .name }}
            subset: canary
            port:
              number: {{ .port }}
          weight: {{ .routing.canary.weight }}
        {{- else }}
        - destination:
            host: {{ .name }}
            port:
              number: {{ .port }}
        {{- end }}
      timeout: {{ .timeout }}
      retries:
        attempts: {{ .retries.attempts }}
        perTryTimeout: {{ .retries.perTryTimeout }}
        retryOn: 5xx,reset,connect-failure
{{- end }}
```

### DestinationRule Template

```yaml
# templates/destination-rule.yaml
{{- range .Values.services }}
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: {{ .name }}
  namespace: {{ $.Values.global.namespace }}
  labels:
    {{- include "istio-config.labels" . | nindent 4 }}
spec:
  host: {{ .name }}
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: {{ .connectionPool.maxConnections }}
      http:
        http1MaxPendingRequests: {{ .connectionPool.http1MaxPendingRequests }}
        http2MaxRequests: {{ .connectionPool.maxConnections }}
    {{- if .outlierDetection.enabled }}
    outlierDetection:
      consecutive5xxErrors: {{ .outlierDetection.consecutive5xxErrors }}
      interval: {{ .outlierDetection.interval }}
      baseEjectionTime: {{ .outlierDetection.baseEjectionTime }}
    {{- end }}
  {{- if .routing.canary.enabled }}
  subsets:
    - name: stable
      labels:
        version: stable
    - name: canary
      labels:
        version: canary
  {{- end }}
{{- end }}
```

### AuthorizationPolicy Template

```yaml
# templates/authorization-policy.yaml
{{- range .Values.services }}
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: {{ .name }}
  namespace: {{ $.Values.global.namespace }}
  labels:
    {{- include "istio-config.labels" . | nindent 4 }}
spec:
  selector:
    matchLabels:
      app: {{ .name }}
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              {{- range .authorization.allowedPrincipals }}
              - {{ . | quote }}
              {{- end }}
{{- end }}
```

### Gateway Template

```yaml
# templates/gateway.yaml
{{- if .Values.gateway.enabled }}
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: {{ .Values.global.namespace }}-gateway
  namespace: {{ .Values.global.namespace }}
spec:
  selector:
    istio: ingressgateway
  servers:
    {{- if .Values.gateway.tls.enabled }}
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: {{ .Values.gateway.tls.credentialName }}
      hosts:
        {{- range .Values.gateway.hosts }}
        - {{ . | quote }}
        {{- end }}
    {{- end }}
    - port:
        number: 80
        name: http
        protocol: HTTP
      {{- if .Values.gateway.tls.enabled }}
      tls:
        httpsRedirect: true
      {{- end }}
      hosts:
        {{- range .Values.gateway.hosts }}
        - {{ . | quote }}
        {{- end }}
{{- end }}
```

## Environment-Specific Values

```yaml
# values-production.yaml
global:
  namespace: production
  mtls: STRICT

gateway:
  enabled: true
  hosts:
    - orders.example.com
    - payments.example.com
  tls:
    enabled: true
    credentialName: production-tls

services:
  - name: order-service
    port: 8080
    timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
    routing:
      canary:
        enabled: true
        weight: 5
    authorization:
      allowedPrincipals:
        - "cluster.local/ns/production/sa/api-gateway"
        - "cluster.local/ns/production/sa/web-frontend"
    connectionPool:
      maxConnections: 500
      http1MaxPendingRequests: 500
    outlierDetection:
      enabled: true
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 60s

  - name: payment-service
    port: 8080
    timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
    routing:
      canary:
        enabled: false
        weight: 0
    authorization:
      allowedPrincipals:
        - "cluster.local/ns/production/sa/order-service"
    connectionPool:
      maxConnections: 200
      http1MaxPendingRequests: 200
    outlierDetection:
      enabled: true
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 60s
```

## Rendering and Deploying

Preview the rendered templates:

```bash
# Render with default values
helm template istio-config ./istio-config/

# Render for production
helm template istio-config ./istio-config/ -f ./istio-config/values-production.yaml

# Install/upgrade for staging
helm upgrade --install istio-config-staging ./istio-config/ \
  -f ./istio-config/values-staging.yaml \
  -n staging

# Install/upgrade for production
helm upgrade --install istio-config-prod ./istio-config/ \
  -f ./istio-config/values-production.yaml \
  -n production
```

## Validating Templates

Add a test step to verify rendered output:

```bash
#!/bin/bash
for ENV in staging production; do
  echo "Validating $ENV..."

  # Render templates
  helm template istio-config ./istio-config/ \
    -f "./istio-config/values-${ENV}.yaml" > "/tmp/rendered-${ENV}.yaml"

  # Validate with kubectl
  kubectl apply --dry-run=client -f "/tmp/rendered-${ENV}.yaml"

  # Validate with istioctl
  istioctl analyze --use-kube=false -f "/tmp/rendered-${ENV}.yaml"
done
```

## Helm vs Kustomize for Istio

Both tools work, and the choice depends on your use case:

Use Helm when:
- You need to loop over lists of services
- You need conditional logic (enable/disable resources per environment)
- You want computed values
- Your team already uses Helm

Use Kustomize when:
- You prefer plain YAML with minimal tooling
- Changes between environments are small patches
- You want simpler code reviews

Many teams use both: Helm for rendering the base configuration and Kustomize for last-mile environment patches. That works too, though it adds complexity.

Helm templates for Istio resources follow the same patterns as Helm templates for any other Kubernetes resource. The key is keeping your values files clean and well-documented, because that is what people will be editing day to day. The templates should be stable and rarely change once they are working correctly.
