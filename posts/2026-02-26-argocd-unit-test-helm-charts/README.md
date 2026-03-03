# How to Unit Test Helm Charts Before Deploying with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Testing

Description: Learn how to unit test Helm charts before ArgoCD deploys them, using helm-unittest, chart-testing, and schema validation to catch errors early.

---

Helm charts are the packaging format for a huge portion of Kubernetes applications deployed through ArgoCD. But Helm templates are essentially Go templates generating YAML, and they can produce unexpected output with certain value combinations. Unit testing your Helm charts before ArgoCD touches them prevents broken deployments and saves hours of debugging.

This guide covers the tools and techniques for testing Helm charts in a GitOps workflow.

## Why Unit Test Helm Charts?

Helm template logic can be surprisingly complex. Consider this snippet:

```yaml
{{- if .Values.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "my-app.fullname" . }}
  {{- with .Values.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
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
{{- end }}
```

Without tests, how do you know this template produces valid output when `ingress.enabled` is true but `ingress.tls` is not set? Or when `ingress.annotations` is an empty map? Unit tests answer these questions definitively.

## Tool 1: helm-unittest

helm-unittest is the most popular unit testing framework for Helm charts. It lets you write test cases in YAML that assert properties of the rendered templates.

### Installation

```bash
# Install as a Helm plugin
helm plugin install https://github.com/helm-unittest/helm-unittest.git

# Verify
helm unittest --help
```

### Writing Tests

Tests live in a `tests/` directory inside your chart:

```text
my-app/
  Chart.yaml
  values.yaml
  templates/
    deployment.yaml
    service.yaml
    ingress.yaml
  tests/
    deployment_test.yaml
    service_test.yaml
    ingress_test.yaml
```

Create `tests/deployment_test.yaml`:

```yaml
suite: Deployment Tests
templates:
  - templates/deployment.yaml
tests:
  - it: should create a deployment with correct name
    set:
      image.repository: myorg/my-app
      image.tag: v1.0.0
    asserts:
      - isKind:
          of: Deployment
      - equal:
          path: metadata.name
          value: RELEASE-NAME-my-app

  - it: should set the correct image
    set:
      image.repository: myorg/my-app
      image.tag: v2.0.0
    asserts:
      - equal:
          path: spec.template.spec.containers[0].image
          value: myorg/my-app:v2.0.0

  - it: should set replica count from values
    set:
      replicaCount: 5
    asserts:
      - equal:
          path: spec.replicas
          value: 5

  - it: should set resource limits
    set:
      resources.limits.memory: 512Mi
      resources.limits.cpu: 500m
      resources.requests.memory: 256Mi
      resources.requests.cpu: 250m
    asserts:
      - equal:
          path: spec.template.spec.containers[0].resources.limits.memory
          value: 512Mi
      - equal:
          path: spec.template.spec.containers[0].resources.limits.cpu
          value: 500m

  - it: should add environment variables from configmap
    set:
      envFrom:
        - configMapRef:
            name: my-app-config
    asserts:
      - contains:
          path: spec.template.spec.containers[0].envFrom
          content:
            configMapRef:
              name: my-app-config

  - it: should not create deployment when disabled
    set:
      enabled: false
    asserts:
      - hasDocuments:
          count: 0
```

### Running Tests

```bash
# Run all tests for a chart
helm unittest ./charts/my-app

# Run with verbose output
helm unittest -v ./charts/my-app

# Run specific test file
helm unittest -f 'tests/deployment_test.yaml' ./charts/my-app

# Generate JUnit output for CI
helm unittest --output-type JUnit --output-file test-results.xml ./charts/my-app
```

Example output:

```text
### Chart: my-app Tests...

 PASS  Deployment Tests
   - should create a deployment with correct name
   - should set the correct image
   - should set replica count from values
   - should set resource limits
   - should add environment variables from configmap
   - should not create deployment when disabled

Charts:     1 passed, 1 total
Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

### Testing Conditional Logic

Test the conditional branches in your templates:

```yaml
# tests/ingress_test.yaml
suite: Ingress Tests
templates:
  - templates/ingress.yaml
tests:
  - it: should not create ingress by default
    asserts:
      - hasDocuments:
          count: 0

  - it: should create ingress when enabled
    set:
      ingress.enabled: true
      ingress.hosts:
        - host: my-app.example.com
          paths:
            - path: /
              pathType: Prefix
    asserts:
      - isKind:
          of: Ingress
      - equal:
          path: spec.rules[0].host
          value: my-app.example.com

  - it: should configure TLS when specified
    set:
      ingress.enabled: true
      ingress.tls:
        - secretName: my-app-tls
          hosts:
            - my-app.example.com
      ingress.hosts:
        - host: my-app.example.com
          paths:
            - path: /
              pathType: Prefix
    asserts:
      - equal:
          path: spec.tls[0].secretName
          value: my-app-tls
      - contains:
          path: spec.tls[0].hosts
          content: my-app.example.com

  - it: should add annotations
    set:
      ingress.enabled: true
      ingress.annotations:
        kubernetes.io/ingress.class: nginx
        cert-manager.io/cluster-issuer: letsencrypt
      ingress.hosts:
        - host: my-app.example.com
          paths:
            - path: /
              pathType: Prefix
    asserts:
      - equal:
          path: metadata.annotations["kubernetes.io/ingress.class"]
          value: nginx
```

## Tool 2: Helm Values Schema Validation

Define a JSON schema for your values file to catch configuration errors before rendering:

Create `values.schema.json` in your chart root:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["image", "replicaCount"],
  "properties": {
    "replicaCount": {
      "type": "integer",
      "minimum": 1,
      "maximum": 50
    },
    "image": {
      "type": "object",
      "required": ["repository", "tag"],
      "properties": {
        "repository": {
          "type": "string",
          "pattern": "^[a-z0-9./-]+$"
        },
        "tag": {
          "type": "string",
          "minLength": 1
        },
        "pullPolicy": {
          "type": "string",
          "enum": ["Always", "IfNotPresent", "Never"]
        }
      }
    },
    "resources": {
      "type": "object",
      "properties": {
        "limits": {
          "type": "object",
          "required": ["memory", "cpu"]
        },
        "requests": {
          "type": "object",
          "required": ["memory", "cpu"]
        }
      }
    }
  }
}
```

Helm validates values against this schema automatically:

```bash
# This fails if values don't match the schema
helm template my-app ./charts/my-app \
  --values bad-values.yaml
# Error: values don't meet the specifications of the schema
```

## Tool 3: chart-testing (ct)

chart-testing is Helm's official testing tool, focused on chart quality and linting:

```bash
# Install
brew install chart-testing

# Lint a chart
ct lint --charts ./charts/my-app

# Lint with custom config
ct lint --config ct.yaml --charts ./charts/my-app
```

Configuration file `ct.yaml`:

```yaml
chart-dirs:
  - charts
chart-repos:
  - bitnami=https://charts.bitnami.com/bitnami
helm-extra-args: --timeout 600s
validate-maintainers: false
check-version-increment: true
```

## CI Pipeline Integration

Combine all testing tools in your CI pipeline:

```yaml
# .github/workflows/helm-test.yaml
name: Helm Chart Tests
on:
  pull_request:
    paths:
      - 'charts/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Helm
        uses: azure/setup-helm@v3

      - name: Install helm-unittest
        run: helm plugin install https://github.com/helm-unittest/helm-unittest.git

      - name: Lint charts
        run: |
          for chart in charts/*/; do
            echo "Linting: $chart"
            helm lint "$chart" --strict
          done

      - name: Run unit tests
        run: |
          for chart in charts/*/; do
            if [ -d "$chart/tests" ]; then
              echo "Testing: $chart"
              helm unittest "$chart" \
                --output-type JUnit \
                --output-file "$chart/test-results.xml"
            fi
          done

      - name: Validate rendered output
        run: |
          for chart in charts/*/; do
            chart_name=$(basename "$chart")
            echo "Validating rendered output: $chart_name"
            helm template "$chart_name" "$chart" | \
              kubeconform -kubernetes-version 1.29.0 -summary
          done

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: charts/*/test-results.xml
```

## Testing Values Combinations

Test multiple value combinations to ensure your templates handle edge cases:

```yaml
# tests/deployment_edge_cases_test.yaml
suite: Deployment Edge Cases
templates:
  - templates/deployment.yaml
tests:
  - it: should work with minimum values
    values:
      - ../ci/minimum-values.yaml
    asserts:
      - isKind:
          of: Deployment

  - it: should work with all features enabled
    values:
      - ../ci/full-values.yaml
    asserts:
      - isKind:
          of: Deployment

  - it: should handle empty annotations
    set:
      podAnnotations: {}
    asserts:
      - isNull:
          path: spec.template.metadata.annotations
```

Create CI value files for different scenarios:

```yaml
# ci/minimum-values.yaml
image:
  repository: myorg/my-app
  tag: v1.0.0
replicaCount: 1
```

```yaml
# ci/full-values.yaml
image:
  repository: myorg/my-app
  tag: v1.0.0
replicaCount: 3
ingress:
  enabled: true
  hosts:
    - host: my-app.example.com
      paths:
        - path: /
          pathType: Prefix
resources:
  limits:
    memory: 512Mi
    cpu: 500m
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
```

## Monitoring Helm Deployments

After your tested charts are deployed by ArgoCD, monitor their health with [OneUptime](https://oneuptime.com/blog/post/2026-02-06-monitor-argocd-deployments-opentelemetry/view) to ensure the runtime behavior matches your test expectations.

## Conclusion

Unit testing Helm charts is not overhead - it is insurance. helm-unittest lets you verify template logic without deploying anything. Values schema validation catches misconfiguration at the earliest possible stage. Combined with chart-testing for linting and kubeconform for schema validation of rendered output, you have a comprehensive testing pipeline that catches errors long before ArgoCD tries to sync. The investment in writing tests pays off every time you avoid a production sync failure.
