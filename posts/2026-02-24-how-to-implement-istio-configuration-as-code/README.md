# How to Implement Istio Configuration as Code

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Configuration as Code, Helm, Kustomize, Terraform

Description: How to implement Istio configuration as code using Helm, Kustomize, and Terraform for repeatable and automated mesh management.

---

Configuration as code means treating your Istio configuration the same way you treat application code. It is not just about storing YAML files in Git (that is version control). Configuration as code goes further - it means templating, parameterizing, testing, and automating your configuration so that deploying to any environment is a repeatable, automated process.

Here is how to implement configuration as code for Istio using the tools most teams already have.

## Why Configuration as Code

Hand-crafted YAML files work for small setups. But when you have 50 services across 3 environments, maintaining separate YAML files for each one becomes a maintenance nightmare. Configuration as code lets you:

- Generate configuration from templates with environment-specific parameters
- Reduce duplication across services and environments
- Enforce standards through shared templates
- Test configuration before deployment
- Automate deployment pipelines

## Using Kustomize

Kustomize is built into kubectl and is the simplest way to manage configuration variations.

### Base Configuration

Define your standard Istio resources as a base:

```yaml
# base/virtual-service.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: PLACEHOLDER
spec:
  hosts:
    - PLACEHOLDER
  http:
    - route:
        - destination:
            host: PLACEHOLDER
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: gateway-error,connect-failure,refused-stream
```

### Kustomize Overlays

```yaml
# overlays/production/api-service/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../base
namePrefix: ""
patches:
  - target:
      kind: VirtualService
    patch: |
      - op: replace
        path: /metadata/name
        value: api-service
      - op: replace
        path: /spec/hosts/0
        value: api-service.production.svc.cluster.local
      - op: replace
        path: /spec/http/0/route/0/destination/host
        value: api-service
      - op: replace
        path: /spec/http/0/timeout
        value: 15s
```

### Kustomize Components

For reusable patterns, use Kustomize components:

```yaml
# components/circuit-breaking/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component
patches:
  - target:
      kind: DestinationRule
    patch: |
      - op: add
        path: /spec/trafficPolicy/outlierDetection
        value:
          consecutive5xxErrors: 5
          interval: 10s
          baseEjectionTime: 30s
          maxEjectionPercent: 30
```

```yaml
# overlays/production/api-service/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../base
components:
  - ../../../components/circuit-breaking
  - ../../../components/strict-mtls
```

## Using Helm

Helm templates give you more flexibility for generating Istio resources dynamically.

### Helm Chart Structure

```
istio-service-chart/
  Chart.yaml
  values.yaml
  values-production.yaml
  values-staging.yaml
  templates/
    virtual-service.yaml
    destination-rule.yaml
    authorization-policy.yaml
    _helpers.tpl
```

### Chart Templates

```yaml
# templates/virtual-service.yaml
{{- range .Values.services }}
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: {{ .name }}
  namespace: {{ $.Values.namespace }}
  labels:
    {{- include "istio-service.labels" $ | nindent 4 }}
spec:
  hosts:
    - {{ .name }}.{{ $.Values.namespace }}.svc.cluster.local
  http:
    {{- if .canary }}
    - route:
        - destination:
            host: {{ .name }}
            subset: stable
          weight: {{ sub 100 .canary.weight }}
        - destination:
            host: {{ .name }}
            subset: canary
          weight: {{ .canary.weight }}
      timeout: {{ .timeout | default $.Values.defaults.timeout }}
    {{- else }}
    - route:
        - destination:
            host: {{ .name }}
      timeout: {{ .timeout | default $.Values.defaults.timeout }}
    {{- end }}
      retries:
        attempts: {{ .retries.attempts | default $.Values.defaults.retries.attempts }}
        perTryTimeout: {{ .retries.perTryTimeout | default $.Values.defaults.retries.perTryTimeout }}
        retryOn: {{ .retries.retryOn | default $.Values.defaults.retries.retryOn }}
---
{{- end }}
```

```yaml
# templates/destination-rule.yaml
{{- range .Values.services }}
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: {{ .name }}
  namespace: {{ $.Values.namespace }}
spec:
  host: {{ .name }}.{{ $.Values.namespace }}.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: {{ .connectionPool.maxConnections | default $.Values.defaults.connectionPool.maxConnections }}
      http:
        http1MaxPendingRequests: {{ .connectionPool.maxPendingRequests | default $.Values.defaults.connectionPool.maxPendingRequests }}
        http2MaxRequests: {{ .connectionPool.maxRequests | default $.Values.defaults.connectionPool.maxRequests }}
    outlierDetection:
      consecutive5xxErrors: {{ .outlierDetection.errors | default $.Values.defaults.outlierDetection.errors }}
      interval: {{ .outlierDetection.interval | default $.Values.defaults.outlierDetection.interval }}
      baseEjectionTime: {{ .outlierDetection.ejectionTime | default $.Values.defaults.outlierDetection.ejectionTime }}
  {{- if .subsets }}
  subsets:
    {{- range .subsets }}
    - name: {{ .name }}
      labels:
        version: {{ .version }}
    {{- end }}
  {{- end }}
---
{{- end }}
```

### Values Files

```yaml
# values.yaml (defaults)
namespace: default
defaults:
  timeout: 10s
  retries:
    attempts: 3
    perTryTimeout: 3s
    retryOn: gateway-error,connect-failure,refused-stream
  connectionPool:
    maxConnections: 100
    maxPendingRequests: 100
    maxRequests: 1000
  outlierDetection:
    errors: 5
    interval: 10s
    ejectionTime: 30s

services: []
```

```yaml
# values-production.yaml
namespace: production
services:
  - name: api-service
    timeout: 15s
    connectionPool:
      maxConnections: 200
    subsets:
      - name: stable
        version: v1
      - name: canary
        version: v2
    canary:
      weight: 5

  - name: payment-service
    timeout: 30s
    retries:
      attempts: 2
      perTryTimeout: 10s
    connectionPool:
      maxConnections: 50

  - name: notification-service
    timeout: 5s
    connectionPool:
      maxConnections: 100
```

Deploy with:

```bash
helm template istio-config ./istio-service-chart -f values-production.yaml | kubectl apply -f -
```

## Using Terraform

For teams that already use Terraform for infrastructure:

```hcl
# main.tf
resource "kubernetes_manifest" "virtual_service" {
  for_each = var.services

  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "VirtualService"
    metadata = {
      name      = each.key
      namespace = var.namespace
    }
    spec = {
      hosts = ["${each.key}.${var.namespace}.svc.cluster.local"]
      http = [{
        route = [{
          destination = {
            host = each.key
          }
        }]
        timeout = each.value.timeout
        retries = {
          attempts      = each.value.retry_attempts
          perTryTimeout = each.value.per_try_timeout
          retryOn       = "gateway-error,connect-failure,refused-stream"
        }
      }]
    }
  }
}
```

```hcl
# variables.tf
variable "namespace" {
  type    = string
  default = "production"
}

variable "services" {
  type = map(object({
    timeout          = string
    retry_attempts   = number
    per_try_timeout  = string
    max_connections  = number
  }))
}
```

```hcl
# terraform.tfvars
namespace = "production"

services = {
  "api-service" = {
    timeout         = "15s"
    retry_attempts  = 3
    per_try_timeout = "5s"
    max_connections = 200
  }
  "payment-service" = {
    timeout         = "30s"
    retry_attempts  = 2
    per_try_timeout = "10s"
    max_connections = 50
  }
}
```

## Testing Configuration

Test your generated configuration before applying:

```bash
# Helm - render and validate
helm template my-release ./istio-service-chart -f values-production.yaml > rendered.yaml
istioctl analyze -R rendered.yaml

# Kustomize - build and validate
kustomize build overlays/production > rendered.yaml
istioctl analyze -R rendered.yaml

# Dry run
kubectl apply --dry-run=server -f rendered.yaml
```

## Enforcing Standards

Use OPA/Gatekeeper or Kyverno to enforce that generated configuration meets your standards:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-istio-timeout
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-timeout
      match:
        any:
          - resources:
              kinds:
                - VirtualService
      validate:
        message: "All VirtualServices must have a timeout configured"
        pattern:
          spec:
            http:
              - timeout: "?*"
```

Configuration as code turns your Istio mesh management from a manual, error-prone process into a systematic, automated one. Pick the tool that fits your team's existing workflow - Kustomize for simplicity, Helm for flexibility, or Terraform if you are already Terraform-native - and build from there.
