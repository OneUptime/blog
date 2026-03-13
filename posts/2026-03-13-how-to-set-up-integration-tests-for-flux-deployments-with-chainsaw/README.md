# How to Set Up Integration Tests for Flux Deployments with Chainsaw

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Chainsaw, Testing, Integration Tests

Description: Learn how to use Chainsaw to write and run integration tests that validate your Flux deployments work correctly end to end.

---

Chainsaw is a Kubernetes testing tool from Kyverno that makes it straightforward to write declarative integration tests. When combined with Flux, Chainsaw lets you verify that your GitOps deployments produce the expected resources, configurations, and behaviors in a real cluster.

This guide covers setting up Chainsaw for testing Flux deployments.

## What Is Chainsaw

Chainsaw is a testing tool that lets you define test scenarios as YAML files. Each test consists of steps that apply resources, assert conditions, and clean up. It is well suited for testing Kubernetes controllers and operators, making it a natural fit for validating Flux deployments.

## Installing Chainsaw

Install Chainsaw using Go:

```bash
go install github.com/kyverno/chainsaw@latest
```

Or download a binary release:

```bash
curl -sSL https://github.com/kyverno/chainsaw/releases/latest/download/chainsaw_linux_amd64.tar.gz | \
  tar xz -C /usr/local/bin chainsaw
```

## Setting Up the Test Environment

Create a local cluster with kind and install Flux:

```bash
kind create cluster --name chainsaw-flux-test

flux install
```

Create a test configuration file at `.chainsaw.yaml`:

```yaml
apiVersion: chainsaw.kyverno.io/v1alpha1
kind: Configuration
metadata:
  name: flux-tests
spec:
  timeouts:
    apply: 30s
    assert: 120s
    delete: 30s
  failFast: true
  parallel: 1
```

The longer assert timeout accounts for Flux reconciliation time.

## Writing Your First Test

Create a test directory structure:

```text
tests/
  flux-kustomization/
    chainsaw-test.yaml
    00-install.yaml
    01-assert.yaml
```

The `chainsaw-test.yaml` defines the test:

```yaml
apiVersion: chainsaw.kyverno.io/v1alpha1
kind: Test
metadata:
  name: flux-kustomization-reconciles
spec:
  steps:
    - name: Create GitRepository and Kustomization
      try:
        - apply:
            file: 00-install.yaml
    - name: Verify reconciliation
      try:
        - assert:
            file: 01-assert.yaml
```

The `00-install.yaml` creates the Flux resources:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: test-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/stefanprodan/podinfo
  ref:
    branch: master
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: test-app
  namespace: flux-system
spec:
  interval: 1m
  path: ./kustomize
  prune: true
  sourceRef:
    kind: GitRepository
    name: test-repo
  targetNamespace: default
```

The `01-assert.yaml` verifies the expected state:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: test-app
  namespace: flux-system
status:
  conditions:
    - type: Ready
      status: "True"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podinfo
  namespace: default
status:
  readyReplicas: 2
```

## Running Tests

Run the tests:

```bash
chainsaw test --test-dir ./tests/
```

Chainsaw will apply the resources, wait for the assertions to pass, and report the results.

## Testing HelmRelease Deployments

Create a test for a HelmRelease:

```text
tests/
  flux-helmrelease/
    chainsaw-test.yaml
    00-install.yaml
    01-assert.yaml
    02-cleanup.yaml
```

The `00-install.yaml`:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 10m
  url: https://stefanprodan.github.io/podinfo
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: podinfo
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: podinfo
      version: "6.5.x"
      sourceRef:
        kind: HelmRepository
        name: podinfo
        namespace: flux-system
  values:
    replicaCount: 1
```

The `01-assert.yaml`:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: podinfo
  namespace: default
status:
  conditions:
    - type: Ready
      status: "True"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podinfo
  namespace: default
spec:
  replicas: 1
status:
  availableReplicas: 1
```

## Testing with Error Conditions

Chainsaw can also verify that invalid configurations fail as expected:

```yaml
apiVersion: chainsaw.kyverno.io/v1alpha1
kind: Test
metadata:
  name: invalid-chart-fails
spec:
  steps:
    - name: Create HelmRelease with invalid chart
      try:
        - apply:
            file: 00-invalid-release.yaml
    - name: Verify failure condition
      try:
        - assert:
            file: 01-assert-failure.yaml
```

The `01-assert-failure.yaml`:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: invalid-release
  namespace: default
status:
  conditions:
    - type: Ready
      status: "False"
```

## Cleanup Steps

Add cleanup to remove resources after tests:

```yaml
apiVersion: chainsaw.kyverno.io/v1alpha1
kind: Test
metadata:
  name: flux-with-cleanup
spec:
  steps:
    - name: Deploy
      try:
        - apply:
            file: 00-install.yaml
    - name: Assert
      try:
        - assert:
            file: 01-assert.yaml
  cleanup:
    - delete:
        ref:
          apiVersion: kustomize.toolkit.fluxcd.io/v1
          kind: Kustomization
          name: test-app
          namespace: flux-system
```

## CI Integration

Add Chainsaw tests to your CI pipeline:

```yaml
name: Integration Tests

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create kind cluster
        uses: helm/kind-action@v1

      - name: Install Flux
        run: |
          curl -s https://fluxcd.io/install.sh | bash
          flux install

      - name: Install Chainsaw
        run: |
          go install github.com/kyverno/chainsaw@latest

      - name: Run tests
        run: chainsaw test --test-dir ./tests/
```

## Conclusion

Chainsaw provides a declarative and repeatable way to test your Flux deployments. By writing tests that verify Kustomization reconciliation, HelmRelease deployment, and error handling, you build confidence that your GitOps pipeline works correctly. Integrating these tests into CI ensures that every change is validated against a real cluster before merging.
