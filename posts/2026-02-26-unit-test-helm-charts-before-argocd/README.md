# How to Unit Test Helm Charts Before Deploying with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Testing

Description: Learn how to unit test Helm charts using helm-unittest and snapshot testing before ArgoCD deploys them, catching template errors and regressions early.

---

Helm charts are essentially programs that generate Kubernetes manifests. Like any program, they can have bugs. A missing `if` condition, a wrong indent level, or an incorrect default value can produce invalid or dangerous manifests. If ArgoCD is your deployment tool, these bugs become production incidents.

Unit testing Helm charts catches these bugs before they reach ArgoCD. This guide covers the practical tools and patterns for testing Helm charts effectively.

## Why Helm Charts Need Tests

Consider this common Helm template:

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicas }}
  template:
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        {{- if .Values.resources }}
        resources:
          {{- toYaml .Values.resources | nindent 10 }}
        {{- end }}
```

Without tests, you might not notice that:
- The `resources` block is indented incorrectly
- A new value file sets `replicas: 0` by accident
- Someone removed a required `if` condition

## Setting Up helm-unittest

helm-unittest is a plugin for Helm that provides a testing framework for chart templates:

```bash
# Install the plugin
helm plugin install https://github.com/helm-unittest/helm-unittest

# Verify installation
helm unittest --help
```

## Writing Your First Test

Tests live in a `tests/` directory within your chart:

```
my-chart/
  Chart.yaml
  values.yaml
  templates/
    deployment.yaml
    service.yaml
  tests/
    deployment_test.yaml
    service_test.yaml
```

### Test: Deployment Basics

```yaml
# tests/deployment_test.yaml
suite: Deployment tests
templates:
  - deployment.yaml

tests:
  - it: should create a deployment with correct name
    set:
      image.repository: my-app
      image.tag: v1.0.0
    asserts:
      - isKind:
          of: Deployment
      - equal:
          path: metadata.name
          value: RELEASE-NAME

  - it: should set the correct replica count
    set:
      replicas: 3
    asserts:
      - equal:
          path: spec.replicas
          value: 3

  - it: should use the correct container image
    set:
      image.repository: gcr.io/my-org/my-app
      image.tag: v2.0.0
    asserts:
      - equal:
          path: spec.template.spec.containers[0].image
          value: "gcr.io/my-org/my-app:v2.0.0"
```

Run the tests:

```bash
helm unittest my-chart/

# Output:
# ### Chart: my-chart - tests/deployment_test.yaml
#  PASS  should create a deployment with correct name
#  PASS  should set the correct replica count
#  PASS  should use the correct container image
#
# Charts:      1 passed, 1 total
# Test Suites: 1 passed, 1 total
# Tests:       3 passed, 3 total
```

### Test: Resource Limits

```yaml
# tests/deployment_test.yaml (continued)
  - it: should set resource limits when provided
    set:
      resources:
        limits:
          cpu: "1"
          memory: "512Mi"
        requests:
          cpu: "500m"
          memory: "256Mi"
    asserts:
      - equal:
          path: spec.template.spec.containers[0].resources.limits.cpu
          value: "1"
      - equal:
          path: spec.template.spec.containers[0].resources.limits.memory
          value: "512Mi"

  - it: should not include resources when not specified
    asserts:
      - isNull:
          path: spec.template.spec.containers[0].resources
```

### Test: Conditional Templates

```yaml
  - it: should create HPA when autoscaling is enabled
    templates:
      - hpa.yaml
    set:
      autoscaling:
        enabled: true
        minReplicas: 2
        maxReplicas: 10
        targetCPU: 80
    asserts:
      - isKind:
          of: HorizontalPodAutoscaler
      - equal:
          path: spec.minReplicas
          value: 2
      - equal:
          path: spec.maxReplicas
          value: 10

  - it: should not create HPA when autoscaling is disabled
    templates:
      - hpa.yaml
    set:
      autoscaling:
        enabled: false
    asserts:
      - hasDocuments:
          count: 0
```

## Testing Service Templates

```yaml
# tests/service_test.yaml
suite: Service tests
templates:
  - service.yaml

tests:
  - it: should create a ClusterIP service by default
    asserts:
      - isKind:
          of: Service
      - equal:
          path: spec.type
          value: ClusterIP

  - it: should create a LoadBalancer when configured
    set:
      service.type: LoadBalancer
    asserts:
      - equal:
          path: spec.type
          value: LoadBalancer

  - it: should expose the correct port
    set:
      service.port: 8080
    asserts:
      - equal:
          path: spec.ports[0].port
          value: 8080
```

## Snapshot Testing

Snapshot tests capture the entire rendered output and compare it against a stored baseline. This catches unexpected changes:

```yaml
# tests/snapshot_test.yaml
suite: Snapshot tests
templates:
  - deployment.yaml

tests:
  - it: should match snapshot for default values
    asserts:
      - matchSnapshot: {}

  - it: should match snapshot for production values
    values:
      - ../values-production.yaml
    asserts:
      - matchSnapshot: {}
```

The first time you run the test, it creates a snapshot file. Subsequent runs compare against the snapshot:

```bash
# First run - creates snapshots
helm unittest my-chart/
# __snapshot__/snapshot_test.yaml.snap created

# After changing a template - detects the change
helm unittest my-chart/
# FAIL - should match snapshot for default values
#   Expected to match snapshot 1

# Update snapshots if the change is intentional
helm unittest -u my-chart/
```

Snapshot files should be committed to Git so they serve as regression tests.

## Testing with Different Value Files

Test your chart with each environment's value file:

```yaml
# tests/environments_test.yaml
suite: Environment-specific tests

tests:
  - it: should render correctly with dev values
    templates:
      - deployment.yaml
    values:
      - ../values-dev.yaml
    asserts:
      - isKind:
          of: Deployment
      - equal:
          path: spec.replicas
          value: 1

  - it: should render correctly with production values
    templates:
      - deployment.yaml
    values:
      - ../values-production.yaml
    asserts:
      - isKind:
          of: Deployment
      - equal:
          path: spec.replicas
          value: 3
      - isNotNull:
          path: spec.template.spec.containers[0].resources.limits
```

## Combining with Schema Validation

After unit testing, run schema validation on the rendered output:

```bash
# Unit test first
helm unittest my-chart/

# Then validate schema
helm template my-release my-chart/ \
  --values my-chart/values-production.yaml | \
  kubeconform -strict -summary -kubernetes-version 1.28.0
```

## CI Pipeline Integration

```yaml
# GitHub Actions
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
      run: helm plugin install https://github.com/helm-unittest/helm-unittest

    - name: Install kubeconform
      run: |
        curl -sL https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | \
          sudo tar xz -C /usr/local/bin

    - name: Lint charts
      run: |
        for chart in charts/*/; do
          helm lint "$chart" --strict
        done

    - name: Run unit tests
      run: |
        for chart in charts/*/; do
          helm unittest "$chart"
        done

    - name: Validate rendered output
      run: |
        for chart in charts/*/; do
          for values in "${chart}"values-*.yaml; do
            [ -f "$values" ] || continue
            echo "Validating $chart with $values..."
            helm template test "$chart" --values "$values" | \
              kubeconform -strict -summary -kubernetes-version 1.28.0
          done
        done
```

## Testing Chart Dependencies

If your chart has dependencies, make sure to update them before testing:

```bash
# Update dependencies
helm dependency update my-chart/

# Then run tests
helm unittest my-chart/
```

In CI:

```yaml
- name: Update dependencies and test
  run: |
    for chart in charts/*/; do
      helm dependency update "$chart"
      helm unittest "$chart"
    done
```

For monitoring the health of Helm-deployed applications after ArgoCD syncs them, integrate with [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-alerts-degraded-applications/view) to track deployment health across your fleet.

## Summary

Unit testing Helm charts with helm-unittest catches template bugs, validates conditional logic, and prevents regressions through snapshot testing. Write tests for each template covering default values, environment-specific configurations, and edge cases. Combine unit testing with schema validation using kubeconform for comprehensive coverage. Integrate both into CI pipelines so that every chart change is validated before it reaches the GitOps repository and ArgoCD. The investment in chart testing pays off through fewer sync failures and faster, more confident deployments.
