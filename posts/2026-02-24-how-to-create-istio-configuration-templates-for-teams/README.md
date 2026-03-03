# How to Create Istio Configuration Templates for Teams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Template, Kubernetes, Helm, Kustomize

Description: How to create reusable Istio configuration templates that teams can customize for their services using Helm charts and Kustomize overlays.

---

Every time a team deploys a new service, they need a VirtualService, a DestinationRule, maybe an AuthorizationPolicy, and probably a Gateway if the service is externally facing. Writing these from scratch each time is tedious and error-prone. Templates solve this by providing pre-built, validated configurations that teams can customize with their specific values.

## Choosing a Templating Approach

There are two solid options for Istio configuration templates:

1. **Helm charts** - best for parameterized templates with complex logic
2. **Kustomize bases and overlays** - best for simple customization and GitOps workflows

Both work well. Helm is more powerful but more complex. Kustomize is simpler but less flexible. Many teams use both: Helm for the base templates and Kustomize for environment-specific overrides.

## Helm-Based Istio Templates

Create a Helm chart that generates all the Istio resources a service needs:

```text
istio-service-template/
  Chart.yaml
  values.yaml
  templates/
    virtualservice.yaml
    destinationrule.yaml
    authorizationpolicy.yaml
    gateway-virtualservice.yaml
    sidecar.yaml
    _helpers.tpl
```

`Chart.yaml`:

```yaml
apiVersion: v2
name: istio-service
description: Standard Istio configuration for a service
version: 1.0.0
```

`values.yaml`:

```yaml
service:
  name: ""
  namespace: ""
  port: 8080

routing:
  enabled: true
  versions:
  - name: stable
    labels:
      version: v1
    weight: 100
  timeout: 10s
  retries:
    enabled: true
    attempts: 3
    perTryTimeout: 3s

resiliency:
  circuitBreaker:
    enabled: true
    maxConnections: 100
    maxPendingRequests: 50
    maxRequests: 100
  outlierDetection:
    enabled: true
    consecutive5xxErrors: 5
    interval: 30s
    baseEjectionTime: 30s

security:
  authorization:
    enabled: false
    allowFrom: []

ingress:
  enabled: false
  hostname: ""
  tls: true
  paths:
  - /

sidecar:
  scope:
    enabled: false
    egressHosts: []
```

`templates/virtualservice.yaml`:

```yaml
{{- if .Values.routing.enabled }}
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: {{ .Values.service.name }}
  namespace: {{ .Values.service.namespace }}
  labels:
    {{- include "istio-service.labels" . | nindent 4 }}
spec:
  hosts:
  - {{ .Values.service.name }}
  http:
  - timeout: {{ .Values.routing.timeout }}
    {{- if .Values.routing.retries.enabled }}
    retries:
      attempts: {{ .Values.routing.retries.attempts }}
      perTryTimeout: {{ .Values.routing.retries.perTryTimeout }}
      retryOn: 5xx,reset,connect-failure
    {{- end }}
    route:
    {{- range .Values.routing.versions }}
    - destination:
        host: {{ $.Values.service.name }}
        subset: {{ .name }}
        port:
          number: {{ $.Values.service.port }}
      weight: {{ .weight }}
    {{- end }}
{{- end }}
```

`templates/destinationrule.yaml`:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: {{ .Values.service.name }}
  namespace: {{ .Values.service.namespace }}
  labels:
    {{- include "istio-service.labels" . | nindent 4 }}
spec:
  host: {{ .Values.service.name }}
  {{- if .Values.resiliency.circuitBreaker.enabled }}
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: {{ .Values.resiliency.circuitBreaker.maxConnections }}
      http:
        http1MaxPendingRequests: {{ .Values.resiliency.circuitBreaker.maxPendingRequests }}
        http2MaxRequests: {{ .Values.resiliency.circuitBreaker.maxRequests }}
    {{- if .Values.resiliency.outlierDetection.enabled }}
    outlierDetection:
      consecutive5xxErrors: {{ .Values.resiliency.outlierDetection.consecutive5xxErrors }}
      interval: {{ .Values.resiliency.outlierDetection.interval }}
      baseEjectionTime: {{ .Values.resiliency.outlierDetection.baseEjectionTime }}
    {{- end }}
  {{- end }}
  subsets:
  {{- range .Values.routing.versions }}
  - name: {{ .name }}
    labels:
      {{- toYaml .labels | nindent 6 }}
  {{- end }}
```

`templates/authorizationpolicy.yaml`:

```yaml
{{- if .Values.security.authorization.enabled }}
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: {{ .Values.service.name }}-access
  namespace: {{ .Values.service.namespace }}
  labels:
    {{- include "istio-service.labels" . | nindent 4 }}
spec:
  selector:
    matchLabels:
      app: {{ .Values.service.name }}
  action: ALLOW
  rules:
  {{- range .Values.security.authorization.allowFrom }}
  - from:
    - source:
        principals:
        - "cluster.local/ns/{{ .namespace }}/sa/{{ .service }}"
    {{- if .paths }}
    to:
    - operation:
        paths:
        {{- range .paths }}
        - {{ . | quote }}
        {{- end }}
    {{- end }}
  {{- end }}
{{- end }}
```

## Using the Template

Teams use the template by providing their own values file:

```yaml
# team-checkout-values.yaml
service:
  name: checkout-api
  namespace: team-checkout
  port: 8080

routing:
  enabled: true
  versions:
  - name: stable
    labels:
      version: v1
    weight: 90
  - name: canary
    labels:
      version: v2
    weight: 10
  timeout: 5s

resiliency:
  circuitBreaker:
    enabled: true
    maxConnections: 200
    maxPendingRequests: 100
    maxRequests: 200

security:
  authorization:
    enabled: true
    allowFrom:
    - service: frontend
      namespace: team-frontend
    - service: mobile-bff
      namespace: team-mobile
      paths: ["/api/v1/cart/*"]

ingress:
  enabled: true
  hostname: checkout.mycompany.com
  paths:
  - /api/v1/public
```

Install it:

```bash
helm install checkout-istio ./istio-service-template -f team-checkout-values.yaml
```

## Kustomize-Based Templates

For teams that prefer Kustomize, create a base that they can overlay:

```text
istio-base/
  kustomization.yaml
  virtualservice.yaml
  destinationrule.yaml
  authorizationpolicy.yaml
```

`istio-base/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- virtualservice.yaml
- destinationrule.yaml
- authorizationpolicy.yaml
```

`istio-base/virtualservice.yaml`:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: SERVICE_NAME
spec:
  hosts:
  - SERVICE_NAME
  http:
  - timeout: 10s
    retries:
      attempts: 3
      perTryTimeout: 3s
      retryOn: 5xx,reset,connect-failure
    route:
    - destination:
        host: SERVICE_NAME
        subset: stable
      weight: 100
```

Teams create overlays:

```text
my-service/
  kustomization.yaml
  patches/
    routing-patch.yaml
```

`my-service/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- github.com/company/istio-base?ref=v1.0.0
namespace: team-checkout
namePrefix: checkout-
patches:
- path: patches/routing-patch.yaml
```

`my-service/patches/routing-patch.yaml`:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: SERVICE_NAME
spec:
  http:
  - timeout: 5s
    route:
    - destination:
        host: checkout-api
        subset: stable
      weight: 80
    - destination:
        host: checkout-api
        subset: canary
      weight: 20
```

## Template Versioning

Version your templates so teams can upgrade at their own pace:

```bash
# Teams pin to a version
helm install checkout-istio company-charts/istio-service --version 2.1.0 -f values.yaml

# Or with Kustomize
resources:
- github.com/company/istio-base?ref=v2.1.0
```

When you release a new template version, teams can test the upgrade in staging before rolling it out to production.

## Template Validation in CI

Add template validation to your CI pipeline:

```yaml
# .github/workflows/validate-istio.yaml
name: Validate Istio Config
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Install istioctl
      run: curl -L https://istio.io/downloadIstio | sh -
    - name: Render templates
      run: helm template my-service ./istio-service-template -f values.yaml > rendered.yaml
    - name: Validate with istioctl
      run: istioctl analyze --use-kube=false rendered.yaml
    - name: Validate with kubeval
      run: kubeval rendered.yaml --strict
```

## Publishing Templates

Host your Helm charts in a chart repository:

```bash
# Package the chart
helm package istio-service-template

# Push to a chart museum or OCI registry
helm push istio-service-template-1.0.0.tgz oci://myregistry.io/charts
```

For Kustomize bases, host them in a Git repository that teams reference.

## Keeping Templates Updated

As Istio versions change, your templates need to keep up. Create a test suite that validates templates against different Istio versions:

```bash
#!/bin/bash
for version in 1.18 1.19 1.20; do
  echo "Testing against Istio $version"
  helm template test ./istio-service-template -f test-values.yaml | \
    istioctl analyze --use-kube=false --istioNamespace istio-system -
done
```

## Summary

Istio configuration templates give teams a fast, consistent way to set up their services in the mesh. Helm charts work well for complex, parameterized templates with conditional logic. Kustomize bases work well for simpler configurations and GitOps workflows. Whichever approach you choose, version your templates, validate them in CI, and provide good default values so teams can get started quickly with minimal customization. The goal is making the right thing the easy thing.
