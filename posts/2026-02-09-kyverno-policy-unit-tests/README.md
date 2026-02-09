# How to Build Policy Unit Tests for Kyverno Policies Using the Kyverno CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kyverno, Policy Testing, Security, Governance

Description: Learn how to write and run unit tests for Kyverno policies using the Kyverno CLI test command, ensuring your policies work correctly before deploying to clusters.

---

Kyverno policies enforce security and governance rules in Kubernetes clusters, but incorrect policies can block legitimate workloads or fail to catch violations. The Kyverno CLI provides a testing framework that validates policies against test cases before deployment, catching policy errors early in the development cycle.

In this guide, we'll build comprehensive unit tests for Kyverno policies using the CLI test command. This test-driven approach ensures policies behave correctly across various scenarios while preventing regressions when policies evolve.

## Understanding Kyverno Policy Testing

The Kyverno CLI test command evaluates policies against predefined resources and expected outcomes. Test cases specify whether a resource should pass or fail validation, allowing you to verify policy logic without deploying to a live cluster.

Test files use YAML format to define policy under test, resources to validate, and expected results. The CLI runs these tests locally, reporting passes and failures with detailed output. This makes policy testing fast and suitable for CI/CD integration.

Tests support all Kyverno policy types including validation, mutation, and generation. You can test admission policies that block resources, mutating policies that modify resources, and generate policies that create additional resources automatically.

## Installing the Kyverno CLI

Install the Kyverno CLI for policy testing:

```bash
# Install on Linux
wget https://github.com/kyverno/kyverno/releases/download/v1.11.0/kyverno-cli_v1.11.0_linux_x86_64.tar.gz
tar -xzf kyverno-cli_v1.11.0_linux_x86_64.tar.gz
sudo mv kyverno /usr/local/bin/

# Install on macOS
brew install kyverno

# Verify installation
kyverno version
```

## Creating Your First Policy and Test

Create a simple validation policy that requires labels:

```yaml
# policies/require-labels.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-labels
spec:
  validationFailureAction: Enforce
  rules:
  - name: check-for-labels
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "Labels 'app' and 'env' are required"
      pattern:
        metadata:
          labels:
            app: "?*"
            env: "?*"
```

Create a test file for this policy:

```yaml
# tests/require-labels-test.yaml
name: require-labels-test
policies:
  - ../policies/require-labels.yaml
resources:
  - resources.yaml
results:
  - policy: require-labels
    rule: check-for-labels
    resource: good-pod
    kind: Pod
    result: pass
  - policy: require-labels
    rule: check-for-labels
    resource: bad-pod-no-labels
    kind: Pod
    result: fail
  - policy: require-labels
    rule: check-for-labels
    resource: bad-pod-missing-env
    kind: Pod
    result: fail
```

Create test resources:

```yaml
# tests/resources.yaml
apiVersion: v1
kind: Pod
metadata:
  name: good-pod
  labels:
    app: myapp
    env: production
spec:
  containers:
  - name: nginx
    image: nginx
---
apiVersion: v1
kind: Pod
metadata:
  name: bad-pod-no-labels
spec:
  containers:
  - name: nginx
    image: nginx
---
apiVersion: v1
kind: Pod
metadata:
  name: bad-pod-missing-env
  labels:
    app: myapp
spec:
  containers:
  - name: nginx
    image: nginx
```

Run the test:

```bash
# Execute policy tests
kyverno test tests/

# Expected output:
# Executing require-labels-test...
# pass: 1, fail: 0, warn: 0, error: 0, skip: 0
```

## Testing Mutation Policies

Create a mutation policy that adds default labels:

```yaml
# policies/add-default-labels.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-default-labels
spec:
  rules:
  - name: add-labels
    match:
      any:
      - resources:
          kinds:
          - Pod
    mutate:
      patchStrategicMerge:
        metadata:
          labels:
            +(managed-by): "kyverno"
            +(environment): "production"
```

Test mutation behavior:

```yaml
# tests/mutation-test.yaml
name: mutation-test
policies:
  - ../policies/add-default-labels.yaml
resources:
  - mutation-resources.yaml
results:
  - policy: add-default-labels
    rule: add-labels
    resource: test-pod
    kind: Pod
    patchedResource: patched-pod.yaml
    result: pass
```

Define expected mutation outcome:

```yaml
# tests/patched-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  labels:
    managed-by: kyverno
    environment: production
spec:
  containers:
  - name: nginx
    image: nginx
```

Test input resource:

```yaml
# tests/mutation-resources.yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
  - name: nginx
    image: nginx
```

Run mutation tests:

```bash
kyverno test tests/mutation-test.yaml --detailed-results
```

## Testing Complex Validation Rules

Test a policy with multiple conditions and deny lists:

```yaml
# policies/restrict-registries.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-registries
spec:
  validationFailureAction: Enforce
  rules:
  - name: validate-registries
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: >-
        Container images must come from approved registries:
        gcr.io, ghcr.io, or quay.io
      foreach:
      - list: "request.object.spec.containers"
        deny:
          conditions:
            all:
            - key: "{{element.image}}"
              operator: NotIn
              value:
              - "gcr.io/*"
              - "ghcr.io/*"
              - "quay.io/*"
```

Comprehensive test cases:

```yaml
# tests/registry-test.yaml
name: registry-validation-test
policies:
  - ../policies/restrict-registries.yaml
resources:
  - registry-resources.yaml
results:
  - policy: restrict-registries
    rule: validate-registries
    resource: allowed-gcr
    kind: Pod
    result: pass
  - policy: restrict-registries
    rule: validate-registries
    resource: allowed-ghcr
    kind: Pod
    result: pass
  - policy: restrict-registries
    rule: validate-registries
    resource: blocked-dockerhub
    kind: Pod
    result: fail
  - policy: restrict-registries
    rule: validate-registries
    resource: blocked-private
    kind: Pod
    result: fail
```

Test resources:

```yaml
# tests/registry-resources.yaml
apiVersion: v1
kind: Pod
metadata:
  name: allowed-gcr
spec:
  containers:
  - name: app
    image: gcr.io/myproject/myapp:v1
---
apiVersion: v1
kind: Pod
metadata:
  name: allowed-ghcr
spec:
  containers:
  - name: app
    image: ghcr.io/myorg/myapp:latest
---
apiVersion: v1
kind: Pod
metadata:
  name: blocked-dockerhub
spec:
  containers:
  - name: app
    image: nginx:latest
---
apiVersion: v1
kind: Pod
metadata:
  name: blocked-private
spec:
  containers:
  - name: app
    image: private-registry.company.com/app:v1
```

## Testing Generation Policies

Test policies that generate additional resources:

```yaml
# policies/generate-network-policy.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-network-policy
spec:
  rules:
  - name: create-default-deny
    match:
      any:
      - resources:
          kinds:
          - Namespace
    generate:
      apiVersion: networking.k8s.io/v1
      kind: NetworkPolicy
      name: default-deny
      namespace: "{{request.object.metadata.name}}"
      synchronize: true
      data:
        spec:
          podSelector: {}
          policyTypes:
          - Ingress
          - Egress
```

Test generation logic:

```yaml
# tests/generation-test.yaml
name: generation-test
policies:
  - ../policies/generate-network-policy.yaml
resources:
  - generation-resources.yaml
results:
  - policy: generate-network-policy
    rule: create-default-deny
    resource: test-namespace
    kind: Namespace
    generatedResource: generated-netpol.yaml
    result: pass
```

Expected generated resource:

```yaml
# tests/generated-netpol.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: test-namespace
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

## Organizing Tests with Test Suites

Structure multiple tests into organized suites:

```bash
# Project structure
kyverno-policies/
├── policies/
│   ├── security/
│   │   ├── require-labels.yaml
│   │   └── restrict-registries.yaml
│   └── compliance/
│       └── add-annotations.yaml
└── tests/
    ├── security/
    │   ├── require-labels-test.yaml
    │   ├── require-labels-resources.yaml
    │   ├── restrict-registries-test.yaml
    │   └── restrict-registries-resources.yaml
    └── compliance/
        ├── add-annotations-test.yaml
        └── add-annotations-resources.yaml
```

Run all tests:

```bash
# Run all tests in directory
kyverno test tests/

# Run specific test suite
kyverno test tests/security/

# Run with verbose output
kyverno test tests/ --verbose
```

## Testing with Variables and Context

Test policies that use JMESPath expressions and context:

```yaml
# policies/limit-containers.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: limit-containers
spec:
  validationFailureAction: Enforce
  rules:
  - name: max-containers
    match:
      any:
      - resources:
          kinds:
          - Pod
    context:
    - name: containerCount
      variable:
        jmesPath: length(request.object.spec.containers)
    validate:
      message: "Pods cannot have more than 3 containers"
      deny:
        conditions:
          any:
          - key: "{{containerCount}}"
            operator: GreaterThan
            value: 3
```

Test with context variables:

```yaml
# tests/context-test.yaml
name: context-variable-test
policies:
  - ../policies/limit-containers.yaml
resources:
  - context-resources.yaml
results:
  - policy: limit-containers
    rule: max-containers
    resource: two-containers
    kind: Pod
    result: pass
  - policy: limit-containers
    rule: max-containers
    resource: four-containers
    kind: Pod
    result: fail
```

## Integrating Tests into CI/CD

Create a GitHub Actions workflow for policy testing:

```yaml
# .github/workflows/policy-test.yml
name: Kyverno Policy Tests

on:
  pull_request:
    paths:
      - 'policies/**'
      - 'tests/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2

    - name: Install Kyverno CLI
      run: |
        wget https://github.com/kyverno/kyverno/releases/download/v1.11.0/kyverno-cli_v1.11.0_linux_x86_64.tar.gz
        tar -xzf kyverno-cli_v1.11.0_linux_x86_64.tar.gz
        sudo mv kyverno /usr/local/bin/

    - name: Run policy tests
      run: |
        kyverno test tests/ --detailed-results

    - name: Validate policy manifests
      run: |
        kyverno apply policies/ --resource tests/resources.yaml --dry-run
```

## Testing Policy Exceptions

Test policies with exceptions and exclusions:

```yaml
# policies/with-exceptions.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: Enforce
  rules:
  - name: require-limits
    match:
      any:
      - resources:
          kinds:
          - Pod
    exclude:
      any:
      - resources:
          namespaces:
          - kube-system
    validate:
      message: "Resource limits are required"
      pattern:
        spec:
          containers:
          - resources:
              limits:
                memory: "?*"
                cpu: "?*"
```

Test exception behavior:

```yaml
# tests/exceptions-test.yaml
name: exceptions-test
policies:
  - ../policies/with-exceptions.yaml
resources:
  - exceptions-resources.yaml
results:
  - policy: require-resource-limits
    rule: require-limits
    resource: excluded-pod
    kind: Pod
    result: skip
  - policy: require-resource-limits
    rule: require-limits
    resource: included-pod-pass
    kind: Pod
    result: pass
  - policy: require-resource-limits
    rule: require-limits
    resource: included-pod-fail
    kind: Pod
    result: fail
```

## Running Tests with Coverage Reports

Generate coverage reports showing tested scenarios:

```bash
# Run tests with detailed output
kyverno test tests/ \
  --detailed-results \
  --output json > test-results.json

# Parse results for coverage
jq '.results[] | {policy: .policy, rule: .rule, resource: .resource, result: .result}' test-results.json
```

## Conclusion

Unit testing Kyverno policies with the CLI ensures that governance rules work correctly before deployment. This test-driven approach catches policy errors early, prevents breaking changes, and builds confidence in policy behavior across various scenarios.

The Kyverno CLI test framework integrates easily into CI/CD pipelines, making policy testing a standard part of development workflows. Regular testing prevents policy regressions and ensures that security and compliance requirements remain enforced correctly.

For production policy development, write tests before implementing policies, cover both positive and negative test cases, and integrate policy testing into pull request workflows to catch issues before policies reach clusters.
