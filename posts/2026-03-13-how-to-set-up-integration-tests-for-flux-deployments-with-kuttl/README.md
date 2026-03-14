# How to Set Up Integration Tests for Flux Deployments with kuttl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Kuttl, Testing, Integration Tests

Description: Learn how to use kuttl to create integration tests that verify your Flux GitOps deployments produce the correct cluster state.

---

kuttl (KUbernetes Test TooL) is a declarative testing framework for Kubernetes. It uses a step-based approach where each step applies resources and asserts expected outcomes. This makes it well suited for testing Flux deployments where you need to verify that reconciliation produces the correct cluster state.

This guide covers setting up kuttl for testing Flux deployments.

## What Is kuttl

kuttl lets you write tests as numbered YAML files in a directory. Each test step consists of an apply file and an assert file. kuttl applies the resources, waits for assertions to pass, and reports results. It can spin up its own kind cluster or use an existing one.

## Installing kuttl

Install kuttl using the kubectl plugin:

```bash
kubectl krew install kuttl
```

Or download the binary directly:

```bash
curl -sSL https://github.com/kudobuilder/kuttl/releases/latest/download/kubectl-kuttl_linux_amd64 -o /usr/local/bin/kubectl-kuttl
chmod +x /usr/local/bin/kubectl-kuttl
```

## Project Structure

Set up your test directory:

```text
tests/
  kuttl/
    kuttl-test.yaml
    flux-kustomization/
      00-install.yaml
      00-assert.yaml
      01-errors.yaml  (optional)
    flux-helmrelease/
      00-install.yaml
      00-assert.yaml
```

## Configuring kuttl

Create the main configuration file at `tests/kuttl/kuttl-test.yaml`:

```yaml
apiVersion: kuttl.dev/v1beta1
kind: TestSuite
metadata:
  name: flux-integration-tests
startKIND: true
kindNodeCache: true
timeout: 180
parallel: 1
commands:
  - command: flux install
```

The `commands` section runs Flux installation before the tests start. The 180-second timeout gives Flux enough time to reconcile resources.

## Writing a Kustomization Test

Create `tests/kuttl/flux-kustomization/00-install.yaml`:

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

Create `tests/kuttl/flux-kustomization/00-assert.yaml`:

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
  availableReplicas: 2
```

kuttl will apply the install file, then wait until the assert conditions are met or the timeout is reached.

## Writing a HelmRelease Test

Create `tests/kuttl/flux-helmrelease/00-install.yaml`:

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
  name: podinfo-helm
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
    ingress:
      enabled: false
```

Create `tests/kuttl/flux-helmrelease/00-assert.yaml`:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: podinfo-helm
  namespace: default
status:
  conditions:
    - type: Ready
      status: "True"
---
apiVersion: v1
kind: Service
metadata:
  name: podinfo-helm
  namespace: default
spec:
  type: ClusterIP
```

## Multi-Step Tests

kuttl supports multiple steps within a test. Use numbered prefixes to define the order.

Step 1 - Deploy the application (`00-install.yaml` and `00-assert.yaml`).

Step 2 - Update the configuration (`01-install.yaml`):

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: podinfo-helm
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
    replicaCount: 3
```

Assert the update (`01-assert.yaml`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podinfo-helm
  namespace: default
spec:
  replicas: 3
```

## Testing Error Conditions

Use error files to assert that certain resources should NOT exist:

Create `01-errors.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: should-not-exist
  namespace: default
```

kuttl will fail the test if this resource is found, which is useful for verifying that pruning works correctly.

## Running Tests

Run all tests:

```bash
kubectl kuttl test tests/kuttl/
```

Run a specific test:

```bash
kubectl kuttl test tests/kuttl/ --test flux-kustomization
```

Run against an existing cluster instead of creating a new one:

```bash
kubectl kuttl test tests/kuttl/ --start-kind=false
```

## Using Commands in Steps

kuttl supports running commands as part of test steps. Create a `00-cmd.yaml`:

```yaml
apiVersion: kuttl.dev/v1beta1
kind: TestStep
commands:
  - command: flux reconcile kustomization test-app -n flux-system
    namespaced: true
```

This is useful for triggering reconciliation or running validation scripts between steps.

## CI Pipeline Integration

Add kuttl tests to your CI workflow:

```yaml
name: Integration Tests

on:
  pull_request:
    branches: [main]

jobs:
  kuttl-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install kuttl
        run: |
          curl -sSL https://github.com/kudobuilder/kuttl/releases/latest/download/kubectl-kuttl_linux_amd64 -o /usr/local/bin/kubectl-kuttl
          chmod +x /usr/local/bin/kubectl-kuttl

      - name: Install Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Run kuttl tests
        run: kubectl kuttl test tests/kuttl/ --timeout 300
```

## Cleanup

kuttl automatically cleans up resources created during tests when using `startKIND: true` since the entire cluster is deleted. When running against an existing cluster, kuttl deletes the test namespace after each test.

## Conclusion

kuttl provides a simple, declarative approach to integration testing Flux deployments. Its step-based model maps naturally to GitOps workflows where you deploy resources and verify the resulting cluster state. By combining kuttl with CI pipelines, you can automatically validate that your Flux configurations produce the expected results in a real Kubernetes environment.
