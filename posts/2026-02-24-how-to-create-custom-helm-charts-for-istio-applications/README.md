# How to Create Custom Helm Charts for Istio Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Helm, Kubernetes, Custom Charts, Microservices

Description: Build custom Helm charts that bundle application deployments with Istio networking and security resources for consistent service mesh configuration.

---

When you deploy applications into an Istio mesh, you typically need more than just a Deployment and a Service. You also need VirtualServices for traffic routing, DestinationRules for load balancing policies, AuthorizationPolicies for security, and maybe a PeerAuthentication resource too. Creating a custom Helm chart that bundles all of this together means every service you deploy comes with its mesh configuration baked in.

This walkthrough shows you how to build a production-quality Helm chart that covers both the application and its Istio configuration.

## Scaffolding the Chart

Start with the standard Helm chart scaffolding:

```bash
helm create my-istio-app
```

This creates a chart with some default templates. Keep the useful ones (deployment, service, serviceaccount, hpa) and add new templates for Istio resources. Remove the ingress template since you will use Istio's Gateway instead:

```bash
rm my-istio-app/templates/ingress.yaml
```

## Defining the Values Schema

A good chart starts with a well-designed values file. Here is one that covers both application and Istio settings:

```yaml
# my-istio-app/values.yaml
replicaCount: 2

image:
  repository: my-registry.example.com/my-app
  tag: "latest"
  pullPolicy: IfNotPresent

service:
  port: 8080
  protocol: HTTP

# Istio-specific configuration
istio:
  enabled: true

  virtualService:
    enabled: true
    hosts:
      - my-app.example.com
    gateway: istio-ingress/main-gateway
    timeout: 30s
    retries:
      enabled: true
      attempts: 3
      perTryTimeout: 10s
      retryOn: "5xx,reset,connect-failure"

  destinationRule:
    enabled: true
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 100
        http:
          http1MaxPendingRequests: 100
          http2MaxRequests: 1000
      outlierDetection:
        consecutive5xxErrors: 5
        interval: 30s
        baseEjectionTime: 30s
        maxEjectionPercent: 50

  authorization:
    enabled: false
    allowedNamespaces: []
    allowedServiceAccounts: []

  peerAuthentication:
    enabled: true
    mtlsMode: STRICT

  canary:
    enabled: false
    weight: 0
```

## VirtualService Template

Create the VirtualService template that adapts based on whether canary deployments are active:

```yaml
# my-istio-app/templates/virtualservice.yaml
{{- if and .Values.istio.enabled .Values.istio.virtualService.enabled }}
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: {{ include "my-istio-app.fullname" . }}
  labels:
    {{- include "my-istio-app.labels" . | nindent 4 }}
spec:
  hosts:
  {{- range .Values.istio.virtualService.hosts }}
  - {{ . | quote }}
  {{- end }}
  - {{ include "my-istio-app.fullname" . }}.{{ .Release.Namespace }}.svc.cluster.local
  {{- if .Values.istio.virtualService.gateway }}
  gateways:
  - {{ .Values.istio.virtualService.gateway }}
  - mesh
  {{- end }}
  http:
  - match:
    - uri:
        prefix: /
    {{- if .Values.istio.virtualService.timeout }}
    timeout: {{ .Values.istio.virtualService.timeout }}
    {{- end }}
    {{- if .Values.istio.virtualService.retries.enabled }}
    retries:
      attempts: {{ .Values.istio.virtualService.retries.attempts }}
      perTryTimeout: {{ .Values.istio.virtualService.retries.perTryTimeout }}
      retryOn: {{ .Values.istio.virtualService.retries.retryOn }}
    {{- end }}
    route:
    {{- if .Values.istio.canary.enabled }}
    - destination:
        host: {{ include "my-istio-app.fullname" . }}
        subset: stable
        port:
          number: {{ .Values.service.port }}
      weight: {{ sub 100 (int .Values.istio.canary.weight) }}
    - destination:
        host: {{ include "my-istio-app.fullname" . }}
        subset: canary
        port:
          number: {{ .Values.service.port }}
      weight: {{ .Values.istio.canary.weight }}
    {{- else }}
    - destination:
        host: {{ include "my-istio-app.fullname" . }}
        port:
          number: {{ .Values.service.port }}
    {{- end }}
{{- end }}
```

## DestinationRule Template

The DestinationRule template manages connection pooling, outlier detection, and subsets:

```yaml
# my-istio-app/templates/destinationrule.yaml
{{- if and .Values.istio.enabled .Values.istio.destinationRule.enabled }}
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: {{ include "my-istio-app.fullname" . }}
  labels:
    {{- include "my-istio-app.labels" . | nindent 4 }}
spec:
  host: {{ include "my-istio-app.fullname" . }}.{{ .Release.Namespace }}.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: {{ .Values.istio.destinationRule.trafficPolicy.connectionPool.tcp.maxConnections }}
      http:
        http1MaxPendingRequests: {{ .Values.istio.destinationRule.trafficPolicy.connectionPool.http.http1MaxPendingRequests }}
        http2MaxRequests: {{ .Values.istio.destinationRule.trafficPolicy.connectionPool.http.http2MaxRequests }}
    outlierDetection:
      consecutive5xxErrors: {{ .Values.istio.destinationRule.trafficPolicy.outlierDetection.consecutive5xxErrors }}
      interval: {{ .Values.istio.destinationRule.trafficPolicy.outlierDetection.interval }}
      baseEjectionTime: {{ .Values.istio.destinationRule.trafficPolicy.outlierDetection.baseEjectionTime }}
      maxEjectionPercent: {{ .Values.istio.destinationRule.trafficPolicy.outlierDetection.maxEjectionPercent }}
  {{- if .Values.istio.canary.enabled }}
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

## AuthorizationPolicy Template

Lock down which services can call your application:

```yaml
# my-istio-app/templates/authorizationpolicy.yaml
{{- if and .Values.istio.enabled .Values.istio.authorization.enabled }}
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: {{ include "my-istio-app.fullname" . }}
  labels:
    {{- include "my-istio-app.labels" . | nindent 4 }}
spec:
  selector:
    matchLabels:
      {{- include "my-istio-app.selectorLabels" . | nindent 6 }}
  action: ALLOW
  rules:
  {{- range .Values.istio.authorization.allowedServiceAccounts }}
  - from:
    - source:
        principals:
        - "cluster.local/ns/*/sa/{{ . }}"
  {{- end }}
  {{- range .Values.istio.authorization.allowedNamespaces }}
  - from:
    - source:
        namespaces:
        - {{ . | quote }}
  {{- end }}
{{- end }}
```

## PeerAuthentication Template

Enforce mTLS for your service:

```yaml
# my-istio-app/templates/peerauthentication.yaml
{{- if and .Values.istio.enabled .Values.istio.peerAuthentication.enabled }}
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: {{ include "my-istio-app.fullname" . }}
  labels:
    {{- include "my-istio-app.labels" . | nindent 4 }}
spec:
  selector:
    matchLabels:
      {{- include "my-istio-app.selectorLabels" . | nindent 6 }}
  mtls:
    mode: {{ .Values.istio.peerAuthentication.mtlsMode }}
{{- end }}
```

## Adding Sidecar Annotations

Modify the Deployment template to include Istio-specific annotations:

```yaml
# In my-istio-app/templates/deployment.yaml, under spec.template.metadata
annotations:
  {{- if .Values.istio.enabled }}
  sidecar.istio.io/inject: "true"
  proxy.istio.io/config: |
    holdApplicationUntilProxyStarts: true
  {{- end }}
```

## Testing Your Chart

Use `helm template` to render the chart and verify the output:

```bash
helm template my-app ./my-istio-app \
  -f values.yaml \
  --debug
```

Write Helm tests that verify the Istio resources are valid:

```yaml
# my-istio-app/templates/tests/test-istio-config.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "my-istio-app.fullname" . }}-istio-test
  annotations:
    helm.sh/hook: test
spec:
  template:
    spec:
      containers:
      - name: test
        image: bitnami/kubectl:latest
        command:
        - /bin/sh
        - -c
        - |
          kubectl get virtualservice {{ include "my-istio-app.fullname" . }} -n {{ .Release.Namespace }}
          kubectl get destinationrule {{ include "my-istio-app.fullname" . }} -n {{ .Release.Namespace }}
      restartPolicy: Never
  backoffLimit: 0
```

Run tests after installation:

```bash
helm install my-app ./my-istio-app -n my-namespace
helm test my-app -n my-namespace
```

## Using the Chart Across Services

Once your chart is solid, package it and use it as a dependency for individual service charts. Each service just needs its own values file:

```yaml
# order-service/values.yaml
replicaCount: 3
image:
  repository: registry.example.com/order-service
  tag: "v2.1.0"

service:
  port: 8080

istio:
  enabled: true
  virtualService:
    enabled: true
    hosts:
      - orders.example.com
    gateway: istio-ingress/main-gateway
    timeout: 15s
  authorization:
    enabled: true
    allowedServiceAccounts:
      - api-gateway
      - payment-service
```

This approach means every service in your organization gets consistent Istio configuration without each team having to become an Istio expert. They fill in the values, the chart handles the rest.

Building custom Helm charts that include Istio resources alongside application resources is one of the most effective ways to standardize service mesh adoption across teams. It removes the friction of "now I also need to figure out Istio config" from every deployment and gives your platform team a single place to enforce best practices.
