# How to Configure HelmRelease Test Action in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Test, Helm Test, Validation

Description: Learn how to configure the test action in a Flux CD HelmRelease to automatically run Helm tests after install or upgrade.

---

## Introduction

Helm charts can include test hooks -- pods that validate whether a release is working correctly after deployment. The `spec.test` field in a Flux CD HelmRelease controls whether and how these tests are executed after each install or upgrade. This provides automated post-deployment validation as part of your GitOps pipeline.

## How Helm Tests Work

Helm tests are pods defined in the chart's `templates/tests/` directory with the `helm.sh/hook: test` annotation. When tests are triggered, Helm creates these pods and waits for them to complete. A test passes if all test pods exit with a zero exit code.

A typical Helm test pod looks like this inside a chart:

```yaml
# templates/tests/test-connection.yaml (inside a Helm chart)
apiVersion: v1
kind: Pod
metadata:
  name: {{ .Release.Name }}-test-connection
  annotations:
    "helm.sh/hook": test
spec:
  containers:
    - name: test
      image: busybox
      command: ['wget', '-qO-', '{{ .Release.Name }}:{{ .Values.service.port }}']
  restartPolicy: Never
```

## The spec.test Field

The `spec.test` field in a HelmRelease configures automatic test execution.

```yaml
# helmrelease.yaml - HelmRelease with test configuration
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  # Test configuration
  test:
    # Enable Helm tests
    enable: true
    # Timeout for test execution (falls back to spec.timeout if not set)
    timeout: 5m
  values:
    replicaCount: 2
```

When `spec.test.enable` is set to `true`, Flux runs `helm test` after every successful install or upgrade.

## Test Options

### enable

Controls whether Helm tests are executed after install or upgrade.

```yaml
spec:
  test:
    enable: true
```

When set to `false` or omitted (default is `false`), Helm tests are not run.

### timeout

Sets the maximum duration for test execution.

```yaml
spec:
  test:
    enable: true
    # Maximum time for all test pods to complete
    timeout: 10m
```

If not specified, the test timeout falls back to `spec.timeout`.

### ignoreFailures

When set to `true`, test failures do not cause the HelmRelease to be marked as failed. This is useful for non-critical tests or informational checks.

```yaml
spec:
  test:
    enable: true
    # Test failures are reported but do not fail the release
    ignoreFailures: true
```

### filters

You can filter which tests to run by name using the `filters` field.

```yaml
spec:
  test:
    enable: true
    filters:
      - name: my-app-test-connection
        exclude: false
      - name: my-app-test-load
        exclude: true
```

## Test and Remediation Interaction

When tests are enabled and a test fails, Flux considers the release action (install or upgrade) as failed. This triggers the configured remediation strategy.

```yaml
# helmrelease.yaml - Tests with remediation on failure
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  test:
    enable: true
    timeout: 5m
  install:
    remediation:
      retries: 3
      # If test fails after install, uninstall and retry
      remediateLastFailure: true
  upgrade:
    remediation:
      retries: 3
      strategy: rollback
      # If test fails after upgrade, rollback
      remediateLastFailure: true
  values:
    replicaCount: 2
```

The flow with tests and remediation:

1. Flux installs or upgrades the release
2. Flux runs Helm tests
3. If tests pass, the release is marked as successful
4. If tests fail, the configured remediation action is triggered (rollback, uninstall, or retry)

## Production Configuration

For production workloads, combine tests with strict remediation to ensure only validated releases remain deployed.

```yaml
# helmrelease-prod.yaml - Production HelmRelease with test validation
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 10m
  timeout: 10m
  chart:
    spec:
      chart: my-app
      version: "2.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  test:
    enable: true
    timeout: 5m
  install:
    atomic: true
    remediation:
      retries: 3
  upgrade:
    atomic: true
    remediation:
      retries: 3
      strategy: rollback
  values:
    replicaCount: 3
```

## Running Tests Manually

You can trigger tests outside of the reconciliation cycle using the Helm CLI.

```bash
# Run Helm tests manually
helm test my-app -n default

# Run tests with a specific timeout
helm test my-app -n default --timeout 5m

# View test pod logs
kubectl logs -n default my-app-test-connection
```

## Verifying Test Configuration

```bash
# Check HelmRelease status (includes test results)
flux get helmrelease my-app -n default

# View detailed conditions including test outcomes
kubectl describe helmrelease my-app -n default

# Check test pod status
kubectl get pods -n default -l "helm.sh/hook=test"

# View test pod logs
kubectl logs -n default -l "helm.sh/hook=test"
```

## Summary

The `spec.test` field in a Flux CD HelmRelease enables automatic post-deployment validation by running Helm test hooks after every install or upgrade. Enable tests with `spec.test.enable: true`, set appropriate timeouts, and combine with remediation strategies to automatically rollback or retry when tests fail. This creates a validated deployment pipeline where only releases that pass their test suite remain active in your cluster.
