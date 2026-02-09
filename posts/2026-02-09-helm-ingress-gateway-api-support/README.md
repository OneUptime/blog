# How to Build Helm Charts That Support Both Ingress and Gateway API Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, Networking

Description: Learn how to create flexible Helm charts that support both traditional Ingress resources and the new Gateway API, enabling seamless migration and multi-environment compatibility.

---

Kubernetes networking is evolving from the Ingress API to the more powerful Gateway API. As teams transition between these standards, Helm charts need to support both approaches to work across different cluster versions and organizational preferences. Building charts with dual support ensures maximum compatibility while enabling teams to adopt the new Gateway API at their own pace.

## Understanding the Two APIs

The traditional Ingress API provides basic HTTP routing capabilities through a single resource type. The Gateway API offers more advanced features with separate resources for infrastructure (Gateway) and routing (HTTPRoute, GRPCRoute). While Ingress remains widely deployed, Gateway API provides better role separation, more sophisticated routing, and enhanced traffic management.

Your chart should detect which API is available and create appropriate resources based on configuration and cluster capabilities.

## Structuring Values for Dual Support

Design your values file to accommodate both approaches:

```yaml
# values.yaml
ingress:
  enabled: true
  className: nginx
  annotations: {}
  hosts:
    - host: app.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: app-tls
      hosts:
        - app.example.com

gateway:
  enabled: false
  gatewayClassName: istio
  gatewayName: default-gateway
  listeners:
    - name: http
      protocol: HTTP
      port: 80
      hostname: app.example.com
    - name: https
      protocol: HTTPS
      port: 443
      hostname: app.example.com
      tls:
        certificateRefs:
          - name: app-tls
  routes:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: api-service
          port: 8080
```

This structure allows users to enable either or both approaches depending on their needs.

## Creating the Ingress Template

Build a standard Ingress template that follows best practices:

```yaml
# templates/ingress.yaml
{{- if and .Values.ingress.enabled (not .Values.gateway.enabled) -}}
{{- $fullName := include "myapp.fullname" . -}}
{{- $svcPort := .Values.service.port -}}
{{- if .Capabilities.APIVersions.Has "networking.k8s.io/v1" -}}
apiVersion: networking.k8s.io/v1
{{- else if .Capabilities.APIVersions.Has "networking.k8s.io/v1beta1" -}}
apiVersion: networking.k8s.io/v1beta1
{{- else -}}
apiVersion: extensions/v1beta1
{{- end }}
kind: Ingress
metadata:
  name: {{ $fullName }}
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
            {{- if $.Capabilities.APIVersions.Has "networking.k8s.io/v1" }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ $fullName }}
                port:
                  number: {{ $svcPort }}
            {{- else }}
            backend:
              serviceName: {{ $fullName }}
              servicePort: {{ $svcPort }}
            {{- end }}
          {{- end }}
    {{- end }}
{{- end }}
```

The template checks Kubernetes version to use the correct Ingress API version and only renders when Ingress is enabled and Gateway is disabled.

## Creating Gateway API Templates

Gateway API uses multiple resources. Create a Gateway template:

```yaml
# templates/gateway.yaml
{{- if and .Values.gateway.enabled (not .Values.ingress.enabled) -}}
{{- if .Capabilities.APIVersions.Has "gateway.networking.k8s.io/v1" -}}
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  gatewayClassName: {{ .Values.gateway.gatewayClassName }}
  listeners:
  {{- range .Values.gateway.listeners }}
  - name: {{ .name }}
    protocol: {{ .protocol }}
    port: {{ .port }}
    {{- if .hostname }}
    hostname: {{ .hostname | quote }}
    {{- end }}
    {{- if .tls }}
    tls:
      mode: {{ .tls.mode | default "Terminate" }}
      {{- if .tls.certificateRefs }}
      certificateRefs:
      {{- range .tls.certificateRefs }}
      - kind: Secret
        name: {{ .name }}
        {{- if .namespace }}
        namespace: {{ .namespace }}
        {{- end }}
      {{- end }}
      {{- end }}
    {{- end }}
    {{- if .allowedRoutes }}
    allowedRoutes:
      {{- toYaml .allowedRoutes | nindent 6 }}
    {{- end }}
  {{- end }}
{{- end }}
{{- end }}
```

Create the HTTPRoute template:

```yaml
# templates/httproute.yaml
{{- if and .Values.gateway.enabled (not .Values.ingress.enabled) -}}
{{- if .Capabilities.APIVersions.Has "gateway.networking.k8s.io/v1" -}}
{{- $fullName := include "myapp.fullname" . -}}
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: {{ $fullName }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  parentRefs:
  - name: {{ .Values.gateway.gatewayName | default $fullName }}
    {{- if .Values.gateway.namespace }}
    namespace: {{ .Values.gateway.namespace }}
    {{- end }}
  {{- if .Values.gateway.hostnames }}
  hostnames:
  {{- range .Values.gateway.hostnames }}
  - {{ . | quote }}
  {{- end }}
  {{- end }}
  rules:
  {{- range .Values.gateway.routes }}
  - matches:
    {{- if .matches }}
    {{- range .matches }}
    - path:
        type: {{ .path.type | default "PathPrefix" }}
        value: {{ .path.value | quote }}
      {{- if .headers }}
      headers:
      {{- range .headers }}
      - name: {{ .name }}
        value: {{ .value }}
      {{- end }}
      {{- end }}
      {{- if .queryParams }}
      queryParams:
      {{- range .queryParams }}
      - name: {{ .name }}
        value: {{ .value }}
      {{- end }}
      {{- end }}
    {{- end }}
    {{- else }}
    - path:
        type: PathPrefix
        value: /
    {{- end }}
    {{- if .filters }}
    filters:
    {{- toYaml .filters | nindent 4 }}
    {{- end }}
    backendRefs:
    {{- range .backendRefs }}
    - name: {{ .name | default $fullName }}
      port: {{ .port }}
      {{- if .weight }}
      weight: {{ .weight }}
      {{- end }}
    {{- end }}
  {{- end }}
{{- end }}
{{- end }}
```

## Creating a Flexible Network Policy

Network policies work with both approaches:

```yaml
# templates/networkpolicy.yaml
{{- if .Values.networkPolicy.enabled -}}
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  podSelector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    {{- if .Values.ingress.enabled }}
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    {{- end }}
    {{- if .Values.gateway.enabled }}
    - namespaceSelector:
        matchLabels:
          name: {{ .Values.gateway.namespace | default "gateway-system" }}
    {{- end }}
    ports:
    - protocol: TCP
      port: {{ .Values.service.port }}
  egress:
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
{{- end }}
```

## Building a Helper Template for URL Generation

Create helpers that work with both APIs:

```yaml
# templates/_helpers.tpl
{{/*
Generate the application URL
*/}}
{{- define "myapp.url" -}}
{{- if .Values.ingress.enabled -}}
{{- $host := index .Values.ingress.hosts 0 -}}
{{- if .Values.ingress.tls -}}
https://{{ $host.host }}
{{- else -}}
http://{{ $host.host }}
{{- end -}}
{{- else if .Values.gateway.enabled -}}
{{- $listener := index .Values.gateway.listeners 0 -}}
{{- if eq $listener.protocol "HTTPS" -}}
https://{{ $listener.hostname }}
{{- else -}}
http://{{ $listener.hostname }}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Check if TLS is enabled
*/}}
{{- define "myapp.tlsEnabled" -}}
{{- if .Values.ingress.enabled -}}
{{- if .Values.ingress.tls -}}
true
{{- end -}}
{{- else if .Values.gateway.enabled -}}
{{- range .Values.gateway.listeners -}}
{{- if .tls -}}
true
{{- end -}}
{{- end -}}
{{- end -}}
{{- end -}}
```

## Creating Advanced Gateway Features

Leverage Gateway API's advanced capabilities:

```yaml
# templates/httproute-advanced.yaml
{{- if .Values.gateway.enabled -}}
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: {{ include "myapp.fullname" . }}-advanced
spec:
  parentRefs:
  - name: {{ .Values.gateway.gatewayName }}
  rules:
  # Traffic splitting for canary deployments
  - matches:
    - path:
        type: PathPrefix
        value: /api
      headers:
      - name: X-Canary
        value: "true"
    backendRefs:
    - name: {{ include "myapp.fullname" . }}-canary
      port: 8080
      weight: 20
    - name: {{ include "myapp.fullname" . }}
      port: 8080
      weight: 80

  # Header-based routing
  - matches:
    - path:
        type: PathPrefix
        value: /admin
      headers:
      - name: X-Admin-Token
        value: required
    filters:
    - type: RequestHeaderModifier
      requestHeaderModifier:
        add:
        - name: X-Forwarded-Role
          value: admin
    backendRefs:
    - name: {{ include "myapp.fullname" . }}-admin
      port: 8080

  # Request mirroring
  - matches:
    - path:
        type: PathPrefix
        value: /
    filters:
    - type: RequestMirror
      requestMirror:
        backendRef:
          name: {{ include "myapp.fullname" . }}-mirror
          port: 8080
    backendRefs:
    - name: {{ include "myapp.fullname" . }}
      port: 8080
{{- end }}
```

## Documentation for Users

Add NOTES.txt guidance:

```yaml
# templates/NOTES.txt
Your application has been deployed!

{{- if or .Values.ingress.enabled .Values.gateway.enabled }}

Access your application at:
{{ include "myapp.url" . }}

{{- if .Values.ingress.enabled }}
Using Ingress Controller: {{ .Values.ingress.className }}
{{- end }}

{{- if .Values.gateway.enabled }}
Using Gateway API with Gateway Class: {{ .Values.gateway.gatewayClassName }}
{{- end }}

{{- else }}

To access your application, use port forwarding:
kubectl port-forward svc/{{ include "myapp.fullname" . }} 8080:{{ .Values.service.port }}

Then visit: http://localhost:8080

{{- end }}
```

## Testing Both Configurations

Create separate values files for testing:

```yaml
# values-ingress.yaml
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: app-ingress.example.com
      paths:
        - path: /
          pathType: Prefix

gateway:
  enabled: false
```

```yaml
# values-gateway.yaml
ingress:
  enabled: false

gateway:
  enabled: true
  gatewayClassName: istio
  gatewayName: shared-gateway
  hostnames:
    - app-gateway.example.com
  routes:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - port: 8080
```

Test both configurations:

```bash
# Test Ingress
helm template myapp ./mychart -f values-ingress.yaml

# Test Gateway API
helm template myapp ./mychart -f values-gateway.yaml

# Install with Ingress
helm install myapp ./mychart -f values-ingress.yaml

# Upgrade to Gateway API
helm upgrade myapp ./mychart -f values-gateway.yaml
```

Building Helm charts with dual Ingress and Gateway API support ensures your applications work across diverse Kubernetes environments. This flexibility allows teams to adopt the new Gateway API gradually while maintaining compatibility with existing Ingress-based infrastructure.
